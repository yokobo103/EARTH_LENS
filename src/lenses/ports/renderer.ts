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

/**
 * 段の高さ。河川レンズと同じで、画面に何が映るかで決めてある。
 * 日本列島が全部入るのが 2,600 km、大陸ひとつが 4,000-6,000 km 付近。
 */
const WORLD_BELOW_METRES = Number.POSITIVE_INFINITY;
const CONTINENT_BELOW_METRES = 6_000_000;
const COUNTRY_BELOW_METRES = 2_800_000;

/**
 * 見た目に効くのは段だけ。軸（container / bulk / energy / connectivity）は
 * 色にも形にも出さない。軸が決めるのは「どの段に入るか」と「地点カードの説明」だけ。
 *
 * 大きさも3段階しか無い。軸をまたいで 4,110万TEU と 12.6億トンを同じ物差しに
 * 載せる方法は無いので、段より細かい序列は作らない。
 */
function pixelSizeForTier(tier: number): number {
  return tier === 1 ? 8.5 : tier === 2 ? 6 : 4.5;
}

function ringVisibleMetres(tier: number): number {
  return tier === 1 ? 9_000_000 : tier === 2 ? 6_500_000 : 3_000_000;
}

function signalMaximumDistance(tier: number): number {
  if (tier === 1) return WORLD_BELOW_METRES;
  if (tier === 2) return CONTINENT_BELOW_METRES;
  return COUNTRY_BELOW_METRES;
}

/**
 * ラベルは段ごとにさらに絞る。実測で、オランダを国スケールで見ると
 * 149枚のラベルが出ていて、そのほとんどが漁港だった。
 */
function labelMaximumDistanceForTier(tier: number): number {
  return tier === 1 ? 9_000_000 : tier === 2 ? 3_500_000 : 1_200_000;
}

export function renderPorts(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  const labelsByFeature = new Map<string, Entity>();
  const normalLabelDistance = new Map<string, number>();

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const { longitude, latitude } = feature.geometry.coordinates;
    const tier = typeof feature.attributes.displayTier === "number" ? feature.attributes.displayTier : 3;
    const signalSize = pixelSizeForTier(tier);
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
        distanceDisplayCondition: new DistanceDisplayCondition(0, signalMaximumDistance(tier)),
      },
      ellipse: {
        semiMajorAxis: 32_000,
        semiMinorAxis: 32_000,
        material: portColor.withAlpha(0.09),
        outline: true,
        outlineColor: portColor.withAlpha(0.32),
        height: 7_000,
        distanceDisplayCondition: new DistanceDisplayCondition(0, ringVisibleMetres(tier)),
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
        distanceDisplayCondition: new DistanceDisplayCondition(0, labelMaximumDistanceForTier(tier)),
      },
    }));
    entities.set(entity.id, feature);
    labelsByFeature.set(feature.id, entity);
    normalLabelDistance.set(feature.id, labelMaximumDistanceForTier(tier));
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
        entity.label.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, id === featureId
          ? labelMaximumDistance("selected")
          : normalLabelDistance.get(id) ?? labelMaximumDistanceForTier(3)));
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
      normalLabelDistance.clear();
    },
  };
}
