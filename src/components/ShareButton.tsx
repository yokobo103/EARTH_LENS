import { useState } from "react";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface ShareButtonProps { locale: Locale }

export function ShareButton({ locale }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const share = async () => {
    const url = window.location.href;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("fallback");
    }
  };
  return <div className="share-control"><button type="button" className="share-button" onClick={() => void share()}>{status === "copied" ? t(locale, "copied") : t(locale, "shareView")}</button>{status === "fallback" && <input className="share-fallback" aria-label={t(locale, "shareUrl")} readOnly value={window.location.href} onFocus={(event) => event.currentTarget.select()} />}</div>;
}
