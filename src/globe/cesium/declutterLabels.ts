import { Cartesian2, ConstantProperty, SceneTransforms, type Entity, type Viewer } from "cesium";

/**
 * 画面上で重なった名札を間引く。
 *
 * Cesium は名札同士の衝突を見ないので、近い地物は文字がそのまま重なって描かれる。
 * ロサンゼルス港とロングビーチ港は5kmしか離れておらず、どちらも世界段なので、
 * 寄ると2枚の名札が完全に重なって読めない塊になっていた。
 *
 * 毎フレーム、見えている名札を画面座標へ落として、強いものから順に場所を取る。
 * 取れなかったものは消す。地図が昔からやっていることを、そのままやる。
 */

/** この値が大きいものが場所を取る。同点なら画面の上にあるほうが勝つ。 */
export const LABEL_WEIGHT_ATTRIBUTE = "labelWeight";

/**
 * 名札の優先度。**レンズをまたいで比べる**ので、共通の 0-100 で持つ。
 *
 * 取扱量（万TEU）と人口（人）と河川の流量を直接比べることはできない。
 * レンズの中の序列は各レンズが小数部で足す（同じ段の港なら扱い量の多いほうが残る）。
 */
export const LABEL_WEIGHT = {
  /** 選んでいる地物。これだけは必ず残す。 */
  selected: 100,
  /** 狭窄部。世界に6つしかなく、隠れると地図の意味が変わる。 */
  chokepoint: 80,
  /** 港。段ごと。 */
  portWorld: 70,
  portContinent: 52,
  portCountry: 36,
  /** 人のいる場所。上位75都市。 */
  populatedPlace: 60,
  /** 面の地物（乾燥帯・山脈・EEZ・鉱物）。点より控えめでよい。 */
  area: 30,
} as const;

/** 名札のまわりに空けておく余白（px）。詰まりすぎると読みにくい。 */
const PADDING_X = 6;
const PADDING_Y = 3;

/** 等幅フォントの概算幅。半角はフォントサイズの0.6倍、全角はほぼ等倍。 */
const NARROW_RATIO = 0.6;

interface Placed {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function estimateWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const character of text) {
    width += character.codePointAt(0)! > 0x2e80 ? fontSize : fontSize * NARROW_RATIO;
  }
  return width;
}

function fontSizeOf(font: string | undefined): number {
  const match = /(\d+(?:\.\d+)?)px/.exec(font ?? "");
  return match ? Number(match[1]) : 10;
}

function overlaps(a: Placed, b: Placed): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

interface Candidate {
  entity: Entity;
  weight: number;
  box: Placed;
}

/**
 * 名札の間引きを viewer に取り付ける。返り値を呼ぶと外れる。
 *
 * カメラが動いていないフレームでは何もしない。名札の集合は動かないので、
 * 一度決めた並びを毎フレーム計算し直す必要がない。
 */
export function attachLabelDeclutter(viewer: Viewer): () => void {
  const scratch = new Cartesian2();
  const suppressed = new Set<Entity>();
  let lastCameraPosition = viewer.camera.positionWC.clone();
  let lastLabelCount = -1;
  let dirty = true;

  const onPostRender = () => {
    const camera = viewer.camera.positionWC;
    const labelled = viewer.entities.values.filter((entity) => entity.label && entity.position);
    if (labelled.length !== lastLabelCount) {
      lastLabelCount = labelled.length;
      dirty = true;
    }
    if (!camera.equalsEpsilon(lastCameraPosition, 0, 1)) {
      lastCameraPosition = camera.clone();
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;

    // 前回消したものを戻してから測り直す。戻さないと、一度隠れた名札が
    // 画面から消えたままになる。
    for (const entity of suppressed) {
      if (entity.label) entity.label.show = undefined;
    }
    suppressed.clear();

    const time = viewer.clock.currentTime;
    const { clientWidth, clientHeight } = viewer.scene.canvas;
    const radius = viewer.scene.globe.ellipsoid.maximumRadius;
    const candidates: Candidate[] = [];
    for (const entity of labelled) {
      if (entity.show === false) continue;
      const label = entity.label!;
      const text = label.text?.getValue(time);
      if (!text) continue;
      const position = entity.position!.getValue(time);
      if (!position) continue;
      // 地球の裏側は画面座標が出ても意味がない。数えると、見えない名札が
      // 見えている名札の場所を奪う。
      if (position.x * camera.x + position.y * camera.y + position.z * camera.z < radius * radius) continue;
      const projected = SceneTransforms.worldToWindowCoordinates(viewer.scene, position, scratch);
      if (!projected) continue;
      if (projected.x < 0 || projected.y < 0 || projected.x > clientWidth || projected.y > clientHeight) continue;

      const fontSize = fontSizeOf(label.font?.getValue(time));
      const width = estimateWidth(text, fontSize) + PADDING_X * 2;
      const height = fontSize + PADDING_Y * 2;
      const offset = label.pixelOffset?.getValue(time);
      const x = projected.x + (offset?.x ?? 0);
      const y = projected.y + (offset?.y ?? 0);
      const weight = Number(entity.properties?.[LABEL_WEIGHT_ATTRIBUTE]?.getValue(time) ?? 0);
      candidates.push({
        entity,
        weight,
        box: { left: x - width / 2, right: x + width / 2, top: y - height, bottom: y },
      });
    }

    // 強いものから場所を取る。同点なら画面の上にあるほうを先に置く。
    candidates.sort((a, b) => (b.weight - a.weight) || (a.box.top - b.box.top));

    const placed: Placed[] = [];
    for (const candidate of candidates) {
      if (placed.some((box) => overlaps(box, candidate.box))) {
        candidate.entity.label!.show = new ConstantProperty(false);
        suppressed.add(candidate.entity);
        continue;
      }
      placed.push(candidate.box);
    }
  };

  viewer.scene.postRender.addEventListener(onPostRender);
  return () => {
    viewer.scene.postRender.removeEventListener(onPostRender);
    for (const entity of suppressed) {
      if (entity.label) entity.label.show = undefined;
    }
    suppressed.clear();
  };
}
