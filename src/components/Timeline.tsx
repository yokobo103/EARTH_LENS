import { useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
 * PaleoDEM は5百万年刻みなので、95 や 220 はキリのいい数字ではなく実際の年代。
 */
const availableAges = [0, 15, 30, 50, 70, 95, 130, 150, 190, 220, 250, 315, 380, 425, 475, 510] as const;
const OLDEST_MA = 510;

/** 三つの大きな区切り。古い順。 */
const eras = [
  { key: "eraPaleozoic", from: OLDEST_MA, to: 252 },
  { key: "eraMesozoic", from: 252, to: 66 },
  { key: "eraCenozoic", from: 66, to: 0 },
] as const;

/** 線の上での位置。左が古く、右が現在。時間が左から右へ流れる向きに合わせる。 */
const ratioOf = (ageMa: number) => 1 - ageMa / OLDEST_MA;
const position = (ageMa: number) => `${ratioOf(ageMa) * 100}%`;

function nearestAge(ratio: number): number {
  const wanted = (1 - Math.min(1, Math.max(0, ratio))) * OLDEST_MA;
  return availableAges.reduce((best, age) => (Math.abs(age - wanted) < Math.abs(best - wanted) ? age : best), availableAges[0]);
}

/**
 * 年代を「数直線」で選ぶ。
 *
 * 目盛りは押せるが、押しボタンには見せない。線のどこを触っても近い年代へ寄る。
 * 目盛りが現在側で詰まっているのは詰め方が悪いのではなく、新生代が本当に短いから。
 * 対数にすれば見た目は均等になるが、それは嘘をつくことになるので線形のままにする。
 *
 * ドラッグ中は印だけ動かし、年代を確定するのは指を離したとき。
 * 通り道の年代を全部読みに行かせない。
 */
export function Timeline({ selection, locale, onChange }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragAge, setDragAge] = useState<number | null>(null);
  const here = selection.mode === "present" ? 0 : selection.ageMa;
  const shown = dragAge ?? here;

  const select = (ageMa: number) => {
    if (ageMa === here) return;
    onChange(ageMa === 0 ? { mode: "present", ageMa: 0 } : { mode: "deep-time", ageMa });
  };
  const ageAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return here;
    return nearestAge((clientX - rect.left) / rect.width);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragAge(ageAt(event.clientX));
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragAge === null) return;
    setDragAge(ageAt(event.clientX));
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragAge === null) return;
    const settled = ageAt(event.clientX);
    setDragAge(null);
    select(settled);
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = availableAges.indexOf(here as (typeof availableAges)[number]);
    if (index < 0) return;
    // 左が古い方なので、左キーで一つ昔へ。
    const next = event.key === "ArrowLeft" || event.key === "ArrowDown" ? index + 1
      : event.key === "ArrowRight" || event.key === "ArrowUp" ? index - 1
      : event.key === "Home" ? 0
      : event.key === "End" ? availableAges.length - 1
      : -1;
    if (next < 0 || next >= availableAges.length) return;
    event.preventDefault();
    select(availableAges[next] ?? 0);
  };

  return (
    <div className="time-scale">
      <div className="time-scale-now">
        <strong>{shown === 0 ? t(locale, "present") : `${shown} Ma`}</strong>
        <small>PALEOMAP</small>
      </div>

      <div className="time-scale-body">
        <div className="time-scale-eras" aria-hidden="true">
          {eras.map((era) => <span key={era.key} style={{ flexGrow: era.from - era.to }}>{t(locale, era.key)}</span>)}
        </div>

        <div
          ref={trackRef}
          className="time-scale-track"
          role="slider"
          tabIndex={0}
          aria-label={t(locale, "deepTime")}
          aria-valuemin={0}
          aria-valuemax={OLDEST_MA}
          aria-valuenow={here}
          aria-valuetext={here === 0 ? t(locale, "present") : `${here} Ma`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={() => setDragAge(null)}
          onKeyDown={onKeyDown}
        >
          <i className="time-scale-line" aria-hidden="true" />
          <i className="time-scale-past" style={{ width: `${(shown / OLDEST_MA) * 100}%` }} aria-hidden="true" />
          {availableAges.map((ageMa) => (
            <i key={ageMa} className={`time-scale-stop${shown === ageMa ? " is-here" : ""}`} style={{ left: position(ageMa) }} aria-hidden="true" />
          ))}
        </div>
      </div>
    </div>
  );
}
