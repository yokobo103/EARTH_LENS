import type { MissionState } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";

interface MissionObservationPanelProps { state: MissionState; locale: Locale; onSubmit: () => void; embedded?: boolean }

export function MissionObservationPanel({ state, locale, onSubmit, embedded = false }: MissionObservationPanelProps) {
  const latestAttempt = state.attempts.at(-1);
  const latestMatchesSelection = Boolean(latestAttempt && state.selectedLocation && latestAttempt.location.latitude === state.selectedLocation.latitude && latestAttempt.location.longitude === state.selectedLocation.longitude);
  return (
    <aside className={embedded ? "mission-observation-embedded" : "glass-panel mission-observation-panel"} aria-label="Mission observation">
      <p className="eyebrow">{t(locale, "fieldCoordinates")}</p><h2>{t(locale, "observationPoint")}</h2>
      {state.selectedLocation ? <><dl className="observation-coordinates"><div><dt>LAT</dt><dd>{state.selectedLocation.latitude.toFixed(3)}</dd></div><div><dt>LON</dt><dd>{state.selectedLocation.longitude.toFixed(3)}</dd></div></dl><button type="button" className="mission-submit" onClick={onSubmit}>{t(locale, "submitLocation")}</button></> : <div className="observation-empty"><span className="target-reticle" /><p>{t(locale, "noPoint")}</p><small>{t(locale, "clickGlobe")}</small></div>}
      {latestAttempt && latestMatchesSelection && !latestAttempt.matched && <section className="mission-no-match" aria-live="polite"><strong>{t(locale, "noMatch")}</strong><p>{t(locale, "noMatchDescription")}</p><span>{t(locale, "distanceFromTarget")}: {latestAttempt.distanceKm.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")} km</span><small>{t(locale, "continueSearching")}</small></section>}
    </aside>
  );
}
