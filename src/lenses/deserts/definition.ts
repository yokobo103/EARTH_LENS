import type {
  DataProvenance,
  EarthLensDefinition,
  GeographicAreaPolygon,
  GeographicBoundingBox,
  GeographicPoint,
  LensDataset,
  LensFeature,
} from "../types";

/**
 * 乾燥帯は「砂漠という名前が付いた場所」ではなく「長いあいだ乾いている気候の範囲」。
 *
 * 以前は Natural Earth の名前が Desert の58件を描いていた。描いていた所の97%は
 * 本当に乾燥帯だったが、逆に本物の砂漠の44%が画面に無かった（アラビア半島の大半、
 * オーストラリア内陸、イラン、ソマリ、モハベ、パタゴニア）。半乾燥のサヘルは
 * 帯として1件も無く、58件中22件がより大きい砂漠の内側に入れ子で、
 * 549万 km2 が二重に塗られていた。名前で拾う限り直らないので、面は測って作る。
 *
 * 面は `tools/build-arid-regions.py` が Köppen-Geiger（1991-2020）から焼く。
 * 実行時に気候データは読まない。
 */

const SOURCE_URL = "https://doi.org/10.6084/m9.figshare.21789074";

const provenance: DataProvenance = {
  source: "Köppen-Geiger climate classification 1991–2020 (Beck et al. 2023)",
  sourceUrl: SOURCE_URL,
  license: "CC BY 4.0 · Beck, H.E. et al. (2023) Scientific Data 10, 724",
  updatedAt: "1991–2020",
  confidence: "high",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Contiguous areas of Köppen class B traced from the 0.1° (about 11 km) grid and generalised for web delivery. Arid = BW, semi-arid = BS. These are 30-year normals, not current drought.",
};

export const desertsDefinition: EarthLensDefinition = {
  id: "deserts",
  urlCode: "ds",
  name: "ARID REGIONS",
  shortName: "Arid",
  category: "earth",
  description: "Where dryness is the long-run climate, not this year's weather.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [
    { label: "Arid (desert)", color: "#d9ad62", symbol: "area" },
    { label: "Semi-arid (steppe)", color: "#d9ad62", symbol: "area" },
  ],
  disclosures: ["KÖPPEN-GEIGER 1991–2020", "30-YEAR NORMALS · NOT DROUGHT", "BECK ET AL. 2023 · CC BY 4.0"],
};

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = PolygonCoordinates[];

type DrynessReason = "arid_climate" | "semi_arid_climate";

interface AridGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: PolygonCoordinates } | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates } | null;
    properties?: { id?: string; why?: DrynessReason; tier?: number; km2?: number };
  }>;
}

/**
 * 名前は今は付けない。
 *
 * 測った面には地名が無い（サハラとアラビアは1つの塊としてつながり、
 * タクラマカンとゴビも1つになる）。Natural Earth の58件をそのまま名札にすると、
 * 測った形の上に「名前が付いている場所だけ濃く見える」問題が戻ってくる。
 * まず面だけで成立させ、名前を出すなら重なり・規模・重複除去の基準を決めてから。
 */
const NAME_BY_REASON: Record<DrynessReason, { en: string; ja: string }> = {
  arid_climate: { en: "Arid climate zone", ja: "乾燥気候の地域" },
  semi_arid_climate: { en: "Semi-arid climate zone", ja: "半乾燥気候の地域" },
};

const TYPE_BY_REASON: Record<DrynessReason, string> = {
  arid_climate: "Arid (desert)",
  semi_arid_climate: "Semi-arid (steppe)",
};

const DESCRIPTION_BY_REASON: Record<DrynessReason, string> = {
  arid_climate: "Over thirty years, less than half the water this climate can take away ever arrives.",
  semi_arid_climate: "Over thirty years, more than half arrives, but never enough to close the gap.",
};

function bboxForPoints(points: GeographicPoint[]): GeographicBoundingBox {
  return points.reduce<GeographicBoundingBox>((bbox, point) => ({
    west: Math.min(bbox.west, point.longitude),
    south: Math.min(bbox.south, point.latitude),
    east: Math.max(bbox.east, point.longitude),
    north: Math.max(bbox.north, point.latitude),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

function normalizePolygon(coordinates: PolygonCoordinates): GeographicAreaPolygon {
  const rings = coordinates.map((ring) => ring.map(([longitude, latitude]) => ({ longitude, latitude })));
  return { rings, bbox: bboxForPoints(rings.flat()) };
}

export async function loadDeserts(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/arid-regions.geojson`);
  if (!response.ok) throw new Error(`Arid regions failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as AridGeoJson;
  const features: LensFeature[] = geojson.features.flatMap((sourceFeature, index) => {
    if (!sourceFeature.geometry) return [];
    const polygonCoordinates = sourceFeature.geometry.type === "Polygon"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const polygons = polygonCoordinates.filter((polygon) => (polygon[0]?.length ?? 0) >= 3).map(normalizePolygon);
    if (polygons.length === 0) return [];
    const bbox = bboxForPoints(polygons.flatMap((polygon) => polygon.rings.flat()));
    const reason: DrynessReason = sourceFeature.properties?.why === "semi_arid_climate" ? "semi_arid_climate" : "arid_climate";
    const tier = sourceFeature.properties?.tier ?? 3;
    const areaKm2 = sourceFeature.properties?.km2 ?? 0;
    return [{
      id: sourceFeature.properties?.id ?? `arid-${index}`,
      lensId: desertsDefinition.id,
      name: NAME_BY_REASON[reason].en,
      description: DESCRIPTION_BY_REASON[reason],
      geometry: {
        type: "area",
        centroid: { longitude: (bbox.west + bbox.east) / 2, latitude: (bbox.south + bbox.north) / 2 },
        polygons,
        bbox,
      },
      provenance,
      attributes: {
        nameJa: NAME_BY_REASON[reason].ja,
        type: TYPE_BY_REASON[reason],
        displayTier: tier,
        displayReason: reason,
        areaKm2,
        climatology: "1991–2020 normals",
        sourceResolution: "0.1° grid (about 11 km)",
      },
    }];
  });
  return { lensId: desertsDefinition.id, features };
}
