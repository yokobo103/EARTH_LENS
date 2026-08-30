import {
  ArcType,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  HeightReference,
  NearFarScalar,
  PolylineGlowMaterialProperty,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

function createSchematicPositions(feature: LensFeature): Cartesian3[] {
  if (feature.geometry.type !== "connection") return [];
  return feature.geometry.endpoints.map((endpoint) =>
    Cartesian3.fromDegrees(endpoint.longitude, endpoint.latitude, 12_000),
  );
}

export function renderSubmarineCableConnections(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  const collection = viewer.entities;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "connection") continue;
    const route = collection.add(new Entity({
      id: `${dataset.lensId}:${feature.id}:route`,
      name: feature.name,
      polyline: {
        positions: createSchematicPositions(feature),
        width: 2,
        arcType: ArcType.GEODESIC,
        material: new PolylineGlowMaterialProperty({
          glowPower: 0.28,
          taperPower: 0.7,
          color: Color.fromCssColorString("#55d8ff").withAlpha(0.82),
        }),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 42_000_000),
      },
    }));
    entities.set(route.id, feature);

    feature.geometry.endpoints.forEach((endpoint, index) => {
      const node = collection.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:endpoint:${index}`,
        name: `${feature.name} · ${endpoint.name}`,
        position: Cartesian3.fromDegrees(endpoint.longitude, endpoint.latitude, 14_000),
        point: {
          pixelSize: 5,
          color: Color.fromCssColorString("#d8faff"),
          outlineColor: Color.fromCssColorString("#178dad"),
          outlineWidth: 2,
          heightReference: HeightReference.NONE,
          scaleByDistance: new NearFarScalar(2_000_000, 1.4, 30_000_000, 0.7),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 42_000_000),
        },
      }));
      entities.set(node.id, feature);
    });
  }

  return {
    setVisible(visible) {
      for (const entityId of entities.keys()) {
        const entity = collection.getById(entityId);
        if (entity) entity.show = visible;
      }
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return entities.get(picked.id);
    },
    destroy() {
      for (const entityId of entities.keys()) collection.removeById(entityId);
      entities.clear();
    },
  };
}
