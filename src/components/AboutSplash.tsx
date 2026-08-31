import { useEffect } from "react";
import aboutSplash from "../assets/about-splash.webp";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";
import { markAboutSplashSeen } from "./aboutSplashState";
import { LanguageSelector } from "./LanguageSelector";

interface AboutSplashProps { locale: Locale; onLocaleChange: (locale: Locale) => void; onClose: () => void }

export function AboutSplash({ locale, onLocaleChange, onClose }: AboutSplashProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const close = () => {
    markAboutSplashSeen();
    onClose();
  };

  return <div className="about-splash-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className="about-splash" role="dialog" aria-modal="true" aria-labelledby="about-splash-title">
      <button type="button" className="about-splash-close" onClick={close} aria-label={t(locale, "close")}>×</button>
      <div className="about-splash-art"><img src={aboutSplash} alt={t(locale, "aboutImageAlt")} /></div>
      <div className="about-splash-copy">
        <span className="eyebrow">EARTH LENS · {t(locale, "aboutKicker")}</span>
        <h1 id="about-splash-title">{t(locale, "aboutTitle")}</h1>
        <p>{t(locale, "aboutBody")}</p>
        <div className="about-splash-language"><span>{locale === "ja" ? "表示言語" : "LANGUAGE"}</span><LanguageSelector locale={locale} onChange={onLocaleChange} /></div>
        <button type="button" className="about-splash-enter" onClick={close}>{t(locale, "enterSystem")}</button>
      </div>
    </section>
  </div>;
}
