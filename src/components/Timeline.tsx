import type { TemporalSelection } from "../temporal/types";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface TimelineProps {
  selection: TemporalSelection;
  locale: Locale;
  onChange: (selection: TemporalSelection) => void;
}

const deepTimeAges = [50, 100, 150, 200, 250] as const;

export function Timeline({ selection, locale, onChange }: TimelineProps) {
  return (
    <div className="time-control">
      <nav className="timeline-options" aria-label="Deep Time">
        <span>{t(locale, "deepTime")}</span>
        <button type="button" aria-pressed={selection.mode === "present"} onClick={() => onChange({ mode: "present", ageMa: 0 })}>{t(locale, "present")}</button>
        {deepTimeAges.map((ageMa) => <button key={ageMa} type="button" aria-pressed={selection.mode === "deep-time" && selection.ageMa === ageMa} onClick={() => onChange({ mode: "deep-time", ageMa })}>{ageMa} Ma</button>)}
      </nav>
      {selection.mode === "deep-time" && <span className="paleo-status"><strong>{selection.ageMa} Ma · ZAHIROVIC2022</strong><small>{t(locale, "paleoModelNote")}</small></span>}
    </div>
  );
}
