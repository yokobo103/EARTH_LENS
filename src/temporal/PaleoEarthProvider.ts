import type { PaleoEarthSnapshot } from "./types";

export interface PaleoEarthProvider {
  getSnapshot(ageMa: number): Promise<PaleoEarthSnapshot>;
}
