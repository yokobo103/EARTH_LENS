import { missionCatalog } from "./catalog";
import { missionCatalogVol2 } from "./catalogVol2";
import type { EarthMission } from "./types";

export const missionRegistry = [...missionCatalog, ...missionCatalogVol2] as const;

export function getMission(id: string): EarthMission | undefined {
  return missionRegistry.find((mission) => mission.id === id);
}

export function getDefaultMission(): EarthMission {
  return missionRegistry[0]!;
}
