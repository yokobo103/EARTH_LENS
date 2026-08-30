import type { WhyHereResult } from "../../why-here/types";
import { t } from "../../i18n/copy";
import { localizeFeatureName, localizeLensName, localizeRelation } from "../../i18n/domain";
import type { Locale } from "../../i18n/types";
import type { EarthMission } from "../../missions/types";

interface MissionWhyHerePanelProps {
  mission: EarthMission;
  result: WhyHereResult | null;
  isAnalyzing: boolean;
  locale: Locale;
  onAnalyze: () => void;
}

export function MissionWhyHerePanel({
  mission,
  result,
  isAnalyzing,
  locale,
  onAnalyze,
}: MissionWhyHerePanelProps) {
  const relevantLensIds = [...new Set(mission.completion.evidenceChain.map((evidence) => evidence.lensId))];
  const relevantResults = relevantLensIds
    .map((lensId) => result?.lensResults.find((lens) => lens.lensId === lensId))
    .filter((lens) => lens !== undefined);

  return (
    <section className="mission-why-here" aria-label="Mission Why Here evidence">
      <div className="mission-why-heading">
        <div><span>{t(locale, "evidenceReview")}</span><h3>{t(locale, "whyHere")}</h3></div>
        <span>R 500 KM</span>
      </div>
      <button type="button" className="mission-evidence-button" onClick={onAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? t(locale, "scanning") : result ? t(locale, "rescanEvidence") : t(locale, "scanTargetArea")}
      </button>
      {result && (
        <div className="mission-evidence-results" aria-live="polite">
          {relevantResults.map((lens) => (
            <section key={lens.lensId}>
              <strong>{localizeLensName(lens.lensId, lens.lensName, locale)}</strong>
              <span>{lens.nearbyCount ? `${lens.nearbyCount} ${t(locale, "nearby")}` : t(locale, "noNearby")}</span>
              {lens.features.slice(0, 4).map((feature) => (
                <p key={`${feature.lensId}:${feature.featureId}`}>
                  {localizeFeatureName(feature.featureId, feature.name, locale)}<small>{localizeRelation(feature, locale, t(locale, "nearbyFeature"))} · {feature.distanceKm} KM</small>
                </p>
              ))}
            </section>
          ))}
          <small className="mission-evidence-note">{t(locale, "evidenceOnly")}</small>
        </div>
      )}
    </section>
  );
}
