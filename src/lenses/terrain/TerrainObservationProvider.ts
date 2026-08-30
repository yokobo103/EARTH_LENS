import type { Viewer } from "cesium";

export interface TerrainObservationHandle {
  setEnabled(enabled: boolean): void;
  reapplyAppearance(): void;
  destroy(): void;
}

export interface TerrainObservationProvider {
  readonly id: string;
  readonly representation: "visual-relief" | "elevation-geometry";
  bind(viewer: Viewer): TerrainObservationHandle;
}
