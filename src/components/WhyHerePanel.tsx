import type { WhyHereResult, WhyHereNearbyFeature } from "../why-here/types";
import { t } from "../i18n/copy";
import { localizeFeatureName, localizeLensName, localizeRelation } from "../i18n/domain";
import type { Locale } from "../i18n/types";
import { summarizeWhyHere, type WhyHereSummaryTone } from "../why-here/summarizeWhyHere";

interface WhyHerePanelProps {
  result: WhyHereResult | null;
  isAnalyzing: boolean;
  radiusKm: number;
  locale: Locale;
  onAnalyze: () => void;
}

export function WhyHerePanel({ result, isAnalyzing, radiusKm, locale, onAnalyze }: WhyHerePanelProps) {
  const summary = result ? summarizeWhyHere(result) : null;
  const toneCopy: Record<WhyHereSummaryTone, string> = {
    "dense-cluster": t(locale, "summaryDenseCluster"),
    "cross-category": t(locale, "summaryCrossCategory"),
    "single-signal": t(locale, "summarySingleSignal"),
    "open-space": t(locale, "summaryOpenSpace"),
    "physical-signal": t(locale, "summaryPhysicalSignal"),
  };

  return (
    <section className="why-here-panel" aria-label="Why Here analysis">
      <div className="why-heading">
        <div><h3>{t(locale, "scan")}</h3></div>
        <span className="radius-readout">R {radiusKm} KM</span>
      </div>
      {!result && (
        <button type="button" className="why-button" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? t(locale, "scanning") : t(locale, "scan")}
        </button>
      )}
      {result && (
        <div className="why-results" aria-live="polite">
          {summary && (
            <section className="why-summary" aria-label={t(locale, "scan")}>
              <div className="why-summary-location">
                <strong>{summary.nearest ? displayNearbyName(summary.nearest, locale) : t(locale, "selectedLocation")}</strong>
                <span>{result.location.latitude.toFixed(2)}° {result.location.latitude >= 0 ? "N" : "S"} · {result.location.longitude.toFixed(2)}° {result.location.longitude >= 0 ? "E" : "W"}{summary.nearest ? ` · ${summary.nearest.distanceKm} km` : ""}</span>
              </div>
              <div className="why-summary-tone">
                <strong>{toneCopy[summary.tone]}</strong>
                <span className="why-summary-count">{summary.evidenceLenses.length}{locale === "ja" ? "" : " "}{t(locale, "scanOverlap")} · {summary.nearbyFeatureCount} {t(locale, "scanNearbyFeatures")}</span>
              </div>
              {summary.evidenceLenses.length > 0 && (
                <div className="why-summary-section">
                  <div className="why-summary-lenses">
                    {summary.evidenceLenses.map((lens) => (
                      <span className="why-summary-lens" key={lens.lensId}>
                        {localizeLensName(lens.lensId, lens.lensName, locale)} · {lens.nearbyCount} {t(locale, "summaryFeatures")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {summary.primarySignal && <span className="why-summary-rarity">{localizeLensName(summary.primarySignal.lensId, summary.primarySignal.lensName, locale)} · {summary.primarySignal.nearbyCount} / {summary.primarySignal.totalFeatureCount} {t(locale, "summaryFeatures")} · {summary.primarySignal.coveragePercent}%</span>}
              {summary.nearest?.context?.populationEstimate !== undefined && summary.nearest.context.populationEstimate > 0 && <span className="why-summary-rarity">POP_EST · {summary.nearest.context.populationEstimate.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}</span>}
              {summary.readingLinks.length > 0 && (
                <div className="why-summary-guides">
                  <span className="why-summary-label">{t(locale, "scanGuides")}</span>
                  {summary.readingLinks.map((reading) => <a key={reading.url} href={reading.url} target="_blank" rel="noreferrer">{reading.title} ↗</a>)}
                </div>
              )}
            </section>
          )}
          {summary?.evidenceLenses.map((lens) => (
            <section className="why-lens-result" key={lens.lensId}>
              <div><strong>{localizeLensName(lens.lensId, lens.lensName, locale)}</strong><span>{lens.nearbyCount ? `${lens.nearbyCount} ${t(locale, "nearby")}` : t(locale, "noNearby")}</span></div>
              {lens.features.map((feature) => (
                <article key={`${feature.lensId}:${feature.featureId}`}>
                  <p>{displayNearbyName(feature, locale)}</p>
                  <span>{localizeRelation(feature, locale, t(locale, "nearbyFeature"))} · {feature.distanceKm} km</span>
                </article>
              ))}
            </section>
          ))}
          <p className="evidence-note">{t(locale, "evidenceOnly")}</p>
          <button type="button" className="why-button is-secondary" onClick={onAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? t(locale, "scanning") : t(locale, "scan")}
          </button>
        </div>
      )}
    </section>
  );
}

function displayNearbyName(feature: WhyHereNearbyFeature, locale: Locale): string {
  const localized = localizeFeatureName(feature.featureId, locale === "ja" ? feature.nameJa ?? feature.name : feature.name, locale);
  if (locale === "ja" && feature.nameJa && feature.name !== feature.nameJa) return `${localized} / ${feature.name}`;
  return localized;
}
