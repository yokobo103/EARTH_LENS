import { missionCatalog } from "./catalog";
import type { EarthMission } from "./types";

export const missionRegistry = missionCatalog;

export function getMission(id: string): EarthMission | undefined {
  return missionRegistry.find((mission) => mission.id === id);
}

export function getDefaultMission(): EarthMission {
  return missionRegistry[0]!;
}
