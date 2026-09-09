import type { TemporalSelection } from "../temporal/types";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface TimelineProps {
  selection: TemporalSelection;
  locale: Locale;
  onChange: (selection: TemporalSelection) => void;
}

/**
 * 復元地形のテクスチャを持っている年代。ここに無い年代へは行けない。
 * PaleoDEM は5百万年刻みなので、95 と 220 はキリのいい数字ではなく実際の年代。
 */
const availableAges = [0, 50, 95, 150, 220, 250] as const;
const OLDEST_MA = 250;

/** 線の上での位置。左が古く、右が現在。時間が左から右へ流れる向きに合わせる。 */
const position = (ageMa: number) => `${(1 - ageMa / OLDEST_MA) * 100}%`;

/** 新生代は6600万年前まで。線の上ではここまでしか占めない。 */
const CENOZOIC_MA = 66;

/**
 * 年代を「数直線」で選ぶ。
 *
 * 地球を見ながら使うものなので、二行より高くしない。
 * 今どこにいるかと、どこまで動けるかだけを出す。model名だけは出典として残す。
 */
export function Timeline({ selection, locale, onChange }: TimelineProps) {
  const here = selection.mode === "present" ? 0 : selection.ageMa;
  const select = (ageMa: number) => onChange(ageMa === 0 ? { mode: "present", ageMa: 0 } : { mode: "deep-time", ageMa });

  return (
    <div className="time-scale">
      <div className="time-scale-now">
        <strong>{here === 0 ? t(locale, "present") : `${here} Ma`}</strong>
        <small>PALEOMAP</small>
      </div>

      <div className="time-scale-body">
        <div className="time-scale-eras" aria-hidden="true">
          <span style={{ flexGrow: OLDEST_MA - CENOZOIC_MA }}>{t(locale, "eraMesozoic")}</span>
          <span style={{ flexGrow: CENOZOIC_MA }}>{t(locale, "eraCenozoic")}</span>
        </div>

        <div className="time-scale-track" role="radiogroup" aria-label={t(locale, "deepTime")}>
          <i className="time-scale-line" aria-hidden="true" />
          <i className="time-scale-past" style={{ width: `${(here / OLDEST_MA) * 100}%` }} aria-hidden="true" />
          {availableAges.map((ageMa) => (
            <button
              key={ageMa}
              type="button"
              role="radio"
              aria-checked={here === ageMa}
              aria-label={ageMa === 0 ? t(locale, "present") : `${ageMa} Ma`}
              className={`time-scale-stop${here === ageMa ? " is-here" : ""}`}
              style={{ left: position(ageMa) }}
              onClick={() => select(ageMa)}
            >
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
