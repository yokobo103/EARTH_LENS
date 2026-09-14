import type { GeographicPoint } from "../lenses/types";

export function formatAnchorCoordinates(point: GeographicPoint): string {
  const latitude = `${Math.abs(point.latitude).toFixed(3)}°${point.latitude >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(point.longitude).toFixed(3)}°${point.longitude >= 0 ? "E" : "W"}`;
  return `${latitude} / ${longitude}`;
}
