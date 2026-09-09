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
import { areaSpanDegrees, labelDistanceForExtent, labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import type { GeographicAreaPolygon, LensDataset, LensFeature, LensRenderHandle } from "../types";

// 乾燥帯（砂色の面）と重なっても読めるよう、山脈は寒色の「枠線」で描く。
// 高原だけは面としての広がりが意味を持つので、薄く塗る。
const featureColor = Color.fromCssColorString("#93a9c9");
const rangeFillAlpha = 0.05;
const plateauFillAlpha = 0.16;

function isPlateau(feature: LensFeature): boolean {
  return feature.attributes.featureClass === "Plateau";
}

function fillAlpha(feature: LensFeature, selected: boolean): number {
  const base = isPlateau(feature) ? plateauFillAlpha : rangeFillAlpha;
  return selected ? base + 0.16 : base;
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
    const labelDistance = labelDistanceForExtent(areaSpanDegrees(feature.geometry.bbox));
    for (const [polygonIndex, polygon] of feature.geometry.polygons.entries()) {
      const entity = viewer.entities.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:${polygonIndex}`,
        name: feature.name,
        polygon: {
          hierarchy: hierarchy(polygon),
          material: new ColorMaterialProperty(color.withAlpha(fillAlpha(feature, false))),
          outline: true,
          outlineColor: color.withAlpha(isPlateau(feature) ? 0.62 : 0.88),
          height: 2_800,
          arcType: ArcType.GEODESIC,
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
