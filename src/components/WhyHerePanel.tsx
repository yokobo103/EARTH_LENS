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
    "human-overlap": t(locale, "summaryHumanOverlap"),
    "flow-hub": t(locale, "summaryFlowHub"),
    corridor: t(locale, "summaryCorridor"),
    "earth-only": t(locale, "summaryEarthOnly"),
    quiet: t(locale, "summaryQuiet"),
  };

  return (
    <section className="why-here-panel" aria-label="Why Here analysis">
      <div className="why-heading">
        <div><span>{t(locale, "crossLensScan")}</span><h3>{t(locale, "whyHere")}</h3></div>
        <span className="radius-readout">R {radiusKm} KM</span>
      </div>
      {!result && (
        <button type="button" className="why-button" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? t(locale, "scanning") : t(locale, "scanNearby")}
        </button>
      )}
      {result && (
        <div className="why-results" aria-live="polite">
          {summary && (
            <section className="why-summary" aria-label={t(locale, "observationReadout")}>
              <div className="why-summary-tone">
                <span className="why-summary-label">{t(locale, "observationReadout")}</span>
                <strong>{toneCopy[summary.tone]}</strong>
                <span>{t(locale, "summaryBasis")}: {summary.evidenceLenses.length > 0
                  ? summary.evidenceLenses.map((lens) => localizeLensName(lens.lensId, lens.lensName, locale)).join(" · ")
                  : t(locale, "noReaction")}</span>
              </div>
              {summary.nearest && <NearestFeature feature={summary.nearest} locale={locale} />}
              {summary.evidenceLenses.length > 0 && (
                <div className="why-summary-section">
                  <span className="why-summary-label">{t(locale, "reactingLenses")}</span>
                  <div className="why-summary-lenses">
                    {summary.evidenceLenses.map((lens) => (
                      <span className="why-summary-lens" key={lens.lensId}>
                        {localizeLensName(lens.lensId, lens.lensName, locale)} · {lens.nearbyCount} {t(locale, "summaryFeatures")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {summary.silentLenses.length > 0 && (
                <details className="why-summary-silent">
                  <summary>{t(locale, "noReaction")} · {summary.silentLenses.length}</summary>
                  <span>{summary.silentLenses.map((lens) => localizeLensName(lens.lensId, lens.lensName, locale)).join(" · ")}</span>
                </details>
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
            {isAnalyzing ? t(locale, "scanning") : t(locale, "scanAgain")}
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

function NearestFeature({ feature, locale }: { feature: WhyHereNearbyFeature; locale: Locale }) {
  return (
    <div className="why-summary-nearest">
      <span className="why-summary-label">{t(locale, "nearestNamedFeature")}</span>
      <strong>{displayNearbyName(feature, locale)}</strong>
      <span>{feature.distanceKm} km {locale === "ja" ? t(locale, "summaryFrom") : t(locale, "summaryDistanceAway")}</span>
    </div>
  );
}
