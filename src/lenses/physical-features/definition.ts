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
  source: "Natural Earth 1:10m Geography Regions · Range/mtn and Plateau",
  sourceUrl: SOURCE_URL,
  license: "Public Domain (Natural Earth terms of use)",
  updatedAt: "2026-09-02 retrieval snapshot",
  confidence: "high",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Mountain and plateau polygons filtered from Natural Earth's geography regions and simplified for web delivery. Regions are cartographic approximations, not elevation measurements.",
};

export const physicalFeaturesDefinition: EarthLensDefinition = {
  id: "physical-features",
  urlCode: "pf",
  name: "MOUNTAIN RANGES & PLATEAUS",
  shortName: "Mountains",
  category: "earth",
  description: "Natural Earth mountain-range and plateau regions that make physical barriers and corridors visible.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [
    { label: "Mountain range", color: "#e7d49b", symbol: "area" },
    { label: "Plateau", color: "#c99bdc", symbol: "area" },
  ],
  disclosures: ["APPROXIMATE REGION", "NO ELEVATION GEOMETRY", "NATURAL EARTH · PUBLIC DOMAIN"],
};

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = PolygonCoordinates[];

interface PhysicalFeaturesGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: PolygonCoordinates } | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates } | null;
    properties?: {
      NAME?: string;
      NAME_JA?: string;
      FEATURECLA?: "Range/mtn" | "Plateau";
      REGION?: string;
      SUBREGION?: string;
      SCALERANK?: number;
      NE_ID?: number;
      WIKIDATAID?: string;
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

function normalizePolygon(coordinates: PolygonCoordinates): GeographicAreaPolygon | null {
  const rings = coordinates
    .filter((ring) => ring.length >= 3)
    .map((ring) => ring.map(([longitude, latitude]) => ({ longitude, latitude })));
  if (!rings.length) return null;
  return { rings, bbox: bboxForPoints(rings.flat()) };
}

export async function loadPhysicalFeatures(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/physical-features.geojson`);
  if (!response.ok) throw new Error(`Natural Earth physical features failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as PhysicalFeaturesGeoJson;
  const features: LensFeature[] = geojson.features.flatMap((sourceFeature, index) => {
    const properties = sourceFeature.properties ?? {};
    if (!sourceFeature.geometry || !properties.NE_ID) return [];
    const polygonCoordinates = sourceFeature.geometry.type === "Polygon"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const polygons = polygonCoordinates.map(normalizePolygon).filter((polygon): polygon is GeographicAreaPolygon => Boolean(polygon));
    if (!polygons.length) return [];
    const bbox = bboxForPoints(polygons.flatMap((polygon) => polygon.rings.flat()));
    const name = properties.NAME?.trim() || `Physical region ${index + 1}`;
    const featureClass = properties.FEATURECLA === "Plateau" ? "Plateau" : "Range/mtn";
    return [{
      id: `physical-ne-${properties.NE_ID}`,
      lensId: physicalFeaturesDefinition.id,
      name,
      description: `${name} is a Natural Earth ${featureClass === "Plateau" ? "plateau" : "mountain-range"} region used to observe physical constraints.`,
      geometry: {
        type: "area",
        centroid: { longitude: (bbox.west + bbox.east) / 2, latitude: (bbox.south + bbox.north) / 2 },
        polygons,
        bbox,
      },
      provenance,
      attributes: {
        ...(properties.NAME_JA?.trim() ? { nameJa: properties.NAME_JA.trim() } : {}),
        featureClass,
        region: properties.REGION ?? "—",
        subregion: properties.SUBREGION ?? "—",
        scaleRank: properties.SCALERANK ?? 10,
        neId: properties.NE_ID,
        ...(properties.WIKIDATAID ? { wikidataId: properties.WIKIDATAID } : {}),
        approximateRegion: true,
      },
    } satisfies LensFeature];
  });
  return { lensId: physicalFeaturesDefinition.id, features };
}
