import { useEffect } from "react";
import aboutSplash from "../assets/about-splash.webp";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";
import { markAboutSplashSeen } from "./aboutSplashState";

interface AboutSplashProps { locale: Locale; onClose: () => void }

export function AboutSplash({ locale, onClose }: AboutSplashProps) {
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
        <button type="button" className="about-splash-enter" onClick={close}>{t(locale, "enterSystem")}</button>
      </div>
    </section>
  </div>;
}
