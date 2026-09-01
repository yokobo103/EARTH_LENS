import { useEffect } from "react";
import aboutSplash from "../assets/about-splash.webp";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";
import { markAboutSplashSeen } from "./aboutSplashState";
import { LanguageSelector } from "./LanguageSelector";

interface AboutSplashProps { locale: Locale; onLocaleChange: (locale: Locale) => void; onClose: () => void }

const LAB_URL = "https://yokobo103.github.io/AI-lab-rebuild-tmp/";

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
    <section className="about-splash observation-note" role="dialog" aria-modal="true" aria-labelledby="about-splash-title">
      <button type="button" className="about-splash-close" onClick={close} aria-label={t(locale, "close")}>×</button>
      <div className="about-splash-scroll">
        <div className="about-splash-hero">
          <div className="about-splash-art"><img src={aboutSplash} alt={t(locale, "aboutImageAlt")} /></div>
          <div className="about-splash-copy">
            <span className="eyebrow">EARTH LENS · {t(locale, "aboutKicker")}</span>
            <h1 id="about-splash-title">{t(locale, "aboutTitle")}</h1>
            <p>{t(locale, "aboutBody")}</p>
            <div className="about-splash-language"><span>{locale === "ja" ? "表示言語" : "LANGUAGE"}</span><LanguageSelector locale={locale} onChange={onLocaleChange} /></div>
            <button type="button" className="about-splash-enter" onClick={close}>{t(locale, "enterSystem")}</button>
          </div>
        </div>
        <article className="observation-note-section author-note">
          <span className="eyebrow">FIELD NOTE 01 · {locale === "ja" ? "作者メッセージ" : "AUTHOR MESSAGE"}</span>
          <p>{t(locale, "authorMessage")}</p>
          <strong>{t(locale, "authorSignature")}</strong>
        </article>
        <article className="observation-note-section lab-note">
          <span className="eyebrow">{t(locale, "labTitle")}</span>
          <p>{t(locale, "labBody")}</p>
          <a className="about-splash-lab-link" href={LAB_URL} target="_blank" rel="noreferrer">{t(locale, "labLink")}</a>
        </article>
        <article className="observation-note-section how-note">
          <span className="eyebrow">{t(locale, "howObserveTitle")}</span>
          <p>{t(locale, "howObserveBody")}</p>
        </article>
      </div>
    </section>
  </div>;
}
