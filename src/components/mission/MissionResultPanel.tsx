import type { EarthMission, MissionState } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";
import { MissionStickerBadge } from "./MissionStickerBadge";
import type { WhyHereResult } from "../../why-here/types";
import { MissionWhyHerePanel } from "./MissionWhyHerePanel";

interface MissionResultPanelProps {
  mission: EarthMission;
  state: MissionState;
  locale: Locale;
  onCollectSticker: () => void;
  whyHereResult?: WhyHereResult | null;
  isAnalyzing?: boolean;
  onAnalyze?: () => void;
  embedded?: boolean;
  /** スマホのシート表示。1画面に収める並びへ切り替える。 */
  compact?: boolean;
}

/**
 * ミッションを解いた直後の画面。
 *
 * スマホでは原則1画面に収める。主役はステッカーで、順位と試行回数は1行。
 * SCAN（なぜここ？）はクリアの主内容ではないので畳んでおき、
 * 見たい人だけが開く。「パスポートに貼る」は下端に貼り付けて、
 * スクロール位置にかかわらず常に見えるようにする。
 */
export function MissionResultPanel({
  mission, state, locale, onCollectSticker,
  whyHereResult = null, isAnalyzing = false, onAnalyze = () => undefined,
  embedded = false, compact = false,
}: MissionResultPanelProps) {
  const missionNumber = `MISSION ${String(mission.number).padStart(2, "0")}`;
  const evidence = (
    <section className="evidence-chain" aria-label="Observation evidence chain">
      {mission.completion.evidenceChain.map((item) => (
        <article key={`${item.lensId}:${item.featureId}`}>
          <div><strong>{item.title}</strong><p>{item.text}</p></div>
        </article>
      ))}
    </section>
  );
  const whyHere = (
    <MissionWhyHerePanel mission={mission} result={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onAnalyze={onAnalyze} />
  );

  return (
    <aside className={`${embedded ? "mission-result-embedded" : "glass-panel mission-result-panel"}${compact ? " is-compact" : ""}`} aria-label="Mission result">
      {/* 見出しは1本。任務ドックは畳んであるので、番号とCLEARはここが唯一の持ち主。 */}
      <header className="mission-result-heading">
        <span className="mission-result-number">{missionNumber}</span>
        <strong className="mission-result-clear">{t(locale, "targetIdentified")}</strong>
      </header>

      <div className="mission-result-sticker">
        <MissionStickerBadge sticker={mission.sticker} missionNumber={mission.number} completed rank={state.rank ?? undefined} />
      </div>

      <p className="mission-result-target">{mission.target.name}</p>

      <p className="mission-result-metrics">
        <span>{t(locale, "rank")} <b>{state.rank}</b></span>
        <span>{t(locale, "attempts")} <b>{state.attempts.length}</b></span>
      </p>

      {compact
        ? <details className="mission-result-more">
            <summary>{t(locale, "whyHere")}</summary>
            {evidence}
            {whyHere}
          </details>
        : <>{evidence}{whyHere}</>}

      <div className="mission-result-cta">
        <button type="button" className="collect-sticker-button" onClick={onCollectSticker}>{t(locale, "placeInPassport")}</button>
      </div>
    </aside>
  );
}
