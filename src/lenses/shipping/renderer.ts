import {
  ArcType,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  PolylineDashMaterialProperty,
  PolylineGlowMaterialProperty,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

function positionsFor(feature: LensFeature): Cartesian3[] {
  if (feature.geometry.type !== "connection") return [];
  return feature.geometry.endpoints.map((endpoint) => Cartesian3.fromDegrees(endpoint.longitude, endpoint.latitude, 20_000));
}

export function renderShippingFlows(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  for (const feature of dataset.features) {
    if (feature.geometry.type !== "connection") continue;
    const positions = positionsFor(feature);
    const band = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}:band`,
      name: feature.name,
      polyline: {
        positions,
        width: 8,
        arcType: ArcType.GEODESIC,
        material: new PolylineGlowMaterialProperty({
          glowPower: 0.22,
          taperPower: 0.18,
          color: Color.fromCssColorString("#f3a847").withAlpha(0.22),
        }),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 42_000_000),
      },
    }));
    entities.set(band.id, feature);
    const center = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}:center`,
      name: feature.name,
      polyline: {
        positions,
        width: 2.2,
        arcType: ArcType.GEODESIC,
        material: new PolylineDashMaterialProperty({
          color: Color.fromCssColorString("#ffd08a").withAlpha(0.64),
          dashLength: 18,
          gapColor: Color.TRANSPARENT,
        }),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 42_000_000),
      },
    }));
    entities.set(center.id, feature);
  }
  return {
    setVisible(visible) {
      for (const entityId of entities.keys()) {
        const entity = viewer.entities.getById(entityId);
        if (entity) entity.show = visible;
      }
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return entities.get(picked.id);
    },
    destroy() {
      for (const entityId of entities.keys()) viewer.entities.removeById(entityId);
      entities.clear();
    },
  };
}
