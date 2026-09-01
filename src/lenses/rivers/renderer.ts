import {
  ArcType,
  Cartesian3,
  Color,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  PolylineGlowMaterialProperty,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

function scaleRank(feature: LensFeature): number {
  const value = feature.attributes.scaleRank;
  return typeof value === "number" ? value : 10;
}

function widthFor(feature: LensFeature): number {
  const rank = scaleRank(feature);
  return rank <= 2 ? 2.4 : rank <= 5 ? 1.8 : 1.25;
}

function opacityFor(feature: LensFeature): number {
  const rank = scaleRank(feature);
  return rank <= 2 ? 0.86 : rank <= 5 ? 0.66 : 0.4;
}

export function renderRivers(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature; baseWidth: number }>();
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "polyline") continue;
    const baseWidth = widthFor(feature);
    for (const [pathIndex, path] of feature.geometry.paths.entries()) {
      const id = `${dataset.lensId}:${feature.id}:${pathIndex}`;
      const entity = viewer.entities.add(new Entity({
        id,
        name: feature.name,
        polyline: {
          positions: Cartesian3.fromDegreesArrayHeights(path.flatMap((point) => [point.longitude, point.latitude, 11_000])),
          width: baseWidth,
          arcType: ArcType.GEODESIC,
          material: new PolylineGlowMaterialProperty({
            glowPower: 0.16,
            taperPower: 0.2,
            color: Color.fromCssColorString("#63c8d9").withAlpha(opacityFor(feature)),
          }),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 39_000_000),
        },
      }));
      entities.set(id, { entity, feature, baseWidth });
    }
  }

  const applySelection = () => {
    for (const rendered of entities.values()) {
      if (!rendered.entity.polyline) continue;
      const selected = rendered.feature.id === selectedFeatureId;
      rendered.entity.polyline.width = new ConstantProperty(selected ? rendered.baseWidth * 2.1 : rendered.baseWidth);
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
