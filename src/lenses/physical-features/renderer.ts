import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  LabelStyle,
  Math as CesiumMath,
  NearFarScalar,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import { labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

function numberAttribute(feature: LensFeature, key: string): number {
  const value = feature.attributes[key];
  return typeof value === "number" ? value : 0;
}

function featureColor(feature: LensFeature): Color {
  const role = feature.attributes.physicalRole;
  if (role === "corridor" || role === "chokepoint") return Color.fromCssColorString("#7fe0c6");
  if (role === "desert") return Color.fromCssColorString("#d8b76a");
  if (role === "plateau") return Color.fromCssColorString("#c99bdc");
  return Color.fromCssColorString("#e7d49b");
}

export function renderPhysicalFeatures(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  const labelsByFeature = new Map<string, Entity>();
  let visible = false;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const { longitude, latitude } = feature.geometry.coordinates;
    const color = featureColor(feature);
    const footprint = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}:footprint`,
      name: feature.name,
      position: Cartesian3.fromDegrees(longitude, latitude, 2_000),
      ellipse: {
        semiMajorAxis: numberAttribute(feature, "footprintMajorKm") * 500,
        semiMinorAxis: numberAttribute(feature, "footprintMinorKm") * 500,
        rotation: CesiumMath.toRadians(numberAttribute(feature, "footprintRotationDeg")),
        material: color.withAlpha(0.11),
        outline: true,
        outlineColor: color.withAlpha(0.7),
        height: 2_000,
      },
      point: {
        pixelSize: 6,
        color: color.withAlpha(0.95),
        outlineColor: Color.fromCssColorString("#071216"),
        outlineWidth: 2,
        scaleByDistance: new NearFarScalar(1_500_000, 1.35, 25_000_000, 0.65),
      },
      label: {
        text: feature.name,
        font: "700 10px ui-monospace, monospace",
        fillColor: color,
        outlineColor: Color.fromCssColorString("#071216"),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(0, -17),
        verticalOrigin: VerticalOrigin.BOTTOM,
        distanceDisplayCondition: new DistanceDisplayCondition(0, labelMaximumDistance("normal")),
      },
    }));
    entities.set(footprint.id, feature);
    labelsByFeature.set(feature.id, footprint);
  }

  return {
    setVisible(nextVisible) {
      visible = nextVisible;
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
