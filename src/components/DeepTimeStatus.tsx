import { formatAge, formatAgeAria, formatAgeTechnical, formatGeologicPeriod } from "../temporal/ageFormat";
import type { TemporalSelection } from "../temporal/types";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface DeepTimeStatusBadgeProps {
  ageMa: number;
  locale: Locale;
}

export function DeepTimeStatusBadge({ ageMa, locale }: DeepTimeStatusBadgeProps) {
  return <aside className="deep-time-status-badge" aria-label={formatAgeAria(ageMa, locale)}>
    <span className="deep-time-status-kicker">{t(locale, "deepTime")}</span>
    <strong>{formatAge(ageMa, locale)}</strong>
    <span className="deep-time-status-period">{formatGeologicPeriod(ageMa, locale)}</span>
    <small>{t(locale, "paleomap")} · {formatAgeTechnical(ageMa)}</small>
  </aside>;
}

interface TimeShiftNoticeProps {
  selection: TemporalSelection;
  locale: Locale;
  animationKey: number;
}

export function TimeShiftNotice({ selection, locale, animationKey }: TimeShiftNoticeProps) {
  const isDeepTime = selection.mode === "deep-time";
  const ageMa = isDeepTime ? selection.ageMa : 0;
  const label = isDeepTime
    ? `${t(locale, "timeShift")} · ${formatAge(ageMa, locale)} · ${formatGeologicPeriod(ageMa, locale)}`
    : `${t(locale, "returnToPresent")} · ${t(locale, "present")}`;
  return <div key={animationKey} className="time-shift-notice" role="status" aria-live="polite">{label}</div>;
}
