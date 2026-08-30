import type { MissionHintEffect } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";

interface MissionEffectsReadoutProps {
  effects: MissionHintEffect[];
  activeLensIds: Set<string>;
  locale: Locale;
}

export function MissionEffectsReadout({ effects, activeLensIds, locale }: MissionEffectsReadoutProps) {
  const shippingActive = activeLensIds.has("shipping-flows");
  const physicalActive = activeLensIds.has("physical-features");
  const cablesActive = activeLensIds.has("submarine-cable-connections");
  const portsActive = activeLensIds.has("major-ports");
  const regionalSignalActive = effects.some((effect) => effect.type === "region-signal" || effect.type === "feature-signal");
  if (!shippingActive && !regionalSignalActive && !physicalActive && !cablesActive && !portsActive) return null;
  return (
    <aside className="mission-effects-readout" aria-label="Mission observation data">
      <span>{t(locale, "observationCapabilities")}</span>
      {shippingActive && <section><strong>{t(locale, "shippingActivity")}</strong><div><i />{t(locale, "schematicActivity")}</div><small>{t(locale, "notActualShipping")}</small></section>}
      {physicalActive && <section><strong>{t(locale, "physicalGeography")}</strong><div><i className="earth-swatch" />{t(locale, "terrainAndFeatures")}</div><small>{t(locale, "approximateRegionsReadout")}</small></section>}
      {cablesActive && <section><strong>{t(locale, "communicationConnections")}</strong><div><i className="cable-swatch" />{t(locale, "schematicConnections")}</div><small>{t(locale, "notActualCablePath")}</small></section>}
      {portsActive && <section><strong>{t(locale, "portInfrastructure")}</strong><div><i className="port-swatch" />{t(locale, "majorPortSignals")}</div><small>{t(locale, "demoData")}</small></section>}
      {regionalSignalActive && <section><strong>{t(locale, "regionalSignal")}</strong><div><i className="signal-swatch" />{t(locale, "searchAreaDetected")}</div></section>}
    </aside>
  );
}
