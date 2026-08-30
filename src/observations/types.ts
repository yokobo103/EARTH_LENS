export type ObservationRelationship = "nearby" | "overlap" | "connected" | "corridor" | "barrier";

export interface ObservationEvidence {
  lensId: string;
  featureId: string;
  distanceKm?: number;
  relationship?: ObservationRelationship;
}

