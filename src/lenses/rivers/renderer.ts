import {
  ArcType,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  Entity,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

/**
 * Natural Earth carries 1,454 river and lake centerlines, and drawing all of
 * them at once buried the Nile among its own tributaries.
 *
 * Which rivers belong at which distance is decided offline by discharge
 * transferred from HydroRIVERS -- see tools/build-river-importance.py. Natural
 * Earth's own scalerank is not used for it: the only rank-0 river on Earth is
 * the Tongariro in New Zealand, which carries 32 m3/s.
 *
 * Three steps, and the closest one is not "everything": 326 lines averaging
 * around 34 m3/s are never drawn, because a skeleton stops being readable once
 * every creek is on it.
 */
interface LodStep {
  maxTier: number;
  enterBelowMetres: number;
}

/**
 * 高さは画面に何が映るかで決めてある。実測で、日本列島が全部入るのが 2,600 km、
 * 大陸ひとつが 4,000-6,000 km 付近。段の名前と、見えている範囲を一致させる。
 */
const FARTHEST_STEP: LodStep = { maxTier: 1, enterBelowMetres: Number.POSITIVE_INFINITY };
const LOD_STEPS: readonly LodStep[] = [
  FARTHEST_STEP,
  { maxTier: 2, enterBelowMetres: 6_000_000 },
  { maxTier: 3, enterBelowMetres: 2_800_000 },
];

function stepAt(level: number): LodStep {
  return LOD_STEPS[level] ?? FARTHEST_STEP;
}

/**
 * A step taken on the way down is given up 25% higher than it was taken, so
 * hovering on a boundary cannot flip the set back and forth.
 */
const HYSTERESIS = 1.25;

/** New lines arrive over this long rather than appearing between two frames. */
const FADE_MILLISECONDS = 380;

const RIVER_COLOR = "#63c8d9";
const LINE_ALTITUDE_METRES = 11_000;

function tierOf(feature: LensFeature): number {
  const value = feature.attributes.displayTier;
  return typeof value === "number" ? value : 3;
}

/** 比べているのと同じ流量で太さも決める。太い線は本当に水が多い線になる。 */
function dischargeOf(feature: LensFeature): number {
  const value = feature.attributes.riverSystemDischargeCms;
  return typeof value === "number" ? value : 0;
}

/**
 * Width and opacity both carry the discharge, so a main stem stands out from
 * the tributary beside it. Nothing goes below one pixel: a thinner line than
 * that is what was shimmering before.
 */
function widthFor(discharge: number): number {
  return discharge >= 10_000 ? 2.4
    : discharge >= 3_000 ? 2.1
    : discharge >= 800 ? 1.7
    : discharge >= 300 ? 1.35
    : discharge >= 100 ? 1.1
    : 1;
}

/**
 * 下の3段は世界表示には出てこない（遠景に出るのは 800 m3/s 以上だけ）ので、
 * 引いたときの静かさを壊さずに、寄ったときの読みやすさだけを上げられる。
 * 大小の差は太さが持つ。
 */
function alphaFor(discharge: number): number {
  return discharge >= 10_000 ? 0.8
    : discharge >= 3_000 ? 0.72
    : discharge >= 800 ? 0.6
    : discharge >= 300 ? 0.56
    : discharge >= 100 ? 0.52
    : 0.48;
}

function levelForHeight(height: number, currentLevel: number): number {
  let level = 0;
  for (let step = 1; step < LOD_STEPS.length; step += 1) {
    const threshold = stepAt(step).enterBelowMetres * (currentLevel >= step ? HYSTERESIS : 1);
    if (height < threshold) level = step;
  }
  return level;
}

interface RenderedRiver {
  entity: Entity;
  feature: LensFeature;
  tier: number;
  baseWidth: number;
  baseAlpha: number;
  alpha: number;
  targetAlpha: number;
}

export function renderRivers(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const rendered = new Map<string, RenderedRiver>();
  const fading = new Set<RenderedRiver>();
  let selectedFeatureId: string | undefined;
  let lensVisible = true;
  let level = levelForHeight(viewer.camera.positionCartographic.height, 0);
  let lastHeight = Number.NaN;
  let lastFrameTime = 0;

  const paint = (river: RenderedRiver) => {
    if (!river.entity.polyline) return;
    river.entity.polyline.material = new ColorMaterialProperty(
      Color.fromCssColorString(RIVER_COLOR).withAlpha(river.alpha),
    );
  };

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "polyline") continue;
    const tier = tierOf(feature);
    const discharge = dischargeOf(feature);
    const baseWidth = widthFor(discharge);
    const baseAlpha = alphaFor(discharge);
    const visible = tier <= stepAt(level).maxTier;
    for (const [pathIndex, path] of feature.geometry.paths.entries()) {
      const id = `${dataset.lensId}:${feature.id}:${pathIndex}`;
      const entity = viewer.entities.add(new Entity({
        id,
        name: feature.name,
        show: visible,
        polyline: {
          positions: Cartesian3.fromDegreesArrayHeights(
            path.flatMap((point) => [point.longitude, point.latitude, LINE_ALTITUDE_METRES]),
          ),
          width: baseWidth,
          arcType: ArcType.GEODESIC,
          material: new ColorMaterialProperty(
            Color.fromCssColorString(RIVER_COLOR).withAlpha(visible ? baseAlpha : 0),
          ),
        },
      }));
      rendered.set(id, {
        entity,
        feature,
        tier,
        baseWidth,
        baseAlpha,
        alpha: visible ? baseAlpha : 0,
        targetAlpha: visible ? baseAlpha : 0,
      });
    }
  }

  const retarget = () => {
    const maxTier = stepAt(level).maxTier;
    for (const river of rendered.values()) {
      const target = river.tier <= maxTier ? river.baseAlpha : 0;
      if (target === river.targetAlpha) continue;
      river.targetAlpha = target;
      if (target > 0) river.entity.show = lensVisible;
      fading.add(river);
    }
  };

  const stepFade = (elapsed: number) => {
    const stride = (elapsed / FADE_MILLISECONDS) || 0;
    for (const river of [...fading]) {
      const delta = river.targetAlpha - river.alpha;
      const move = Math.sign(delta) * Math.min(Math.abs(delta), river.baseAlpha * stride);
      river.alpha = Math.abs(delta) <= 0.004 ? river.targetAlpha : river.alpha + move;
      paint(river);
      if (river.alpha !== river.targetAlpha) continue;
      if (river.alpha === 0) river.entity.show = false;
      fading.delete(river);
    }
  };

  // camera.changed does not fire for the opening fly-to, and reading the camera
  // once per frame is cheaper than listening for every kind of movement.
  const onPostRender = () => {
    const now = performance.now();
    const elapsed = lastFrameTime === 0 ? 16 : Math.min(now - lastFrameTime, 120);
    lastFrameTime = now;

    const height = viewer.camera.positionCartographic.height;
    if (height !== lastHeight) {
      lastHeight = height;
      const next = levelForHeight(height, level);
      if (next !== level) {
        level = next;
        retarget();
      }
    }
    if (fading.size > 0) stepFade(elapsed);
  };
  viewer.scene.postRender.addEventListener(onPostRender);

  const applySelection = () => {
    for (const river of rendered.values()) {
      if (!river.entity.polyline) continue;
      const selected = river.feature.id === selectedFeatureId;
      river.entity.polyline.width = new ConstantProperty(selected ? river.baseWidth * 2.1 : river.baseWidth);
    }
  };

  return {
    setVisible(visible) {
      lensVisible = visible;
      for (const river of rendered.values()) river.entity.show = visible && river.alpha > 0;
    },
    setSelectedFeature(featureId) {
      selectedFeatureId = featureId;
      applySelection();
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return rendered.get(picked.id)?.feature;
    },
    destroy() {
      viewer.scene.postRender.removeEventListener(onPostRender);
      for (const river of rendered.values()) viewer.entities.remove(river.entity);
      rendered.clear();
      fading.clear();
    },
  };
}
