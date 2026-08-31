import type { GeographicPoint } from "../lenses/types";
import type { ObservationEvidence } from "../observations/types";

export interface WhyHereNearbyFeature extends ObservationEvidence {
  name: string;
  lensName: string;
  distanceKm: number;
  nameJa?: string;
  relationship: "nearby" | "overlap" | "connected";
  relation: "near-point" | "associated-endpoint" | "near-line" | "near-area" | "inside-area" | "outside-area";
  relationLabel?: string;
}

export interface WhyHereLensResult {
  lensId: string;
  lensName: string;
  nearbyCount: number;
  features: WhyHereNearbyFeature[];
}

export interface WhyHereResult {
  location: GeographicPoint;
  radiusKm: number;
  lensResults: WhyHereLensResult[];
  /** Closest named evidence point, retained even when it falls outside the scan radius. */
  closestNamedFeature?: WhyHereNearbyFeature | null;
  evidenceOnly: true;
}
