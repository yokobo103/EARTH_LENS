import type { MissionProgress, MissionRank, MissionState } from "./types";

const STORAGE_KEY = "earth-lens:mission-progress:v1";
const rankWeight: Record<MissionRank, number> = { S: 4, A: 3, B: 2, C: 1 };

function isProgress(value: unknown): value is MissionProgress {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MissionProgress>;
  return typeof item.missionId === "string" && typeof item.completed === "boolean" && typeof item.attempts === "number";
}

export function loadMissionProgress(): Record<string, MissionProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    return Object.fromEntries(parsed.filter(isProgress).map((item) => [item.missionId, item]));
  } catch {
    return {};
  }
}

export function saveMissionProgress(progress: Record<string, MissionProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.values(progress)));
  } catch {
    // The game remains playable when storage is blocked or full.
  }
}

export function recordMissionCompletion(
  current: Record<string, MissionProgress>,
  state: MissionState,
): Record<string, MissionProgress> {
  if (state.status !== "completed" || !state.rank) return current;
  const previous = current[state.currentMissionId];
  const bestRank = !previous?.bestRank || rankWeight[state.rank] > rankWeight[previous.bestRank]
    ? state.rank
    : previous.bestRank;
  const bestHintsUsed = previous?.bestHintsUsed === undefined
    ? state.revealedHintIds.length
    : Math.min(previous.bestHintsUsed, state.revealedHintIds.length);
  return {
    ...current,
    [state.currentMissionId]: {
      missionId: state.currentMissionId,
      completed: true,
      bestRank,
      bestHintsUsed,
      attempts: (previous?.attempts ?? 0) + state.attempts.length,
      completedAt: previous?.completedAt ?? new Date().toISOString(),
    },
  };
}
