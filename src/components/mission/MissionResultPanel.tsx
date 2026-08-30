import type { EarthMission, MissionState } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";
import { MissionStickerBadge } from "./MissionStickerBadge";

interface MissionResultPanelProps { mission: EarthMission; state: MissionState; locale: Locale; onCollectSticker: () => void }

export function MissionResultPanel({ mission, state, locale, onCollectSticker }: MissionResultPanelProps) {
  return <aside className="glass-panel mission-result-panel" aria-label="Mission result">
    <p className="eyebrow">{t(locale, "correctLocation")}</p><h2>{t(locale, "targetIdentified")}</h2><strong className="result-target">{mission.target.name}</strong>
    <section className="evidence-chain" aria-label="Observation evidence chain">{mission.completion.evidenceChain.map((evidence) => <article key={`${evidence.lensId}:${evidence.featureId}`}><div><strong>{evidence.title}</strong><p>{evidence.text}</p></div></article>)}</section>
    <div className="sticker-acquired"><span>{t(locale, "stickerAcquired")}</span><MissionStickerBadge sticker={mission.sticker} missionNumber={mission.number} completed rank={state.rank ?? undefined} compact /></div>
    <dl className="result-metrics"><div><dt>{t(locale, "rank")}</dt><dd>{state.rank}</dd></div><div><dt>{t(locale, "attempts")}</dt><dd>{state.attempts.length}</dd></div></dl>
    <button type="button" className="collect-sticker-button" onClick={onCollectSticker}>{t(locale, "placeInPassport")}</button>
  </aside>;
}
