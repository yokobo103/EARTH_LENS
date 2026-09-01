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
  note: "Simplified web-delivery centerlines from Natural Earth. This is a generalized cartographic network, not a measurement of river flow, width, seasonality, or navigability.",
};

export const riversDefinition: EarthLensDefinition = {
  id: "rivers",
  name: "RIVERS",
  shortName: "Rivers",
  category: "earth",
  description: "Generalized river and lake centerlines for observing how water corridors relate to borders, ports, and settlements.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "Generalized river centerline", color: "#63c8d9", symbol: "line" }],
  disclosures: ["GENERALIZED RIVER NETWORK", "NOT HYDROLOGICAL FLOW DATA", "NATURAL EARTH · PUBLIC DOMAIN"],
};

type Position = [number, number];

interface RiversGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "LineString"; coordinates: Position[] } | { type: "MultiLineString"; coordinates: Position[][] } | null;
    properties?: { name?: string; featurecla?: string; scalerank?: number };
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

export async function loadRivers(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/rivers.geojson`);
  if (!response.ok) throw new Error(`Natural Earth rivers failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as RiversGeoJson;
  const features: LensFeature[] = geojson.features.flatMap((sourceFeature, index) => {
    if (!sourceFeature.geometry) return [];
    const rawPaths = sourceFeature.geometry.type === "LineString"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const paths = rawPaths
      .filter((path) => path.length >= 2)
      .map((path) => path.map(([longitude, latitude]) => ({ longitude, latitude })));
    if (paths.length === 0) return [];
    const points = paths.flat();
    const scaleRank = sourceFeature.properties?.scalerank ?? 10;
    const name = sourceFeature.properties?.name?.trim() || `River network ${index + 1}`;
    return [{
      id: `river-ne-${index}`,
      lensId: riversDefinition.id,
      name,
      description: `${name} is a generalized centerline from the Natural Earth 1:10m Rivers + lake centerlines dataset.`,
      geometry: { type: "polyline", paths, bbox: bboxForPoints(points) },
      provenance,
      attributes: {
        featureClass: sourceFeature.properties?.featurecla ?? "River",
        scaleRank,
        approximateGeometry: true,
      },
    }];
  });
  return { lensId: riversDefinition.id, features };
}
