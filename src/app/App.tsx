import { useEffect, useMemo, useState } from "react";
import type { AppMode } from "./types";
import { AnchoredDetailsCard } from "../components/AnchoredDetailsCard";
import { LayerPanel } from "../components/LayerPanel";
import { LanguageSelector } from "../components/LanguageSelector";
import { ModeSelector } from "../components/ModeSelector";
import { MissionAnchoredCard } from "../components/mission/MissionAnchoredCard";
import { MissionPanel } from "../components/mission/MissionPanel";
import { MissionPassport } from "../components/mission/MissionPassport";
import { ShareButton } from "../components/ShareButton";
import { AboutSplash } from "../components/AboutSplash";
import { shouldShowAboutSplash } from "../components/aboutSplashState";
import { Timeline } from "../components/Timeline";
import { EarthGlobe } from "../globe/EarthGlobe";
import { useIsCompact } from "../hooks/useIsCompact";
import { lensRegistry } from "../lenses/registry";
import type { LensFeature } from "../lenses/types";
import { createMissionState, getActiveMissionEffects, revealNextHint, selectMissionFeature, selectMissionLocation, submitMissionLocation } from "../missions/engine";
import { loadMissionProgress, recordMissionCompletion, saveMissionProgress } from "../missions/progressStore";
import { getDefaultMission, getMission, missionRegistry } from "../missions/registry";
import type { MissionProgress } from "../missions/types";
import { t } from "../i18n/copy";
import { localizeLensDefinition, localizeMission } from "../i18n/domain";
import type { Locale } from "../i18n/types";
import type { TemporalSelection } from "../temporal/types";
import { analyzeLocation } from "../why-here/analyzeLocation";
import type { WhyHereResult } from "../why-here/types";
import { readSharedViewState, type SharedCameraState, type SharedViewState } from "../share/urlState";

type MissionView = "passport" | "field";
const defaultMission = getDefaultMission();
const initialSharedView = readSharedViewState();
const hasSharedView = new URLSearchParams(window.location.search).get("v") === "1";
const CAMERA_STORAGE_KEY = "earth-lens-camera";

function readStoredCamera(): SharedCameraState | null {
  try {
    const raw = window.localStorage.getItem(CAMERA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SharedCameraState>;
    if ([parsed.longitude, parsed.latitude, parsed.height, parsed.heading, parsed.pitch, parsed.roll].every((value) => typeof value === "number" && Number.isFinite(value))
      && Math.abs(parsed.longitude ?? 0) <= 180
      && Math.abs(parsed.latitude ?? 0) <= 90
      && (parsed.height ?? 0) >= 10_000
      && (parsed.height ?? 0) <= 100_000_000) {
      return parsed as SharedCameraState;
    }
  } catch {
    // localStorage may be unavailable in private browsing or embedded previews.
  }
  return null;
}
const openingLocation = { latitude: 1.264, longitude: 103.84 };
const openingFeature = { lensId: "major-ports", featureId: "port-singapore" };

function initialLocale(): Locale {
  if (initialSharedView.locale) return initialSharedView.locale;
  try {
    const stored = localStorage.getItem("earth-lens-locale");
    if (stored === "ja" || stored === "en") return stored;
  } catch { /* private browsing: use the browser hint */ }
  return typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function App() {
  const isCompact = useIsCompact();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [appMode, setAppMode] = useState<AppMode>(initialSharedView.mode ?? "explore");
  const [missionView, setMissionView] = useState<MissionView>(initialSharedView.mode === "mission" ? "field" : "passport");
  const [missionState, setMissionState] = useState(() => createMissionState(defaultMission));
  const [missionProgress, setMissionProgress] = useState<Record<string, MissionProgress>>(() => loadMissionProgress());
  const [newlyCollectedId, setNewlyCollectedId] = useState<string | null>(null);
  const currentMission = getMission(missionState.currentMissionId) ?? defaultMission;
  const displayMission = useMemo(() => localizeMission(currentMission, locale), [currentMission, locale]);
  const displayMissions = useMemo(() => missionRegistry.map((mission) => localizeMission(mission, locale)), [locale]);
  const missionEffects = useMemo(() => getActiveMissionEffects(missionState.revealedHintIds, displayMission), [displayMission, missionState.revealedHintIds]);
  const cameraEffect = [...missionEffects].reverse().find((effect) => effect.type === "camera-focus");
  const displayLenses = useMemo(() => lensRegistry.map((lens) => localizeLensDefinition(lens.definition, locale)), [locale]);
  const defaultLensIds = useMemo(() => new Set(lensRegistry.filter((lens) => lens.definition.visibleByDefault).map((lens) => lens.definition.id)), []);
  const initialActiveLensIds = useMemo(() => {
    const knownLensIds = new Set(lensRegistry.map((lens) => lens.definition.id));
    const fallbackIds = hasSharedView ? [...defaultLensIds] : [...defaultLensIds, "major-ports", "shipping-flows"];
    const initialFeature = initialSharedView.feature ?? (!hasSharedView ? openingFeature : null);
    const ids = new Set((initialSharedView.lensIds ?? fallbackIds).filter((id) => knownLensIds.has(id)));
    if (initialFeature && knownLensIds.has(initialFeature.lensId)) ids.add(initialFeature.lensId);
    return ids;
  }, [defaultLensIds]);
  const [activeLensIds, setActiveLensIds] = useState(() => new Set(initialActiveLensIds));
  const [missionLensIds, setMissionLensIds] = useState(() => new Set(initialSharedView.lensIds ?? defaultLensIds));
  const [selectedFeature, setSelectedFeature] = useState<LensFeature | null>(null);
  const [sharedFeature, setSharedFeature] = useState(initialSharedView.feature ?? (!hasSharedView ? openingFeature : null));
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(initialSharedView.location);
  const [anchorPoint, setAnchorPoint] = useState<{ latitude: number; longitude: number } | null>(initialSharedView.location ?? (!hasSharedView ? openingLocation : null));
  const [anchorExpanded, setAnchorExpanded] = useState(false);
  const [whyHereResult, setWhyHereResult] = useState<WhyHereResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [temporalSelection, setTemporalSelection] = useState<TemporalSelection>(initialSharedView.temporal ?? { mode: "present", ageMa: 0 });
  const [sharedCamera, setSharedCamera] = useState<SharedCameraState | null>(() => initialSharedView.camera ?? (!hasSharedView ? readStoredCamera() : null));
  const [aboutOpen, setAboutOpen] = useState(!hasSharedView && shouldShowAboutSplash);
  const [utilityOpen, setUtilityOpen] = useState(false);
  const [missionBriefingOpen, setMissionBriefingOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    try { localStorage.setItem("earth-lens-locale", locale); } catch { /* private browsing */ }
  }, [locale]);
  useEffect(() => {
    if (!sharedCamera) return;
    try {
      window.localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(sharedCamera));
    } catch {
      // localStorage may be unavailable in private browsing or embedded previews.
    }
  }, [sharedCamera]);

  const shareState: SharedViewState = {
    camera: sharedCamera,
    lensIds: [...(appMode === "explore" ? activeLensIds : missionLensIds)],
    location: anchorPoint,
    feature: sharedFeature,
    mode: appMode,
    locale: null,
    temporal: temporalSelection,
  };

  const toggleExploreLens = (lensId: string) => setActiveLensIds((current) => toggleSetValue(current, lensId));
  const toggleMissionLens = (lensId: string) => setMissionLensIds((current) => toggleSetValue(current, lensId));
  const clearSelection = () => { setSelectedFeature(null); setSharedFeature(null); setSelectedLocation(null); setAnchorPoint(null); setAnchorExpanded(false); setWhyHereResult(null); };
  const selectFeature = (feature: LensFeature, anchor: { latitude: number; longitude: number }) => { setSelectedFeature(feature); setSharedFeature({ lensId: feature.lensId, featureId: feature.id }); setSelectedLocation(null); setAnchorPoint(anchor); setAnchorExpanded(false); setWhyHereResult(null); };
  const handleGlobeFeature = (feature: LensFeature, anchor: { latitude: number; longitude: number }) => {
    if (appMode === "mission") {
      setSelectedFeature(feature);
      setSharedFeature({ lensId: feature.lensId, featureId: feature.id });
      setMissionState((state) => selectMissionFeature(state, feature));
      setAnchorPoint(missionFeatureAnchor(feature));
    } else {
      selectFeature(feature, anchor);
    }
  };
  const selectLocation = (location: { latitude: number; longitude: number }) => { setSelectedLocation(location); setSelectedFeature(null); setSharedFeature(null); setAnchorPoint(location); setAnchorExpanded(false); setWhyHereResult(null); };
  const handleGlobeLocation = (location: { latitude: number; longitude: number }) => {
    if (appMode === "mission") {
      setMissionState((state) => selectMissionLocation(state, location));
      setAnchorPoint(location);
    } else {
      selectLocation(location);
    }
  };
  const runWhyHere = async () => { if (!anchorPoint) return; setIsAnalyzing(true); try { setWhyHereResult(await analyzeLocation(anchorPoint, 500)); } finally { setIsAnalyzing(false); } };
  const changeTime = (selection: TemporalSelection) => { setTemporalSelection(selection); clearSelection(); };
  const changeMode = (mode: AppMode) => {
    setAppMode(mode); clearSelection();
    if (mode === "mission") { setMissionView("passport"); setTemporalSelection({ mode: "present", ageMa: 0 }); }
  };
  const startMission = (missionId: string) => {
    const mission = getMission(missionId); if (!mission) return;
    setMissionState(createMissionState(mission)); setMissionLensIds(new Set(mission.recommendedLensIds)); clearSelection(); setMissionView("field"); setNewlyCollectedId(null);
  };
  const collectSticker = () => { setNewlyCollectedId(currentMission.id); setMissionView("passport"); };
  const submitMissionAnswer = () => {
    const nextState = submitMissionLocation(missionState, currentMission);
    setMissionState(nextState);
    if (nextState.status === "completed") {
      setAnchorPoint(currentMission.target); setAnchorExpanded(true); setSelectedFeature(null); setSharedFeature(null);
      setMissionProgress((current) => {
        const nextProgress = recordMissionCompletion(current, nextState);
        saveMissionProgress(nextProgress);
        return nextProgress;
      });
    }
  };

  const showGlobe = appMode === "explore" || missionView === "field";
  const missionFocus = useMemo(() => missionState.status === "completed"
    ? currentMission.target
    : cameraEffect?.type === "camera-focus" ? { ...cameraEffect.location, altitude: cameraEffect.altitude } : null,
  [cameraEffect, currentMission.target, missionState.status]);
  const layerPanel = <LayerPanel lenses={displayLenses} activeLensIds={appMode === "explore" ? activeLensIds : missionLensIds} locale={locale} onToggle={appMode === "explore" ? toggleExploreLens : toggleMissionLens} suspended={appMode === "explore" && temporalSelection.mode === "deep-time"} missionRecommendedLensIds={appMode === "mission" ? currentMission.recommendedLensIds : undefined} />;
  const timeline = <Timeline selection={temporalSelection} locale={locale} onChange={changeTime} />;
  const missionPanel = <MissionPanel mission={displayMission} state={missionState} locale={locale} onOpenPassport={() => { setMissionView("passport"); }} onRevealHint={() => setMissionState((state) => revealNextHint(state, currentMission))} />;
  const missionAnchorContent = anchorPoint ? <MissionAnchoredCard mission={displayMission} state={missionState} locale={locale} expanded={anchorExpanded} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} onSubmit={submitMissionAnswer} onAnalyze={() => { setAnchorExpanded(true); void runWhyHere(); }} onCollectSticker={collectSticker} onExpand={() => setAnchorExpanded(true)} onClose={clearSelection} /> : null;

  return (
    <main lang={locale} className={`app-shell${locale === "ja" ? " ja-ui" : ""}${isCompact ? " compact-ui" : ""}${temporalSelection.mode === "deep-time" ? " deep-time-active" : ""}${appMode === "mission" ? " mission-mode" : ""}${missionView === "passport" && appMode === "mission" ? " passport-mode" : ""}`}>
      {showGlobe && <EarthGlobe activeLensIds={appMode === "explore" ? activeLensIds : missionLensIds} onFeatureSelect={handleGlobeFeature} onLocationSelect={handleGlobeLocation} temporalSelection={temporalSelection} appMode={appMode} missionEffects={missionEffects} missionFocus={missionFocus} ariaLabel={t(locale, "interactiveEarth")} locale={locale} selectedFeature={selectedFeature} anchorPoint={anchorPoint} anchorExpanded={anchorExpanded} anchorContent={appMode === "explore" ? (anchorPoint ? <AnchoredDetailsCard feature={selectedFeature} location={selectedLocation} anchorPoint={anchorPoint} expanded={anchorExpanded} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onExpand={() => setAnchorExpanded(true)} onAnalyze={() => { setAnchorExpanded(true); void runWhyHere(); }} onClose={clearSelection} /> : null) : missionAnchorContent} initialCamera={sharedCamera} initialFeature={initialSharedView.feature ?? (!hasSharedView ? openingFeature : null)} onCameraChange={setSharedCamera} />}
      <header className="app-header"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true" /><div><strong><span className="brand-full">EARTH LENS</span><span className="brand-compact" aria-hidden="true">EL</span></strong><span>{t(locale, "systemSubtitle")}</span></div></div><ModeSelector mode={appMode} locale={locale} onChange={changeMode} /><div className="header-controls"><button type="button" className="header-utility-toggle" aria-expanded={utilityOpen} onClick={() => setUtilityOpen((open) => !open)}>{t(locale, "tools")}</button><div className={`header-utility${utilityOpen ? " is-open" : ""}`}>{appMode === "explore" && timeline}<ShareButton locale={locale} state={shareState} /><LanguageSelector locale={locale} onChange={setLocale} /><button type="button" className="header-about" onClick={() => { setAboutOpen(true); setUtilityOpen(false); }}>{t(locale, "aboutMenu")}</button>{appMode === "mission" && <div className="mode-readout"><span>{t(locale, "journeyStatus")}</span><strong>{t(locale, "missionPassport")}</strong></div>}<button type="button" className="utility-sheet-close" onClick={() => setUtilityOpen(false)}>{t(locale, "close")}</button></div></div></header>
      {showGlobe && layerPanel}
      {appMode === "mission" && (missionView === "passport" ? <MissionPassport missions={displayMissions} progress={missionProgress} locale={locale} newlyCollectedId={newlyCollectedId} onStartMission={startMission} /> : <details className="mission-briefing-dock" open={missionBriefingOpen} onToggle={(event) => setMissionBriefingOpen(event.currentTarget.open)}><summary><span>MISSION {String(displayMission.number).padStart(2, "0")} · {displayMission.title}</span><small>{t(locale, "hints")} {missionState.revealedHintIds.length} / {displayMission.hints.length}</small><b>{missionBriefingOpen ? t(locale, "closeBriefing") : t(locale, "openBriefing")}</b></summary>{missionPanel}</details>)}
      {aboutOpen && <AboutSplash locale={locale} onLocaleChange={setLocale} onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

function missionFeatureAnchor(feature: LensFeature): { latitude: number; longitude: number } {
  if (feature.geometry.type === "point") return feature.geometry.coordinates;
  if (feature.geometry.type === "area") return feature.geometry.centroid;
  if (feature.geometry.type === "polyline") return feature.geometry.paths[0]?.[0] ?? { latitude: 0, longitude: 0 };
  return feature.geometry.endpoints[0] ?? { latitude: 0, longitude: 0 };
}

function toggleSetValue(current: Set<string>, value: string): Set<string> {
  const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next;
}
