import { useState } from "react";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";
import { writeSharedViewState, type SharedViewState } from "../share/urlState";

interface ShareButtonProps {
  locale: Locale;
  state: SharedViewState;
}

export function ShareButton({ locale, state }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "fallback">("idle");
  const share = async () => {
    const url = writeSharedViewState(state);
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: "EARTH LENS", url });
          setStatus("shared");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // A share sheet can be present but unavailable in an embedded/insecure context.
        }
      }
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("fallback");
    }
  };
  return <div className="share-control"><button type="button" className="share-button" onClick={() => void share()}>{status === "shared" ? t(locale, "shared") : status === "copied" ? t(locale, "copied") : t(locale, "shareView")}</button>{status === "fallback" && <input className="share-fallback" aria-label={t(locale, "shareUrl")} readOnly value={window.location.href} onFocus={(event) => event.currentTarget.select()} />}</div>;
}
