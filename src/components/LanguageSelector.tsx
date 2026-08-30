import type { Locale } from "../i18n/types";

interface LanguageSelectorProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export function LanguageSelector({ locale, onChange }: LanguageSelectorProps) {
  return (
    <nav className="language-selector" aria-label={locale === "ja" ? "表示言語" : "Display language"}>
      <button type="button" aria-pressed={locale === "en"} onClick={() => onChange("en")}>EN</button>
      <button type="button" aria-pressed={locale === "ja"} onClick={() => onChange("ja")}>日本語</button>
    </nav>
  );
}
