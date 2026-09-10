import * as CesiumRuntime from "cesium";
import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  DistanceDisplayCondition,
  Entity,
  HorizontalOrigin,
  LabelStyle,
  VerticalOrigin,
  type Viewer,
} from "cesium";

interface EllipsoidalOccluderLike {
  cameraPosition: Cartesian3;
  isPointVisible(point: Cartesian3): boolean;
}

const EllipsoidalOccluder = (CesiumRuntime as unknown as {
  EllipsoidalOccluder: new (ellipsoid: Viewer["scene"]["globe"]["ellipsoid"], cameraPosition?: Cartesian3) => EllipsoidalOccluderLike;
}).EllipsoidalOccluder;
import { labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import glowImage from "../../assets/city-glow.png";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

/**
 * 港（高度9,000m）の下に敷いて、地表 → 人の灯り → 港 の順を高さで確定させる。
 *
 * ただし高さだけでは足りなかった。billboard は point と描画経路が違い、
 * 全球の引き（18,500km）では深度に負けて一枚も描かれない。4,500m でも
 * 7,500m でも 12,000m でも同じで、深度テストを切ったときだけ出た。
 * なので深度テストは切り、代わりに地平線の裏側を自前で消す（下の occluder）。
 */
const GLOW_ALTITUDE_METRES = 6_000;

/** 100万人の都市の直径。ここを基準に面積が人口へ比例するよう広げる。 */
const BASE_DIAMETER_PX = 17;

/**
 * 光の大きさ。半径ではなく面積を人口に比例させる。
 * 東京3,567万をそのまま半径に掛けると36倍になり、東京しか見えなくなる。
 */
function glowDiameter(population: number): number {
  const scale = Math.sqrt(population / 1_000_000);
  return BASE_DIAMETER_PX * Math.min(5.5, Math.max(0.85, scale));
}

/**
 * 何位までをどこまで引いても出すか。
 *
 * 見せたいのは人がいる場所ではなく、いない場所。全部出すとヨーロッパとインドが
 * ただの染みになって、サハラもシベリアも「その他」になってしまう。
 * 起動時のカメラは18,500km なので、そこでは上位50だけが灯る。
 */
function glowMaximumDistance(populationRank: number): number {
  if (populationRank <= 50) return 50_000_000;
  if (populationRank <= 200) return 16_000_000;
  if (populationRank <= 500) return 10_000_000;
  if (populationRank <= 1_200) return 6_000_000;
  return 3_000_000;
}

function labelMaximumDistanceForRank(populationRank: number): number {
  if (populationRank <= 30) return 5_000_000;
  if (populationRank <= 200) return 3_000_000;
  return 1_600_000;
}

export function renderPopulatedPlaces(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature; labelDistance: number; surfacePoint: Cartesian3 }>();
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const { longitude, latitude } = feature.geometry.coordinates;
    const population = typeof feature.attributes.population === "number" ? feature.attributes.population : 0;
    const rank = typeof feature.attributes.populationRank === "number" ? feature.attributes.populationRank : 9_999;
    const diameter = glowDiameter(population);
    const labelDistance = labelMaximumDistanceForRank(rank);

    const entity = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}`,
      name: feature.name,
      position: Cartesian3.fromDegrees(longitude, latitude, GLOW_ALTITUDE_METRES),
      billboard: {
        image: glowImage,
        width: diameter,
        height: diameter,
        // 半透明の白を重ねると明るくなるので、回廊（東京〜大阪、ルール、ナイル）は
        // 何もしなくても濃くなる。加算合成は要らない。
        color: Color.WHITE.withAlpha(0.5),
        // 深度テストに任せると一枚も出ない。裏側は下で自前に消す。
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new DistanceDisplayCondition(0, glowMaximumDistance(rank)),
      },
      label: {
        text: feature.name,
        font: "700 10px ui-monospace, monospace",
        fillColor: Color.fromCssColorString("#f3fbff").withAlpha(0.92),
        outlineColor: Color.fromCssColorString("#050d12"),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: HorizontalOrigin.LEFT,
        pixelOffset: new Cartesian2(Math.round(diameter / 2) + 3, 0),
        verticalOrigin: VerticalOrigin.CENTER,
        distanceDisplayCondition: new DistanceDisplayCondition(0, labelDistance),
      },
    }));
    entities.set(entity.id as string, {
      entity, feature, labelDistance,
      surfacePoint: Cartesian3.fromDegrees(longitude, latitude, 0),
    });
  }

  /**
   * 地球の裏側の灯りを消す。
   *
   * 深度テストを切った代償で、放っておくと地球を突き抜けて反対側の都市が光る。
   * 毎フレームではなくカメラが動き終わったときだけ数え直す（7,332個でも
   * 内積を取るだけなので一瞬）。レンズのON/OFFは entity.show、
   * 地平線の裏は billboard.show と label.show で、役割を分けて衝突させない。
   */
  const occluder = new EllipsoidalOccluder(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
  let lastCameraPosition: Cartesian3 | null = null;
  const applyHorizon = () => {
    const camera = viewer.camera.positionWC;
    // 起動時のカメラはプログラムで設定されるので camera.changed が飛ばない。
    // それだけを頼りにすると、初期カメラで一度計算した裏表がそのまま固まり、
    // 手前側の灯りまで消えたままになる（実際にそうなった）。描画のたびに
    // カメラが動いたかどうかだけ見て、動いたときに測り直す。
    if (lastCameraPosition && Cartesian3.equalsEpsilon(camera, lastCameraPosition, 0, 1)) return;
    lastCameraPosition = Cartesian3.clone(camera, lastCameraPosition ?? undefined);
    occluder.cameraPosition = camera;
    for (const rendered of entities.values()) {
      const visible = occluder.isPointVisible(rendered.surfacePoint);
      if (rendered.entity.billboard) rendered.entity.billboard.show = new ConstantProperty(visible);
      if (rendered.entity.label) rendered.entity.label.show = new ConstantProperty(visible);
    }
  };
  applyHorizon();
  viewer.scene.postRender.addEventListener(applyHorizon);

  const applySelection = () => {
    for (const rendered of entities.values()) {
      if (!rendered.entity.label) continue;
      const selected = rendered.feature.id === selectedFeatureId;
      rendered.entity.label.distanceDisplayCondition = new ConstantProperty(
        new DistanceDisplayCondition(0, selected ? labelMaximumDistance("selected") : rendered.labelDistance),
      );
      if (rendered.entity.billboard) {
        rendered.entity.billboard.color = new ConstantProperty(Color.WHITE.withAlpha(selected ? 0.92 : 0.5));
      }
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
      viewer.scene.postRender.removeEventListener(applyHorizon);
      for (const rendered of entities.values()) viewer.entities.remove(rendered.entity);
      entities.clear();
    },
  };
}
