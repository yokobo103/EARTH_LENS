import {
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  LabelStyle,
  NearFarScalar,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

function colorForIndex(index: number): Color {
  const low = Color.fromCssColorString("#7656c7");
  const high = Color.fromCssColorString("#f0a6ff");
  return Color.lerp(low, high, Math.max(0, Math.min(1, index / 100)), new Color()).withAlpha(0.72);
}

export function renderCriticalMinerals(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  const collection = viewer.entities;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const index = Number(feature.attributes.productionIndex);
    const height = 260_000 + index * 9_000;
    const { longitude, latitude } = feature.geometry.coordinates;
    const entity = collection.add(new Entity({
      id: `${dataset.lensId}:${feature.id}`,
      name: feature.name,
      position: Cartesian3.fromDegrees(longitude, latitude, height / 2),
      cylinder: {
        length: height,
        topRadius: 105_000,
        bottomRadius: 145_000,
        material: colorForIndex(index),
        outline: true,
        outlineColor: Color.fromCssColorString("#f1c8ff").withAlpha(0.65),
        numberOfVerticalLines: 8,
      },
      label: {
        text: `${feature.attributes.country}\n${feature.attributes.mineral} · ${index}`,
        font: "650 10px ui-monospace, monospace",
        fillColor: Color.fromCssColorString("#f4dcff"),
        outlineColor: Color.fromCssColorString("#100817"),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(0, -16),
        verticalOrigin: VerticalOrigin.BOTTOM,
        scaleByDistance: new NearFarScalar(2_000_000, 1, 18_000_000, 0.55),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 18_000_000),
      },
    }));
    entities.set(entity.id, feature);
  }

  return {
    setVisible(visible) {
      for (const entityId of entities.keys()) {
        const entity = collection.getById(entityId);
        if (entity) entity.show = visible;
      }
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return entities.get(picked.id);
    },
    destroy() {
      for (const entityId of entities.keys()) collection.removeById(entityId);
      entities.clear();
    },
  };
}
