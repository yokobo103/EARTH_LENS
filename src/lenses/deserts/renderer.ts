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

const fillColor = Color.fromCssColorString("#d9ad62");

function hierarchy(polygon: GeographicAreaPolygon): PolygonHierarchy {
  const [outer = [], ...holes] = polygon.rings;
  return new PolygonHierarchy(
    Cartesian3.fromDegreesArray(outer.flatMap((point) => [point.longitude, point.latitude])),
    holes.map((ring) => new PolygonHierarchy(Cartesian3.fromDegreesArray(ring.flatMap((point) => [point.longitude, point.latitude])))),
  );
}

export function renderDeserts(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature }>();
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "area") continue;
    for (const [polygonIndex, polygon] of feature.geometry.polygons.entries()) {
      const entity = viewer.entities.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:${polygonIndex}`,
        name: feature.name,
        polygon: {
          hierarchy: hierarchy(polygon),
          material: new ColorMaterialProperty(fillColor.withAlpha(0.17)),
          outline: true,
          outlineColor: fillColor.withAlpha(0.56),
          height: 2_800,
          arcType: ArcType.GEODESIC,
        },
        position: Cartesian3.fromDegrees(feature.geometry.centroid.longitude, feature.geometry.centroid.latitude, 3_000),
        label: {
          text: feature.name,
          font: "700 10px ui-monospace, monospace",
          fillColor: fillColor.withAlpha(0.95),
          outlineColor: Color.fromCssColorString("#071216"),
          outlineWidth: 4,
          style: LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cartesian2(0, -8),
          verticalOrigin: VerticalOrigin.BOTTOM,
          distanceDisplayCondition: new DistanceDisplayCondition(0, labelMaximumDistance("normal")),
        },
      }));
      entities.set(entity.id, { entity, feature });
    }
  }

  const applySelection = () => {
    for (const rendered of entities.values()) {
      if (!rendered.entity.label) continue;
      const selected = rendered.feature.id === selectedFeatureId;
      rendered.entity.label.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, labelMaximumDistance(selected ? "selected" : "normal")));
      if (rendered.entity.polygon) rendered.entity.polygon.material = new ColorMaterialProperty(fillColor.withAlpha(selected ? 0.3 : 0.17));
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
