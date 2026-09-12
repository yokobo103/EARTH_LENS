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
 * Natural Earth carries 1,454 river and lake centerlines. Drawing all of them
 * at once buried the Nile among its own tributaries, and a screen full of
 * sub-pixel glowing lines shimmered whenever the globe moved.
 *
 * The lens now shows a skeleton first and fills it in as the camera comes
 * down. Rank 4 is the far step because that is where Natural Earth puts the
 * Tigris -- one step tighter and the Tigris, Euphrates, Indus, Ganges and
 * Huang He all disappear from a world view, which is the opposite of the
 * point.
 */
interface LodStep {
  maxRank: number;
  enterBelowMetres: number;
}

const FARTHEST_STEP: LodStep = { maxRank: 4, enterBelowMetres: Number.POSITIVE_INFINITY };
const LOD_STEPS: readonly LodStep[] = [
  FARTHEST_STEP,
  { maxRank: 6, enterBelowMetres: 3_500_000 },
  { maxRank: 10, enterBelowMetres: 900_000 },
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

function displayRank(feature: LensFeature): number {
  const value = feature.attributes.displayRank ?? feature.attributes.scaleRank;
  return typeof value === "number" ? value : 10;
}

/**
 * Width and opacity both carry the ranking, so a major river reads as major
 * even where it runs beside its tributaries. Nothing goes below one pixel:
 * a thinner line than that is what was shimmering in the first place.
 */
function widthFor(rank: number): number {
  return rank <= 1 ? 2.2 : rank <= 2 ? 1.9 : rank <= 4 ? 1.5 : rank <= 6 ? 1.15 : 1;
}

function alphaFor(rank: number): number {
  return rank <= 1 ? 0.8 : rank <= 2 ? 0.72 : rank <= 4 ? 0.58 : rank <= 6 ? 0.44 : 0.34;
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
  rank: number;
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
    const rank = displayRank(feature);
    const baseWidth = widthFor(rank);
    const baseAlpha = alphaFor(rank);
    const visible = rank <= stepAt(level).maxRank;
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
        rank,
        baseWidth,
        baseAlpha,
        alpha: visible ? baseAlpha : 0,
        targetAlpha: visible ? baseAlpha : 0,
      });
    }
  }

  const retarget = () => {
    const maxRank = stepAt(level).maxRank;
    for (const river of rendered.values()) {
      const target = river.rank <= maxRank ? river.baseAlpha : 0;
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
