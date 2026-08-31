import type { WhyHereLensResult, WhyHereNearbyFeature, WhyHereResult } from "./types";

export type WhyHereSummaryTone = "human-overlap" | "flow-hub" | "corridor" | "earth-only" | "quiet";

export interface WhyHereSummary {
  tone: WhyHereSummaryTone;
  evidenceLenses: WhyHereLensResult[];
  silentLenses: WhyHereLensResult[];
  nearest: (WhyHereNearbyFeature & { lensName: string }) | null;
}

/** Deterministic wording inputs only: no interpretation, model, or external service. */
export function summarizeWhyHere(result: WhyHereResult): WhyHereSummary {
  const evidenceLenses = result.lensResults
    .filter((lens) => lens.nearbyCount > 0)
    .sort((a, b) => nearestDistance(a) - nearestDistance(b));
  const silentLenses = result.lensResults.filter((lens) => lens.nearbyCount === 0);
  const evidenceIds = new Set(evidenceLenses.map((lens) => lens.lensId));
  const humanCount = evidenceLenses.filter((lens) => lens.lensId === "major-ports" || lens.lensId === "shipping-flows" || lens.lensId === "submarine-cable-connections").length;

  let tone: WhyHereSummaryTone = "quiet";
  if (evidenceIds.has("strategic-chokepoints") && evidenceIds.has("physical-features")) tone = "corridor";
  else if (humanCount >= 2 && evidenceIds.has("strategic-chokepoints")) tone = "flow-hub";
  else if (humanCount >= 2) tone = "human-overlap";
  else if (evidenceLenses.some((lens) => lens.lensId === "terrain-relief" || lens.lensId === "physical-features")) tone = "earth-only";

  const nearest = result.closestNamedFeature
    ? result.closestNamedFeature
    : evidenceLenses.flatMap((lens) => lens.features.map((feature) => ({ ...feature, lensName: lens.lensName })))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
  return { tone, evidenceLenses, silentLenses, nearest };
}

function nearestDistance(lens: WhyHereLensResult): number {
  return lens.features[0]?.distanceKm ?? Number.POSITIVE_INFINITY;
}
