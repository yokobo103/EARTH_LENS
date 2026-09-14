import { getLensModule } from "../lenses/registry";
import type { GeographicPoint, LensFeature } from "../lenses/types";
import { localizeFeatureDisplayName, localizeLensName } from "../i18n/domain";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";
import type { WhyHereResult } from "../why-here/types";
import { DetailsPanel } from "./DetailsPanel";
import { AnchorActionBar } from "./AnchorActionBar";

interface AnchoredDetailsCardProps {
  feature: LensFeature | null;
  location: GeographicPoint | null;
  anchorPoint: GeographicPoint;
  expanded: boolean;
  whyHereResult: WhyHereResult | null;
  isAnalyzing: boolean;
  locale: Locale;
  onAnalyze: () => void;
  onClose?: () => void;
}

export function AnchoredDetailsCard({ feature, location, anchorPoint, expanded, whyHereResult, isAnalyzing, locale, onAnalyze, onClose }: AnchoredDetailsCardProps) {
  const lens = feature ? getLensModule(feature.lensId)?.definition : undefined;
  const featureName = feature ? localizeFeatureDisplayName(feature, locale) : "";
  const isOpeningRegion = !feature && Math.abs(anchorPoint.latitude - 1.264) < 0.02 && Math.abs(anchorPoint.longitude - 103.84) < 0.02;
  const title = feature ? featureName : isOpeningRegion ? (locale === "ja" ? "シンガポール地域" : "SINGAPORE REGION") : t(locale, "selectedLocation");
  const layerName = feature ? localizeLensName(feature.lensId, lens?.name ?? feature.lensId, locale) : isOpeningRegion ? t(locale, "regionalHub") : t(locale, "selectedLocation");

  return <section className={`anchor-card-content${expanded ? " is-expanded" : " is-action-bar"}`} aria-label={expanded ? t(locale, "scan") : title}>
    {expanded ? <DetailsPanel feature={feature} location={feature ? location : anchorPoint} analysisLocation={anchorPoint} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onAnalyze={onAnalyze} embedded /> : <AnchorActionBar point={anchorPoint} title={feature ? title : layerName} actionLabel={t(locale, "scan")} tone="explore" onAction={onAnalyze} onClose={onClose} closeLabel={t(locale, "close")} isBusy={isAnalyzing} busyLabel={t(locale, "scanning")} />}
  </section>;
}
