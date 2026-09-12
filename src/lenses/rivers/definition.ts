import type {
  DataProvenance,
  EarthLensDefinition,
  GeographicBoundingBox,
  GeographicPoint,
  LensDataset,
  LensFeature,
} from "../types";

const SOURCE_URL = "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/";

const provenance: DataProvenance = {
  source: "Natural Earth 1:10m Rivers + lake centerlines",
  sourceUrl: SOURCE_URL,
  license: "Public Domain (Natural Earth terms of use)",
  updatedAt: "2026-09-01 retrieval snapshot",
  confidence: "high",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Simplified web-delivery centerlines from Natural Earth. Which rivers appear at which distance is decided by discharge transferred from HydroRIVERS, not by Natural Earth's scalerank.",
  derivedFrom: [{
    source: "HydroRIVERS v1.0 (HydroSHEDS)",
    sourceUrl: "https://www.hydrosheds.org/products/hydrorivers",
    license: "Free for non-commercial and commercial use, attribution required",
    citation: "Lehner, B., Grill G. (2013) Hydrological Processes 27",
    note: "Long-term average discharge matched to each Natural Earth line by position, offline. 1,448 of 1,455 lines matched. No HydroRIVERS geometry is shipped.",
  }],
};

export const riversDefinition: EarthLensDefinition = {
  id: "rivers",
  urlCode: "rv",
  name: "RIVERS",
  shortName: "Rivers",
  category: "earth",
  description: "Lines of water joining inland to sea. People and boundaries both tend to follow them.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "River", color: "#63c8d9", symbol: "line" }],
  disclosures: ["GENERALIZED RIVER NETWORK", "SHOWN BY DISCHARGE · HYDRORIVERS", "NATURAL EARTH · PUBLIC DOMAIN"],
};

type Position = [number, number];

interface RiversGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "LineString"; coordinates: Position[] } | { type: "MultiLineString"; coordinates: Position[][] } | null;
    properties?: {
      name?: string;
      featurecla?: string;
      scalerank?: number;
      /** tools/build-river-importance.py が焼いた派生値。元は HydroRIVERS。 */
      dis?: number;
      sys?: number;
      clas?: number;
      chain?: number;
    };
  }>;
}

function bboxForPoints(points: GeographicPoint[]): GeographicBoundingBox {
  return points.reduce<GeographicBoundingBox>((bbox, point) => ({
    west: Math.min(bbox.west, point.longitude),
    south: Math.min(bbox.south, point.latitude),
    east: Math.max(bbox.east, point.longitude),
    north: Math.max(bbox.north, point.latitude),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

/**
 * 表示の段。1 = 世界、2 = 大陸、3 = 国。4 はこのレンズでは描かない。
 *
 * 近景でも全 1,455 本には戻さない。いちばん細かい段でも 1,129 本で、
 * 残りは平均流量の中央値が 34 m3/s 前後の細流。出しても水系の骨格が読めなくなるだけ。
 */
export type RiverTier = 1 | 2 | 3 | 4;

/** なぜこの段に入ったか。DATA 側で答えられるように残す。 */
export type RiverTierReason = "discharge" | "mainstem" | "scalerank";

/**
 * 段のしきい値。すべて平均流量 m3/s で、そのままユーザーに見せられる数にしてある。
 *
 * 流量だけで切ると大河が途中で終わる。上流ほど流量は減るので当然で、1,000 m3/s で
 * 切るとミシシッピは 3 区間中 1 区間しか残らなかった。そこで比べるのは区間ごとの
 * 流量ではなく、同名で端点が接する区間をつないだ鎖の最大流量（chain）にしてある。
 *
 * 鎖でも救えないのが、途中で名前が変わる大河。長江はトゥオトゥオ川・金沙江・
 * 揚子江と名前が変わり、源流部の流量は 35 m3/s しかない。これは HydroRIVERS の
 * 「水系の河口流量（sys）」と「本流かどうか（clas）」で拾う。
 */
const WORLD_DISCHARGE = 800;
const WORLD_SYSTEM_OUTLET = 20_000;
const CONTINENT_DISCHARGE = 300;
const COUNTRY_DISCHARGE = 100;
const COUNTRY_MAINSTEM_DISCHARGE = 50;

interface RiverImportance {
  tier: RiverTier;
  reason: RiverTierReason;
}

/**
 * HydroRIVERS と照合できなかった線の逃げ道。
 * 7 本あり、スエズ運河（人工水路で自然流量が無い）、ドナウ・デルタの分流、
 * 干上がるカルカン川、ロワール川の 1 区間。黙って消さずに scalerank で置く。
 */
function importanceFromScaleRank(scaleRank: number): RiverImportance {
  const tier: RiverTier = scaleRank <= 2 ? 1 : scaleRank <= 5 ? 2 : scaleRank <= 7 ? 3 : 4;
  return { tier, reason: "scalerank" };
}

function importanceOf(chain: number, systemOutlet: number, mainstemOrder: number, matched: boolean, scaleRank: number): RiverImportance {
  if (!matched) return importanceFromScaleRank(scaleRank);
  if (chain >= WORLD_DISCHARGE) return { tier: 1, reason: "discharge" };
  if (mainstemOrder <= 2 && systemOutlet >= WORLD_SYSTEM_OUTLET) return { tier: 1, reason: "mainstem" };
  if (chain >= CONTINENT_DISCHARGE) return { tier: 2, reason: "discharge" };
  if (chain >= COUNTRY_DISCHARGE) return { tier: 3, reason: "discharge" };
  if (mainstemOrder === 1 && chain >= COUNTRY_MAINSTEM_DISCHARGE) return { tier: 3, reason: "mainstem" };
  return { tier: 4, reason: "discharge" };
}

export async function loadRivers(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/rivers.geojson`);
  if (!response.ok) throw new Error(`Natural Earth rivers failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as RiversGeoJson;

  const features: LensFeature[] = [];
  for (const [index, sourceFeature] of geojson.features.entries()) {
    if (!sourceFeature.geometry) continue;
    const rawPaths = sourceFeature.geometry.type === "LineString"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const paths = rawPaths
      .filter((path) => path.length >= 2)
      .map((path) => path.map(([longitude, latitude]) => ({ longitude, latitude })));
    if (paths.length === 0) continue;

    const properties = sourceFeature.properties;
    const scaleRank = properties?.scalerank ?? 10;
    const matched = typeof properties?.dis === "number";
    const discharge = properties?.dis ?? 0;
    const chain = properties?.chain ?? discharge;
    const systemOutlet = properties?.sys ?? 0;
    const mainstemOrder = properties?.clas ?? 9;
    const { tier, reason } = importanceOf(chain, systemOutlet, mainstemOrder, matched, scaleRank);
    // 描かない段のものは作らない。エンティティを持たなければ描画も当たり判定も要らない。
    if (tier === 4) continue;

    const name = properties?.name?.trim() || `River network ${index + 1}`;
    features.push({
      id: `river-ne-${index}`,
      lensId: riversDefinition.id,
      name,
      description: "A line carrying water and people from inland out to the sea.",
      geometry: { type: "polyline", paths, bbox: bboxForPoints(paths.flat()) },
      provenance,
      attributes: {
        featureClass: properties?.featurecla ?? "River",
        // 見えている理由は、この3つと段で説明できる。
        displayTier: tier,
        displayReason: reason,
        ...(matched ? {
          averageDischargeCms: discharge,
          riverSystemDischargeCms: chain,
          riverSystemOutletCms: systemOutlet,
          mainstemOrder,
        } : {}),
        scaleRank,
        approximateGeometry: true,
      },
    });
  }
  return { lensId: riversDefinition.id, features };
}
