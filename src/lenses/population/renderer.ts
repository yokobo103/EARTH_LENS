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
  NearFarScalar,
  VerticalOrigin,
  type Viewer,
} from "cesium";
import { labelMaximumDistance } from "../../globe/cesium/labelVisibility";
import glowImage from "../../assets/city-glow.png";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

interface EllipsoidalOccluderLike {
  cameraPosition: Cartesian3;
  isPointVisible(point: Cartesian3): boolean;
}

const EllipsoidalOccluder = (CesiumRuntime as unknown as {
  EllipsoidalOccluder: new (ellipsoid: Viewer["scene"]["globe"]["ellipsoid"], cameraPosition?: Cartesian3) => EllipsoidalOccluderLike;
}).EllipsoidalOccluder;

/**
 * 港（高度9,000m）の下に敷いて、地表 → 人の灯り → 港 の順を作る。
 * 深度テストは効かない（billboard は point と描画経路が違い、全球の引きでは
 * 一枚も描かれなかった）ので切ってあり、裏側は下の occluder で自前に消す。
 */
const GLOW_ALTITUDE_METRES = 6_000;

/** 港より奥へ押す量。金色の硬い点を、光に呑まれず手前に残す。 */
const GLOW_EYE_OFFSET = new Cartesian3(0, 0, 12_000);

/** 一番小さい都市の直径。ここから人口で広げる。 */
const MIN_DIAMETER_PX = 16;

/**
 * 人口 → 直径の指数。
 *
 * 上位75は東京3,568万〜ヤンゴン409万で、人口比が8.7倍しかない。素の sqrt（0.5）だと
 * 直径比が2.95倍にとどまり、大都市が塊として立たない。0.72 なら4.75倍になり、
 * 「最大は下限の4.5〜6倍」に収まる。線形（1.0）まで上げると東京だけが巨大になる。
 */
const DIAMETER_EXPONENT = 0.72;

/**
 * 寄ったときの育ち方。
 *
 * ピクセル固定のままだと、寄るほど都市が画面に占める割合に対して光が小さくなり、
 * 「点が置いてある」ように見える。小さい町を足して空白を埋めるのではなく、
 * 遠くから見えていた同じ人口核を、そのまま大きくする。
 */
const GROWTH = new NearFarScalar(2_000_000, 2.4, 22_000_000, 0.95);

/** どこまで引いても寄っても、対象は同じ75都市。ズームで増減させない。 */
const ALWAYS_VISIBLE = new DistanceDisplayCondition(0, 60_000_000);

/** 名前は寄ってから。引きで75枚の名札が出ると、見たい暗がりが文字で埋まる。 */
const LABEL_MAXIMUM_DISTANCE = 4_000_000;

export function renderPopulatedPlaces(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature; surfacePoint: Cartesian3 }>();
  let selectedFeatureId: string | undefined;

  const populations = dataset.features
    .map((feature) => (typeof feature.attributes.population === "number" ? feature.attributes.population : 0))
    .filter((population) => population > 0);
  const smallest = populations.length ? Math.min(...populations) : 1;

  const glowDiameter = (population: number) =>
    MIN_DIAMETER_PX * Math.pow(Math.max(1, population / smallest), DIAMETER_EXPONENT);

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "point") continue;
    const population = typeof feature.attributes.population === "number" ? feature.attributes.population : 0;
    if (population <= 0) continue;
    const { longitude, latitude } = feature.geometry.coordinates;
    const diameter = glowDiameter(population);

    const entity = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}`,
      name: feature.name,
      position: Cartesian3.fromDegrees(longitude, latitude, GLOW_ALTITUDE_METRES),
      billboard: {
        image: glowImage,
        width: diameter,
        height: diameter,
        color: Color.WHITE.withAlpha(0.62),
        scaleByDistance: GROWTH,
        eyeOffset: GLOW_EYE_OFFSET,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: ALWAYS_VISIBLE,
      },
      label: {
        text: feature.name,
        font: "700 10px ui-monospace, monospace",
        fillColor: Color.fromCssColorString("#f3fbff").withAlpha(0.9),
        outlineColor: Color.fromCssColorString("#050d12"),
        outlineWidth: 4,
        style: LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: HorizontalOrigin.LEFT,
        pixelOffset: new Cartesian2(Math.round(diameter / 2) + 4, 0),
        verticalOrigin: VerticalOrigin.CENTER,
        distanceDisplayCondition: new DistanceDisplayCondition(0, LABEL_MAXIMUM_DISTANCE),
      },
    }));
    entities.set(entity.id as string, {
      entity, feature,
      surfacePoint: Cartesian3.fromDegrees(longitude, latitude, 0),
    });
  }

  /**
   * 地球の裏側の灯りを消す。
   *
   * 深度テストを切った代償で、放っておくと地球を突き抜けて反対側の都市が光る。
   * 起動時のカメラはプログラムで設定されるので camera.changed が飛ばず、
   * それだけを頼りにすると初期値のまま固まる。描画のたびにカメラが動いたかだけ見る。
   */
  const occluder = new EllipsoidalOccluder(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
  let lastCameraPosition: Cartesian3 | null = null;
  const applyHorizon = () => {
    const camera = viewer.camera.positionWC;
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
      const selected = rendered.feature.id === selectedFeatureId;
      if (rendered.entity.label) {
        rendered.entity.label.distanceDisplayCondition = new ConstantProperty(
          new DistanceDisplayCondition(0, selected ? labelMaximumDistance("selected") : LABEL_MAXIMUM_DISTANCE),
        );
      }
      if (rendered.entity.billboard) {
        rendered.entity.billboard.color = new ConstantProperty(Color.WHITE.withAlpha(selected ? 0.95 : 0.62));
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
