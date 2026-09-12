import type { EarthMission, MissionState } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";
import { MissionStickerBadge } from "./MissionStickerBadge";

interface MissionResultPanelProps {
  mission: EarthMission;
  state: MissionState;
  locale: Locale;
  onCollectSticker: () => void;
  embedded?: boolean;
  /** スマホのシート表示。1画面に収める並びへ切り替える。 */
  compact?: boolean;
}

/**
 * ミッションを解いた直後の画面。
 *
 * ここは答え合わせで終わる。500km走査も、周辺Featureの一覧も、再スキャンも置かない。
 * あれは「この装置が何を持っているか」を確かめる道具で、
 * いま知りたい「なぜここが答えだったのか」には答えていなかった。
 *
 * EARTH LENS の中での説明は「なぜ、ここだったのか」で完結させ、
 * その先は外部の資料へ渡す。開くのは新しいタブで、この画面は畳まない。
 */
export function MissionResultPanel({
  mission, state, locale, onCollectSticker, embedded = false, compact = false,
}: MissionResultPanelProps) {
  const missionNumber = `MISSION ${String(mission.number).padStart(2, "0")}`;
  const references = (mission.references ?? []).slice(0, 2);

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

      <section className="mission-answer" aria-label={t(locale, "whyThisPlace")}>
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

      {references.length > 0 && (
        <nav className="mission-references" aria-label={t(locale, "seeFullEvidence")}>
          {references.map((reference) => (
            <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer">
              {reference.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      )}

      <div className="mission-result-cta">
        <button type="button" className="collect-sticker-button" onClick={onCollectSticker}>{t(locale, "placeInPassport")}</button>
      </div>
    </aside>
  );
}
