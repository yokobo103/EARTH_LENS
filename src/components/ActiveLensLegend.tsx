import type { CSSProperties } from "react";
import type { EarthLensDefinition } from "../lenses/types";
import { groupLensesForDisplay } from "../lenses/registry";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface ActiveLensLegendProps {
  lenses: EarthLensDefinition[];
  activeLensIds: Set<string>;
  locale: Locale;
}

/**
 * いま点いているレンズだけを、地球のすぐ下に並べる読み取り専用の凡例。
 *
 * 印は地球（画面中央）に出るのに、その意味を書いたものが画面端のレンズ一覧しか無かった。
 * 一覧は「選ぶための操作盤」、ここは「いま何が出ているかの読み取り」で役割を分ける。
 * 操作の入口を増やさないため、ここは押せない（button も onClick も持たない）。
 */
export function ActiveLensLegend({ lenses, activeLensIds, locale }: ActiveLensLegendProps) {
  // 一覧と同じ並びで出す。凡例と操作盤で順番が違うと照合できない。
  const active = groupLensesForDisplay(lenses).flatMap((group) => group.lenses).filter((lens) => activeLensIds.has(lens.id));
  if (!active.length) return null;

  return (
    <div className="active-lens-legend" aria-label={t(locale, "lensesShowing")}>
      <span className="active-lens-legend-label">{t(locale, "lensesShowing")}</span>
      <ul>
        {active.map((lens) => {
          const legend = lens.legend[0];
          const style = { "--lens-color": legend?.color ?? "#79e3d2" } as CSSProperties;
          return (
            <li key={lens.id} style={style}>
              <i className={`lens-rail-swatch legend-${legend?.symbol ?? "point"}`} aria-hidden="true" />
              <span>{lens.shortName}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
