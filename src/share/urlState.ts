import type { AppMode } from "../app/types";
import type { Locale } from "../i18n/types";
import { lensRegistry } from "../lenses/registry";
import type { GeographicPoint } from "../lenses/types";
import type { TemporalSelection } from "../temporal/types";

export interface SharedCameraState {
  longitude: number;
  latitude: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
}

export interface SharedFeatureState {
  lensId: string;
  featureId: string;
}

export interface SharedViewState {
  camera: SharedCameraState | null;
  lensIds: string[] | null;
  location: GeographicPoint | null;
  feature: SharedFeatureState | null;
  mode: AppMode | null;
  locale: Locale | null;
  temporal: TemporalSelection | null;
}

const emptyState: SharedViewState = { camera: null, lensIds: null, location: null, feature: null, mode: null, locale: null, temporal: null };
const DEFAULT_HEADING = 0;
const DEFAULT_PITCH = -Math.PI / 2;
const DEFAULT_ROLL = 0;
const lensIdByUrlCode = new Map(lensRegistry.map((lens) => [lens.definition.urlCode, lens.definition.id]));
const knownLensIds = new Set(lensRegistry.map((lens) => lens.definition.id));

export function readSharedViewState(search = window.location.search): SharedViewState {
  try {
    const params = new URLSearchParams(search);
    if (params.get("v") !== "1") return emptyState;
    return {
      camera: parseCamera(params.get("c")),
      lensIds: parseLensIds(params.get("l")),
      location: parsePoint(params.get("p")),
      feature: parseFeature(params.get("f")),
      mode: parseMode(params.get("m")),
      // Kept for backwards compatibility. New share URLs deliberately omit lang.
      locale: params.get("lang") === "ja" ? "ja" : params.get("lang") === "en" ? "en" : null,
      temporal: parseTemporal(params.get("t")),
    };
  } catch {
    return emptyState;
  }
}

/** Write a compact share URL only when the user explicitly presses Share. */
export function writeSharedViewState(state: SharedViewState): string {
  const pairs: string[] = ["v=1"];
  if (state.camera) pairs.push(`c=${formatCamera(state.camera)}`);
  if (state.lensIds?.length) {
    const codes = state.lensIds
      .map((id) => lensRegistry.find((lens) => lens.definition.id === id)?.definition.urlCode)
      .filter((code): code is string => Boolean(code));
    if (codes.length) pairs.push(`l=${encodeCsv(codes)}`);
  }
  if (state.location) pairs.push(`p=${encodeCsv([round(state.location.longitude), round(state.location.latitude)])}`);
  if (state.feature) pairs.push(`f=${encodeURIComponent(state.feature.lensId)}:${encodeURIComponent(state.feature.featureId)}`);
  if (state.mode === "mission") pairs.push("m=m");
  if (state.temporal?.mode === "deep-time") pairs.push(`t=${state.temporal.ageMa}`);
  const url = `${window.location.pathname}?${pairs.join("&")}${window.location.hash}`;
  window.history.replaceState(null, "", url);
  return window.location.href;
}

function formatCamera(camera: SharedCameraState): string {
  const fields = [round(camera.longitude), round(camera.latitude), String(Math.max(1, Math.round(camera.height / 1_000)))];
  const orientation = [camera.heading, camera.pitch, camera.roll];
  const defaults = [DEFAULT_HEADING, DEFAULT_PITCH, DEFAULT_ROLL];
  let end = orientation.length;
  while (end > 0 && nearlyEqual(orientation[end - 1] ?? 0, defaults[end - 1] ?? 0)) end -= 1;
  fields.push(...orientation.slice(0, end).map(round));
  return fields.join(",");
}

function parseCamera(value: string | null): SharedCameraState | null {
  if (!value) return null;
  const values = value.split(",").map(Number);
  if (values.length < 3 || values.length > 6 || values.some((number) => !Number.isFinite(number))) return null;
  const longitude = values[0];
  const latitude = values[1];
  const encodedHeight = values[2];
  if (longitude === undefined || latitude === undefined || encodedHeight === undefined) return null;
  const height = encodedHeight < 100_000 ? encodedHeight * 1_000 : encodedHeight;
  if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90 || height < 10_000 || height > 100_000_000) return null;
  return {
    longitude,
    latitude,
    height,
    heading: values[3] ?? DEFAULT_HEADING,
    pitch: values[4] ?? DEFAULT_PITCH,
    roll: values[5] ?? DEFAULT_ROLL,
  };
}

function parsePoint(value: string | null): GeographicPoint | null {
  if (!value) return null;
  const [longitudeValue, latitudeValue] = value.split(",");
  const longitude = Number(longitudeValue);
  const latitude = Number(latitudeValue);
  return Number.isFinite(longitude) && Number.isFinite(latitude) && Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90 ? { longitude, latitude } : null;
}

function parseFeature(value: string | null): SharedFeatureState | null {
  if (!value) return null;
  const separator = value.indexOf(":");
  if (separator < 1) return null;
  try {
    const lensId = decodeURIComponent(value.slice(0, separator));
    const featureId = decodeURIComponent(value.slice(separator + 1));
    return lensId && featureId ? { lensId, featureId } : null;
  } catch {
    return null;
  }
}

function parseLensIds(value: string | null): string[] | null {
  if (!value) return null;
  const ids = value.split(",").flatMap((token) => {
    try {
      const decoded = decodeURIComponent(token.trim());
      const legacyId = knownLensIds.has(decoded) ? decoded : undefined;
      const shortId = lensIdByUrlCode.get(decoded);
      const resolved = legacyId ?? shortId;
      return resolved ? [resolved] : [];
    } catch {
      return [];
    }
  });
  // A present-but-unknown lens list intentionally resolves to an empty list;
  // this keeps the shared view visibly incomplete instead of silently falling
  // back to the default lens set.
  return [...new Set(ids)];
}

function parseMode(value: string | null): AppMode | null {
  return value === "m" ? "mission" : value === "e" ? "explore" : null;
}

function parseTemporal(value: string | null): TemporalSelection | null {
  if (value === "p" || value === "0") return { mode: "present", ageMa: 0 };
  const ageMa = Number(value);
  return Number.isInteger(ageMa) && ageMa >= 0 && ageMa <= 1000 ? { mode: "deep-time", ageMa } : null;
}

function encodeCsv(values: string[]): string {
  return values.map((value) => encodeURIComponent(value)).join(",");
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

function round(value: number): string {
  return Number(value.toFixed(3)).toString();
}
