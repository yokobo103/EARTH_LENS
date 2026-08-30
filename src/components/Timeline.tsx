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
    <nav className="timeline-panel" aria-label="Deep Time">
      <div><span>{t(locale, "deepTime")}</span><small>{t(locale, "discreteSnapshots")}</small></div>
      <div className="timeline-options">
        <button type="button" aria-pressed={selection.mode === "present"} onClick={() => onChange({ mode: "present", ageMa: 0 })}>{t(locale, "present")}</button>
        <span className="timeline-track" aria-hidden="true"><i /></span>
        <button type="button" aria-pressed={selection.mode === "deep-time"} onClick={() => onChange({ mode: "deep-time", ageMa: 250 })}>250 Ma</button>
      </div>
    </nav>
  );
}
