import { lensRegistry } from "./registry";
import type { LensDataset, LensModule } from "./types";

const datasetCache = new Map<string, Promise<LensDataset>>();

export function loadLensDataset(lens: LensModule): Promise<LensDataset> {
  const existing = datasetCache.get(lens.definition.id);
  if (existing) return existing;
  const pending = lens.load();
  datasetCache.set(lens.definition.id, pending);
  return pending;
}

export async function loadAllLensDatasets(): Promise<LensDataset[]> {
  return Promise.all(lensRegistry.map(loadLensDataset));
}
