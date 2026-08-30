import { useEffect, useMemo, useState } from "react";
import type { AppMode } from "./types";
import { CompactSheet, type CompactSheetTab } from "../components/CompactSheet";
import { DetailsPanel } from "../components/DetailsPanel";
import { LayerPanel } from "../components/LayerPanel";
import { LanguageSelector } from "../components/LanguageSelector";
import { ModeSelector } from "../components/ModeSelector";
import { MissionEffectsReadout } from "../components/mission/MissionEffectsReadout";
import { MissionObservationPanel } from "../components/mission/MissionObservationPanel";
import { MissionPanel } from "../components/mission/MissionPanel";
import { MissionPassport } from "../components/mission/MissionPassport";
import { MissionResultPanel } from "../components/mission/MissionResultPanel";
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

type MissionView = "passport" | "field";
type CompactPanel = "lenses" | "details" | "time" | "briefing" | "answer" | "result";
const defaultMission = getDefaultMission();

export function App() {
  const isCompact = useIsCompact();
  const [compactPanel, setCompactPanel] = useState<CompactPanel | null>(null);
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem("earth-lens-locale") === "ja" ? "ja" : "en");
  const [appMode, setAppMode] = useState<AppMode>("explore");
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
  const [activeLensIds, setActiveLensIds] = useState(() => new Set(defaultLensIds));
  const [missionLensIds, setMissionLensIds] = useState(() => new Set(defaultLensIds));
  const [selectedFeature, setSelectedFeature] = useState<LensFeature | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [whyHereResult, setWhyHereResult] = useState<WhyHereResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [temporalSelection, setTemporalSelection] = useState<TemporalSelection>({ mode: "present", ageMa: 0 });

  useEffect(() => { document.documentElement.lang = locale; localStorage.setItem("earth-lens-locale", locale); }, [locale]);

  const toggleExploreLens = (lensId: string) => setActiveLensIds((current) => toggleSetValue(current, lensId));
  const toggleMissionLens = (lensId: string) => setMissionLensIds((current) => toggleSetValue(current, lensId));
  const selectFeature = (feature: LensFeature) => { setSelectedFeature(feature); setSelectedLocation(null); setWhyHereResult(null); };
  const handleGlobeFeature = (feature: LensFeature) => {
    if (appMode === "mission") {
      setSelectedFeature(feature);
      setMissionState((state) => selectMissionFeature(state, feature));
      if (isCompact) setCompactPanel("answer");
    } else {
      selectFeature(feature);
      if (isCompact) setCompactPanel("details");
    }
  };
  const selectLocation = (location: { latitude: number; longitude: number }) => { setSelectedLocation(location); setSelectedFeature(null); setWhyHereResult(null); };
  const handleGlobeLocation = (location: { latitude: number; longitude: number }) => {
    if (appMode === "mission") {
      setMissionState((state) => selectMissionLocation(state, location));
      if (isCompact) setCompactPanel("answer");
    } else {
      selectLocation(location);
      if (isCompact) setCompactPanel("details");
    }
  };
  const runWhyHere = async () => { if (!selectedLocation) return; setIsAnalyzing(true); try { setWhyHereResult(await analyzeLocation(selectedLocation, 500)); } finally { setIsAnalyzing(false); } };
  const changeTime = (selection: TemporalSelection) => { setTemporalSelection(selection); setSelectedFeature(null); setSelectedLocation(null); setWhyHereResult(null); };
  const changeMode = (mode: AppMode) => {
    setAppMode(mode); setCompactPanel(null); setSelectedFeature(null); setSelectedLocation(null); setWhyHereResult(null);
    if (mode === "mission") { setMissionView("passport"); setTemporalSelection({ mode: "present", ageMa: 0 }); }
  };
  const startMission = (missionId: string) => {
    const mission = getMission(missionId); if (!mission) return;
    setMissionState(createMissionState(mission)); setMissionLensIds(new Set(defaultLensIds)); setSelectedFeature(null); setMissionView("field"); setNewlyCollectedId(null); setCompactPanel(null);
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
  const layerPanel = <LayerPanel lenses={displayLenses} activeLensIds={activeLensIds} locale={locale} onToggle={toggleExploreLens} suspended={temporalSelection.mode === "deep-time"} />;
  const detailsPanel = <DetailsPanel feature={selectedFeature} location={selectedLocation} whyHereResult={whyHereResult} isAnalyzing={isAnalyzing} locale={locale} onAnalyze={() => { void runWhyHere(); }} />;
  const timeline = <Timeline selection={temporalSelection} locale={locale} onChange={changeTime} />;
  const missionPanel = <MissionPanel mission={displayMission} state={missionState} locale={locale} lenses={displayLenses} activeLensIds={missionLensIds} onToggleLens={toggleMissionLens} onOpenPassport={() => { setMissionView("passport"); setCompactPanel(null); }} onRevealHint={() => setMissionState((state) => revealNextHint(state, currentMission))} />;
  const missionAnswer = missionState.status === "completed"
    ? <MissionResultPanel mission={displayMission} state={missionState} locale={locale} onCollectSticker={collectSticker} />
    : <MissionObservationPanel state={missionState} locale={locale} onSubmit={submitMissionAnswer} />;
  const exploreTabs: CompactSheetTab<CompactPanel>[] = [
    { id: "lenses", label: t(locale, "layers"), content: layerPanel },
    { id: "details", label: t(locale, "details"), content: detailsPanel },
    { id: "time", label: t(locale, "deepTime"), content: timeline },
  ];
  const missionTabs: CompactSheetTab<CompactPanel>[] = [
    { id: "briefing", label: t(locale, "mission"), content: missionPanel },
    { id: missionState.status === "completed" ? "result" : "answer", label: missionState.status === "completed" ? t(locale, "complete") : t(locale, "observationPoint"), content: missionAnswer },
  ];

  return (
    <main lang={locale} className={`app-shell${locale === "ja" ? " ja-ui" : ""}${isCompact ? " compact-ui" : ""}${temporalSelection.mode === "deep-time" ? " deep-time-active" : ""}${appMode === "mission" ? " mission-mode" : ""}${missionView === "passport" && appMode === "mission" ? " passport-mode" : ""}`}>
      {showGlobe && <EarthGlobe activeLensIds={appMode === "explore" ? activeLensIds : missionLensIds} onFeatureSelect={handleGlobeFeature} onLocationSelect={handleGlobeLocation} temporalSelection={temporalSelection} appMode={appMode} missionEffects={missionEffects} missionFocus={missionFocus} ariaLabel={t(locale, "interactiveEarth")} locale={locale} selectedFeature={selectedFeature} />}
      <header className="app-header"><div className="brand-lockup"><span className="brand-mark" aria-hidden="true" /><div><strong>EARTH LENS</strong><span>{t(locale, "systemSubtitle")}</span></div></div><ModeSelector mode={appMode} locale={locale} onChange={changeMode} /><div className="header-controls"><LanguageSelector locale={locale} onChange={setLocale} /><div className="mode-readout"><span>{appMode === "mission" ? t(locale, "journeyStatus") : t(locale, "activeEpoch")}</span><strong>{appMode === "mission" ? t(locale, "missionPassport") : temporalSelection.mode === "present" ? t(locale, "present") : t(locale, "age250")}</strong></div></div></header>
      {appMode === "explore" ? (isCompact ? <CompactSheet tabs={exploreTabs} activeTab={compactPanel} onChange={setCompactPanel} /> : <>{layerPanel}{detailsPanel}{timeline}</>) : missionView === "passport" ? <MissionPassport missions={displayMissions} progress={missionProgress} locale={locale} newlyCollectedId={newlyCollectedId} onStartMission={startMission} /> : isCompact ? <CompactSheet tabs={missionTabs} activeTab={compactPanel} onChange={setCompactPanel} /> : <>{missionPanel}{missionAnswer}<MissionEffectsReadout effects={missionEffects} activeLensIds={missionLensIds} locale={locale} /></>}
      {appMode === "explore" && temporalSelection.mode === "deep-time" && <section className="paleo-notice" aria-label="Deep time status"><span>{t(locale, "deepTimePrototype")}</span><strong>{t(locale, "age250")}</strong><small>{t(locale, "schematicLandmass")}</small></section>}
      {appMode === "explore" && !isCompact && <div className="coordinate-readout" aria-hidden="true"><span>LAT {selectedLocation ? selectedLocation.latitude.toFixed(3) : "—"}</span><span>LON {selectedLocation ? selectedLocation.longitude.toFixed(3) : "—"}</span><span>{temporalSelection.mode === "present" ? t(locale, "radius") : t(locale, "paleoSnapshot")}</span></div>}
    </main>
  );
}

function toggleSetValue(current: Set<string>, value: string): Set<string> {
  const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next;
}
