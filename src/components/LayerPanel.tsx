import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { EarthLensDefinition, LensCategory } from "../lenses/types";
import { t } from "../i18n/copy";
import { localizeConfidence } from "../i18n/domain";
import type { Locale } from "../i18n/types";

interface LayerPanelProps {
  lenses: EarthLensDefinition[];
  activeLensIds: Set<string>;
  locale: Locale;
  onToggle: (lensId: string) => void;
  suspended?: boolean;
}

interface LensInfoState {
  lens: EarthLensDefinition;
  top: number;
  left: number;
}

export function LayerPanel({ lenses, activeLensIds, locale, onToggle, suspended = false }: LayerPanelProps) {
  const [info, setInfo] = useState<LensInfoState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickFor = useRef<string | null>(null);
  const categoryOrder: LensCategory[] = ["earth", "resources", "human", "power"];
  const categoryLabels: Record<LensCategory, string> = {
    earth: t(locale, "categoryEarth"), resources: t(locale, "categoryResources"),
    human: t(locale, "categoryHuman"), power: t(locale, "categoryPower"),
  };

  useEffect(() => () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const clearLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };
  const openInfo = (lens: EarthLensDefinition, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setInfo({
      lens,
      top: Math.max(82, Math.min(rect.top, window.innerHeight - 390)),
      left: Math.min(rect.right + 10, window.innerWidth - 330),
    });
  };
  const startLongPress = (event: ReactPointerEvent<HTMLButtonElement>, lens: EarthLensDefinition) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    clearLongPress();
    const target = event.currentTarget;
    longPressTimer.current = setTimeout(() => {
      suppressClickFor.current = lens.id;
      openInfo(lens, target);
    }, 520);
  };
  const toggleLens = (lensId: string) => {
    if (suppressClickFor.current === lensId) {
      suppressClickFor.current = null;
      return;
    }
    onToggle(lensId);
  };

  return (
    <aside className={`layer-panel lens-rail${suspended ? " is-suspended" : ""}`} aria-label="Lens rail">
      <div className="lens-rail-heading"><span>{t(locale, "layers")}</span><small>{t(locale, "holdForDetails")}</small></div>
      <div className="layer-list">
        {categoryOrder.map((category) => {
          const categoryLenses = lenses.filter((lens) => lens.category === category);
          if (!categoryLenses.length) return null;
          return <section className={`layer-category category-${category}`} key={category} aria-label={categoryLabels[category]}>
            <h3 className="layer-category-heading">{categoryLabels[category]}</h3>
            <div className="layer-category-items">{categoryLenses.map((lens) => {
              const active = activeLensIds.has(lens.id);
              const legend = lens.legend[0];
              const style = { "--lens-color": legend?.color ?? "#79e3d2" } as CSSProperties;
              return <section className={`layer-item${active ? " is-active" : ""}`} style={style} key={lens.id}>
                <button
                  type="button"
                  className="layer-toggle"
                  aria-pressed={active}
                  aria-haspopup="dialog"
                  disabled={suspended}
                  onClick={() => toggleLens(lens.id)}
                  onContextMenu={(event) => { event.preventDefault(); openInfo(lens, event.currentTarget); }}
                  onKeyDown={(event) => {
                    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                      event.preventDefault();
                      openInfo(lens, event.currentTarget);
                    }
                  }}
                  onPointerDown={(event) => startLongPress(event, lens)}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onPointerLeave={clearLongPress}
                >
                  <i className={`lens-rail-swatch legend-${legend?.symbol ?? "point"}`} aria-hidden="true" />
                  <strong>{lens.name}</strong>
                  <span>{active ? t(locale, "on") : t(locale, "off")}</span>
                </button>
              </section>;
            })}</div>
          </section>;
        })}
      </div>
      {suspended && <p className="lens-rail-status">{t(locale, "modernSuspended")}</p>}
      {info && <aside className="lens-info-card" role="dialog" aria-label={`${info.lens.name} ${t(locale, "details")}`} style={{ top: info.top, left: info.left }}>
        <button type="button" className="anchor-close" onClick={() => setInfo(null)} aria-label={t(locale, "close")}>×</button>
        <span className="eyebrow">{info.lens.category.toUpperCase()} LENS</span>
        <h2>{info.lens.name}</h2>
        <p>{info.lens.description}</p>
        <div className="legend" aria-label={`${info.lens.name} legend`}>{info.lens.legend.map((item) => <span key={item.label}><i className={`legend-${item.symbol}`} style={{ "--legend-color": item.color } as CSSProperties} />{item.label}</span>)}</div>
        {info.lens.disclosures && <div className="lens-disclosures">{info.lens.disclosures.map((item) => <span key={item}>{item}</span>)}</div>}
        <dl className="detail-grid"><dt>{t(locale, "source")}</dt><dd>{info.lens.provenance.source}</dd><dt>{t(locale, "license")}</dt><dd>{info.lens.provenance.license}</dd><dt>{t(locale, "updated")}</dt><dd>{info.lens.provenance.updatedAt}</dd><dt>{t(locale, "dataConfidence")}</dt><dd>{localizeConfidence(info.lens.provenance.confidence, locale)}</dd></dl>
        {info.lens.provenance.sourceUrl && <a className="source-link" href={info.lens.provenance.sourceUrl} target="_blank" rel="noreferrer">{t(locale, "viewReference")}</a>}
        {info.lens.furtherReading && info.lens.furtherReading.length > 0 && <section className="further-reading"><div className="further-reading-heading"><strong>{t(locale, "furtherReading")}</strong><small>{t(locale, "externalGuide")}</small></div>{info.lens.furtherReading.map((reading) => <article key={reading.url}><a href={reading.url} target="_blank" rel="noreferrer">{reading.title} ↗</a><p>{reading.note}</p><small>{reading.language === "en" ? t(locale, "englishOnly") : reading.language.toUpperCase()} · {t(locale, "checked")} {reading.checkedAt}</small></article>)}</section>}
      </aside>}
    </aside>
  );
}
