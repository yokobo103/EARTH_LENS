import completeButtonCompact from "../assets/complete/complete-button-pc.png";
import completeButtonWide from "../assets/complete/complete-button-mobile.png";
import completeStickerVol1 from "../assets/complete/complete-sticker-vol1.png";
import completeStickerVol2 from "../assets/complete/complete-sticker-vol2.png";
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
