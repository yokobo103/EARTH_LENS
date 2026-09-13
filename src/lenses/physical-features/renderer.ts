import {
  ArcType,
  Cartesian2,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  LabelStyle,
  PolygonHierarchy,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import { LABEL_WEIGHT_ATTRIBUTE } from "../../globe/cesium/declutterLabels";
import { areaSpanDegrees, labelDistanceForExtent, labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import type { GeographicAreaPolygon, LensDataset, LensFeature, LensRenderHandle } from "../types";

// 乾燥帯（砂色の面）と重なっても読めるよう、寒色で描く。
const featureColor = Color.fromCssColorString("#93a9c9");

/**
 * 段の高さ。河川・港と同じで、画面に何が映るかで決めてある。
 * 世界 6,000 km 超 / 大陸 2,800-6,000 km / 国 2,800 km 未満。
 * 国より寄っても地物は増やさない。
 */
const CONTINENT_BELOW_METRES = 6_000_000;
const COUNTRY_BELOW_METRES = 2_800_000;

function tierOf(feature: LensFeature): number {
  const value = feature.attributes.displayTier;
  return typeof value === "number" ? value : 3;
}

function maximumDistanceForTier(tier: number): number {
  if (tier <= 1) return Number.POSITIVE_INFINITY;
  if (tier === 2) return CONTINENT_BELOW_METRES;
  return COUNTRY_BELOW_METRES;
}

/**
 * 高い地面ほど濃く塗る。
 *
 * これまでは山脈が細い枠線、高原が薄い面で、太さも濃さも面積とも標高とも
 * 連動していなかった。ヒマラヤとナガ丘陵が同じ線で出て、閉じた輪郭に名札という
 * 描き方が国境と同じ語彙になり、地形ではなく区画割りに見えていた。
 *
 * 濃さの根拠は、その地物が段に入ったのと同じ数字。1,000 m 以上の面積で
 * 段に入ったものは、その面積で濃さも決まる。
 */
function fillAlpha(feature: LensFeature, selected: boolean): number {
  const tier = tierOf(feature);
  const base = tier <= 1 ? 0.34 : tier === 2 ? 0.26 : 0.16;
  return selected ? base + 0.16 : base;
}

/** 枠は輪郭を示すだけ。国境に見えないよう、面より弱くする。 */
function outlineAlpha(feature: LensFeature): number {
  const tier = tierOf(feature);
  return tier <= 1 ? 0.5 : tier === 2 ? 0.36 : 0.24;
}

function hierarchy(polygon: GeographicAreaPolygon): PolygonHierarchy {
  const [outer = [], ...holes] = polygon.rings;
  return new PolygonHierarchy(
    Cartesian3.fromDegreesArray(outer.flatMap((point) => [point.longitude, point.latitude])),
    holes.map((ring) => new PolygonHierarchy(Cartesian3.fromDegreesArray(ring.flatMap((point) => [point.longitude, point.latitude])))),
  );
}

export function renderPhysicalFeatures(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature; baseColor: Color; labelDistance: number }>();
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "area") continue;
    const color = featureColor;
    const tier = tierOf(feature);
    const labelDistance = Math.min(
      labelDistanceForExtent(areaSpanDegrees(feature.geometry.bbox)),
      maximumDistanceForTier(tier),
    );
    for (const [polygonIndex, polygon] of feature.geometry.polygons.entries()) {
      const entity = viewer.entities.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:${polygonIndex}`,
        name: feature.name,
        // 名札が重なったとき、地形は背景なので港より弱く、ただし国段の港よりは強い。
        // これが無いと、欧州の大陸表示でアルプスの名札が港に全部負ける。
        properties: { [LABEL_WEIGHT_ATTRIBUTE]: tier <= 1 ? 65 : tier === 2 ? 45 : 28 },
        polygon: {
          hierarchy: hierarchy(polygon),
          material: new ColorMaterialProperty(color.withAlpha(fillAlpha(feature, false))),
          outline: true,
          outlineColor: color.withAlpha(outlineAlpha(feature)),
          height: 2_800,
          arcType: ArcType.GEODESIC,
          distanceDisplayCondition: new DistanceDisplayCondition(0, maximumDistanceForTier(tier)),
        },
        position: Cartesian3.fromDegrees(feature.geometry.centroid.longitude, feature.geometry.centroid.latitude, 3_000),
        label: {
          text: feature.name,
          font: "700 10px ui-monospace, monospace",
          fillColor: color.withAlpha(0.95),
          outlineColor: Color.fromCssColorString("#071216"),
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -8),
          verticalOrigin: VerticalOrigin.BOTTOM,
          distanceDisplayCondition: new DistanceDisplayCondition(0, labelDistance),
        },
      }));
      entities.set(entity.id, { entity, feature, baseColor: color, labelDistance });
    }
  }

  const applySelection = () => {
    for (const rendered of entities.values()) {
      const selected = rendered.feature.id === selectedFeatureId;
      const color = rendered.baseColor;
      if (rendered.entity.label) rendered.entity.label.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, selected ? labelMaximumDistance("selected") : rendered.labelDistance));
      if (rendered.entity.polygon) rendered.entity.polygon.material = new ColorMaterialProperty(color.withAlpha(fillAlpha(rendered.feature, selected)));
    }
  };

  return {
    setVisible(visible) {
      for (const rendered of entities.values()) rendered.entity.show = visible;
    },
    setSelectedFeature(featureId) {
      selectedFeatureId = featureId;
      applySelection();
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return entities.get(picked.id)?.feature;
    },
    destroy() {
      for (const rendered of entities.values()) viewer.entities.remove(rendered.entity);
      entities.clear();
    },
  };
}
