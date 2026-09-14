import { useEffect, useRef } from "react";
import type { EarthMission, MissionState } from "../../missions/types";
import type { Locale } from "../../i18n/types";
import { t } from "../../i18n/copy";
import { MissionObservationPanel } from "./MissionObservationPanel";
import { MissionResultPanel } from "./MissionResultPanel";
import { AnchorActionBar } from "../AnchorActionBar";

interface MissionAnchoredCardProps {
  mission: EarthMission;
  state: MissionState;
  locale: Locale;
  expanded: boolean;
  onSubmit: () => void;
  onCollectSticker: () => void;
  onClose?: () => void;
  /** スマホのシート表示。結果画面の並びが変わる。 */
  compact?: boolean;
}

export function MissionAnchoredCard({ mission, state, locale, expanded, onSubmit, onCollectSticker, onClose, compact = false }: MissionAnchoredCardProps) {
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
  const title = state.status === "completed" ? t(locale, "targetIdentified") : t(locale, "selectedLocation");
  return <section ref={rootRef} className={`anchor-card-content mission-anchor-card${expanded ? " is-expanded" : " is-action-bar"}${state.status === "completed" ? " is-result" : ""}`} aria-label={title}>
    {state.status === "completed" ? <MissionResultPanel mission={mission} state={state} locale={locale} onCollectSticker={onCollectSticker} embedded compact={compact} /> : expanded ? <MissionObservationPanel state={state} locale={locale} onSubmit={onSubmit} embedded /> : state.selectedLocation ? <AnchorActionBar point={state.selectedLocation} title={title} actionLabel={t(locale, "submitLocation")} tone="mission" onAction={onSubmit} onClose={onClose} closeLabel={t(locale, "close")} feedback={latestAttempt && latestMatchesSelection && !latestAttempt.matched ? `${t(locale, "noMatch")} · ${latestAttempt.distanceKm.toLocaleString(locale === "ja" ? "ja-JP" : "en-US")} km` : undefined} /> : null}
  </section>;
}
