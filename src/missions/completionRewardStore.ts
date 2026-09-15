const STORAGE_KEY = "earth-lens:completion-reward-seen:v1";

export type CompletionRewardSeenMap = Record<string, boolean>;

function isSeenMap(value: unknown): value is CompletionRewardSeenMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((seen) => typeof seen === "boolean");
}

export function loadCompletionRewardSeen(): CompletionRewardSeenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isSeenMap(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCompletionRewardSeen(seen: CompletionRewardSeenMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // The reward remains available for the current session when storage is blocked.
  }
}
