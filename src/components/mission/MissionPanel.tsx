import type { EarthLensDefinition } from "../../lenses/types";
import type { EarthMission, MissionState } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";

interface MissionPanelProps {
  mission: EarthMission;
  state: MissionState;
  locale: Locale;
  lenses: EarthLensDefinition[];
  activeLensIds: Set<string>;
  onRevealHint: () => void;
  onToggleLens: (lensId: string) => void;
  onOpenPassport: () => void;
}

export function MissionPanel({ mission, state, locale, lenses, activeLensIds, onRevealHint, onToggleLens, onOpenPassport }: MissionPanelProps) {
  const nextHint = mission.hints[state.revealedHintIds.length];
  return (
    <aside className="glass-panel mission-panel" aria-label="Mission briefing">
      <button type="button" className="passport-back-button" onClick={onOpenPassport}>← {t(locale, "backToPassport")}</button>
      <div className="mission-kicker"><span>MISSION {String(mission.number).padStart(2, "0")}</span><i>{state.status === "completed" ? t(locale, "complete") : t(locale, "active")}</i></div>
      <p className="eyebrow">{mission.type.toUpperCase()} · {t(locale, "planetaryAssignment")}</p>
      <h1>{mission.title}</h1>
      <p className="mission-objective">{mission.prompt}</p>
      <dl className="mission-status-grid">
        <div><dt>{t(locale, "target")}</dt><dd>{state.status === "completed" ? mission.target.name : t(locale, "unknown")}</dd></div>
        <div><dt>{t(locale, "hints")}</dt><dd>{state.revealedHintIds.length} / {mission.hints.length}</dd></div>
      </dl>
      <section className="mission-lens-kit">
        <div className="mission-section-heading"><span>{t(locale, "lensKit")}</span><small>{t(locale, "allLensesAvailable")}</small></div>
        <div className="mission-lens-grid">{lenses.map((lens) => (
          <button type="button" key={lens.id} aria-pressed={activeLensIds.has(lens.id)} onClick={() => onToggleLens(lens.id)}><i /><span>{lens.name}</span></button>
        ))}</div>
      </section>
      <section className="mission-hints" aria-label="Mission hints">
        <div className="mission-section-heading"><span>{t(locale, "hintChannel")}</span><small>{t(locale, "hintIsClue")}</small></div>
        {mission.hints.map((hint) => {
          const revealed = state.revealedHintIds.includes(hint.id);
          return <article className={`mission-hint${revealed ? " is-revealed" : ""}`} key={hint.id}>
            <div><span>HINT {String(hint.number).padStart(2, "0")}</span><i>{revealed ? t(locale, "revealed") : hint.id === nextHint?.id ? t(locale, "available") : t(locale, "locked")}</i></div>
            {revealed && <><strong>{hint.title}</strong><p>{hint.text}</p>{hint.effect && <small>{hint.effect.type.replace("-", " ").toUpperCase()} · {hint.effect.label}</small>}</>}
          </article>;
        })}
        {nextHint && state.status === "active" && <button type="button" className="hint-button" onClick={onRevealHint}>{t(locale, "requestHint")} {String(nextHint.number).padStart(2, "0")}</button>}
      </section>
    </aside>
  );
}
