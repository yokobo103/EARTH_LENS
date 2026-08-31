import type {
  DataProvenance,
  EarthLensDefinition,
  GeographicAreaPolygon,
  GeographicBoundingBox,
  GeographicPoint,
  LensDataset,
  LensFeature,
} from "../types";

const SOURCE_URL = "https://nsidc.org/data/g02135/versions/4";

const edgeProvenance: DataProvenance = {
  source: "NSIDC Sea Ice Index, Version 4 (G02135)", sourceUrl: SOURCE_URL,
  license: "Free and open use; Sea Ice Index citation required (NSIDC policy)",
  updatedAt: "1981–2010 median climatology · retrieved 2026-08-31", confidence: "high", dataKind: "real",
  classifications: ["real", "derived"],
  note: "Fetterer et al. (2025), Sea Ice Index v4, DOI 10.7265/a98x-0f50. March and September median extent polylines were densified in their native polar stereographic projections before conversion to WGS84. These lines are a 1981–2010 climatological reference, not the 2025 observed areas.",
};

const extentProvenance: DataProvenance = {
  source: "NSIDC Sea Ice Index, Version 4 (G02135)", sourceUrl: SOURCE_URL,
  license: "Free and open use; Sea Ice Index citation required (NSIDC policy)",
  updatedAt: "2025 monthly extent · retrieved 2026-08-31", confidence: "high", dataKind: "real",
  classifications: ["real", "derived"],
  note: "Official 2025 monthly extent polygons: Northern Hemisphere March/September and Southern Hemisphere September/March. Rings were densified in the source polar projection, then converted to WGS84 without changing source topology. NSIDC defines 2025 Northern Hemisphere extent as including the AMSR2 pole hole; the application fills no holes and adds no artificial polar closure. WHY HERE uses one nominal 25 km source cell as coastal tolerance so port points on land are classified against adjacent sea ice. Not current conditions or a navigation product.",
};

export const seaIceDefinition: EarthLensDefinition = {
  id: "sea-ice-edges", name: "SEA ICE", shortName: "Sea Ice", category: "earth",
  description: "Observed 2025 sea-ice areas reveal seasonal ocean constraints; unchanged 1981–2010 median edges provide a separate climatological comparison.",
  temporal: { mode: "present" }, provenance: extentProvenance, visibleByDefault: false,
  legend: [
    { label: "2025 year-round ice · N Sep / S Mar observed", color: "#dffaff", symbol: "area" },
    { label: "2025 winter-only ice · N Mar / S Sep observed", color: "#57a9d1", symbol: "area" },
    { label: "2025 outside winter extent · no fill", color: "#183241", symbol: "area" },
    { label: "1981–2010 median extent edges", color: "#f5d77f", symbol: "line" },
  ],
  disclosures: [
    "AREAS · 2025 OBSERVED EXTENT · N MAR/SEP + S SEP/MAR",
    "LINES · 1981–2010 MEDIAN EDGES",
    "NOT CURRENT CONDITIONS · NOT FOR NAVIGATION",
  ],
};

type Position = [number, number];
type PolygonCoordinates = Position[][];

interface SeaIceEdgesGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature"; id: "winter-median-edge" | "summer-median-edge";
    properties: { edge: "winter" | "summer"; northMonth: string; southMonth: string };
    geometry: { type: "MultiLineString"; coordinates: Position[][] };
  }>;
}

interface SeaIceExtentGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature"; id: "winter-observed-extent-2025" | "summer-observed-extent-2025";
    properties: { extent: "winter" | "summer"; observationYear: number; northMonth: string; southMonth: string };
    geometry: { type: "MultiPolygon"; coordinates: PolygonCoordinates[] };
  }>;
}

function bboxForPoints(points: GeographicPoint[]): GeographicBoundingBox {
  return points.reduce<GeographicBoundingBox>((bbox, point) => ({
    west: Math.min(bbox.west, point.longitude), south: Math.min(bbox.south, point.latitude),
    east: Math.max(bbox.east, point.longitude), north: Math.max(bbox.north, point.latitude),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

function mergeBboxes(bboxes: GeographicBoundingBox[]): GeographicBoundingBox {
  return bboxes.reduce<GeographicBoundingBox>((merged, bbox) => ({
    west: Math.min(merged.west, bbox.west), south: Math.min(merged.south, bbox.south),
    east: Math.max(merged.east, bbox.east), north: Math.max(merged.north, bbox.north),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

function normalizePolygon(coordinates: PolygonCoordinates): GeographicAreaPolygon {
  const rings = coordinates.map((ring) => ring.map(([longitude, latitude]) => ({ longitude, latitude })));
  return { rings, bbox: bboxForPoints(rings.flat()) };
}

async function loadEdges(): Promise<LensFeature[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/sea-ice-median-edges.geojson`);
  if (!response.ok) throw new Error(`Sea ice edges failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as SeaIceEdgesGeoJson;
  return geojson.features.map((sourceFeature): LensFeature => {
    const paths = sourceFeature.geometry.coordinates.map((path) => path.map(([longitude, latitude]) => ({ longitude, latitude })));
    const winter = sourceFeature.properties.edge === "winter";
    return {
      id: sourceFeature.id, lensId: seaIceDefinition.id,
      name: winter ? "WINTER MEDIAN ICE EDGE" : "SUMMER MEDIAN ICE EDGE",
      description: winter
        ? "The 1981–2010 median maximum seasonal edge: March in the north and September in the south."
        : "The 1981–2010 median minimum seasonal edge: September in the north and March in the south.",
      geometry: { type: "polyline", paths, bbox: bboxForPoints(paths.flat()) }, provenance: edgeProvenance,
      attributes: {
        type: "Median sea-ice extent edge", edgeSeason: sourceFeature.properties.edge,
        northernHemisphereMonth: sourceFeature.properties.northMonth,
        southernHemisphereMonth: sourceFeature.properties.southMonth,
        climatology: "1981–2010", sourceResolution: "25 km",
      },
    };
  });
}

async function loadExtentAreas(): Promise<LensFeature[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/sea-ice-extent-2025.geojson`);
  if (!response.ok) throw new Error(`Sea ice extent failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as SeaIceExtentGeoJson;
  return geojson.features.map((sourceFeature): LensFeature => {
    const polygons = sourceFeature.geometry.coordinates.map(normalizePolygon);
    const winter = sourceFeature.properties.extent === "winter";
    return {
      id: sourceFeature.id, lensId: seaIceDefinition.id,
      name: winter ? "2025 WINTER OBSERVED ICE EXTENT" : "2025 SUMMER OBSERVED ICE EXTENT",
      description: winter
        ? "Where monthly mean sea-ice concentration reached at least 15% in the 2025 winter snapshot: March north, September south."
        : "Where monthly mean sea-ice concentration reached at least 15% in the 2025 summer snapshot: September north, March south.",
      geometry: {
        type: "area", centroid: { longitude: 0, latitude: winter ? 86 : 88 }, polygons,
        bbox: mergeBboxes(polygons.map((polygon) => polygon.bbox)),
      },
      provenance: extentProvenance,
      attributes: {
        type: "Observed monthly sea-ice extent", extentSeason: sourceFeature.properties.extent,
        observationYear: sourceFeature.properties.observationYear,
        northernHemisphereMonth: sourceFeature.properties.northMonth,
        southernHemisphereMonth: sourceFeature.properties.southMonth,
        sourceResolution: "25 km", containmentEvidence: true, containmentToleranceKm: 25,
      },
    };
  });
}

export async function loadSeaIceEdges(): Promise<LensDataset> {
  const [areas, edges] = await Promise.all([loadExtentAreas(), loadEdges()]);
  return { lensId: seaIceDefinition.id, features: [...areas, ...edges] };
}
