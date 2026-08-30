import type {
  DataProvenance,
  EarthLensDefinition,
  GeographicAreaPolygon,
  GeographicBoundingBox,
  GeographicPoint,
  LensDataset,
  LensFeature,
} from "../types";

const SOURCE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";

const provenance: DataProvenance = {
  source: "Natural Earth 1:50m Admin 0 – Countries",
  sourceUrl: SOURCE_URL,
  license: "Public Domain (Natural Earth terms of use)",
  updatedAt: "2026-08-30 retrieval snapshot",
  confidence: "high",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Simplified to 12% and reduced to 6 properties for web delivery. Boundaries follow Natural Earth's editorial choices and are not a statement of recognition.",
};

export const bordersDefinition: EarthLensDefinition = {
  id: "admin0-borders",
  name: "COUNTRY BORDERS",
  shortName: "Borders",
  category: "power",
  description: "Country outlines from a simplified Natural Earth 1:50m delivery snapshot.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "National boundary", color: "#d6d2b8", symbol: "line" }],
  disclosures: ["SIMPLIFIED GEOMETRY · 1:50m", "NATURAL EARTH · PUBLIC DOMAIN"],
};

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = PolygonCoordinates[];

interface CountriesGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Polygon"; coordinates: PolygonCoordinates } | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };
    properties: {
      NAME?: string;
      NAME_JA?: string;
      ISO_A3?: string;
      CONTINENT?: string;
      SUBREGION?: string;
      POP_EST?: number;
    };
  }>;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude + 180) % 360 + 360) % 360 - 180;
}

function bboxForPoints(points: GeographicPoint[]): GeographicBoundingBox {
  return points.reduce<GeographicBoundingBox>((bbox, point) => ({
    west: Math.min(bbox.west, point.longitude),
    south: Math.min(bbox.south, point.latitude),
    east: Math.max(bbox.east, point.longitude),
    north: Math.max(bbox.north, point.latitude),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

function mergeBboxes(bboxes: GeographicBoundingBox[]): GeographicBoundingBox {
  return bboxes.reduce<GeographicBoundingBox>((merged, bbox) => ({
    west: Math.min(merged.west, bbox.west),
    south: Math.min(merged.south, bbox.south),
    east: Math.max(merged.east, bbox.east),
    north: Math.max(merged.north, bbox.north),
  }), { west: 180, south: 90, east: -180, north: -90 });
}

function ringCentroid(ring: GeographicPoint[]): { point: GeographicPoint; area: number } {
  if (ring.length < 3) return { point: ring[0] ?? { latitude: 0, longitude: 0 }, area: 0 };
  const origin = ring[0]!.longitude;
  const unwrapped = ring.map((point) => {
    let longitude = point.longitude;
    while (longitude - origin > 180) longitude -= 360;
    while (longitude - origin < -180) longitude += 360;
    return { x: longitude, y: point.latitude };
  });
  let crossSum = 0;
  let longitudeSum = 0;
  let latitudeSum = 0;
  for (let index = 0; index < unwrapped.length - 1; index += 1) {
    const current = unwrapped[index]!;
    const next = unwrapped[index + 1]!;
    const cross = current.x * next.y - next.x * current.y;
    crossSum += cross;
    longitudeSum += (current.x + next.x) * cross;
    latitudeSum += (current.y + next.y) * cross;
  }
  if (Math.abs(crossSum) < 1e-9) {
    const bbox = bboxForPoints(ring);
    return { point: { longitude: (bbox.west + bbox.east) / 2, latitude: (bbox.south + bbox.north) / 2 }, area: 0 };
  }
  return {
    point: {
      longitude: normalizeLongitude(longitudeSum / (3 * crossSum)),
      latitude: latitudeSum / (3 * crossSum),
    },
    area: Math.abs(crossSum / 2),
  };
}

function normalizePolygon(coordinates: PolygonCoordinates): GeographicAreaPolygon {
  const rings = coordinates.map((ring) => ring.map(([longitude, latitude]) => ({ longitude, latitude })));
  return { rings, bbox: bboxForPoints(rings.flat()) };
}

function countryFeatureId(isoA3: string | undefined, index: number): string {
  const normalized = isoA3?.trim();
  return `country-${normalized && normalized !== "-99" ? normalized.toLowerCase() : index}`;
}

export async function loadBorders(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/admin0-countries.geojson`);
  if (!response.ok) throw new Error(`Country borders failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as CountriesGeoJson;
  const features: LensFeature[] = geojson.features.map((sourceFeature, index) => {
    const polygonCoordinates = sourceFeature.geometry.type === "Polygon"
      ? [sourceFeature.geometry.coordinates]
      : sourceFeature.geometry.coordinates;
    const polygons = polygonCoordinates.map(normalizePolygon);
    const centroid = polygons
      .map((polygon) => ringCentroid(polygon.rings[0] ?? []))
      .sort((a, b) => b.area - a.area)[0]?.point ?? { longitude: 0, latitude: 0 };
    const name = sourceFeature.properties.NAME?.trim() || sourceFeature.properties.ISO_A3 || `Country ${index + 1}`;
    const nameJa = sourceFeature.properties.NAME_JA?.trim();
    return {
      id: countryFeatureId(sourceFeature.properties.ISO_A3, index),
      lensId: bordersDefinition.id,
      name,
      description: "A simplified country outline from the Natural Earth 1:50m Admin 0 dataset.",
      geometry: { type: "area", centroid, polygons, bbox: mergeBboxes(polygons.map((polygon) => polygon.bbox)) },
      provenance,
      attributes: {
        ...(nameJa ? { nameJa } : {}),
        isoA3: sourceFeature.properties.ISO_A3 ?? "—",
        continent: sourceFeature.properties.CONTINENT ?? "—",
        subregion: sourceFeature.properties.SUBREGION ?? "—",
        populationEstimate: sourceFeature.properties.POP_EST ?? 0,
        geometryScale: "1:50m simplified to 12%",
      },
    };
  });
  return { lensId: bordersDefinition.id, features };
}
