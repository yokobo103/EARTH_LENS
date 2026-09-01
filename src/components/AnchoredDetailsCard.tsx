import { getLensModule } from "../lenses/registry";
import type { GeographicPoint, LensFeature } from "../lenses/types";
import { localizeFeatureDescription, localizeFeatureDisplayName, localizeLensName } from "../i18n/domain";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";
import type { WhyHereResult } from "../why-here/types";
import { DetailsPanel } from "./DetailsPanel";

interface AnchoredDetailsCardProps {
  feature: LensFeature | null;
  location: GeographicPoint | null;
  anchorPoint: GeographicPoint;
  expanded: boolean;
  whyHereResult: WhyHereResult | null;
  isAnalyzing: boolean;
  locale: Locale;
  onExpand: () => void;
  onAnalyze: () => void;
  onClose: () => void;
}

export function AnchoredDetailsCard({ feature, location, anchorPoint, expanded, whyHereResult, isAnalyzing, locale, onExpand, onAnalyze, onClose }: AnchoredDetailsCardProps) {
  const lens = feature ? getLensModule(feature.lensId)?.definition : undefined;
  const featureName = feature ? localizeFeatureDisplayName(feature, locale) : "";
  const isOpeningRegion = !feature && Math.abs(anchorPoint.latitude - 1.264) < 0.02 && Math.abs(anchorPoint.longitude - 103.84) < 0.02;
  const title = feature ? featureName : isOpeningRegion ? (locale === "ja" ? "シンガポール地域" : "SINGAPORE REGION") : `${anchorPoint.latitude.toFixed(3)}°, ${anchorPoint.longitude.toFixed(3)}°`;
  const layerName = feature ? localizeLensName(feature.lensId, lens?.name ?? feature.lensId, locale) : isOpeningRegion ? t(locale, "regionalHub") : t(locale, "selectedLocation");
  const description = feature ? localizeFeatureDescription(feature, locale) : "";

  return <section className={`anchor-card-content${expanded ? " is-expanded" : ""}`} aria-label={expanded ? t(locale, "details") : title}>
    <button type="button" className="anchor-close" onClick={onClose} aria-label={t(locale, "close")}>×</button>
    {expanded ? <DetailsPanel feature={feature} location={feature ? location : anchorPoint} analysisLocation={anchorPoint} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onAnalyze={onAnalyze} embedded /> : <>
      <p className="anchor-layer">{layerName}</p>
      <h2>{title}</h2>
      {description && <p className="anchor-summary">{description}</p>}
      <span className="anchor-coordinates">LAT {anchorPoint.latitude.toFixed(3)} · LON {anchorPoint.longitude.toFixed(3)}</span>
      <div className="anchor-actions">
        <button type="button" className="anchor-why" onClick={onAnalyze}>{isAnalyzing ? t(locale, "scanning") : t(locale, "scan")}</button>
        <button type="button" className="anchor-expand" onClick={onExpand}>{t(locale, "expandDetails")}</button>
      </div>
    </>}
  </section>;
}
