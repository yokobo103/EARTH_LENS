import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  GeoJsonDataSource,
  LabelGraphics,
  LabelStyle,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import { labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import type { LensDataset, LensRenderHandle } from "../types";

function toGeoJson(dataset: LensDataset) {
  return {
    type: "FeatureCollection" as const,
    features: dataset.features.flatMap((feature) => {
      if (feature.geometry.type !== "area") return [];
      const coordinates = feature.geometry.polygons.map((polygon) => polygon.rings.map((ring) => ring.map((point) => [point.longitude, point.latitude])));
      return [{
        type: "Feature" as const,
        id: `${dataset.lensId}:${feature.id}`,
        properties: { name: feature.name },
        geometry: coordinates.length === 1
          ? { type: "Polygon" as const, coordinates: coordinates[0] }
          : { type: "MultiPolygon" as const, coordinates },
      }];
    }),
  };
}

export function renderBorders(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const dataSource = new GeoJsonDataSource(dataset.lensId);
  const featureByEntityId = new Map(dataset.features.map((feature) => [`${dataset.lensId}:${feature.id}`, feature]));
  let visible = false;
  let selectedFeatureId: string | undefined;
  let destroyed = false;

  const applyLabelVisibility = () => {
    for (const entity of dataSource.entities.values) {
      const feature = featureByEntityId.get(entity.id);
      if (!feature || !entity.label) continue;
      const priority = feature.id === selectedFeatureId ? "selected" : "normal";
      entity.label.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(0, labelMaximumDistance(priority)));
    }
  };

  void viewer.dataSources.add(dataSource);
  void dataSource.load(toGeoJson(dataset), {
    clampToGround: false,
    fill: Color.TRANSPARENT,
    stroke: Color.fromCssColorString("#d6d2b8").withAlpha(0.72),
    strokeWidth: 1.15,
  }).then(() => {
    if (destroyed || viewer.isDestroyed()) return;
    for (const entity of dataSource.entities.values) {
      const feature = featureByEntityId.get(entity.id);
      if (!feature || feature.geometry.type !== "area") continue;
      entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(feature.geometry.centroid.longitude, feature.geometry.centroid.latitude, 2_500));
      entity.label = new LabelGraphics({
        text: feature.name,
        font: "700 10px ui-monospace, monospace",
        fillColor: Color.fromCssColorString("#e5e2cc"),
        outlineColor: Color.fromCssColorString("#071216"),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(0, -10),
        verticalOrigin: VerticalOrigin.BOTTOM,
      });
    }
    dataSource.show = visible;
    applyLabelVisibility();
  });

  return {
    setVisible(nextVisible) {
      visible = nextVisible;
      dataSource.show = visible;
    },
    setSelectedFeature(featureId) {
      selectedFeatureId = featureId;
      applyLabelVisibility();
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return featureByEntityId.get(picked.id);
    },
    destroy() {
      destroyed = true;
      featureByEntityId.clear();
      if (!viewer.isDestroyed()) viewer.dataSources.remove(dataSource, true);
    },
  };
}
