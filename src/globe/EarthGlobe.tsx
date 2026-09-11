import { useEffect, useRef, type ReactNode } from "react";
import * as CesiumRuntime from "cesium";
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Credit,
  Math as CesiumMath,
  SceneTransforms,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SingleTileImageryProvider,
  type ImageryLayer,
  type Viewer,
} from "cesium";
import type { AppMode } from "../app/types";
import { localizeDataset } from "../i18n/domain";
import type { Locale } from "../i18n/types";
import { t } from "../i18n/copy";
import { loadLensDataset } from "../lenses/dataStore";
import { lensRegistry } from "../lenses/registry";
import type { LensFeature, LensRenderHandle } from "../lenses/types";
import type { GeographicPoint } from "../lenses/types";
import { reapplyNaturalEarthRelief } from "../lenses/terrain/NaturalEarthReliefProvider";
import { renderMissionEffects } from "../missions/effects/renderMissionEffects";
import type { MissionOverlayHandle } from "../missions/overlays/types";
import type { MissionHintEffect } from "../missions/types";
import { TimeController } from "../temporal/TimeController";
import type { TemporalSelection } from "../temporal/types";
import type { SharedCameraState, SharedFeatureState } from "../share/urlState";
import { createEarthViewer } from "./cesium/createViewer";

interface EarthGlobeProps {
  activeLensIds: Set<string>;
  onFeatureSelect: (feature: LensFeature, anchor: GeographicPoint) => void;
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
  temporalSelection: TemporalSelection;
  appMode: AppMode;
  missionEffects: MissionHintEffect[];
  missionFocus: (GeographicPoint & { altitude?: number }) | null;
  ariaLabel: string;
  locale: Locale;
  selectedFeature: LensFeature | null;
  anchorPoint: GeographicPoint | null;
  anchorExpanded: boolean;
  anchorContent: ReactNode;
  onAnchorClose: () => void;
  initialCamera: SharedCameraState | null;
  initialFeature: SharedFeatureState | null;
  terrainReliefEnabled: boolean;
  onCameraChange?: (camera: SharedCameraState) => void;
}

interface EllipsoidalOccluderLike {
  cameraPosition: Cartesian3;
  isPointVisible(point: Cartesian3): boolean;
}

const EllipsoidalOccluder = (CesiumRuntime as unknown as {
  EllipsoidalOccluder: new (ellipsoid: Viewer["scene"]["globe"]["ellipsoid"], cameraPosition?: Cartesian3) => EllipsoidalOccluderLike;
}).EllipsoidalOccluder;

/**
 * 復元された地球の1枚テクスチャ。
 *
 * 前は海岸線を数百本のポリラインで引いていて、線が多すぎて何を見ているのか
 * 分からなかった。DEEP LENS が先に同じ問題を解いていて、答えは「線を描かない」
 * ことだった。標高グリッドから焼いた等緯経度の画像を、現在の地球の上に1枚重ねる。
 *
 * 出典は Scotese & Wright (2018) PALEOMAP PaleoDEM（CC BY 4.0）。
 * 元は1度グリッドなので、海岸線は測量された岸ではなくモデルの0m等値線。
 */
const PALEO_TEXTURE_CREDIT = "Scotese & Wright (2018) PALEOMAP PaleoDEM · 1° grid · CC BY 4.0";

function paleoTextureUrl(ageMa: number): string {
  return `${import.meta.env.BASE_URL}geo/paleodem-${ageMa}.webp`;
}

export function EarthGlobe({ activeLensIds, onFeatureSelect, onLocationSelect, temporalSelection, appMode, missionEffects, missionFocus, ariaLabel, locale, selectedFeature, anchorPoint, anchorExpanded, anchorContent, onAnchorClose, initialCamera, initialFeature, terrainReliefEnabled, onCameraChange }: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRootRef = useRef<HTMLDivElement>(null);
  const anchorPinRef = useRef<HTMLSpanElement>(null);
  const anchorLineRef = useRef<HTMLSpanElement>(null);
  const anchorCardRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const renderHandlesRef = useRef(new Map<string, LensRenderHandle>());
  const paleoLayerRef = useRef<ImageryLayer | null>(null);
  const missionEffectHandlesRef = useRef<MissionOverlayHandle[]>([]);
  const activeLensIdsRef = useRef(activeLensIds);
  const temporalSelectionRef = useRef(temporalSelection);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const onLocationSelectRef = useRef(onLocationSelect);
  const selectedFeatureRef = useRef(selectedFeature);
  const anchorPointRef = useRef(anchorPoint);
  const anchorExpandedRef = useRef(anchorExpanded);
  const frozenCardPositionRef = useRef<{ left: number; top: number } | null>(null);
  const renderedLocaleRef = useRef<Locale | null>(null);
  const renderGenerationRef = useRef(0);
  const pendingLensLoadsRef = useRef(new Map<string, number>());
  const onCameraChangeRef = useRef(onCameraChange);
  const restoredFeatureRef = useRef(false);
  const initialCameraRef = useRef(initialCamera);
  const initialFeatureRef = useRef(initialFeature);

  useEffect(() => { activeLensIdsRef.current = activeLensIds; }, [activeLensIds]);
  useEffect(() => { temporalSelectionRef.current = temporalSelection; }, [temporalSelection]);
  useEffect(() => { onFeatureSelectRef.current = onFeatureSelect; }, [onFeatureSelect]);
  useEffect(() => { onLocationSelectRef.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { selectedFeatureRef.current = selectedFeature; }, [selectedFeature]);
  useEffect(() => { anchorPointRef.current = anchorPoint; frozenCardPositionRef.current = null; }, [anchorPoint]);
  useEffect(() => {
    anchorExpandedRef.current = anchorExpanded;
    frozenCardPositionRef.current = null;
    // シートに切り替わった瞬間に、吹き出し時代の inline 座標を落とす。
    // postRender を待つと、次の描画まで中途半端な位置のまま出る。
    const card = anchorCardRef.current;
    if (card && anchorExpanded && (containerRef.current?.clientWidth ?? window.innerWidth) <= 820) {
      card.style.left = "";
      card.style.top = "";
    }
  }, [anchorExpanded]);
  useEffect(() => { onCameraChangeRef.current = onCameraChange; }, [onCameraChange]);
  const terrainReliefEnabledRef = useRef(terrainReliefEnabled);
  useEffect(() => { terrainReliefEnabledRef.current = terrainReliefEnabled; }, [terrainReliefEnabled]);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = createEarthViewer(containerRef.current);
    viewerRef.current = viewer;
    // 画像レイヤは viewer の生成後に非同期で足される。足された時点で当て直さないと、
    // 初回だけ設定を無視した素の見た目で出る（設定はONなのに効かない、という状態になっていた）。
    const removeImageryListener = viewer.imageryLayers.layerAdded.addEventListener(() => {
      if (temporalSelectionRef.current.mode === "present") reapplyNaturalEarthRelief(viewer, terrainReliefEnabledRef.current);
    });
    const startingCamera = initialCameraRef.current;
    if (startingCamera) viewer.camera.setView({ destination: Cartesian3.fromDegrees(startingCamera.longitude, startingCamera.latitude, startingCamera.height), orientation: { heading: startingCamera.heading, pitch: startingCamera.pitch, roll: startingCamera.roll } });
    const emitCamera = () => {
      const cartographic = viewer.camera.positionCartographic;
      if (!cartographic) return;
      onCameraChangeRef.current?.({ longitude: CesiumMath.toDegrees(cartographic.longitude), latitude: CesiumMath.toDegrees(cartographic.latitude), height: cartographic.height, heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll: viewer.camera.roll });
    };
    let cameraTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleCamera = () => { if (cameraTimer) clearTimeout(cameraTimer); cameraTimer = setTimeout(emitCamera, 350); };
    viewer.camera.moveEnd.addEventListener(scheduleCamera);
    viewer.camera.changed.addEventListener(scheduleCamera);
    const occluder = new EllipsoidalOccluder(viewer.scene.globe.ellipsoid, viewer.camera.positionWC);
    const windowPosition = new Cartesian2();
    const renderHandles = renderHandlesRef.current;
    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((event: { position: Cartesian2 }) => {
      const surface = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      const clickedLocation = surface ? geographicPointFromCartesian(surface) : null;
      const picked = viewer.scene.pick(event.position) as { id?: unknown } | undefined;
      if (picked?.id) {
        for (const [lensId, handle] of renderHandles) {
          if (!activeLensIdsRef.current.has(lensId)) continue;
          const feature = handle.getFeatureForPick(picked.id);
          if (feature) {
            onFeatureSelectRef.current(feature, clickedLocation ?? featureAnchorPoint(feature));
            return;
          }
        }
      }
      if (temporalSelectionRef.current.mode !== "present") return;
      if (clickedLocation) onLocationSelectRef.current(clickedLocation);
    }, ScreenSpaceEventType.LEFT_CLICK);

    const updateAnchor = () => {
      const point = anchorPointRef.current;
      const root = anchorRootRef.current;
      const pin = anchorPinRef.current;
      const line = anchorLineRef.current;
      const card = anchorCardRef.current;
      if (!point || !root || !pin || !line || !card) return;

      const worldPosition = Cartesian3.fromDegrees(point.longitude, point.latitude, 350);
      occluder.cameraPosition = viewer.camera.positionWC;
      const projected = SceneTransforms.worldToWindowCoordinates(viewer.scene, worldPosition, windowPosition);
      const stageWidth = containerRef.current?.clientWidth ?? window.innerWidth;
      const stageHeight = containerRef.current?.clientHeight ?? window.innerHeight;

      // スマホで開いた状態は、座標に追従する吹き出しではなく下からのシート。
      // 位置は CSS が決めるので、こちらが付けた inline の座標を消して手を引く。
      // 地球を回して地点が裏へ回ってもシートは閉じない（読んでいる途中で消えない）。
      const isSheet = stageWidth <= 820 && anchorExpandedRef.current;
      if (isSheet) {
        root.style.visibility = "visible";
        root.dataset.visible = "true";
        root.dataset.sheet = "true";
        card.style.left = "";
        card.style.top = "";
        frozenCardPositionRef.current = null;
        pin.style.visibility = projected ? "visible" : "hidden";
        line.style.visibility = "hidden";
        if (projected) {
          pin.style.left = `${projected.x}px`;
          pin.style.top = `${projected.y}px`;
        }
        root.dataset.expanded = "true";
        return;
      }
      root.dataset.sheet = "false";
      pin.style.visibility = "visible";
      line.style.visibility = "visible";

      const visible = Boolean(projected && occluder.isPointVisible(worldPosition));
      root.style.visibility = visible ? "visible" : "hidden";
      root.dataset.visible = String(visible);
      if (!visible || !projected) return;

      const cardRect = card.getBoundingClientRect();
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;
      const edge = stageWidth <= 820 ? 8 : 14;
      const safeTop = stageWidth <= 820 ? 66 : 88;
      const safeBottom = stageWidth <= 820 ? mobileBottomChrome() : 18;
      const canPlaceRight = projected.x + 22 + cardWidth <= stageWidth - edge;
      const canPlaceLeft = projected.x - 22 - cardWidth >= edge;
      let left: number;
      let top: number;
      if (canPlaceRight || canPlaceLeft) {
        left = canPlaceRight ? projected.x + 22 : projected.x - cardWidth - 22;
        top = projected.y - cardHeight / 2;
      } else {
        left = projected.x - cardWidth / 2;
        const canPlaceBelow = projected.y + 22 + cardHeight <= stageHeight - safeBottom;
        top = canPlaceBelow ? projected.y + 22 : projected.y - cardHeight - 22;
      }
      left = clamp(left, edge, Math.max(edge, stageWidth - cardWidth - edge));
      top = clamp(top, safeTop, Math.max(safeTop, stageHeight - cardHeight - safeBottom));

      if (anchorExpandedRef.current) {
        // The card grows after the expand click. Revalidate the frozen position
        // against the current (expanded) height so it cannot remain anchored
        // below the viewport from the compact-card measurement.
        const maxExpandedTop = Math.max(safeTop, stageHeight - cardHeight - safeBottom);
        const frozen = frozenCardPositionRef.current;
        if (!frozen || frozen.top < safeTop || frozen.top > maxExpandedTop) {
          frozenCardPositionRef.current = { left, top: clamp(top, safeTop, maxExpandedTop) };
        }
        const resolvedPosition = frozenCardPositionRef.current;
        if (resolvedPosition) ({ left, top } = resolvedPosition);
      } else {
        frozenCardPositionRef.current = null;
      }

      pin.style.left = `${projected.x}px`;
      pin.style.top = `${projected.y}px`;
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;

      const lineTarget = nearestPointOnCard(projected.x, projected.y, left, top, cardWidth, cardHeight);
      const deltaX = lineTarget.x - projected.x;
      const deltaY = lineTarget.y - projected.y;
      line.style.left = `${projected.x}px`;
      line.style.top = `${projected.y}px`;
      line.style.width = `${Math.hypot(deltaX, deltaY)}px`;
      line.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
      root.dataset.anchorX = projected.x.toFixed(2);
      root.dataset.anchorY = projected.y.toFixed(2);
      root.dataset.cardLeft = left.toFixed(2);
      root.dataset.cardTop = top.toFixed(2);
      root.dataset.expanded = String(anchorExpandedRef.current);
    };
    viewer.scene.postRender.addEventListener(updateAnchor);

    return () => {
      removeImageryListener();
      viewer.scene.postRender.removeEventListener(updateAnchor);
      viewer.camera.moveEnd.removeEventListener(scheduleCamera);
      viewer.camera.changed.removeEventListener(scheduleCamera);
      if (cameraTimer) clearTimeout(cameraTimer);
      clickHandler.destroy();
      for (const handle of renderHandles.values()) handle.destroy();
      renderHandles.clear();
      viewerRef.current = null;
      viewer.destroy();
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const renderHandles = renderHandlesRef.current;
    if (renderedLocaleRef.current !== locale) {
      renderGenerationRef.current += 1;
      pendingLensLoadsRef.current.clear();
      for (const handle of renderHandles.values()) handle.destroy();
      renderHandles.clear();
      renderedLocaleRef.current = locale;
    }
    const generation = renderGenerationRef.current;
    for (const lens of lensRegistry) {
      const lensId = lens.definition.id;
      const shouldBeVisible = activeLensIds.has(lensId) && TimeController.isLensAvailable(lens.definition, temporalSelection);
      const existingHandle = renderHandles.get(lensId);
      if (existingHandle) {
        existingHandle.setVisible(shouldBeVisible);
        continue;
      }
      if (!shouldBeVisible || pendingLensLoadsRef.current.get(lensId) === generation) continue;
      pendingLensLoadsRef.current.set(lensId, generation);
      void loadLensDataset(lens).then((dataset) => {
        if (renderGenerationRef.current !== generation || viewer.isDestroyed()) return;
        pendingLensLoadsRef.current.delete(lensId);
        if (renderHandles.has(lensId)) return;
        let handle;
        try {
          handle = lens.render(viewer, localizeDataset(dataset, locale));
        } catch (error) {
          // 途中まで追加された entity が残ると、ハンドルが無いので二度と消せない。
          // 片付けてから投げ直し、静かに壊れないようにする。
          removeLensEntities(viewer, lensId);
          throw error;
        }
        handle.setSelectedFeature?.(selectedFeatureRef.current?.lensId === lensId ? selectedFeatureRef.current.id : undefined);
        handle.setVisible(
          activeLensIdsRef.current.has(lensId)
          && TimeController.isLensAvailable(lens.definition, temporalSelectionRef.current),
        );
        renderHandles.set(lensId, handle);
        const startingFeature = initialFeatureRef.current;
        if (!restoredFeatureRef.current && startingFeature?.lensId === lensId) {
          const restored = dataset.features.find((feature) => feature.id === startingFeature.featureId);
          if (restored) {
            restoredFeatureRef.current = true;
            onFeatureSelectRef.current(restored, featureAnchorPoint(restored));
          }
        }
      }).catch((error: unknown) => {
        pendingLensLoadsRef.current.delete(lensId);
        console.error(`Lens "${lensId}" failed to render`, error);
      });
    }
  }, [activeLensIds, locale, temporalSelection]);

  useEffect(() => {
    for (const [lensId, handle] of renderHandlesRef.current) {
      handle.setSelectedFeature?.(selectedFeature?.lensId === lensId ? selectedFeature.id : undefined);
    }
  }, [selectedFeature]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    const dropPaleoLayer = () => {
      const existing = paleoLayerRef.current;
      if (!existing) return;
      viewer.imageryLayers.remove(existing, true);
      paleoLayerRef.current = null;
    };

    /** 現在の地球の下地。古代のテクスチャは別扱いなので触らない。 */
    const restyleBaseLayers = (deepTime: boolean) => {
      for (let index = 0; index < viewer.imageryLayers.length; index += 1) {
        const layer = viewer.imageryLayers.get(index);
        if (layer === paleoLayerRef.current) continue;
        if (deepTime) { layer.alpha = 0; }
        else { layer.alpha = 1; }
      }
    };

    if (temporalSelection.mode === "present") {
      dropPaleoLayer();
      restyleBaseLayers(false);
      reapplyNaturalEarthRelief(viewer, terrainReliefEnabled);
      viewer.scene.globe.baseColor = Color.fromCssColorString("#071216");
      return;
    }

    viewer.scene.globe.baseColor = Color.fromCssColorString("#13272a");
    let cancelled = false;
    void SingleTileImageryProvider.fromUrl(paleoTextureUrl(temporalSelection.ageMa), { credit: new Credit(PALEO_TEXTURE_CREDIT) })
      .then((provider) => {
        if (cancelled || viewer.isDestroyed()) return;
        const arriving = viewer.imageryLayers.addImageryProvider(provider);
        // 先に足してから古い方を外す。入れ替えの一瞬だけ現代の地球が見えるのを防ぐ。
        dropPaleoLayer();
        paleoLayerRef.current = arriving;
        restyleBaseLayers(true);
      })
      .catch((error: unknown) => {
        console.warn(`Reconstructed Earth ${temporalSelection.ageMa} Ma could not be loaded`, error);
      });
    return () => { cancelled = true; };
  }, [temporalSelection, terrainReliefEnabled]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || appMode !== "mission") return;
    viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(-25, 18, 19_500_000), duration: 0.9 });
  }, [appMode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    for (const handle of missionEffectHandlesRef.current) handle.destroy();
    missionEffectHandlesRef.current = appMode === "mission" ? renderMissionEffects(viewer, missionEffects) : [];
    return () => {
      for (const handle of missionEffectHandlesRef.current) handle.destroy();
      missionEffectHandlesRef.current = [];
    };
  }, [appMode, missionEffects]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !missionFocus) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(missionFocus.longitude, missionFocus.latitude, missionFocus.altitude ?? 4_800_000),
      duration: 1.25,
    });
  }, [missionFocus]);

  return <div className="earth-stage">
    <div ref={containerRef} className="earth-globe" aria-label={ariaLabel} />
    {anchorPoint && anchorContent && <div ref={anchorRootRef} className={`globe-anchor${anchorExpanded ? " is-expanded" : ""}`}>
      <span ref={anchorLineRef} className="anchor-leader" aria-hidden="true" />
      <span ref={anchorPinRef} className="anchor-pin" aria-hidden="true" />
      <div ref={anchorCardRef} className="anchor-card">
        <button type="button" className="anchor-close" onClick={onAnchorClose} aria-label={t(locale, "close")}>×</button>
        {anchorContent}
      </div>
    </div>}
  </div>;
}

/**
 * レンズの描画が途中で失敗したときの後片付け。
 *
 * どのレンダラーも entity の id を `<lensId>:...` で始めるので、接頭辞で拾える。
 * ここを通らないと、追加済みの entity が viewer に残ったままハンドルが失われ、
 * そのレンズを二度と消せなくなる（2026-09-09、山脈・高原で実際に起きた）。
 */
function removeLensEntities(viewer: Viewer, lensId: string): void {
  const prefix = `${lensId}:`;
  for (const entity of [...viewer.entities.values]) {
    if (typeof entity.id === "string" && entity.id.startsWith(prefix)) viewer.entities.remove(entity);
  }
  for (let index = viewer.dataSources.length - 1; index >= 0; index -= 1) {
    const dataSource = viewer.dataSources.get(index);
    if (dataSource.name === lensId) viewer.dataSources.remove(dataSource, true);
  }
}

/**
 * スマホで下端に居座るものの高さ。
 *
 * 以前は CSS のレンズ帯が88px、こちらの計算が72pxで食い違っていて、
 * カードが帯の下に潜り込んでいた。数字は CSS 側の
 * --mobile-bottom-chrome を正本にして、こちらは読むだけにする。
 */
function mobileBottomChrome(): number {
  if (typeof window === "undefined") return 88;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--mobile-bottom-chrome");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 88;
}

function geographicPointFromCartesian(position: Cartesian3): GeographicPoint {
  const cartographic = Cartographic.fromCartesian(position);
  return { latitude: CesiumMath.toDegrees(cartographic.latitude), longitude: CesiumMath.toDegrees(cartographic.longitude) };
}

function featureAnchorPoint(feature: LensFeature): GeographicPoint {
  if (feature.geometry.type === "point") return feature.geometry.coordinates;
  if (feature.geometry.type === "area") return feature.geometry.centroid;
  if (feature.geometry.type === "polyline") return feature.geometry.paths[0]?.[0] ?? { latitude: 0, longitude: 0 };
  return feature.geometry.endpoints[0] ?? { latitude: 0, longitude: 0 };
}

function nearestPointOnCard(x: number, y: number, left: number, top: number, width: number, height: number): { x: number; y: number } {
  const right = left + width;
  const bottom = top + height;
  const clampedX = clamp(x, left, right);
  const clampedY = clamp(y, top, bottom);
  if (x < left || x > right) return { x: clampedX, y: clampedY };
  return Math.abs(y - top) < Math.abs(y - bottom) ? { x: clampedX, y: top } : { x: clampedX, y: bottom };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
