import { getLensModule } from "../lenses/registry";
import type { GeographicPoint, LensFeature } from "../lenses/types";
import { localizeFeatureDescription, localizeFeatureName, localizeLensName } from "../i18n/domain";
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
  const featureName = feature && locale === "ja" && typeof feature.attributes.nameJa === "string"
    ? feature.attributes.nameJa
    : feature ? localizeFeatureName(feature.id, feature.name, locale) : "";
  const title = feature ? featureName : `${anchorPoint.latitude.toFixed(3)}°, ${anchorPoint.longitude.toFixed(3)}°`;
  const layerName = feature ? localizeLensName(feature.lensId, lens?.name ?? feature.lensId, locale) : t(locale, "selectedLocation");
  const description = feature ? localizeFeatureDescription(feature, locale) : t(locale, "locationScanDescription");

  return <section className={`anchor-card-content${expanded ? " is-expanded" : ""}`} aria-label={expanded ? t(locale, "details") : title}>
    <button type="button" className="anchor-close" onClick={onClose} aria-label={t(locale, "close")}>×</button>
    {expanded ? <DetailsPanel feature={feature} location={location} analysisLocation={anchorPoint} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onAnalyze={onAnalyze} embedded /> : <>
      <p className="anchor-layer">{layerName}</p>
      <h2>{title}</h2>
      <p className="anchor-summary">{description}</p>
      <span className="anchor-coordinates">LAT {anchorPoint.latitude.toFixed(3)} · LON {anchorPoint.longitude.toFixed(3)}</span>
      <div className="anchor-actions">
        <button type="button" className="anchor-why" onClick={onAnalyze}>{isAnalyzing ? t(locale, "scanning") : t(locale, "whyHere")}</button>
        <button type="button" className="anchor-expand" onClick={onExpand}>{t(locale, "expandDetails")}</button>
      </div>
    </>}
  </section>;
}
