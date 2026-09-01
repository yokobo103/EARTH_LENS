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
  source: "Marine Regions World EEZ v12 · selected Pacific-facing zones",
  sourceUrl: SOURCE_URL,
  license: "Creative Commons Attribution 4.0 International (Marine Regions / VLIZ)",
  updatedAt: "2026-09-01 retrieval snapshot",
  confidence: "medium",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "A curated subset of Marine Regions' 200 nautical mile EEZ polygons, simplified for web delivery. EEZs are maritime jurisdiction zones, not sovereign territory or a statement about disputed boundaries.",
};

export const eezDefinition: EarthLensDefinition = {
  id: "eez",
  urlCode: "ez",
  name: "EXCLUSIVE ECONOMIC ZONES",
  shortName: "EEZ",
  category: "power",
  description: "Selected maritime zones reveal how small islands can anchor very large areas at sea.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "200 NM maritime zone", color: "#a6a4ed", symbol: "area" }],
  disclosures: ["CURATED DEMO SUBSET", "EEZ / 200 NM MARITIME ZONE", "NOT SOVEREIGN TERRITORY"],
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
    const territory = sourceFeature.properties?.territory1?.trim() || "Selected maritime territory";
    const sovereign = sourceFeature.properties?.sovereign1?.trim() || territory;
    const name = sourceFeature.properties?.geoname?.trim() || `${territory} Exclusive Economic Zone`;
    const territoryJaName = japaneseTerritoryName(territory) ?? japaneseTerritoryName(sovereign);
    return [{
      id: `eez-mrgid-${sourceFeature.properties?.mrgid ?? index}`,
      lensId: eezDefinition.id,
      name,
      description: `${name} is a 200 nautical mile maritime zone in the Marine Regions dataset.`,
      geometry: {
        type: "area",
        centroid: { longitude: (bbox.west + bbox.east) / 2, latitude: (bbox.south + bbox.north) / 2 },
        polygons,
        bbox,
      },
      provenance,
      attributes: {
        ...(territoryJaName ? { nameJa: `${territoryJaName}のEEZ` } : {}),
        territory,
        sovereign,
        territoryIso: sourceFeature.properties?.iso_ter1 ?? "—",
        sovereignIso: sourceFeature.properties?.iso_sov1 ?? "—",
        areaKm2: sourceFeature.properties?.area_km2 ?? 0,
        zoneType: "200NM EEZ",
        maritimeZone: true,
        approximateRegion: true,
      },
    }];
  });
  return { lensId: eezDefinition.id, features };
}
