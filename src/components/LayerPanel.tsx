import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { EarthLensDefinition } from "../lenses/types";
import { groupLensesForDisplay, sampleDataLensIds, type LensGroupId } from "../lenses/registry";
import { t } from "../i18n/copy";
import { localizeConfidence, localizeLensCategory } from "../i18n/domain";
import type { Locale } from "../i18n/types";

interface LayerPanelProps {
  lenses: EarthLensDefinition[];
  activeLensIds: Set<string>;
  locale: Locale;
  onToggle: (lensId: string) => void;
  suspended?: boolean;
  missionRecommendedLensIds?: readonly string[];
  /** レンズではないが、レンズの棚の端に置くもの。押すと年代の線が出る。 */
  bonusLens?: { active: boolean; onToggle: () => void };
}

interface LensInfoState {
  lens: EarthLensDefinition;
  top: number;
  left: number;
  detailsOpen: boolean;
}

function firstLook(lensId: string, locale: Locale): string {
  const copy: Record<string, [string, string]> = {
    "populated-places": ["明るい場所と、その周りの暗さ", "The bright clusters and the darkness around them"],
    "major-ports": ["海の道が陸に渡る地点", "Where sea routes hand off to land"],
    "strategic-chokepoints": ["細く絞られた通り道", "The narrow passages everything must pass through"],
    "shipping-flows": ["物が海を越えて動く方向", "Where things move across the sea"],
    "submarine-cable-connections": ["海を越えてつながる地域", "The regions connected across the sea"],
    "eez": ["陸から海へ広がる境界", "The boundary that extends from land into the sea"],
    "admin0-borders": ["地形と一致する線、しない線", "Borders that follow the terrain — and those that do not"],
    "sea-ice-edges": ["季節で動く海の縁", "The edge of the sea that moves with the season"],
    "physical-features": ["人の移動を押しやる地形", "The terrain that pushes movement aside"],
    deserts: ["乾きが続く地域のまとまり", "The regions where dryness persists"],
    rivers: ["大きな水系の骨格", "The skeleton of major water systems"],
  };
  const value = copy[lensId];
  return value ? value[locale === "ja" ? 0 : 1] : locale === "ja" ? "地球上で何が重なるか" : "What becomes visible when views overlap";
}

function LensGlyph({ lensId }: { lensId: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (lensId) {
    case "populated-places": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><circle cx="9" cy="8" r="3" {...common} /><circle cx="16.5" cy="9" r="2.3" {...common} /><path d="M3.5 19c.5-3.2 2.3-4.8 5.5-4.8s5 1.6 5.5 4.8M13 15c2.8-.7 5.2.6 6 3.5" {...common} /></svg>;
    case "major-ports": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><circle cx="12" cy="3.5" r="1.5" {...common} /><path d="M12 5v10.5M8.5 8h7M7 14.5c0 3-2 4.5-5 4.5 2.4 2 5.8 2.5 10 2.5s7.6-.5 10-2.5c-3 0-5-1.5-5-4.5" {...common} /></svg>;
    case "strategic-chokepoints": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M4 5c4.4 0 4.4 14 8 14s3.6-14 8-14" {...common} /><path d="M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3M12 4v3M12 9v3M12 15v3" {...common} /></svg>;
    case "shipping-flows": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><circle cx="4" cy="17" r="2" {...common} /><path d="M6 7h8c2.2 0 3 1.2 3 2.8S16.2 13 14 13h-4c-2.2 0-3 1.2-3 2.8S8.8 19 11 19h8M16 5l3 2-3 2" {...common} /></svg>;
    case "submarine-cable-connections": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><circle cx="6" cy="17" r="2.5" {...common} /><circle cx="18" cy="7" r="2.5" {...common} /><path d="M8 15l8-6M9 18l6-3" {...common} /></svg>;
    case "eez": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M4 4v5l2 2-2 3v6" {...common} /><path d="M7 18c2-1 4-1 6 0s4 1 7 0" {...common} /><path d="M11 4c3 1 6 3.5 8 7" {...common} strokeDasharray="2.5 2.5" /><path d="M11 4c1.5 3 2 6 1 9" {...common} strokeDasharray="2.5 2.5" /></svg>;
    case "admin0-borders": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M7 3v4l3 3-3 4v7M17 3v4l-3 3 3 4v7" {...common} /><path d="M12 4v3M12 10v3M12 16v4" {...common} strokeDasharray="3 2" /></svg>;
    case "sea-ice-edges": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M7 5.2l10 13.6M17 5.2L7 18.8" {...common} /></svg>;
    case "physical-features": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M3 19l7-9 3.5 4 2.5-3 5 8M7 19l3-4 2.5 3 3.5-5 2.5 6" {...common} /></svg>;
    case "deserts": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><circle cx="12" cy="12" r="4" {...common} /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" {...common} /></svg>;
    case "rivers": return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M3 7c3.5 0 3.5 3 7 3s3.5-3 7-3 3.5 3 4 3M3 14c3.5 0 3.5 3 7 3s3.5-3 7-3 3.5 3 4 3" {...common} /></svg>;
    default: return <svg viewBox="0 0 24 24" aria-hidden="true" className="lens-glyph"><path d="M12 3l8 9-8 9-8-9 8-9z" {...common} /></svg>;
  }
}

export function LayerPanel({ lenses, activeLensIds, locale, onToggle, suspended = false, missionRecommendedLensIds, bonusLens }: LayerPanelProps) {
  const [info, setInfo] = useState<LensInfoState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickFor = useRef<string | null>(null);
  const lastPointerType = useRef<string | null>(null);
  const groupLabels: Record<LensGroupId, string> = {
    "human-lines": t(locale, "groupHumanLines"),
    "earth-conditions": t(locale, "groupEarthConditions"),
  };
  const lensGroups = groupLensesForDisplay(lenses);

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
      detailsOpen: false,
    });
  };
  const toggleDetails = () => setInfo((current) => current ? { ...current, detailsOpen: !current.detailsOpen } : current);
  const startLongPress = (event: ReactPointerEvent<HTMLButtonElement>, lens: EarthLensDefinition) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    lastPointerType.current = event.pointerType;
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
      <div className="lens-rail-heading"><div><span>{locale === "ja" ? "視点を選ぶ" : "CHOOSE A VIEWPOINT"}</span><small>{locale === "ja" ? "クリックして、地球に重ねてみましょう" : "Click to layer another way of seeing the Earth"}</small></div><em>{locale === "ja" ? "複数選択できます" : "MULTI-SELECT"}</em></div>
      <div className="lens-mobile-hint" role="note">
        <span aria-hidden="true">ⓘ</span>
        <span>{locale === "ja" ? "長押しで説明" : "HOLD FOR INFO"}</span>
      </div>
      <div className="layer-list">
        {lensGroups.map((group) => {
          if (!group.lenses.length) return null;
          return <section className={`layer-category group-${group.id}`} key={group.id} aria-label={groupLabels[group.id]}>
            <h3 className="layer-category-heading">{groupLabels[group.id]}</h3>
            <div className="layer-category-items">{group.lenses.map((lens) => {
              const active = activeLensIds.has(lens.id);
              const recommended = missionRecommendedLensIds?.includes(lens.id) ?? false;
              const legend = lens.legend[0];
              const style = { "--lens-color": legend?.color ?? "#79e3d2" } as CSSProperties;
              return <section className={`layer-item${active ? " is-active" : ""}`} style={style} key={lens.id}>
                <button
                  type="button"
                  className="layer-toggle"
                  aria-pressed={active}
                  aria-haspopup="dialog"
                  disabled={suspended}
                  onClick={(event) => {
                    const pointerType = lastPointerType.current;
                    lastPointerType.current = null;
                    // Desktop click fixes the explanation in the reading area.
                    // Mobile tap is deliberately only ON/OFF; peek is reserved for long-press.
                    if (pointerType === "mouse" || event.detail === 0) openInfo(lens, event.currentTarget);
                    else if (pointerType === "touch") setInfo(null);
                    toggleLens(lens.id);
                  }}
                  onContextMenu={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") openInfo(lens, event.currentTarget);
                  }}
                  onPointerEnter={(event) => { if (event.pointerType === "mouse") openInfo(lens, event.currentTarget); }}
                  onPointerDown={(event) => startLongPress(event, lens)}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onPointerLeave={clearLongPress}
                >
                  <LensGlyph lensId={lens.id} />
                  <span className="lens-chip-label">
                    <strong>{lens.shortName}</strong>
                    {sampleDataLensIds.has(lens.id) && <em className="lens-sample-tag">{t(locale, "sampleData")}</em>}
                  </span>
                  {missionRecommendedLensIds && <span><em className={recommended ? "lens-kit-focus" : "lens-kit-standby"}>{recommended ? t(locale, "missionFocus") : t(locale, "standby")}</em></span>}
                </button>
              </section>;
            })}
            {bonusLens && group === lensGroups[lensGroups.length - 1] && (
              <section className={`layer-item is-bonus${bonusLens.active ? " is-active" : ""}`} style={{ "--lens-color": "#ffd690" } as CSSProperties}>
                <button type="button" className="layer-toggle" aria-pressed={bonusLens.active} disabled={suspended} onClick={bonusLens.onToggle}>
                  <i className="lens-rail-swatch legend-bonus" aria-hidden="true" />
                  <span className="lens-chip-label"><strong>{t(locale, "bonusLensChip")}</strong></span>
                </button>
              </section>
            )}</div>
          </section>;
        })}
      </div>
      {suspended && <p className="lens-rail-status">{t(locale, "modernSuspended")}</p>}
      {info && <aside className="lens-info-card" role="dialog" aria-label={`${info.lens.name} ${t(locale, "lensInfo")}`} style={{ top: info.top, left: info.left }}>
        <button type="button" className="anchor-close" onClick={() => setInfo(null)} aria-label={t(locale, "close")}>×</button>
        <span className="eyebrow">{localizeLensCategory(info.lens, locale).toUpperCase()} LENS</span>
        <h2>{info.lens.name}</h2>
        <p>{info.lens.description}</p>
        <div className="lens-peek-first"><span>{locale === "ja" ? "まず見る" : "START WITH"}</span><strong>{firstLook(info.lens.id, locale)}</strong></div>
        <button type="button" className={`lens-details-toggle${info.detailsOpen ? " is-open" : ""}`} onClick={toggleDetails}>{info.detailsOpen ? (locale === "ja" ? "意味に戻る ↑" : "BACK TO MEANING ↑") : (locale === "ja" ? "詳しく見る →" : "OPEN EVIDENCE →")}</button>
        {info.detailsOpen && <div className="lens-evidence"><div className="lens-evidence-heading"><span>{locale === "ja" ? "証拠を読む" : "READ THE EVIDENCE"}</span><small>{locale === "ja" ? "出典・条件・派生データ" : "Source · conditions · derived data"}</small></div><div className="legend" aria-label={`${info.lens.name} legend`}>{info.lens.legend.map((item) => <span key={item.label}><i className={`legend-${item.symbol}`} style={{ "--legend-color": item.color } as CSSProperties} />{item.label}</span>)}</div>{info.lens.disclosures && <div className="lens-disclosures">{info.lens.disclosures.map((item) => <span key={item}>{item}</span>)}</div>}<dl className="detail-grid"><dt>{t(locale, "source")}</dt><dd>{info.lens.provenance.source}</dd><dt>{t(locale, "license")}</dt><dd>{info.lens.provenance.license}</dd><dt>{t(locale, "updated")}</dt><dd>{info.lens.provenance.updatedAt}</dd><dt>{t(locale, "dataConfidence")}</dt><dd>{localizeConfidence(info.lens.provenance.confidence, locale)}</dd>{info.lens.provenance.derivedFrom?.map((derived) => <Fragment key={derived.source}><dt>{t(locale, "derivedFrom")}</dt><dd><a href={derived.sourceUrl} target="_blank" rel="noreferrer">{derived.source} ↗</a>{derived.citation && <small>{derived.citation}</small>}<small>{derived.license}</small></dd></Fragment>)}</dl>{info.lens.provenance.sourceUrl && <a className="source-link" href={info.lens.provenance.sourceUrl} target="_blank" rel="noreferrer">{t(locale, "viewReference")}</a>}{info.lens.furtherReading && info.lens.furtherReading.length > 0 && <section className="further-reading"><div className="further-reading-heading"><strong>{t(locale, "furtherReading")}</strong><small>{t(locale, "externalGuide")}</small></div>{info.lens.furtherReading.map((reading) => <article key={reading.url}><a href={reading.url} target="_blank" rel="noreferrer">{reading.title} ↗</a><p>{reading.note}</p><small>{reading.language === "en" ? t(locale, "englishOnly") : reading.language.toUpperCase()} · {t(locale, "checked")} {reading.checkedAt}</small></article>)}</section>}</div>}
      </aside>}
    </aside>
  );
}
