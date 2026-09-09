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

/**
 * 面の地物の名札を、どこまで引いても出すか。広いものほど早く出す。
 *
 * 全部を同じ距離にすると、サハラの名前が出るまで寄らないといけないのに、
 * 寄ったとたん小さい地物の名札まで一斉に出て潰し合う。
 * 境目は実データの広がりから決めた（乾燥帯58件・山脈294件の経度緯度幅）。
 */
export function labelDistanceForExtent(spanDegrees: number): number {
  if (spanDegrees >= 22) return 26_000_000;   // サハラ、アンデス、チベット高原クラス
  if (spanDegrees >= 10) return 13_000_000;
  if (spanDegrees >= 4) return 8_000_000;
  return 5_500_000;
}

/** 面の地物の広がり（経度幅と緯度幅の大きい方、度）。 */
export function areaSpanDegrees(bbox: { west: number; east: number; south: number; north: number }): number {
  return Math.max(bbox.east - bbox.west, bbox.north - bbox.south);
}
