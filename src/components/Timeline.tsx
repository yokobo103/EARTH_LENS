import type { TemporalSelection } from "../temporal/types";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface TimelineProps {
  selection: TemporalSelection;
  locale: Locale;
  onChange: (selection: TemporalSelection) => void;
}

export function Timeline({ selection, locale, onChange }: TimelineProps) {
  return (
    <div className="time-control">
      <nav className="timeline-options" aria-label="Deep Time">
        <span>{t(locale, "deepTime")}</span>
        <button type="button" aria-pressed={selection.mode === "present"} onClick={() => onChange({ mode: "present", ageMa: 0 })}>{t(locale, "present")}</button>
        <button type="button" aria-pressed={selection.mode === "deep-time"} onClick={() => onChange({ mode: "deep-time", ageMa: 250 })}>250 Ma</button>
      </nav>
      {selection.mode === "deep-time" && <span className="paleo-status"><strong>{t(locale, "age250")}</strong><small>{t(locale, "schematicLandmass")}</small></span>}
    </div>
  );
}
