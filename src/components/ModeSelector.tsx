import type { AppMode } from "../app/types";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface ModeSelectorProps {
  mode: AppMode;
  locale: Locale;
  onChange: (mode: AppMode) => void;
}

export function ModeSelector({ mode, locale, onChange }: ModeSelectorProps) {
  return (
    <nav className="mode-selector" aria-label="Application mode">
      <button type="button" aria-pressed={mode === "explore"} onClick={() => onChange("explore")}>{t(locale, "explore")}</button>
      <button type="button" aria-pressed={mode === "mission"} onClick={() => onChange("mission")}>{t(locale, "mission")}</button>
    </nav>
  );
}
