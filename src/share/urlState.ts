import type { AppMode } from "../app/types";
import type { Locale } from "../i18n/types";
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
      locale: params.get("lang") === "ja" ? "ja" : params.get("lang") === "en" ? "en" : null,
      temporal: params.get("t") === "250" ? { mode: "deep-time", ageMa: 250 } : params.get("t") === "p" ? { mode: "present", ageMa: 0 } : null,
    };
  } catch {
    return emptyState;
  }
}

export function writeSharedViewState(state: SharedViewState): void {
  const params = new URLSearchParams();
  params.set("v", "1");
  if (state.camera) params.set("c", [state.camera.longitude, state.camera.latitude, state.camera.height, state.camera.heading, state.camera.pitch, state.camera.roll].map((value) => round(value)).join(","));
  if (state.lensIds?.length) params.set("l", state.lensIds.join(","));
  if (state.location) params.set("p", `${round(state.location.longitude)},${round(state.location.latitude)}`);
  if (state.feature) params.set("f", `${encodeURIComponent(state.feature.lensId)}:${encodeURIComponent(state.feature.featureId)}`);
  if (state.mode) params.set("m", state.mode === "mission" ? "m" : "e");
  if (state.locale) params.set("lang", state.locale);
  if (state.temporal) params.set("t", state.temporal.mode === "deep-time" ? "250" : "p");
  const url = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);
}

function parseCamera(value: string | null): SharedCameraState | null {
  if (!value) return null;
  const values = value.split(",").map(Number);
  if (values.length !== 6 || values.some((number) => !Number.isFinite(number))) return null;
  const longitude = values[0];
  const latitude = values[1];
  const height = values[2];
  const heading = values[3];
  const pitch = values[4];
  const roll = values[5];
  if (longitude === undefined || latitude === undefined || height === undefined || heading === undefined || pitch === undefined || roll === undefined) return null;
  if (Math.abs(longitude) > 180 || Math.abs(latitude) > 90 || height < 10_000 || height > 100_000_000) return null;
  return { longitude, latitude, height, heading, pitch, roll };
}

function parsePoint(value: string | null): GeographicPoint | null {
  if (!value) return null;
  const longitude = Number(value.split(",")[0]);
  const latitude = Number(value.split(",")[1]);
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
  return value.split(",").map((id) => id.trim()).filter(Boolean);
}

function parseMode(value: string | null): AppMode | null {
  return value === "m" ? "mission" : value === "e" ? "explore" : null;
}

function round(value: number): string {
  return Number(value.toFixed(3)).toString();
}
