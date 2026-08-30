import {
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  HeightReference,
  LabelStyle,
  NearFarScalar,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

export function renderChokepoints(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  const collection = viewer.entities;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const { longitude, latitude } = feature.geometry.coordinates;
    const entity = collection.add(
      new Entity({
        id: `${dataset.lensId}:${feature.id}`,
        name: feature.name,
        position: Cartesian3.fromDegrees(longitude, latitude, 1_500),
        point: {
          pixelSize: 9,
          color: Color.fromCssColorString("#ffb454"),
          outlineColor: Color.fromCssColorString("#29190d"),
          outlineWidth: 3,
          heightReference: HeightReference.NONE,
          scaleByDistance: new NearFarScalar(2_000_000, 1.35, 30_000_000, 0.65),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 40_000_000),
        },
        label: {
          text: feature.name.toUpperCase(),
          font: "600 11px ui-monospace, monospace",
          fillColor: Color.fromCssColorString("#ffe4be"),
          outlineColor: Color.fromCssColorString("#081014"),
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -18),
          verticalOrigin: VerticalOrigin.BOTTOM,
          scaleByDistance: new NearFarScalar(2_000_000, 1, 16_000_000, 0.55),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 16_000_000),
        },
      }),
    );
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
