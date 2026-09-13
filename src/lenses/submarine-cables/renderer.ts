import {
  ArcType,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  ColorMaterialProperty,
  HeightReference,
  NearFarScalar,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

/**
 * ケーブルは「どことどこがつながっているか」。向きは無い。
 *
 * なので線は**左右対称**にする。太さは端から端まで一定、両端に同じ大きさの点。
 * どちらから読んでも同じ形なので、向きを読み取りようがない。
 * 物流レンズは破線が流れるので、動いているか止まっているかで一目で分かれる。
 *
 * 以前は glow の taperPower が 0.7 で、線が片側へ細くなっていた。
 * 向きが無いはずのケーブルに向きが見え、向きが要る物流にはそれが無い、
 * という逆の状態だった。
 */
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
        width: 1.8,
        arcType: ArcType.GEODESIC,
        // 端から端まで同じ太さ。細らせない。
        material: new ColorMaterialProperty(Color.fromCssColorString("#7cf6c9").withAlpha(0.66)),
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
          // 両端とも同じ大きさ。差をつけると向きに見える。
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
