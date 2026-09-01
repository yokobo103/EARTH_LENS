import type {
  DataProvenance,
  EarthLensDefinition,
  GeographicAreaPolygon,
  GeographicBoundingBox,
  GeographicPoint,
  LensDataset,
  LensFeature,
} from "../types";

const SOURCE_URL = "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/";

const provenance: DataProvenance = {
  source: "Natural Earth 1:10m Geography Regions · Desert features",
  sourceUrl: SOURCE_URL,
  license: "Public Domain (Natural Earth terms of use)",
  updatedAt: "2026-09-01 retrieval snapshot",
  confidence: "medium",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Desert polygons filtered from Natural Earth's geography regions and simplified for web delivery. They are approximate cartographic regions, not a climate classification, land-cover measurement, or continuous dryness index.",
};

export const desertsDefinition: EarthLensDefinition = {
  id: "deserts",
  name: "ARID REGIONS",
  shortName: "Arid",
  category: "earth",
  description: "Approximate desert regions for observing how dry land relates to rivers, cities, and routes.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "Approximate desert region", color: "#d9ad62", symbol: "area" }],
  disclosures: ["APPROXIMATE REGION", "NOT A CLIMATE INDEX", "NATURAL EARTH · PUBLIC DOMAIN"],
};

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = PolygonCoordinates[];

interface DesertsGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: PolygonCoordinates } | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates } | null;
    properties?: { NAME?: string; NAME_JA?: string; FEATURECLA?: string; REGION?: string; SUBREGION?: string; SCALERANK?: number };
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

function normalizePolygon(coordinates: PolygonCoordinates): GeographicAreaPolygon {
  const rings = coordinates.map((ring) => ring.map(([longitude, latitude]) => ({ longitude, latitude })));
  return { rings, bbox: bboxForPoints(rings.flat()) };
}

export async function loadDeserts(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/deserts.geojson`);
  if (!response.ok) throw new Error(`Natural Earth deserts failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as DesertsGeoJson;
  const features: LensFeature[] = geojson.features.flatMap((sourceFeature, index) => {
    if (!sourceFeature.geometry) return [];
    const polygonCoordinates = sourceFeature.geometry.type === "Polygon"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const polygons = polygonCoordinates.filter((polygon) => (polygon[0]?.length ?? 0) >= 3).map(normalizePolygon);
    if (polygons.length === 0) return [];
    const bbox = bboxForPoints(polygons.flatMap((polygon) => polygon.rings.flat()));
    const name = sourceFeature.properties?.NAME?.trim() || `Arid region ${index + 1}`;
    const nameJa = sourceFeature.properties?.NAME_JA?.trim();
    return [{
      id: `desert-ne-${index}`,
      lensId: desertsDefinition.id,
      name,
      description: `${name} is an approximate desert region from Natural Earth's geography regions dataset.`,
      geometry: {
        type: "area",
        centroid: { longitude: (bbox.west + bbox.east) / 2, latitude: (bbox.south + bbox.north) / 2 },
        polygons,
        bbox,
      },
      provenance,
      attributes: {
        ...(nameJa ? { nameJa } : {}),
        featureClass: sourceFeature.properties?.FEATURECLA ?? "Desert",
        region: sourceFeature.properties?.REGION ?? "—",
        subregion: sourceFeature.properties?.SUBREGION ?? "—",
        scaleRank: sourceFeature.properties?.SCALERANK ?? 0,
        approximateRegion: true,
      },
    }];
  });
  return { lensId: desertsDefinition.id, features };
}
