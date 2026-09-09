import type { TemporalSelection } from "../temporal/types";
import { t } from "../i18n/copy";
import type { Locale } from "../i18n/types";

interface TimelineProps {
  selection: TemporalSelection;
  locale: Locale;
  onChange: (selection: TemporalSelection) => void;
}

/** 復元海岸線を持っている年代。ここに無い年代へは行けない。 */
const availableAges = [0, 50, 100, 150, 200, 250] as const;
const OLDEST_MA = 250;

/** 線の上での位置。左が今、右が昔。 */
const position = (ageMa: number) => `${(ageMa / OLDEST_MA) * 100}%`;

/** 新生代は6600万年前まで。線の上ではここまでしか占めない。 */
const CENOZOIC_MA = 66;

/**
 * 年代を「数直線」で選ぶ。
 *
 * ボタンを6個並べると設定画面に見えるが、行き先は場所ではなく時間なので、
 * 選ぶ前に「どこからどこまで動けるのか」が見えている方がいい。
 * 線の長さがそのまま時間の長さで、新生代が中生代の隣で薄いのは事実そのもの。
 *
 * 目盛りは押せるが、押しボタンには見せない。線を触ると年代が変わる、
 * という以上の説明は要らないはず。
 */
export function Timeline({ selection, locale, onChange }: TimelineProps) {
  const here = selection.mode === "present" ? 0 : selection.ageMa;
  const select = (ageMa: number) => onChange(ageMa === 0 ? { mode: "present", ageMa: 0 } : { mode: "deep-time", ageMa });

  return (
    <div className="time-scale">
      <div className="time-scale-eras" aria-hidden="true">
        <span style={{ flexGrow: CENOZOIC_MA }}>{t(locale, "eraCenozoic")}</span>
        <span style={{ flexGrow: OLDEST_MA - CENOZOIC_MA }}>{t(locale, "eraMesozoic")}</span>
      </div>

      <div className="time-scale-track" role="radiogroup" aria-label={t(locale, "deepTime")}>
        <i className="time-scale-line" aria-hidden="true" />
        <i className="time-scale-past" style={{ width: position(here) }} aria-hidden="true" />
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

      <div className="time-scale-ends" aria-hidden="true">
        <span>{t(locale, "present")}</span>
        <span>{OLDEST_MA} Ma</span>
      </div>

      <p className="time-scale-readout">
        {selection.mode === "present"
          ? <span>{t(locale, "timeScaleHint")}</span>
          : <><strong>{selection.ageMa} Ma · ZAHIROVIC2022</strong><small>{t(locale, "paleoModelNote")}</small></>}
      </p>
    </div>
  );
}
