import type { GeographicPoint } from "../lenses/types";
import type { ObservationRelationship } from "../observations/types";

export type MissionType = "find" | "barrier" | "gateway" | "intersection" | "route" | "bottleneck" | "hub" | "resource" | "terrain" | "alternative" | "shortcut";
export type MissionRegion = "asia" | "middle-east" | "europe" | "africa" | "south-america" | "oceania";
export type MissionStickerShape = "oval" | "shield" | "rectangle" | "circle" | "arch" | "custom";
export type MissionStickerIcon = "strait" | "mountain" | "tanker" | "canal" | "port" | "rock" | "salt-flat" | "rift";

export interface MissionSticker {
  id: string;
  missionId: string;
  title: string;
  region: string;
  image?: string;
  shape: MissionStickerShape;
  icon: MissionStickerIcon;
  description: string;
  coordinateLabel?: string;
}

export type MissionHintEffect =
  | { type: "region-signal"; location: GeographicPoint; radiusKm: number; label: string }
  | { type: "feature-signal"; location: GeographicPoint; radiusKm: number; label: string }
  | { type: "camera-focus"; location: GeographicPoint; altitude: number; label: string };

export interface MissionCompletionEvidence {
  lensId: string;
  featureId: string;
  relationship: ObservationRelationship;
  title: string;
  text: string;
}

export interface MissionHint {
  id: string;
  number: number;
  title: string;
  text: string;
  effect?: MissionHintEffect;
}

export interface MissionTranslation {
  title: string;
  prompt: string;
  targetName: string;
  sticker: Pick<MissionSticker, "title" | "region" | "description">;
  hints: Record<string, { title: string; text: string; effectLabel?: string }>;
  evidence: Record<string, { title: string; text: string }>;
}

export interface EarthMission {
  id: string;
  number: number;
  type: MissionType;
  title: string;
  prompt: string;
  region: MissionRegion;
  recommendedLensIds: string[];
  target: GeographicPoint & { name: string; successRadiusKm: number };
  hints: MissionHint[];
  sticker: MissionSticker;
  completion: { evidenceChain: MissionCompletionEvidence[] };
  translations?: { ja: MissionTranslation };
}

export type MissionRank = "S" | "A" | "B" | "C";
export type MissionStatus = "active" | "completed";

export interface MissionAttempt {
  number: number;
  location: GeographicPoint;
  distanceKm: number;
  matched: boolean;
}

export interface MissionState {
  currentMissionId: string;
  status: MissionStatus;
  revealedHintIds: string[];
  selectedLocation: GeographicPoint | null;
  attempts: MissionAttempt[];
  rank: MissionRank | null;
}

export interface MissionProgress {
  missionId: string;
  completed: boolean;
  bestRank?: MissionRank;
  bestHintsUsed?: number;
  attempts: number;
  completedAt?: string;
}
