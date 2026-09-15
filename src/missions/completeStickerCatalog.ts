import completeButtonCompact from "../assets/complete/complete-button-pc.webp";
import completeButtonWide from "../assets/complete/complete-button-mobile.webp";
import completeStickerVol1 from "../assets/complete/complete-sticker-vol1.webp";
import completeStickerVol2 from "../assets/complete/complete-sticker-vol2.webp";
import type { CopyKey } from "../i18n/copy";

export interface CompleteStickerDefinition {
  passportId: string;
  number: number;
  titleKey: CopyKey;
  image: string;
}

export { completeButtonCompact, completeButtonWide };

export const completeStickerCatalog: readonly CompleteStickerDefinition[] = [
  { passportId: "passport-vol-1", number: 1, titleKey: "passportVol1Title", image: completeStickerVol1 },
  { passportId: "passport-vol-2", number: 2, titleKey: "passportVol2Title", image: completeStickerVol2 },
];
