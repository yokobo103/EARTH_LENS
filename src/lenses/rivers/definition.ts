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
  urlCode: "rv",
  name: "RIVERS",
  shortName: "Rivers",
  category: "earth",
  description: "Lines of water joining inland to sea. People and boundaries both tend to follow them.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "River", color: "#63c8d9", symbol: "line" }],
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

interface PreparedRiver {
  index: number;
  name: string;
  sourceName: string;
  scaleRank: number;
  featureClass: string;
  paths: GeographicPoint[][];
}

const ENDPOINT_PRECISION = 3;

function endpointKey(name: string, point: GeographicPoint): string {
  return `${name}|${point.longitude.toFixed(ENDPOINT_PRECISION)},${point.latitude.toFixed(ENDPOINT_PRECISION)}`;
}

/**
 * Natural Earth ranks each segment on its own, so one river can change rank
 * partway along: the Mississippi is rank 1 below St. Louis and rank 5 above it.
 * Drawing by raw rank would end the river in the middle of a continent.
 *
 * Segments that carry the same name and actually touch end to end are one
 * river, so they are given the strongest rank in the chain. Sharing a name is
 * not enough on its own -- there are unrelated Rio Negros and Rio Grandes on
 * different continents -- which is why the endpoints have to meet.
 *
 * This lifts 16 of 1,454 segments across 9 rivers. No list of river names is
 * involved, so new Natural Earth data is handled the same way.
 */
function assignDisplayRanks(rivers: PreparedRiver[]): Map<number, number> {
  const parent = new Map<number, number>();
  const find = (node: number): number => {
    let current = node;
    while (parent.get(current) !== current) {
      const next = parent.get(current) ?? current;
      parent.set(current, parent.get(next) ?? next);
      current = parent.get(current) ?? current;
    }
    return current;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };

  for (const river of rivers) parent.set(river.index, river.index);

  const byEndpoint = new Map<string, number>();
  for (const river of rivers) {
    if (!river.sourceName) continue;
    for (const path of river.paths) {
      const first = path[0];
      const last = path[path.length - 1];
      if (!first || !last) continue;
      for (const point of [first, last]) {
        const key = endpointKey(river.sourceName, point);
        const seen = byEndpoint.get(key);
        if (seen === undefined) byEndpoint.set(key, river.index);
        else union(seen, river.index);
      }
    }
  }

  const strongest = new Map<number, number>();
  for (const river of rivers) {
    const root = find(river.index);
    strongest.set(root, Math.min(strongest.get(root) ?? river.scaleRank, river.scaleRank));
  }

  const displayRanks = new Map<number, number>();
  for (const river of rivers) displayRanks.set(river.index, strongest.get(find(river.index)) ?? river.scaleRank);
  return displayRanks;
}

export async function loadRivers(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/rivers.geojson`);
  if (!response.ok) throw new Error(`Natural Earth rivers failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as RiversGeoJson;

  const prepared: PreparedRiver[] = [];
  for (const [index, sourceFeature] of geojson.features.entries()) {
    if (!sourceFeature.geometry) continue;
    const rawPaths = sourceFeature.geometry.type === "LineString"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const paths = rawPaths
      .filter((path) => path.length >= 2)
      .map((path) => path.map(([longitude, latitude]) => ({ longitude, latitude })));
    if (paths.length === 0) continue;
    const sourceName = sourceFeature.properties?.name?.trim() ?? "";
    prepared.push({
      index,
      sourceName,
      name: sourceName || `River network ${index + 1}`,
      scaleRank: sourceFeature.properties?.scalerank ?? 10,
      featureClass: sourceFeature.properties?.featurecla ?? "River",
      paths,
    });
  }

  const displayRanks = assignDisplayRanks(prepared);

  const features: LensFeature[] = prepared.map((river) => ({
    id: `river-ne-${river.index}`,
    lensId: riversDefinition.id,
    name: river.name,
    description: "A line carrying water and people from inland out to the sea.",
    geometry: { type: "polyline", paths: river.paths, bbox: bboxForPoints(river.paths.flat()) },
    provenance,
    attributes: {
      featureClass: river.featureClass,
      scaleRank: river.scaleRank,
      displayRank: displayRanks.get(river.index) ?? river.scaleRank,
      approximateGeometry: true,
    },
  }));
  return { lensId: riversDefinition.id, features };
}
