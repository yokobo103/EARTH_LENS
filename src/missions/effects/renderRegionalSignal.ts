import {
  Cartesian2,
  Cartesian3,
  CallbackProperty,
  Color,
  ColorMaterialProperty,
  Entity,
  LabelStyle,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import type { MissionOverlayHandle } from "../overlays/types";
import type { MissionHintEffect } from "../types";

type RegionalSignalEffect = Extract<MissionHintEffect, { type: "region-signal" | "feature-signal" }>;

export function renderRegionalSignal(viewer: Viewer, effect: RegionalSignalEffect): MissionOverlayHandle {
  const { longitude, latitude } = effect.location;
  const startedAt = performance.now();
  const radiusMeters = effect.radiusKm * 1_000;
  const pulseRadius = new CallbackProperty(() => radiusMeters * (0.97 + 0.03 * Math.sin((performance.now() - startedAt) / 520)), false);
  const pulseColor = new CallbackProperty(() => Color.fromCssColorString("#79e3d2").withAlpha(0.075 + 0.025 * Math.sin((performance.now() - startedAt) / 520)), false);
  const signalArea = viewer.entities.add(new Entity({
    id: `mission-effect:${effect.type}:${longitude}:${latitude}`,
    name: effect.label,
    position: Cartesian3.fromDegrees(longitude, latitude, 2_000),
    ellipse: {
      semiMajorAxis: pulseRadius,
      semiMinorAxis: pulseRadius,
      height: 2_000,
      material: new ColorMaterialProperty(pulseColor),
      outline: true,
      outlineColor: Color.fromCssColorString("#79e3d2").withAlpha(0.58),
    },
    label: {
      text: effect.label,
      font: "700 10px ui-monospace, monospace",
      fillColor: Color.fromCssColorString("#bff8ee").withAlpha(0.85),
      outlineColor: Color.fromCssColorString("#04100f"),
      outlineWidth: 4,
      style: LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: VerticalOrigin.BOTTOM,
      pixelOffset: new Cartesian2(0, -8),
    },
  }));
  return { destroy: () => { if (!viewer.isDestroyed()) viewer.entities.remove(signalArea); } };
}
