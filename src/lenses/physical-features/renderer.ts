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
import { labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import type { GeographicAreaPolygon, LensDataset, LensFeature, LensRenderHandle } from "../types";

const rangeColor = Color.fromCssColorString("#e7d49b");
const plateauColor = Color.fromCssColorString("#c99bdc");

function scaleRank(feature: LensFeature): number {
  return typeof feature.attributes.scaleRank === "number" ? feature.attributes.scaleRank : 10;
}

function featureColor(feature: LensFeature): Color {
  return feature.attributes.featureClass === "Plateau" ? plateauColor : rangeColor;
}

function hierarchy(polygon: GeographicAreaPolygon): PolygonHierarchy {
  const [outer = [], ...holes] = polygon.rings;
  return new PolygonHierarchy(
    Cartesian3.fromDegreesArray(outer.flatMap((point) => [point.longitude, point.latitude])),
    holes.map((ring) => new PolygonHierarchy(Cartesian3.fromDegreesArray(ring.flatMap((point) => [point.longitude, point.latitude])))),
  );
}

export function renderPhysicalFeatures(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature; baseColor: Color }>();
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "area") continue;
    const color = featureColor(feature);
    const rank = scaleRank(feature);
    const labelDistance = rank <= 2 ? labelMaximumDistance("nearby") : labelMaximumDistance("normal");
    for (const [polygonIndex, polygon] of feature.geometry.polygons.entries()) {
      const entity = viewer.entities.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:${polygonIndex}`,
        name: feature.name,
        polygon: {
          hierarchy: hierarchy(polygon),
          material: new ColorMaterialProperty(color.withAlpha(rank <= 2 ? 0.2 : 0.12)),
          outline: true,
          outlineColor: color.withAlpha(rank <= 2 ? 0.72 : 0.42),
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
      entities.set(entity.id, { entity, feature, baseColor: color });
    }
  }

  const applySelection = () => {
    for (const rendered of entities.values()) {
      const selected = rendered.feature.id === selectedFeatureId;
      const color = rendered.baseColor;
      if (rendered.entity.label) rendered.entity.label.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, labelMaximumDistance(selected ? "selected" : scaleRank(rendered.feature) <= 2 ? "nearby" : "normal")));
      if (rendered.entity.polygon) rendered.entity.polygon.material = new ColorMaterialProperty(color.withAlpha(selected ? 0.34 : scaleRank(rendered.feature) <= 2 ? 0.2 : 0.12));
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
