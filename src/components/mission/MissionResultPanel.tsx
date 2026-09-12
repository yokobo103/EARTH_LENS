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
 * ここは答え合わせであって、データ検証の画面ではない。読ませたいのは
 * 「なぜここが答えだったのか」の一段落で、証拠はその裏付けとして短く添える。
 * 500km走査（SCAN）は解いた直後に要るものではないので、一段下げて畳んでおく。
 *
 * スマホでは「パスポートに貼る」を下端に貼り付けたまま、この全部が
 * 1画面に収まる高さに保つ。
 */
export function MissionResultPanel({
  mission, state, locale, onCollectSticker,
  whyHereResult = null, isAnalyzing = false, onAnalyze = () => undefined,
  embedded = false, compact = false,
}: MissionResultPanelProps) {
  const missionNumber = `MISSION ${String(mission.number).padStart(2, "0")}`;

  return (
    <aside className={`${embedded ? "mission-result-embedded" : "glass-panel mission-result-panel"}${compact ? " is-compact" : ""}`} aria-label="Mission result">
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

      {/* 答え合わせの本文。この画面で一番読んでほしいのはここ。 */}
      <section className="mission-answer" aria-label={t(locale, "whyHere")}>
        <h3>{t(locale, "whyThisPlace")}</h3>
        <p>{mission.completion.answer}</p>
        <ul className="mission-answer-grounds">
          {mission.completion.evidenceChain.map((item) => (
            <li key={`${item.lensId}:${item.featureId}`}>
              <b>{item.title}</b>{item.text}
            </li>
          ))}
        </ul>
      </section>

      {/* 生データの走査は、読み終わった人が自分で確かめたいときのためのもの。 */}
      <details className="mission-result-more">
        <summary>{t(locale, "seeFullEvidence")}</summary>
        <MissionWhyHerePanel mission={mission} result={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onAnalyze={onAnalyze} />
      </details>

      <div className="mission-result-cta">
        <button type="button" className="collect-sticker-button" onClick={onCollectSticker}>{t(locale, "placeInPassport")}</button>
      </div>
    </aside>
  );
}
