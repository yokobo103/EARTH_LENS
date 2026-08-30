import type { Viewer } from "cesium";

export interface MissionOverlayHandle {
  destroy(): void;
}

export interface MissionOverlayModule {
  id: string;
  name: string;
  render(viewer: Viewer): MissionOverlayHandle;
}
