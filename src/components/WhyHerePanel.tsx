import { useMemo, useState } from "react";
import type { WhyHereLensResult, WhyHereNearbyFeature, WhyHereResult } from "../why-here/types";
import { t } from "../i18n/copy";
import { localizeFeatureName, localizeLensName, localizeRelation } from "../i18n/domain";
import type { Locale } from "../i18n/types";
import { summarizeWhyHere, type WhyHereSummary, type WhyHereSummaryTone } from "../why-here/summarizeWhyHere";

interface WhyHerePanelProps {
  result: WhyHereResult | null;
  isAnalyzing: boolean;
  radiusKm: number;
  locale: Locale;
  onAnalyze: () => void;
}

const INITIAL_FEATURE_LIMIT = 3;

export function WhyHerePanel({ result, isAnalyzing, radiusKm, locale, onAnalyze }: WhyHerePanelProps) {
  const summary = result ? summarizeWhyHere(result) : null;
  const [openLensIds, setOpenLensIds] = useState<Set<string>>(new Set());
  const [expandedLensIds, setExpandedLensIds] = useState<Set<string>>(new Set());

  const toneCopy: Record<WhyHereSummaryTone, string> = {
    "dense-cluster": t(locale, "summaryDenseCluster"),
    "cross-category": t(locale, "summaryCrossCategory"),
    "single-signal": t(locale, "summarySingleSignal"),
    "open-space": t(locale, "summaryOpenSpace"),
    "physical-signal": t(locale, "summaryPhysicalSignal"),
  };
  const signalLenses = useMemo(() => summary
    ? [...summary.evidenceLenses]
      .sort((a, b) => b.nearbyCount - a.nearbyCount || firstDistance(a) - firstDistance(b))
      .slice(0, 4)
    : [], [summary]);

  const toggleLens = (lensId: string) => setOpenLensIds((current) => {
    const next = new Set(current);
    if (next.has(lensId)) next.delete(lensId); else next.add(lensId);
    return next;
  });
  const toggleFeatures = (lensId: string) => setExpandedLensIds((current) => {
    const next = new Set(current);
    if (next.has(lensId)) next.delete(lensId); else next.add(lensId);
    return next;
  });

  return (
    <section className={`why-here-panel${result ? " has-result" : ""}`} aria-label={result ? t(locale, "scanResult") : t(locale, "scan")}>
      <div className="why-heading">
        <div><span>{result ? t(locale, "scanResult") : t(locale, "observationReadout")}</span><h3>{result ? t(locale, "scanResult") : t(locale, "scan")}</h3></div>
        <span className="radius-readout">R {radiusKm} KM</span>
      </div>
      {!result && (
        <button type="button" className="why-button" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? t(locale, "scanning") : t(locale, "scan")}
        </button>
      )}
      {result && summary && (
        <div className="why-results" aria-live="polite">
          <ScanSummary summary={summary} result={result} signalLenses={signalLenses} toneCopy={toneCopy} locale={locale} />

          <section className="why-lens-explorer" aria-label={t(locale, "scanExploreNearby")}>
            <div className="why-section-heading">
              <strong>{t(locale, "scanExploreNearby")}</strong>
              <span>{summary.nearbyFeatureCount} {t(locale, "summaryFeatures")}</span>
            </div>
            <div className="why-lens-accordion">
              {summary.evidenceLenses.map((lens) => {
                const isOpen = openLensIds.has(lens.lensId);
                const showAll = expandedLensIds.has(lens.lensId);
                const visibleFeatures = showAll ? lens.features : lens.features.slice(0, INITIAL_FEATURE_LIMIT);
                return <section className={`why-lens-result${isOpen ? " is-open" : ""}`} key={lens.lensId}>
                  <button type="button" className="why-lens-toggle" aria-expanded={isOpen} aria-controls={`why-lens-${lens.lensId}`} onClick={() => toggleLens(lens.lensId)}>
                    <span><strong>{localizeLensName(lens.lensId, lens.lensName, locale)}</strong><small>{lens.nearbyCount} {t(locale, "summaryFeatures")}</small></span>
                    <b aria-hidden="true">{isOpen ? "−" : "+"}</b>
                  </button>
                  {isOpen && <div id={`why-lens-${lens.lensId}`} className="why-lens-result-body">
                    {visibleFeatures.map((feature) => <NearbyFeatureRow feature={feature} locale={locale} key={`${feature.lensId}:${feature.featureId}`} />)}
                    {lens.features.length > INITIAL_FEATURE_LIMIT && <button type="button" className="why-show-more" aria-expanded={showAll} onClick={() => toggleFeatures(lens.lensId)}>
                      {showAll ? t(locale, "showLess") : `${t(locale, "showMore")} · ${lens.features.length - INITIAL_FEATURE_LIMIT}`}
                    </button>}
                  </div>}
                </section>;
              })}
            </div>
          </section>

          <details className="why-data-details">
            <summary><span>{t(locale, "dataDetails")}</span><b aria-hidden="true">+</b></summary>
            <div className="why-data-details-body">
              <p className="evidence-note">{t(locale, "evidenceOnly")}</p>
              <dl className="why-data-readout">
                <div><dt>{t(locale, "radius")}</dt><dd>{result.radiusKm} km</dd></div>
                <div><dt>{t(locale, "nearbyFeature")}</dt><dd>{summary.nearbyFeatureCount}</dd></div>
              </dl>
              {summary.readingLinks.length > 0 && <div className="why-summary-guides">
                <span className="why-summary-label">{t(locale, "scanGuides")}</span>
                {summary.readingLinks.map((reading) => <a key={reading.url} href={reading.url} target="_blank" rel="noreferrer">{reading.title} ↗</a>)}
              </div>}
              {summary.silentLenses.length > 0 && <details className="why-silent-details">
                <summary>{t(locale, "noReaction")} · {summary.silentLenses.length}</summary>
                <span>{summary.silentLenses.map((lens) => localizeLensName(lens.lensId, lens.lensName, locale)).join(" · ")}</span>
              </details>}
            </div>
          </details>

          <button type="button" className="why-button is-secondary" onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? t(locale, "scanning") : t(locale, "scanAgain")}
          </button>
        </div>
      )}
    </section>
  );
}

interface ScanSummaryProps {
  summary: WhyHereSummary;
  result: WhyHereResult;
  signalLenses: WhyHereLensResult[];
  toneCopy: Record<WhyHereSummaryTone, string>;
  locale: Locale;
}

function ScanSummary({ summary, result, signalLenses, toneCopy, locale }: ScanSummaryProps) {
  const nearestName = summary.nearest ? displayNearbyName(summary.nearest, locale) : t(locale, "selectedLocation");
  const primaryName = summary.primarySignal
    ? localizeLensName(summary.primarySignal.lensId, summary.primarySignal.lensName, locale)
    : null;
  const standout = primaryName
    ? `${t(locale, "scanPrimarySignalPrefix")}: ${primaryName} · ${summary.primarySignal?.nearbyCount ?? 0} ${t(locale, "summaryFeatures")}`
    : t(locale, "scanNoStrongSignal");
  return <section className="why-summary" aria-label={t(locale, "scanResult")}>
    <div className="why-summary-location">
      <span className="why-summary-label">{t(locale, "scanLocation")}</span>
      <strong>{nearestName}</strong>
      <span>{formatCoordinates(result.location)}{summary.nearest ? ` · ${summary.nearest.distanceKm} km` : ""}</span>
    </div>
    <div className="why-summary-tone">
      <span className="why-summary-label">{t(locale, "observationReadout")}</span>
      <strong>{toneCopy[summary.tone]}</strong>
    </div>
    <div className="why-summary-section">
      <span className="why-summary-label">{t(locale, "scanSignals")}</span>
      {signalLenses.length > 0 ? <div className="why-summary-lenses">
        {signalLenses.map((lens) => <span className="why-summary-lens" key={lens.lensId}>{localizeLensName(lens.lensId, lens.lensName, locale)} <b>{lens.nearbyCount}</b></span>)}
      </div> : <span className="why-summary-rarity">{t(locale, "scanNoStrongSignal")}</span>}
    </div>
    <div className="why-summary-standout">
      <span className="why-summary-label">{t(locale, "scanStandout")}</span>
      <p>{standout}</p>
    </div>
  </section>;
}

function NearbyFeatureRow({ feature, locale }: { feature: WhyHereNearbyFeature; locale: Locale }) {
  return <article>
    <p>{displayNearbyName(feature, locale)}</p>
    <span>{feature.distanceKm} km · {localizeRelation(feature, locale, t(locale, "nearbyFeature"))}</span>
  </article>;
}

function displayNearbyName(feature: WhyHereNearbyFeature, locale: Locale): string {
  const localized = localizeFeatureName(feature.featureId, locale === "ja" ? feature.nameJa ?? feature.name : feature.name, locale);
  if (locale === "ja" && feature.nameJa && feature.name !== feature.nameJa) return `${localized} / ${feature.name}`;
  return localized;
}

function formatCoordinates(location: WhyHereResult["location"]): string {
  const latitude = `${Math.abs(location.latitude).toFixed(2)}°${location.latitude >= 0 ? "N" : "S"}`;
  const longitude = `${Math.abs(location.longitude).toFixed(2)}°${location.longitude >= 0 ? "E" : "W"}`;
  return `${latitude} / ${longitude}`;
}

function firstDistance(lens: WhyHereLensResult): number {
  return lens.features[0]?.distanceKm ?? Number.POSITIVE_INFINITY;
}
