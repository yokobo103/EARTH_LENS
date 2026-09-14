import { passportCatalog } from "./passportCatalog";
import type { MissionPassportDefinition } from "./passportTypes";

export const passportRegistry: readonly MissionPassportDefinition[] = passportCatalog;

export function getPassport(id: string): MissionPassportDefinition | undefined {
  return passportRegistry.find((passport) => passport.id === id);
}

export function getDefaultPassport(): MissionPassportDefinition {
  return passportRegistry[0]!;
}
