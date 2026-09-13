import {
  ArcType,
  CallbackProperty,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  Entity,
  PolylineDashMaterialProperty,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

/**
 * 物流は「モノがどこからどこへ動くか」。ケーブルは「どことどこがつながっているか」。
 * どちらも地域と地域を結ぶ線なので、色が違うだけだと同じ問いに見えてしまう。
 *
 * ここは**動き**で分ける。破線が線に沿って揺れるので、
 * 「この上を何かが行き来している」と読める。ケーブルは止まったままの線にしてある。
 *
 * 揺れは往復にしてある。片方向へ流し続けると「東アジアから欧州へ」と
 * 断定することになるが、データは EAST ASIA ↔ EUROPE FLOW で双方向。
 * 折れ線の格納順はただの並び順で、流れの向きではない。
 *
 * 動く破線は、同時に「これは実際の航路ではない」も言っている。
 * 海図の航路は動かないし、点線でもない。
 */
const FLOW_COLOR = "#ffb3de";
const FLOW_ALTITUDE_METRES = 20_000;

/** 破線1周期のピクセル長。長いほど流れがゆっくり見える。 */
const DASH_LENGTH = 26;

/**
 * 往復1周にかける秒数と、片側へ寄せるビット数。
 *
 * 16ビットが破線1周期（26px）なので、1ビットは約1.6px。振幅6ビットは片道 約10px、
 * いちばん速い瞬間で 約8.7px/秒。破線が自分の周期の3分の1ぶんだけ行って戻る、
 * という速さで、流れ去っていく印象にはならない。
 */
const SWAY_PERIOD_SECONDS = 7;
const SWAY_BITS = 6;

const PATTERN_BITS = 16;
const BASE_PATTERN = 0b1111_1100_0000_0000;

/**
 * dashPattern は16ビットの並び。毎フレーム1ビットずつ回すと、
 * 破線が線に沿って進んでいるように見える。位置は動かさないので安い。
 */
function rotatePattern(shift: number): number {
  const steps = ((shift % PATTERN_BITS) + PATTERN_BITS) % PATTERN_BITS;
  return ((BASE_PATTERN >>> steps) | (BASE_PATTERN << (PATTERN_BITS - steps))) & 0xffff;
}

function positionsFor(feature: LensFeature): Cartesian3[] {
  if (feature.geometry.type !== "connection") return [];
  return feature.geometry.endpoints.map((endpoint) =>
    Cartesian3.fromDegrees(endpoint.longitude, endpoint.latitude, FLOW_ALTITUDE_METRES));
}

export function renderShippingFlows(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, LensFeature>();
  // viewer.clock は止めてある（shouldAnimate: false）ので、実時間で回す。
  // 時計を動かすと古代地球の時代スライダーと干渉する。
  const start = performance.now();

  const dashPattern = new CallbackProperty(() => {
    const seconds = (performance.now() - start) / 1000;
    const phase = (2 * Math.PI * seconds) / SWAY_PERIOD_SECONDS;
    return rotatePattern(Math.round(SWAY_BITS * Math.sin(phase)));
  }, false);

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "connection") continue;
    const entity = viewer.entities.add(new Entity({
      id: `${dataset.lensId}:${feature.id}`,
      name: feature.name,
      polyline: {
        positions: positionsFor(feature),
        width: 2.4,
        arcType: ArcType.GEODESIC,
        material: new PolylineDashMaterialProperty({
          color: Color.fromCssColorString(FLOW_COLOR).withAlpha(0.62),
          gapColor: Color.TRANSPARENT,
          dashLength: DASH_LENGTH,
          dashPattern,
        }),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 42_000_000),
      },
    }));
    entities.set(entity.id, feature);
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
