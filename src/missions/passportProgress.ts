import type { MissionProgress } from "./types";
import type { MissionPassportDefinition } from "./passportTypes";

export function getPassportMissionIds(passport: MissionPassportDefinition): string[] {
  return passport.sections.flatMap((section) => section.missionIds);
}

export function isPassportComplete(passport: MissionPassportDefinition, progress: Record<string, MissionProgress>): boolean {
  const missionIds = getPassportMissionIds(passport);
  return missionIds.length > 0 && missionIds.every((missionId) => progress[missionId]?.completed === true);
}

export function getCompletedPassportIds(passports: readonly MissionPassportDefinition[], progress: Record<string, MissionProgress>): string[] {
  return passports.filter((passport) => isPassportComplete(passport, progress)).map((passport) => passport.id);
}
