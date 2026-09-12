import { useEffect, useRef } from "react";
import type { EarthMission, MissionState } from "../../missions/types";
import type { Locale } from "../../i18n/types";
import { t } from "../../i18n/copy";
import { MissionObservationPanel } from "./MissionObservationPanel";
import { MissionResultPanel } from "./MissionResultPanel";

interface MissionAnchoredCardProps {
  mission: EarthMission;
  state: MissionState;
  locale: Locale;
  expanded: boolean;
  onSubmit: () => void;
  onCollectSticker: () => void;
  onExpand: () => void;
  /** スマホのシート表示。結果画面の並びが変わる。 */
  compact?: boolean;
}

export function MissionAnchoredCard({ mission, state, locale, expanded, onSubmit, onCollectSticker, onExpand, compact = false }: MissionAnchoredCardProps) {
  const rootRef = useRef<HTMLElement>(null);

  // クリアに変わった瞬間、カードの中身は総取り替えになる。直前まで読んでいた
  // 位置のままだと、結果画面の途中から表示されて見出しもステッカーも見えない。
  useEffect(() => {
    if (state.status !== "completed") return;
    const root = rootRef.current;
    if (!root) return;
    root.scrollTop = 0;
    (root.closest(".anchor-card") as HTMLElement | null)?.scrollTo({ top: 0 });
  }, [state.status]);

  const latestAttempt = state.attempts.at(-1);
  const latestMatchesSelection = Boolean(latestAttempt && state.selectedLocation && latestAttempt.location.latitude === state.selectedLocation.latitude && latestAttempt.location.longitude === state.selectedLocation.longitude);
  const title = state.status === "completed" ? t(locale, "targetIdentified") : state.selectedLocation ? `${state.selectedLocation.latitude.toFixed(3)}°, ${state.selectedLocation.longitude.toFixed(3)}°` : t(locale, "observationPoint");
  return <section ref={rootRef} className={`anchor-card-content mission-anchor-card${expanded ? " is-expanded" : ""}`} aria-label={title}>
    {state.status === "completed" ? <MissionResultPanel mission={mission} state={state} locale={locale} onCollectSticker={onCollectSticker} embedded compact={compact} /> : expanded ? <MissionObservationPanel state={state} locale={locale} onSubmit={onSubmit} embedded /> : <>
      <p className="anchor-layer">{t(locale, "observationPoint")}</p>
      <h2>{title}</h2>
      {state.selectedLocation ? <><span className="anchor-coordinates">LAT {state.selectedLocation.latitude.toFixed(3)} · LON {state.selectedLocation.longitude.toFixed(3)}</span><div className="anchor-actions mission-anchor-actions"><button type="button" className="anchor-why" onClick={onSubmit}>{t(locale, "submitLocation")}</button><button type="button" className="anchor-expand" onClick={onExpand}>{t(locale, "openBriefing")}</button></div></> : <p className="anchor-summary">{t(locale, "clickGlobe")}</p>}
      {latestAttempt && latestMatchesSelection && !latestAttempt.matched && <p className="mission-anchor-feedback">{t(locale, "noMatch")} · {latestAttempt.distanceKm.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")} km</p>}
    </>}
  </section>;
}
