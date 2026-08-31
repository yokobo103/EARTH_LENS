import { getLensModule } from "../lenses/registry";
import { t } from "../i18n/copy";
import { localizeConfidence, localizeFeatureDescription, localizeFeatureName, localizeLensName, localizeValue } from "../i18n/domain";
import type { Locale } from "../i18n/types";
import type { GeographicPoint, LensFeature } from "../lenses/types";
import type { WhyHereResult } from "../why-here/types";
import { WhyHerePanel } from "./WhyHerePanel";

interface DetailsPanelProps {
  feature: LensFeature | null;
  location: GeographicPoint | null;
  analysisLocation?: GeographicPoint | null;
  whyHereResult: WhyHereResult | null;
  isAnalyzing: boolean;
  locale: Locale;
  onAnalyze: () => void;
  embedded?: boolean;
}

export function DetailsPanel({ feature, location, analysisLocation = location, whyHereResult, isAnalyzing, locale, onAnalyze, embedded = false }: DetailsPanelProps) {
  const lens = feature ? getLensModule(feature.lensId)?.definition : undefined;
  const featureName = feature && locale === "ja" && typeof feature.attributes.nameJa === "string"
    ? feature.attributes.nameJa
    : feature ? localizeFeatureName(feature.id, feature.name, locale) : "";
  return (
    <aside className={`glass-panel details-panel${embedded ? " is-embedded" : ""}`} aria-label="Details">
      <span className="eyebrow">{t(locale, "fieldReport")}</span>
      <h2>{t(locale, "details")}</h2>
      {!feature && !location ? (
        <div className="empty-state">
          <span className="target-reticle" aria-hidden="true" />
          <p>{t(locale, "selectFeature")}</p>
          <small>{t(locale, "inspectFeature")}</small>
        </div>
      ) : feature ? (
        <div className="feature-details">
          {feature.provenance.dataKind === "demo" && <div className="demo-badge">{t(locale, "demoData")}</div>}
          {feature.provenance.classifications && <div className="provenance-tags" aria-label="Data classification">{feature.provenance.classifications.map((classification) => <span key={classification}>{classification.toUpperCase()}</span>)}</div>}
          <p className="feature-layer">{localizeLensName(feature.lensId, lens?.name ?? feature.lensId, locale)}</p>
          <h3>{featureName}</h3>
          <p className="feature-description">{localizeFeatureDescription(feature, locale)}</p>

          {feature.geometry.type === "connection" && feature.lensId !== "shipping-flows" && (
            <section className="route-disclaimer" aria-label="Cable route disclaimer">
              <strong>{t(locale, "schematicRoute")}</strong>
              <span>{t(locale, "notActualCablePath")}</span>
            </section>
          )}
          {feature.lensId === "shipping-flows" && (
            <section className="route-disclaimer shipping-disclaimer" aria-label="Shipping route disclaimer"><strong>{t(locale, "schematicFlow")}</strong><span>{t(locale, "notActualShippingRoute")}</span></section>
          )}
          {feature.attributes.approximateRegion === true && (
            <section className="route-disclaimer approximate-disclaimer"><strong>{t(locale, "approximateRegion")}</strong><span>{t(locale, "notMeasuredBoundary")}</span></section>
          )}

          <dl className="detail-grid">
            {feature.attributes.connection !== undefined && <><dt>{t(locale, "connection")}</dt><dd>{localizeValue(feature.attributes.connection, locale)}</dd></>}
            {feature.attributes.type !== undefined && <><dt>{t(locale, "type")}</dt><dd>{localizeValue(feature.attributes.type, locale)}</dd></>}
            {feature.attributes.physicalRole !== undefined && <><dt>{t(locale, "physicalRole")}</dt><dd>{localizeValue(feature.attributes.physicalRole, locale)}</dd></>}
            {feature.attributes.region !== undefined && <><dt>{t(locale, "region")}</dt><dd>{localizeValue(feature.attributes.region, locale)}</dd></>}
            {feature.attributes.country !== undefined && <><dt>{t(locale, "country")}</dt><dd>{localizeValue(feature.attributes.country, locale)}</dd></>}
            {feature.attributes.mineral !== undefined && <><dt>{t(locale, "mineral")}</dt><dd>{localizeValue(feature.attributes.mineral, locale)}</dd></>}
            {feature.attributes.productionIndex !== undefined && <><dt>{t(locale, "demoIndex")}</dt><dd>{localizeValue(feature.attributes.productionIndex, locale)} / 100</dd></>}
            {feature.attributes.unit !== undefined && <><dt>{t(locale, "unit")}</dt><dd>{localizeValue(feature.attributes.unit, locale)}</dd></>}
            {feature.attributes.isoA3 !== undefined && <><dt>{t(locale, "isoCode")}</dt><dd>{localizeValue(feature.attributes.isoA3, locale)}</dd></>}
            {feature.attributes.continent !== undefined && <><dt>{t(locale, "continent")}</dt><dd>{localizeValue(feature.attributes.continent, locale)}</dd></>}
            {feature.attributes.subregion !== undefined && <><dt>{t(locale, "subregion")}</dt><dd>{localizeValue(feature.attributes.subregion, locale)}</dd></>}
            {feature.attributes.populationEstimate !== undefined && <><dt>{t(locale, "populationEstimate")}</dt><dd>{Number(feature.attributes.populationEstimate).toLocaleString(locale === "ja" ? "ja-JP" : "en-US")}</dd></>}
            {feature.attributes.routeType !== undefined && <><dt>{t(locale, "routeType")}</dt><dd>{localizeValue(feature.attributes.routeType, locale)}</dd></>}
            {feature.attributes.flowType !== undefined && <><dt>{t(locale, "flowType")}</dt><dd>{localizeValue(feature.attributes.flowType, locale)}</dd></>}
            {feature.attributes.actualRouteRepresented !== undefined && <><dt>{t(locale, "actualSeabedRoute")}</dt><dd>{feature.attributes.actualRouteRepresented ? t(locale, "represented") : t(locale, "notRepresented")}</dd></>}
            {feature.attributes.edgeSeason !== undefined && <><dt>{t(locale, "edgeSeason")}</dt><dd>{localizeValue(feature.attributes.edgeSeason, locale)}</dd></>}
            {feature.attributes.extentSeason !== undefined && <><dt>{t(locale, "extentSeason")}</dt><dd>{localizeValue(feature.attributes.extentSeason, locale)}</dd></>}
            {feature.attributes.observationYear !== undefined && <><dt>{t(locale, "observationYear")}</dt><dd>{localizeValue(feature.attributes.observationYear, locale)}</dd></>}
            {feature.attributes.northernHemisphereMonth !== undefined && <><dt>{t(locale, "northernHemisphereMonth")}</dt><dd>{localizeValue(feature.attributes.northernHemisphereMonth, locale)}</dd></>}
            {feature.attributes.southernHemisphereMonth !== undefined && <><dt>{t(locale, "southernHemisphereMonth")}</dt><dd>{localizeValue(feature.attributes.southernHemisphereMonth, locale)}</dd></>}
            {feature.attributes.climatology !== undefined && <><dt>{t(locale, "climatology")}</dt><dd>{localizeValue(feature.attributes.climatology, locale)}</dd></>}
            {feature.attributes.sourceResolution !== undefined && <><dt>{t(locale, "sourceResolution")}</dt><dd>{localizeValue(feature.attributes.sourceResolution, locale)}</dd></>}
            <dt>{t(locale, "source")}</dt><dd>{feature.provenance.source}</dd>
            <dt>{t(locale, "updated")}</dt><dd>{feature.provenance.updatedAt}</dd>
            <dt>{t(locale, "license")}</dt><dd>{feature.provenance.license}</dd>
          </dl>

          {feature.provenance.note && <section className="provenance-note"><strong>{t(locale, "dataNote")}</strong><p>{feature.provenance.note}</p></section>}

          <div className={`confidence confidence-${feature.provenance.confidence}`}>
            <span>{t(locale, "dataConfidence")}</span>
            <strong>{localizeConfidence(feature.provenance.confidence, locale)}</strong>
          </div>
          {feature.provenance.sourceUrl && (
            <a className="source-link" href={feature.provenance.sourceUrl} target="_blank" rel="noreferrer">{t(locale, "viewReference")}</a>
          )}
          {(() => {
            const readings = feature.furtherReading ?? lens?.furtherReading;
            if (!readings?.length) return null;
            return <section className="further-reading"><div className="further-reading-heading"><strong>{t(locale, "furtherReading")}</strong><small>{t(locale, "externalGuide")}</small></div>{readings.map((reading) => <article key={reading.url}><a href={reading.url} target="_blank" rel="noreferrer">{reading.title} ↗</a><p>{reading.note}</p><small>{reading.language === "en" ? t(locale, "englishOnly") : reading.language.toUpperCase()} · {t(locale, "checked")} {reading.checkedAt}</small></article>)}</section>;
          })()}
          {analysisLocation && <WhyHerePanel result={whyHereResult} isAnalyzing={isAnalyzing} radiusKm={500} locale={locale} onAnalyze={onAnalyze} />}
        </div>
      ) : location ? (
        <div className="location-details">
          <p className="feature-layer">{t(locale, "selectedLocation")}</p>
          <h3>{location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°</h3>
          <dl className="detail-grid location-grid">
            <dt>{t(locale, "latitude")}</dt><dd>{location.latitude.toFixed(5)}°</dd>
            <dt>{t(locale, "longitude")}</dt><dd>{location.longitude.toFixed(5)}°</dd>
          </dl>
          <p className="feature-description">{t(locale, "locationScanDescription")}</p>
          <WhyHerePanel result={whyHereResult} isAnalyzing={isAnalyzing} radiusKm={500} locale={locale} onAnalyze={onAnalyze} />
        </div>
      ) : null}
    </aside>
  );
}
