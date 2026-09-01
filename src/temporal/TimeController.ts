import type { EarthLensDefinition } from "../lenses/types";
import type { TemporalSelection } from "./types";

export class TimeController {
  static isLensAvailable(lens: EarthLensDefinition, selection: TemporalSelection): boolean {
    if (lens.temporal.mode === "all") return true;
    if (selection.mode === "present") return lens.temporal.mode === "present" || lens.temporal.mode === "historical";
    // Deep Time is an overlay lens: present-day evidence keeps its current
    // coordinates so users can compare today's systems with past coastlines.
    // A future deep-time-native lens can still use this same availability gate.
    return true;
  }

  static label(selection: TemporalSelection): string {
    return selection.mode === "present" ? "PRESENT" : `${selection.ageMa} MILLION YEARS AGO`;
  }
}
