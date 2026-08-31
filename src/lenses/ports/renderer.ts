import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  LabelStyle,
  NearFarScalar,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import { labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

const portColor = Color.fromCssColorString("#f1cf70");

function signalMaximumDistance(scaleRank: number): number {
  if (scaleRank <= 4) return 42_000_000;
  if (scaleRank === 5) return 28_000_000;
  if (scaleRank === 6) return 19_000_000;
  if (scaleRank === 7) return 13_000_000;
  return 10_000_000;
}

export function renderPorts(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  const labelsByFeature = new Map<string, Entity>();

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const { longitude, latitude } = feature.geometry.coordinates;
    const scaleRank = typeof feature.attributes.scaleRank === "number" ? feature.attributes.scaleRank : 8;
    const signalSize = Math.max(4.5, 8 - scaleRank * 0.42);
    const entity = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}`,
      name: feature.name,
      position: Cartesian3.fromDegrees(longitude, latitude, 9_000),
      point: {
        pixelSize: signalSize,
        color: portColor.withAlpha(0.94),
        outlineColor: Color.fromCssColorString("#181407"),
        outlineWidth: 1.5,
        scaleByDistance: new NearFarScalar(1_200_000, 1.35, 35_000_000, 0.45),
        distanceDisplayCondition: new DistanceDisplayCondition(0, signalMaximumDistance(scaleRank)),
      },
      ellipse: {
        semiMajorAxis: 32_000,
        semiMinorAxis: 32_000,
        material: portColor.withAlpha(0.09),
        outline: true,
        outlineColor: portColor.withAlpha(0.32),
        height: 7_000,
        distanceDisplayCondition: new DistanceDisplayCondition(0, 6_500_000),
      },
      label: {
        text: feature.name,
        font: "700 10px ui-monospace, monospace",
        fillColor: Color.fromCssColorString("#ffecb2"),
        outlineColor: Color.fromCssColorString("#071216"),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(0, -18),
        verticalOrigin: VerticalOrigin.BOTTOM,
        distanceDisplayCondition: new DistanceDisplayCondition(0, labelMaximumDistance("normal")),
      },
    }));
    entities.set(entity.id, feature);
    labelsByFeature.set(feature.id, entity);
  }

  return {
    setVisible(visible) {
      for (const entityId of entities.keys()) {
        const entity = viewer.entities.getById(entityId);
        if (entity) entity.show = visible;
      }
    },
    setSelectedFeature(featureId) {
      for (const [id, entity] of labelsByFeature) {
        if (!entity.label) continue;
        entity.label.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, labelMaximumDistance(id === featureId ? "selected" : "normal")));
      }
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return entities.get(picked.id);
    },
    destroy() {
      for (const entityId of entities.keys()) viewer.entities.removeById(entityId);
      entities.clear();
      labelsByFeature.clear();
    },
  };
}
