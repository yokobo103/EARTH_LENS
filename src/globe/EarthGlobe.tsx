import { useEffect, useRef, type ReactNode } from "react";
import * as CesiumRuntime from "cesium";
import {
  ArcType,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  Entity,
  Math as CesiumMath,
  PolygonHierarchy,
  SceneTransforms,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Viewer,
} from "cesium";
import type { AppMode } from "../app/types";
import { localizeDataset } from "../i18n/domain";
import type { Locale } from "../i18n/types";
import { loadLensDataset } from "../lenses/dataStore";
import { lensRegistry } from "../lenses/registry";
import type { LensFeature, LensRenderHandle } from "../lenses/types";
import type { GeographicPoint } from "../lenses/types";
import { reapplyNaturalEarthRelief } from "../lenses/terrain/NaturalEarthReliefProvider";
import { renderMissionEffects } from "../missions/effects/renderMissionEffects";
import type { MissionOverlayHandle } from "../missions/overlays/types";
import type { MissionHintEffect } from "../missions/types";
import { DemoPaleoEarthProvider } from "../temporal/DemoPaleoEarthProvider";
import { TimeController } from "../temporal/TimeController";
import type { PaleoEarthSnapshot, TemporalSelection } from "../temporal/types";
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
  initialCamera: SharedCameraState | null;
  initialFeature: SharedFeatureState | null;
  onCameraChange?: (camera: SharedCameraState) => void;
}

interface EllipsoidalOccluderLike {
  cameraPosition: Cartesian3;
  isPointVisible(point: Cartesian3): boolean;
}

const EllipsoidalOccluder = (CesiumRuntime as unknown as {
  EllipsoidalOccluder: new (ellipsoid: Viewer["scene"]["globe"]["ellipsoid"], cameraPosition?: Cartesian3) => EllipsoidalOccluderLike;
}).EllipsoidalOccluder;

function renderPaleoSnapshot(viewer: Viewer, snapshot: PaleoEarthSnapshot): Entity[] {
  return snapshot.polygons.flatMap((polygon) => {
    const degrees = polygon.coordinates.flatMap((point) => [point.longitude, point.latitude]);
    const positions = Cartesian3.fromDegreesArray(degrees);
    return [
      viewer.entities.add(new Entity({
        id: `paleo:${snapshot.ageMa}:${polygon.id}:fill`,
        name: polygon.name,
        polygon: {
          hierarchy: new PolygonHierarchy(positions),
          material: Color.fromCssColorString("#ba8b55").withAlpha(0.82),
          outline: false,
        },
      })),
      viewer.entities.add(new Entity({
        id: `paleo:${snapshot.ageMa}:${polygon.id}:outline`,
        name: polygon.name,
        polyline: {
          positions,
          width: 2,
          arcType: ArcType.GEODESIC,
          material: Color.fromCssColorString("#ffd690").withAlpha(0.9),
        },
      })),
    ];
  });
}

export function EarthGlobe({ activeLensIds, onFeatureSelect, onLocationSelect, temporalSelection, appMode, missionEffects, missionFocus, ariaLabel, locale, selectedFeature, anchorPoint, anchorExpanded, anchorContent, initialCamera, initialFeature, onCameraChange }: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRootRef = useRef<HTMLDivElement>(null);
  const anchorPinRef = useRef<HTMLSpanElement>(null);
  const anchorLineRef = useRef<HTMLSpanElement>(null);
  const anchorCardRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const renderHandlesRef = useRef(new Map<string, LensRenderHandle>());
  const paleoEntitiesRef = useRef<Entity[]>([]);
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
  useEffect(() => { anchorExpandedRef.current = anchorExpanded; frozenCardPositionRef.current = null; }, [anchorExpanded]);
  useEffect(() => { onCameraChangeRef.current = onCameraChange; }, [onCameraChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = createEarthViewer(containerRef.current);
    viewerRef.current = viewer;
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
      const visible = Boolean(projected && occluder.isPointVisible(worldPosition));
      root.style.visibility = visible ? "visible" : "hidden";
      root.dataset.visible = String(visible);
      if (!visible || !projected) return;

      const stageWidth = containerRef.current?.clientWidth ?? window.innerWidth;
      const stageHeight = containerRef.current?.clientHeight ?? window.innerHeight;
      const cardRect = card.getBoundingClientRect();
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;
      const edge = stageWidth <= 820 ? 8 : 14;
      const safeTop = stageWidth <= 820 ? 66 : 88;
      const safeBottom = stageWidth <= 820 ? 72 : 18;
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
        frozenCardPositionRef.current ??= { left, top };
        ({ left, top } = frozenCardPositionRef.current);
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
        const handle = lens.render(viewer, localizeDataset(dataset, locale));
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
    for (const entity of paleoEntitiesRef.current) viewer.entities.remove(entity);
    paleoEntitiesRef.current = [];

    if (temporalSelection.mode === "present") {
      reapplyNaturalEarthRelief(viewer, activeLensIdsRef.current.has("terrain-relief"));
    } else {
      for (let index = 0; index < viewer.imageryLayers.length; index += 1) {
        const layer = viewer.imageryLayers.get(index);
        layer.alpha = 0.12;
        layer.saturation = 0;
        layer.brightness = 0.42;
      }
    }
    viewer.scene.globe.baseColor = Color.fromCssColorString(temporalSelection.mode === "present" ? "#071216" : "#13272a");

    if (temporalSelection.mode === "present") return;
    let cancelled = false;
    const provider = new DemoPaleoEarthProvider();
    void provider.getSnapshot(temporalSelection.ageMa).then((snapshot) => {
      if (cancelled || viewer.isDestroyed()) return;
      paleoEntitiesRef.current = renderPaleoSnapshot(viewer, snapshot);
      viewer.camera.flyTo({ destination: Cartesian3.fromDegrees(0, 8, 19_500_000), duration: 0.8 });
    });
    return () => { cancelled = true; };
  }, [temporalSelection]);

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
      <div ref={anchorCardRef} className="anchor-card">{anchorContent}</div>
    </div>}
  </div>;
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
