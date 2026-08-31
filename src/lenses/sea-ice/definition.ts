import type { DataProvenance, EarthLensDefinition, GeographicBoundingBox, GeographicPoint, LensDataset, LensFeature } from "../types";

const SOURCE_URL = "https://nsidc.org/data/g02135/versions/4";

const provenance: DataProvenance = {
  source: "NSIDC Sea Ice Index, Version 4 (G02135)",
  sourceUrl: SOURCE_URL,
  license: "Free and open use; Sea Ice Index citation required (NSIDC policy)",
  updatedAt: "1981–2010 median climatology · retrieved 2026-08-31",
  confidence: "high",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Fetterer et al. (2025), Sea Ice Index v4, DOI 10.7265/a98x-0f50. March and September median extent polylines were densified in their native polar stereographic projections before conversion to WGS84. This is a climatological reference, not current ice conditions or a navigation product.",
};

export const seaIceDefinition: EarthLensDefinition = {
  id: "sea-ice-edges",
  name: "SEA ICE",
  shortName: "Sea Ice",
  category: "earth",
  description: "Median winter and summer sea-ice edges reveal where seasonal freezing constrains access to the ocean.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [
    { label: "Year-round ice · inside summer edge", color: "#e9fbff", symbol: "area" },
    { label: "Winter ice · between median edges", color: "#78bfe8", symbol: "area" },
    { label: "Typically ice-free · outside winter edge", color: "#244c60", symbol: "area" },
  ],
  disclosures: ["REAL DATA · 1981–2010 MEDIAN", "EDGE CLIMATOLOGY · NOT CURRENT CONDITIONS", "NORTH + SOUTH HEMISPHERES"],
};

type Position = [number, number];

interface SeaIceGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: "winter-median-edge" | "summer-median-edge";
    properties: { edge: "winter" | "summer"; northMonth: string; southMonth: string };
    geometry: { type: "MultiLineString"; coordinates: Position[][] };
  }>;
}

function bboxForPaths(paths: GeographicPoint[][]): GeographicBoundingBox {
  return paths.flat().reduce<GeographicBoundingBox>((bbox, point) => ({
    west: Math.min(bbox.west, point.longitude),
    south: Math.min(bbox.south, point.latitude),
    east: Math.max(bbox.east, point.longitude),
    north: Math.max(bbox.north, point.latitude),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

export async function loadSeaIceEdges(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/sea-ice-median-edges.geojson`);
  if (!response.ok) throw new Error(`Sea ice edges failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as SeaIceGeoJson;
  const features = geojson.features.map((sourceFeature): LensFeature => {
    const paths = sourceFeature.geometry.coordinates.map((path) => path.map(([longitude, latitude]) => ({ longitude, latitude })));
    const winter = sourceFeature.properties.edge === "winter";
    return {
      id: sourceFeature.id,
      lensId: seaIceDefinition.id,
      name: winter ? "WINTER MEDIAN ICE EDGE" : "SUMMER MEDIAN ICE EDGE",
      description: winter
        ? "The typical maximum seasonal ice edge: March in the north and September in the south."
        : "The typical minimum seasonal ice edge: September in the north and March in the south.",
      geometry: { type: "polyline", paths, bbox: bboxForPaths(paths) },
      provenance,
      attributes: {
        type: "Median sea-ice extent edge",
        edgeSeason: sourceFeature.properties.edge,
        northernHemisphereMonth: sourceFeature.properties.northMonth,
        southernHemisphereMonth: sourceFeature.properties.southMonth,
        climatology: "1981–2010",
        sourceResolution: "25 km",
      },
    };
  });
  return { lensId: seaIceDefinition.id, features };
}
