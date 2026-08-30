import type { WhyHereResult } from "../why-here/types";
import { t } from "../i18n/copy";
import { localizeFeatureName, localizeLensName, localizeRelation } from "../i18n/domain";
import type { Locale } from "../i18n/types";

interface WhyHerePanelProps {
  result: WhyHereResult | null;
  isAnalyzing: boolean;
  radiusKm: number;
  locale: Locale;
  onAnalyze: () => void;
}

export function WhyHerePanel({ result, isAnalyzing, radiusKm, locale, onAnalyze }: WhyHerePanelProps) {
  return (
    <section className="why-here-panel" aria-label="Why Here analysis">
      <div className="why-heading">
        <div><span>{t(locale, "crossLensScan")}</span><h3>{t(locale, "whyHere")}</h3></div>
        <span className="radius-readout">R {radiusKm} KM</span>
      </div>
      <button type="button" className="why-button" onClick={onAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? t(locale, "scanning") : result ? t(locale, "scanAgain") : t(locale, "scanNearby")}
      </button>
      {result && (
        <div className="why-results" aria-live="polite">
          {result.lensResults.map((lens) => (
            <section className="why-lens-result" key={lens.lensId}>
              <div><strong>{localizeLensName(lens.lensId, lens.lensName, locale)}</strong><span>{lens.nearbyCount ? `${lens.nearbyCount} ${t(locale, "nearby")}` : t(locale, "noNearby")}</span></div>
              {lens.features.map((feature) => (
                <article key={`${feature.lensId}:${feature.featureId}`}>
                  <p>{localizeFeatureName(feature.featureId, locale === "ja" ? feature.nameJa ?? feature.name : feature.name, locale)}</p>
                  <span>{localizeRelation(feature, locale, t(locale, "nearbyFeature"))} · {feature.distanceKm} km</span>
                </article>
              ))}
            </section>
          ))}
          <p className="evidence-note">{t(locale, "evidenceOnly")}</p>
        </div>
      )}
    </section>
  );
}
