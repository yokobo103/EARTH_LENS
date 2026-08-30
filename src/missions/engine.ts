import { haversineDistanceKm } from "../why-here/analyzeLocation";
import type { LensFeature } from "../lenses/types";
import type { EarthMission, MissionHintEffect, MissionRank, MissionState } from "./types";

export function createMissionState(mission: EarthMission): MissionState {
  return { currentMissionId: mission.id, status: "active", revealedHintIds: [], selectedLocation: null, attempts: [], rank: null };
}

export function selectMissionLocation(state: MissionState, location: { latitude: number; longitude: number }): MissionState {
  if (state.status === "completed") return state;
  return { ...state, selectedLocation: location };
}

export function selectMissionFeature(state: MissionState, feature: LensFeature): MissionState {
  if (state.status === "completed") return state;
  const location = feature.geometry.type === "point"
    ? feature.geometry.coordinates
    : feature.geometry.type === "area"
      ? feature.geometry.centroid
      : feature.geometry.endpoints[0];
  return location ? selectMissionLocation(state, location) : state;
}

export function revealNextHint(state: MissionState, mission: EarthMission): MissionState {
  if (state.status === "completed") return state;
  const nextHint = mission.hints[state.revealedHintIds.length];
  if (!nextHint) return state;
  return { ...state, revealedHintIds: [...state.revealedHintIds, nextHint.id] };
}

export function getActiveMissionEffects(revealedHintIds: string[], mission: EarthMission): MissionHintEffect[] {
  return mission.hints.filter((hint) => revealedHintIds.includes(hint.id)).flatMap((hint) => hint.effect ? [hint.effect] : []);
}

export function rankForHintCount(hintCount: number): MissionRank {
  if (hintCount === 0) return "S";
  if (hintCount === 1) return "A";
  if (hintCount === 2) return "B";
  return "C";
}

export function submitMissionLocation(state: MissionState, mission: EarthMission): MissionState {
  if (state.status === "completed" || !state.selectedLocation) return state;
  const distanceKm = Math.round(haversineDistanceKm(state.selectedLocation, mission.target));
  const matched = distanceKm <= mission.target.successRadiusKm;
  const attempt = { number: state.attempts.length + 1, location: state.selectedLocation, distanceKm, matched };
  return {
    ...state,
    attempts: [...state.attempts, attempt],
    status: matched ? "completed" : "active",
    rank: matched ? rankForHintCount(state.revealedHintIds.length) : null,
  };
}
