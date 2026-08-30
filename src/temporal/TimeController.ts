import type { EarthLensDefinition } from "../lenses/types";
import type { TemporalSelection } from "./types";

export class TimeController {
  static isLensAvailable(lens: EarthLensDefinition, selection: TemporalSelection): boolean {
    if (lens.temporal.mode === "all") return true;
    if (selection.mode === "present") return lens.temporal.mode === "present" || lens.temporal.mode === "historical";
    return lens.temporal.mode === "deep-time";
  }

  static label(selection: TemporalSelection): string {
    return selection.mode === "present" ? "PRESENT" : `${selection.ageMa} MILLION YEARS AGO`;
  }
}
