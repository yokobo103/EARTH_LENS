import { useEffect, useRef } from "react";
import {
  ArcType,
  Cartesian3,
  Cartographic,
  Color,
  Entity,
  Math as CesiumMath,
  PolygonHierarchy,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Cartesian2,
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
import { createEarthViewer } from "./cesium/createViewer";

interface EarthGlobeProps {
  activeLensIds: Set<string>;
  onFeatureSelect: (feature: LensFeature) => void;
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
  temporalSelection: TemporalSelection;
  appMode: AppMode;
  missionEffects: MissionHintEffect[];
  missionFocus: (GeographicPoint & { altitude?: number }) | null;
  ariaLabel: string;
  locale: Locale;
  selectedFeature: LensFeature | null;
}

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

export function EarthGlobe({ activeLensIds, onFeatureSelect, onLocationSelect, temporalSelection, appMode, missionEffects, missionFocus, ariaLabel, locale, selectedFeature }: EarthGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const renderHandlesRef = useRef(new Map<string, LensRenderHandle>());
  const paleoEntitiesRef = useRef<Entity[]>([]);
  const missionEffectHandlesRef = useRef<MissionOverlayHandle[]>([]);
  const activeLensIdsRef = useRef(activeLensIds);
  const temporalSelectionRef = useRef(temporalSelection);
  const onFeatureSelectRef = useRef(onFeatureSelect);
  const onLocationSelectRef = useRef(onLocationSelect);
  const selectedFeatureRef = useRef(selectedFeature);
  const renderedLocaleRef = useRef<Locale | null>(null);
  const renderGenerationRef = useRef(0);
  const pendingLensLoadsRef = useRef(new Map<string, number>());

  useEffect(() => { activeLensIdsRef.current = activeLensIds; }, [activeLensIds]);
  useEffect(() => { temporalSelectionRef.current = temporalSelection; }, [temporalSelection]);
  useEffect(() => { onFeatureSelectRef.current = onFeatureSelect; }, [onFeatureSelect]);
  useEffect(() => { onLocationSelectRef.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { selectedFeatureRef.current = selectedFeature; }, [selectedFeature]);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = createEarthViewer(containerRef.current);
    viewerRef.current = viewer;
    const renderHandles = renderHandlesRef.current;
    const clickHandler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    clickHandler.setInputAction((event: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(event.position) as { id?: unknown } | undefined;
      if (picked?.id) {
        for (const [lensId, handle] of renderHandles) {
          if (!activeLensIdsRef.current.has(lensId)) continue;
          const feature = handle.getFeatureForPick(picked.id);
          if (feature) {
            onFeatureSelectRef.current(feature);
            return;
          }
        }
      }
      if (temporalSelectionRef.current.mode !== "present") return;
      const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
      if (!cartesian) return;
      const cartographic = Cartographic.fromCartesian(cartesian);
      onLocationSelectRef.current({
        latitude: CesiumMath.toDegrees(cartographic.latitude),
        longitude: CesiumMath.toDegrees(cartographic.longitude),
      });
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
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

  return <div ref={containerRef} className="earth-globe" aria-label={ariaLabel} />;
}
