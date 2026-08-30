import { shippingActivityOverlay } from "./shippingActivityOverlay";
import type { MissionOverlayModule } from "./types";

export const missionOverlayRegistry = [shippingActivityOverlay] as const satisfies readonly MissionOverlayModule[];

export function getMissionOverlay(id: string): MissionOverlayModule | undefined {
  return missionOverlayRegistry.find((overlay) => overlay.id === id);
}
