import type { Viewer } from "cesium";
import type { LensDataset, LensRenderHandle } from "../types";
import { NaturalEarthReliefProvider } from "./NaturalEarthReliefProvider";

export function renderTerrainRelief(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  void dataset;
  const providerHandle = new NaturalEarthReliefProvider().bind(viewer);
  return {
    setVisible(visible) { providerHandle.setEnabled(visible); },
    reapplyAppearance() { providerHandle.reapplyAppearance(); },
    getFeatureForPick() { return undefined; },
    destroy() { providerHandle.destroy(); },
  };
}
