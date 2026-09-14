import { lensRegistry } from "../lenses/registry";
import type { FurtherReadingLink, LensCategory } from "../lenses/types";
import type { WhyHereLensResult, WhyHereNearbyFeature, WhyHereResult } from "./types";

/**
 * The summary is deliberately phrased in terms of general Lens properties,
 * not individual ids. Adding a registry entry therefore makes it eligible
 * for the readout without editing this rule set.
 */
export type WhyHereSummaryTone = "dense-cluster" | "cross-category" | "single-signal" | "open-space" | "physical-signal";

export interface WhyHerePrimarySignal {
  lensId: string;
  lensName: string;
  nearbyCount: number;
  totalFeatureCount: number;
  rarityScore: number;
  /** Share of this Lens' named dataset that falls inside the scan radius. */
  coveragePercent: number;
}

export type WhyHereHeadlineKind =
  | "deserts-rivers"
  | "population-ports"
  | "terrain-rivers"
  | "rivers-ports"
  | "ports-shipping"
  | "rivers-signal"
  | "population-signal"
  | "deserts-signal"
  | "terrain-signal"
  | "human-signal"
  | "earth-signal"
  | "human-sparse"
  | "open-space"
  | "fallback";

export interface WhyHereHeadline {
  kind: WhyHereHeadlineKind;
  lensIds: string[];
}

export interface WhyHereSummary {
  tone: WhyHereSummaryTone;
  evidenceLenses: WhyHereLensResult[];
  silentLenses: WhyHereLensResult[];
  nearest: (WhyHereNearbyFeature & { lensName: string }) | null;
  primarySignal: WhyHerePrimarySignal | null;
  headline: WhyHereHeadline;
  /** Lens-level guides are the honest external door behind the local scan. */
  readingLinks: FurtherReadingLink[];
  nearbyFeatureCount: number;
}

interface ScoredLens {
  lens: WhyHereLensResult;
  category: LensCategory | "unknown";
  score: number;
}

/** Deterministic wording inputs only: no interpretation, model, or external service. */
export function summarizeWhyHere(result: WhyHereResult): WhyHereSummary {
  const categoryByLensId = new Map(lensRegistry.map((lens) => [lens.definition.id, lens.definition.category]));
  const evidenceLenses = result.lensResults
    .filter((lens) => lens.nearbyCount > 0)
    .sort((a, b) => nearestDistance(a) - nearestDistance(b));
  const silentLenses = result.lensResults.filter((lens) => lens.nearbyCount === 0);
  const scored = evidenceLenses.map((lens): ScoredLens => ({
    lens,
    category: categoryByLensId.get(lens.lensId) ?? "unknown",
    score: rarityScore(lens),
  }));
  const ranked = scored.slice().sort((a, b) => b.score - a.score || b.lens.nearbyCount - a.lens.nearbyCount || nearestDistance(a.lens) - nearestDistance(b.lens));
  const primary = ranked[0];
  const categories = new Set(scored.map((item) => item.category).filter((category): category is LensCategory => category !== "unknown"));
  const earthSignals = scored.filter((item) => item.category === "earth").length;
  const candidates: Array<{ tone: WhyHereSummaryTone; score: number }> = [];

  if (evidenceLenses.length === 0) {
    const nearestRatio = result.closestNamedFeature ? result.closestNamedFeature.distanceKm / Math.max(1, result.radiusKm) : 1;
    candidates.push({ tone: "open-space", score: 100 + Math.min(100, nearestRatio * 40) });
  }
  if (primary && primary.lens.nearbyCount >= 2) {
    candidates.push({ tone: "dense-cluster", score: primary.score });
  }
  if (categories.size >= 2) {
    candidates.push({ tone: "cross-category", score: 48 + categories.size * 18 + Math.min(18, evidenceLenses.length * 3) });
  }
  if (evidenceLenses.length === 1) {
    candidates.push({ tone: "single-signal", score: 55 + Math.min(20, primary?.score ?? 0) });
  }
  if (earthSignals > 0 && categories.size === 1) {
    candidates.push({ tone: "physical-signal", score: 56 + Math.min(22, earthSignals * 8) });
  }

  const tone = candidates.sort((a, b) => b.score - a.score)[0]?.tone ?? "open-space";
  const nearest = result.closestNamedFeature
    ? result.closestNamedFeature
    : evidenceLenses.flatMap((lens) => lens.features.map((feature) => ({ ...feature, lensName: lens.lensName })))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
  const primarySignal = primary ? {
    lensId: primary.lens.lensId,
    lensName: primary.lens.lensName,
    nearbyCount: primary.lens.nearbyCount,
    totalFeatureCount: primary.lens.totalFeatureCount ?? primary.lens.nearbyCount,
    rarityScore: Math.round(primary.score),
    coveragePercent: Math.round((primary.lens.nearbyCount / Math.max(1, primary.lens.totalFeatureCount ?? primary.lens.nearbyCount)) * 1000) / 10,
  } : null;
  const orderedEvidenceLenses = scored
    .slice()
    .sort((a, b) => b.score - a.score || b.lens.nearbyCount - a.lens.nearbyCount || nearestDistance(a.lens) - nearestDistance(b.lens))
    .map((item) => item.lens);
  const headline = buildHeadline(orderedEvidenceLenses, scored, result, categoryByLensId);
  const readingLinks = uniqueReadingLinks(evidenceLenses);
  const nearbyFeatureCount = evidenceLenses.reduce((sum, lens) => sum + lens.nearbyCount, 0);
  return { tone, evidenceLenses: orderedEvidenceLenses, silentLenses, nearest, primarySignal, headline, readingLinks, nearbyFeatureCount };
}

function buildHeadline(
  evidenceLenses: WhyHereLensResult[],
  scored: ScoredLens[],
  result: WhyHereResult,
  categoryByLensId: Map<string, LensCategory | undefined>,
): WhyHereHeadline {
  const ids = new Set(evidenceLenses.map((lens) => lens.lensId));
  const rankedIds = new Set(scored
    .slice()
    .sort((a, b) => b.score - a.score || b.lens.nearbyCount - a.lens.nearbyCount || nearestDistance(a.lens) - nearestDistance(b.lens))
    .slice(0, 3)
    .map((item) => item.lens.lensId));
  const pair = (first: string, second: string): string[] | null => ids.has(first) && ids.has(second) && (rankedIds.has(first) || rankedIds.has(second)) ? [first, second] : null;
  const desertsRivers = pair("deserts", "rivers");
  if (desertsRivers) return { kind: "deserts-rivers", lensIds: desertsRivers };
  const populationPorts = pair("populated-places", "major-ports");
  if (populationPorts) return { kind: "population-ports", lensIds: populationPorts };
  const terrainRivers = pair("physical-features", "rivers");
  if (terrainRivers) return { kind: "terrain-rivers", lensIds: terrainRivers };
  const riversPorts = pair("rivers", "major-ports");
  if (riversPorts) return { kind: "rivers-ports", lensIds: riversPorts };
  const portsShipping = pair("major-ports", "shipping-flows");
  if (portsShipping) return { kind: "ports-shipping", lensIds: portsShipping };

  const humanLensIds = new Set(scored.filter((item) => item.category === "human").map((item) => item.lens.lensId));
  const knownHumanLensCount = result.lensResults.filter((lens) => categoryByLensId.get(lens.lensId) === "human").length;
  if (evidenceLenses.length === 0 && knownHumanLensCount > 0 && humanLensIds.size === 0) return { kind: "human-sparse", lensIds: [] };
  const primary = scored
    .slice()
    .sort((a, b) => b.score - a.score || nearestDistance(a.lens) - nearestDistance(b.lens))[0]?.lens;
  if (primary) return { kind: singleSignalHeadlineKind(primary.lensId, categoryByLensId.get(primary.lensId)), lensIds: [primary.lensId] };
  if (evidenceLenses.length === 0) return { kind: "open-space", lensIds: [] };
  return { kind: "fallback", lensIds: evidenceLenses.slice(0, 2).map((lens) => lens.lensId) };
}

function singleSignalHeadlineKind(lensId: string, category: LensCategory | undefined): WhyHereHeadlineKind {
  if (lensId === "rivers") return "rivers-signal";
  if (lensId === "populated-places") return "population-signal";
  if (lensId === "deserts") return "deserts-signal";
  if (lensId === "physical-features" || lensId === "terrain-relief") return "terrain-signal";
  return category === "human" ? "human-signal" : "earth-signal";
}

function rarityScore(lens: WhyHereLensResult): number {
  const total = Math.max(lens.nearbyCount, lens.totalFeatureCount ?? lens.nearbyCount, 1);
  const ratio = lens.nearbyCount / total;
  // Ratio and count are precomputed from the in-memory dataset snapshot; no global scan is performed here.
  return Math.min(55, lens.nearbyCount * 9) + Math.min(35, ratio * 2_000) + (lens.nearbyCount >= 2 ? 10 : 0);
}

function uniqueReadingLinks(lenses: WhyHereLensResult[]): FurtherReadingLink[] {
  const links: FurtherReadingLink[] = [];
  const seen = new Set<string>();
  for (const lens of lenses) {
    const definition = lensRegistry.find((candidate) => candidate.definition.id === lens.lensId)?.definition;
    for (const link of definition?.furtherReading ?? []) {
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      links.push(link);
    }
  }
  return links;
}

function nearestDistance(lens: WhyHereLensResult): number {
  return lens.features[0]?.distanceKm ?? Number.POSITIVE_INFINITY;
}
