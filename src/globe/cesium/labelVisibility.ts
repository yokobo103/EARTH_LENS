export type LabelPriority = "selected" | "mission" | "nearby" | "normal";

const maximumDistanceByPriority: Record<LabelPriority, number> = {
  selected: 42_000_000,
  mission: 13_000_000,
  nearby: 8_000_000,
  normal: 5_500_000,
};

export function labelMaximumDistance(priority: LabelPriority): number {
  return maximumDistanceByPriority[priority];
}
