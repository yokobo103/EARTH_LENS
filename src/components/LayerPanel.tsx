import type { CSSProperties } from "react";
import type { EarthLensDefinition, LensCategory } from "../lenses/types";
import { t } from "../i18n/copy";
import { localizeLensCategory } from "../i18n/domain";
import type { Locale } from "../i18n/types";

interface LayerPanelProps {
  lenses: EarthLensDefinition[];
  activeLensIds: Set<string>;
  locale: Locale;
  onToggle: (lensId: string) => void;
  suspended?: boolean;
}

export function LayerPanel({ lenses, activeLensIds, locale, onToggle, suspended = false }: LayerPanelProps) {
  const categoryOrder: LensCategory[] = ["earth", "resources", "human", "power"];
  const categoryLabels = {
    earth: t(locale, "categoryEarth"),
    resources: t(locale, "categoryResources"),
    human: t(locale, "categoryHuman"),
    power: t(locale, "categoryPower"),
  };
  return (
    <aside className={`glass-panel layer-panel${suspended ? " is-suspended" : ""}`} aria-label="Lens layers">
      <div className="panel-heading">
        <div><span className="eyebrow">{t(locale, "observation")}</span><h2>{t(locale, "layers")}</h2></div>
      </div>
      <div className="layer-list">
        {categoryOrder.map((category) => {
          const categoryLenses = lenses.filter((lens) => lens.category === category);
          if (!categoryLenses.length) return null;
          return <section className={`layer-category category-${category}`} key={category}>
            <h3 className="layer-category-heading">{categoryLabels[category]}</h3>
            <div className="layer-category-items">{categoryLenses.map((lens) => {
              const active = activeLensIds.has(lens.id);
              return (
                <section className={`layer-item${active ? " is-active" : ""}`} key={lens.id}>
                  <button type="button" className="layer-toggle" aria-pressed={active} disabled={suspended} onClick={() => onToggle(lens.id)}>
                    <span className="toggle-box" aria-hidden="true">{active ? "×" : ""}</span>
                    <span><strong>{lens.name}</strong><small>{localizeLensCategory(lens, locale)}</small></span>
                    <span className="layer-status">{active ? t(locale, "on") : t(locale, "off")}</span>
                  </button>
                  {active && (
                    <>
                      <div className="legend" aria-label={`${lens.name} legend`}>
                        {lens.legend.map((item) => (
                          <span key={item.label}>
                            <i className={`legend-${item.symbol}`} style={{ "--legend-color": item.color } as CSSProperties} />
                            {item.label}
                          </span>
                        ))}
                      </div>
                      {lens.disclosures && <div className="lens-disclosures">{lens.disclosures.map((disclosure) => <span key={disclosure}>{disclosure}</span>)}</div>}
                    </>
                  )}
                </section>
              );
            })}</div>
          </section>;
        })}
      </div>
      <p className="panel-footnote">{suspended ? t(locale, "modernSuspended") : t(locale, "toggleLenses")}</p>
    </aside>
  );
}
