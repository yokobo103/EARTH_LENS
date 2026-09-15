import { useEffect } from "react";
import type { CompleteStickerDefinition } from "../../missions/completeStickerCatalog";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";

interface CompleteStickerAcquisitionDialogProps {
  entry: CompleteStickerDefinition;
  locale: Locale;
  onViewCollection: () => void;
  onDismiss: () => void;
}

export function CompleteStickerAcquisitionDialog({ entry, locale, onViewCollection, onDismiss }: CompleteStickerAcquisitionDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

  const titleId = `complete-sticker-acquisition-title-${entry.passportId}`;
  const descriptionId = `complete-sticker-acquisition-description-${entry.passportId}`;

  return <div className="complete-sticker-acquisition-backdrop">
    <section className="complete-sticker-acquisition-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button type="button" className="complete-sticker-acquisition-close" aria-label={t(locale, "close")} onClick={onDismiss}>×</button>
      <span className="complete-sticker-acquisition-eyebrow">{t(locale, "journeyComplete")}</span>
      <h2 id={titleId}>{t(locale, "completeStickerAcquired")}</h2>
      <p className="complete-sticker-acquisition-volume">{t(locale, entry.titleKey)}</p>
      <div className="complete-sticker-acquisition-art">
        <img src={entry.image} alt={`${t(locale, entry.titleKey)} ${t(locale, "completeStickers")}`} />
      </div>
      <p id={descriptionId} className="complete-sticker-acquisition-description">{t(locale, "completeStickerAcquiredDescription")}</p>
      <div className="complete-sticker-acquisition-actions">
        <button type="button" className="complete-sticker-acquisition-primary" autoFocus onClick={onViewCollection}>{t(locale, "viewCollection")}</button>
        <button type="button" className="complete-sticker-acquisition-secondary" onClick={onDismiss}>{t(locale, "backToPassport")}</button>
      </div>
    </section>
  </div>;
}
