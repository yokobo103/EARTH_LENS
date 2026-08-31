import { useEffect, useMemo, useState } from "react";
import type { AppMode } from "./types";
import { CompactSheet, type CompactSheetTab } from "../components/CompactSheet";
import { AnchoredDetailsCard } from "../components/AnchoredDetailsCard";
import { LayerPanel } from "../components/LayerPanel";
import { LanguageSelector } from "../components/LanguageSelector";
import { ModeSelector } from "../components/ModeSelector";
import { MissionEffectsReadout } from "../components/mission/MissionEffectsReadout";
import { MissionObservationPanel } from "../components/mission/MissionObservationPanel";
import { MissionPanel } from "../components/mission/MissionPanel";
import { MissionPassport } from "../components/mission/MissionPassport";
import { MissionResultPanel } from "../components/mission/MissionResultPanel";
import { ShareButton } from "../components/ShareButton";
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
import { readSharedViewState, writeSharedViewState, type SharedCameraState } from "../share/urlState";

type MissionView = "passport" | "field";
type CompactPanel = "briefing" | "answer" | "result";
const defaultMission = getDefaultMission();
const initialSharedView = readSharedViewState();

export function App() {
  const isCompact = useIsCompact();
  const [compactPanel, setCompactPanel] = useState<CompactPanel | null>(null);
  const [locale, setLocale] = useState<Locale>(() => initialSharedView.locale ?? (localStorage.getItem("earth-lens-locale") === "ja" ? "ja" : "en"));
  const [appMode, setAppMode] = useState<AppMode>(initialSharedView.mode ?? "explore");
  const [missionView, setMissionView] = useState<MissionView>("passport");
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
    const ids = new Set((initialSharedView.lensIds ?? [...defaultLensIds]).filter((id) => knownLensIds.has(id)));
    if (initialSharedView.feature && knownLensIds.has(initialSharedView.feature.lensId)) ids.add(initialSharedView.feature.lensId);
    return ids;
  }, [defaultLensIds]);
  const [activeLensIds, setActiveLensIds] = useState(() => new Set(initialActiveLensIds));
  const [missionLensIds, setMissionLensIds] = useState(() => new Set(defaultLensIds));
  const [selectedFeature, setSelectedFeature] = useState<LensFeature | null>(null);
  const [sharedFeature, setSharedFeature] = useState(initialSharedView.feature);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(initialSharedView.location);
  const [anchorPoint, setAnchorPoint] = useState<{ latitude: number; longitude: number } | null>(initialSharedView.location);
  const [anchorExpanded, setAnchorExpanded] = useState(false);
  const [whyHereResult, setWhyHereResult] = useState<WhyHereResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [temporalSelection, setTemporalSelection] = useState<TemporalSelection>(initialSharedView.temporal ?? { mode: "present", ageMa: 0 });
  const [sharedCamera, setSharedCamera] = useState<SharedCameraState | null>(initialSharedView.camera);

  useEffect(() => { document.documentElement.lang = locale; localStorage.setItem("earth-lens-locale", locale); }, [locale]);
  useEffect(() => {
    writeSharedViewState({ camera: sharedCamera, lensIds: [...(appMode === "explore" ? activeLensIds : missionLensIds)], location: anchorPoint, feature: sharedFeature, mode: appMode, locale, temporal: temporalSelection });
  }, [activeLensIds, appMode, locale, missionLensIds, sharedCamera, sharedFeature, temporalSelection, anchorPoint]);

  const toggleExploreLens = (lensId: string) => setActiveLensIds((current) => toggleSetValue(current, lensId));
  const toggleMissionLens = (lensId: string) => setMissionLensIds((current) => toggleSetValue(current, lensId));
  const clearSelection = () => { setSelectedFeature(null); setSharedFeature(null); setSelectedLocation(null); setAnchorPoint(null); setAnchorExpanded(false); setWhyHereResult(null); };
  const selectFeature = (feature: LensFeature, anchor: { latitude: number; longitude: number }) => { setSelectedFeature(feature); setSharedFeature({ lensId: feature.lensId, featureId: feature.id }); setSelectedLocation(null); setAnchorPoint(anchor); setAnchorExpanded(false); setWhyHereResult(null); };
  const handleGlobeFeature = (feature: LensFeature, anchor: { latitude: number; longitude: number }) => {
    if (appMode === "mission") {
      setSelectedFeature(feature);
      setSharedFeature({ lensId: feature.lensId, featureId: feature.id });
      setMissionState((state) => selectMissionFeature(state, feature));
      if (isCompact) setCompactPanel("answer");
    } else {
      selectFeature(feature, anchor);
    }
  };
  const selectLocation = (location: { latitude: number; longitude: number }) => { setSelectedLocation(location); setSelectedFeature(null); setSharedFeature(null); setAnchorPoint(location); setAnchorExpanded(false); setWhyHereResult(null); };
  const handleGlobeLocation = (location: { latitude: number; longitude: number }) => {
    if (appMode === "mission") {
      setMissionState((state) => selectMissionLocation(state, location));
      if (isCompact) setCompactPanel("answer");
    } else {
      selectLocation(location);
    }
  };
  const runWhyHere = async () => { if (!anchorPoint) return; setIsAnalyzing(true); try { setWhyHereResult(await analyzeLocation(anchorPoint, 500)); } finally { setIsAnalyzing(false); } };
  const changeTime = (selection: TemporalSelection) => { setTemporalSelection(selection); clearSelection(); };
  const changeMode = (mode: AppMode) => {
    setAppMode(mode); setCompactPanel(null); clearSelection();
    if (mode === "mission") { setMissionView("passport"); setTemporalSelection({ mode: "present", ageMa: 0 }); }
  };
  const startMission = (missionId: string) => {
    const mission = getMission(missionId); if (!mission) return;
    setMissionState(createMissionState(mission)); setMissionLensIds(new Set(defaultLensIds)); clearSelection(); setMissionView("field"); setNewlyCollectedId(null); setCompactPanel(null);
  };
  const collectSticker = () => { setNewlyCollectedId(currentMission.id); setMissionView("passport"); setCompactPanel(null); };
  const submitMissionAnswer = () => {
    const nextState = submitMissionLocation(missionState, currentMission);
    setMissionState(nextState);
    if (nextState.status === "completed") {
      if (isCompact) setCompactPanel("result");
      setMissionProgress((current) => {
        const nextProgress = recordMissionCompletion(current, nextState);
        saveMissionProgress(nextProgress);
        return nextProgress;
      });
    }
  };

  const showGlobe = appMode === "explore" || missionView === "field";
  const missionFocus = missionState.status === "completed"
    ? currentMission.target
    : cameraEffect?.type === "camera-focus" ? { ...cameraEffect.location, altitude: cameraEffect.altitude } : null;
  const layerPanel = <LayerPanel lenses={displayLenses} activeLensIds={appMode === "explore" ? activeLensIds : missionLensIds} locale={locale} onToggle={appMode === "explore" ? toggleExploreLens : toggleMissionLens} suspended={appMode === "explore" && temporalSelection.mode === "deep-time"} />;
  const timeline = <Timeline selection={temporalSelection} locale={locale} onChange={changeTime} />;
  const missionPanel = <MissionPanel mission={displayMission} state={missionState} locale={locale} onOpenPassport={() => { setMissionView("passport"); setCompactPanel(null); }} onRevealHint={() => setMissionState((state) => revealNextHint(state, currentMission))} />;
  const missionAnswer = missionState.status === "completed"
    ? <MissionResultPanel mission={displayMission} state={missionState} locale={locale} onCollectSticker={collectSticker} />
    : <MissionObservationPanel state={missionState} locale={locale} onSubmit={submitMissionAnswer} />;
  const missionTabs: CompactSheetTab<CompactPanel>[] = [
    { id: "briefing", label: t(locale, "mission"), content: missionPanel },
    { id: missionState.status === "completed" ? "result" : "answer", label: missionState.status === "completed" ? t(locale, "complete") : t(locale, "observationPoint"), content: missionAnswer },
  ];

  return (
    <main lang={locale} className={`app-shell${locale === "ja" ? " ja-ui" : ""}${isCompact ? " compact-ui" : ""}${temporalSelection.mode === "deep-time" ? " deep-time-active" : ""}${appMode === "mission" ? " mission-mode" : ""}${missionView === "passport" && appMode === "mission" ? " passport-mode" : ""}`}>
      {showGlobe && <EarthGlobe activeLensIds={appMode === "explore" ? activeLensIds : missionLensIds} onFeatureSelect={handleGlobeFeature} onLocationSelect={handleGlobeLocation} temporalSelection={temporalSelection} appMode={appMode} missionEffects={missionEffects} missionFocus={missionFocus} ariaLabel={t(locale, "interactiveEarth")} locale={locale} selectedFeature={selectedFeature} anchorPoint={appMode === "explore" ? anchorPoint : null} anchorExpanded={anchorExpanded} anchorContent={anchorPoint && appMode === "explore" ? <AnchoredDetailsCard feature={selectedFeature} location={selectedLocation} anchorPoint={anchorPoint} expanded={anchorExpanded} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onExpand={() => setAnchorExpanded(true)} onAnalyze={() => { setAnchorExpanded(true); void runWhyHere(); }} onClose={clearSelection} /> : null} initialCamera={sharedCamera} initialFeature={initialSharedView.feature} onCameraChange={setSharedCamera} />}
      <header className="app-header"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true" /><div><strong><span className="brand-full">EARTH LENS</span><span className="brand-compact" aria-hidden="true">EL</span></strong><span>{t(locale, "systemSubtitle")}</span></div></div><ModeSelector mode={appMode} locale={locale} onChange={changeMode} /><div className="header-controls">{appMode === "explore" && timeline}<ShareButton locale={locale} /><LanguageSelector locale={locale} onChange={setLocale} />{appMode === "mission" && <div className="mode-readout"><span>{t(locale, "journeyStatus")}</span><strong>{t(locale, "missionPassport")}</strong></div>}</div></header>
      {showGlobe && layerPanel}
      {appMode === "mission" && (missionView === "passport" ? <MissionPassport missions={displayMissions} progress={missionProgress} locale={locale} newlyCollectedId={newlyCollectedId} onStartMission={startMission} /> : isCompact ? <CompactSheet tabs={missionTabs} activeTab={compactPanel} onChange={setCompactPanel} /> : <>{missionPanel}{missionAnswer}<MissionEffectsReadout effects={missionEffects} activeLensIds={missionLensIds} locale={locale} /></>)}
    </main>
  );
}

function toggleSetValue(current: Set<string>, value: string): Set<string> {
  const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next;
}
