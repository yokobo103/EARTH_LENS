import { loadAllLensDatasets } from "../lenses/dataStore";
import { lensRegistry } from "../lenses/registry";
import type { GeographicAreaPolygon, GeographicBoundingBox, GeographicPoint, LensFeature } from "../lenses/types";
import type { WhyHereNearbyFeature, WhyHereResult } from "./types";

const EARTH_RADIUS_KM = 6_371;

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function normalizedLongitudeDelta(longitude: number, reference: number): number {
  return ((longitude - reference + 540) % 360) - 180;
}

function bboxCouldBeWithinRadius(location: GeographicPoint, bbox: GeographicBoundingBox, radiusKm: number): boolean {
  const latitudeMargin = radiusKm / 110.574;
  if (location.latitude < bbox.south - latitudeMargin || location.latitude > bbox.north + latitudeMargin) return false;
  if (bbox.east - bbox.west >= 300) return true;
  const longitudeMargin = radiusKm / (111.32 * Math.max(0.1, Math.cos(toRadians(location.latitude))));
  if (location.longitude >= bbox.west - longitudeMargin && location.longitude <= bbox.east + longitudeMargin) return true;
  return Math.min(
    Math.abs(normalizedLongitudeDelta(bbox.west, location.longitude)),
    Math.abs(normalizedLongitudeDelta(bbox.east, location.longitude)),
  ) <= longitudeMargin;
}

function pointInRing(location: GeographicPoint, ring: GeographicPoint[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let currentIndex = 0, previousIndex = ring.length - 1; currentIndex < ring.length; previousIndex = currentIndex, currentIndex += 1) {
    const current = ring[currentIndex]!;
    const previous = ring[previousIndex]!;
    const currentX = normalizedLongitudeDelta(current.longitude, location.longitude);
    const previousX = normalizedLongitudeDelta(previous.longitude, location.longitude);
    const intersects = ((current.latitude > location.latitude) !== (previous.latitude > location.latitude))
      && (0 < (previousX - currentX) * (location.latitude - current.latitude) / (previous.latitude - current.latitude) + currentX);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(location: GeographicPoint, polygon: GeographicAreaPolygon): boolean {
  const outerRing = polygon.rings[0];
  if (!outerRing || !pointInRing(location, outerRing)) return false;
  return !polygon.rings.slice(1).some((hole) => pointInRing(location, hole));
}

function distanceToSegmentKm(location: GeographicPoint, start: GeographicPoint, end: GeographicPoint): number {
  const latitudeScale = Math.PI * EARTH_RADIUS_KM / 180;
  const longitudeScale = latitudeScale * Math.max(0.01, Math.cos(toRadians(location.latitude)));
  const startLongitudeDelta = normalizedLongitudeDelta(start.longitude, location.longitude);
  const ax = startLongitudeDelta * longitudeScale;
  const ay = (start.latitude - location.latitude) * latitudeScale;
  const bx = (startLongitudeDelta + normalizedLongitudeDelta(end.longitude, start.longitude)) * longitudeScale;
  const by = (end.latitude - location.latitude) * latitudeScale;
  const segmentX = bx - ax;
  const segmentY = by - ay;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * segmentX + ay * segmentY) / lengthSquared));
  return Math.hypot(ax + projection * segmentX, ay + projection * segmentY);
}

function distanceToPolygonEdgesKm(location: GeographicPoint, polygon: GeographicAreaPolygon): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const ring of polygon.rings) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      nearest = Math.min(nearest, distanceToSegmentKm(location, ring[index]!, ring[index + 1]!));
    }
  }
  return nearest;
}

function distanceToPathsKm(location: GeographicPoint, paths: GeographicPoint[][]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const path of paths) {
    for (let index = 0; index < path.length - 1; index += 1) {
      nearest = Math.min(nearest, distanceToSegmentKm(location, path[index]!, path[index + 1]!));
    }
  }
  return nearest;
}

export function haversineDistanceKm(a: GeographicPoint, b: GeographicPoint): number {
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(value));
}

function measureFeature(location: GeographicPoint, feature: LensFeature, radiusKm: number): { distanceKm: number; relation: WhyHereNearbyFeature["relation"]; relationLabel?: string } {
  if (feature.geometry.type === "point") {
    return { distanceKm: haversineDistanceKm(location, feature.geometry.coordinates), relation: "near-point" };
  }
  if (feature.geometry.type === "connection") {
    const distances = feature.geometry.endpoints.map((endpoint) => ({
      endpoint,
      distanceKm: haversineDistanceKm(location, endpoint),
    })).sort((a, b) => a.distanceKm - b.distanceKm);
    const nearest = distances[0];
    return {
      distanceKm: nearest?.distanceKm ?? Number.POSITIVE_INFINITY,
      relation: "associated-endpoint",
      relationLabel: nearest ? `Associated endpoint: ${nearest.endpoint.name}` : undefined,
    };
  }
  if (feature.geometry.type === "polyline") {
    if (!bboxCouldBeWithinRadius(location, feature.geometry.bbox, radiusKm)) {
      return { distanceKm: Number.POSITIVE_INFINITY, relation: "near-line" };
    }
    return { distanceKm: distanceToPathsKm(location, feature.geometry.paths), relation: "near-line" };
  }
  if (!bboxCouldBeWithinRadius(location, feature.geometry.bbox, radiusKm)) {
    return { distanceKm: Number.POSITIVE_INFINITY, relation: "near-area" };
  }
  const relevantPolygons = feature.geometry.polygons.filter((polygon) => bboxCouldBeWithinRadius(location, polygon.bbox, radiusKm));
  if (relevantPolygons.some((polygon) => pointInPolygon(location, polygon))) {
    return { distanceKm: 0, relation: "inside-area", relationLabel: "Inside area" };
  }
  return {
    distanceKm: Math.min(...relevantPolygons.map((polygon) => distanceToPolygonEdgesKm(location, polygon))),
    relation: "near-area",
  };
}

export async function analyzeLocation(location: GeographicPoint, radiusKm = 500): Promise<WhyHereResult> {
  const datasets = await loadAllLensDatasets();
  const datasetById = new Map(datasets.map((dataset) => [dataset.lensId, dataset]));
  const lensResults = lensRegistry.map((lens) => {
    const nearby = (datasetById.get(lens.definition.id)?.features ?? [])
      .map((feature) => ({ feature, measurement: measureFeature(location, feature, radiusKm) }))
      .filter(({ measurement }) => measurement.distanceKm <= radiusKm)
      .sort((a, b) => a.measurement.distanceKm - b.measurement.distanceKm)
      .map(({ feature, measurement }): WhyHereNearbyFeature => ({
        featureId: feature.id,
        name: feature.name,
        nameJa: typeof feature.attributes.nameJa === "string" ? feature.attributes.nameJa : undefined,
        lensId: feature.lensId,
        lensName: lens.definition.name,
        distanceKm: Math.round(measurement.distanceKm),
        relationship: measurement.relation === "associated-endpoint" ? "connected" : measurement.relation === "near-line" || measurement.relation === "near-area" || measurement.relation === "inside-area" ? "overlap" : "nearby",
        relation: measurement.relation,
        relationLabel: measurement.relationLabel,
      }));
    return {
      lensId: lens.definition.id,
      lensName: lens.definition.name,
      nearbyCount: nearby.length,
      features: nearby,
    };
  });
  return { location, radiusKm, lensResults, evidenceOnly: true };
}
