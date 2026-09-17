import type {
  DataProvenance,
  EarthLensDefinition,
  GeographicAreaPolygon,
  GeographicBoundingBox,
  GeographicPoint,
  LensDataset,
  LensFeature,
} from "../types";

const SOURCE_URL = "https://www.marineregions.org/downloads.php";

const provenance: DataProvenance = {
  source: "Marine Regions World EEZ v12 · all zones",
  sourceUrl: SOURCE_URL,
  license: "Creative Commons Attribution 4.0 International (Marine Regions / VLIZ)",
  updatedAt: "2026-09-01 retrieval snapshot",
  confidence: "medium",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Marine Regions' 200 nautical mile EEZ polygons for the whole world, including overlapping claims and joint regimes, simplified for web delivery. EEZs are maritime jurisdiction zones, not sovereign territory or a statement about disputed boundaries.",
};

export const eezDefinition: EarthLensDefinition = {
  id: "eez",
  urlCode: "ez",
  name: "EXCLUSIVE ECONOMIC ZONES",
  shortName: "EEZ",
  category: "power",
  description: "A small island can hold rights over a very large piece of sea.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "200 NM maritime zone", color: "#a6a4ed", symbol: "area" }],
  disclosures: ["EEZ / 200 NM MARITIME ZONE", "SIMPLIFIED FOR WEB", "NOT SOVEREIGN TERRITORY"],
};

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = PolygonCoordinates[];

interface EezGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: PolygonCoordinates } | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates } | null;
    properties?: {
      mrgid?: number;
      geoname?: string;
      territory1?: string;
      iso_ter1?: string;
      sovereign1?: string;
      iso_sov1?: string;
      area_km2?: number;
      pol_type?: string;
      label_lon?: number;
      label_lat?: number;
      name_ja?: string;
    };
  }>;
}

const territoryJa: Record<string, string> = {
  Australia: "オーストラリア", Chile: "チリ", CookIslands: "クック諸島", Ecuador: "エクアドル", Fiji: "フィジー",
  Indonesia: "インドネシア", Japan: "日本", Kiribati: "キリバス", MarshallIslands: "マーシャル諸島", Micronesia: "ミクロネシア連邦",
  Nauru: "ナウル", NewZealand: "ニュージーランド", Palau: "パラオ", PapuaNewGuinea: "パプアニューギニア", Philippines: "フィリピン",
  SolomonIslands: "ソロモン諸島", Tonga: "トンガ", Tuvalu: "ツバル", Vanuatu: "バヌアツ", Samoa: "サモア",
};

function japaneseTerritoryName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const key = value.replaceAll(" ", "");
  return territoryJa[key] ?? undefined;
}

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

export async function loadEez(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/eez.geojson`);
  if (!response.ok) throw new Error(`Marine Regions EEZ failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as EezGeoJson;
  const features: LensFeature[] = geojson.features.flatMap((sourceFeature, index) => {
    if (!sourceFeature.geometry) return [];
    const polygonCoordinates = sourceFeature.geometry.type === "Polygon"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const polygons = polygonCoordinates.filter((polygon) => (polygon[0]?.length ?? 0) >= 3).map(normalizePolygon);
    if (polygons.length === 0) return [];
    const bbox = bboxForPoints(polygons.flatMap((polygon) => polygon.rings.flat()));
    // 名札の位置は生成時に焼いた内点（必ず海域の内側）。bbox の中点だと、日付変更線を
    // またぐロシア・アラスカ・フィジーの名札が経度0付近（大西洋やアフリカ）に出てしまう。
    const labelLongitude = sourceFeature.properties?.label_lon;
    const labelLatitude = sourceFeature.properties?.label_lat;
    const centroid = typeof labelLongitude === "number" && typeof labelLatitude === "number"
      ? { longitude: labelLongitude, latitude: labelLatitude }
      : { longitude: (bbox.west + bbox.east) / 2, latitude: (bbox.south + bbox.north) / 2 };
    const territory = sourceFeature.properties?.territory1?.trim() || "Selected maritime territory";
    const sovereign = sourceFeature.properties?.sovereign1?.trim() || territory;
    const name = sourceFeature.properties?.geoname?.trim() || `${territory} Exclusive Economic Zone`;
    const zoneType = sourceFeature.properties?.pol_type ?? "200NM";
    // 係争海域・共同管理海域を片方の国名で呼ぶと誤解を招くので、国名から日本語名を作らない。
    const territoryJaName = zoneType === "200NM"
      ? sourceFeature.properties?.name_ja?.trim() || japaneseTerritoryName(territory) || japaneseTerritoryName(sovereign)
      : undefined;
    const zoneJaPrefix = zoneType === "Joint regime" ? "共同管理海域" : zoneType === "Overlapping claim" ? "主張が重なる海域" : undefined;
    return [{
      id: `eez-mrgid-${sourceFeature.properties?.mrgid ?? index}`,
      lensId: eezDefinition.id,
      name,
      description: "A line drawn from land divides who may use the sea's resources.",
      geometry: {
        type: "area",
        centroid,
        polygons,
        bbox,
      },
      provenance,
      attributes: {
        ...(territoryJaName ? { nameJa: `${territoryJaName}のEEZ` } : zoneJaPrefix ? { nameJa: `${zoneJaPrefix}: ${name.replace(/^(Overlapping claim|Joint regime area)\s*:?\s*/i, "")}` } : {}),
        territory,
        sovereign,
        territoryIso: sourceFeature.properties?.iso_ter1 ?? "—",
        sovereignIso: sourceFeature.properties?.iso_sov1 ?? "—",
        areaKm2: sourceFeature.properties?.area_km2 ?? 0,
        zoneType,
        maritimeZone: true,
        approximateRegion: true,
      },
    }];
  });
  return { lensId: eezDefinition.id, features };
}
