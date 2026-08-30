import type { Viewer } from "cesium";
import type { MissionOverlayHandle } from "../overlays/types";
import type { MissionHintEffect } from "../types";
import { renderRegionalSignal } from "./renderRegionalSignal";

export function renderMissionEffects(viewer: Viewer, effects: MissionHintEffect[]): MissionOverlayHandle[] {
  return effects.flatMap((effect) => {
    if (effect.type === "region-signal" || effect.type === "feature-signal") return [renderRegionalSignal(viewer, effect)];
    return [];
  });
}
