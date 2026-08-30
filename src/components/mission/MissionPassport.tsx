import { useMemo, useState } from "react";
import type { EarthMission, MissionProgress, MissionRegion } from "../../missions/types";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";
import { MissionStickerBadge } from "./MissionStickerBadge";

interface MissionPassportProps {
  missions: readonly EarthMission[];
  progress: Record<string, MissionProgress>;
  locale: Locale;
  newlyCollectedId: string | null;
  onStartMission: (missionId: string) => void;
}

const regionOrder: MissionRegion[] = ["asia", "middle-east", "europe", "africa", "south-america", "oceania"];

export function MissionPassport({ missions, progress, locale, newlyCollectedId, onStartMission }: MissionPassportProps) {
  const grouped = useMemo(() => regionOrder.map((region) => ({ region, missions: missions.filter((mission) => mission.region === region) })).filter((group) => group.missions.length > 0), [missions]);
  const [activeRegion, setActiveRegion] = useState<MissionRegion | "all">("all");
  const visibleGroups = activeRegion === "all" ? grouped : grouped.filter((group) => group.region === activeRegion);
  const completedCount = Object.values(progress).filter((item) => item.completed).length;
  return <section className="mission-passport" aria-label={t(locale, "missionPassport")}>
    <div className="passport-cover-edge" aria-hidden="true" />
    <header className="passport-heading">
      <div><span className="passport-globe-mark" aria-hidden="true">◎</span><p>EARTH LENS</p><h1>{t(locale, "missionPassport")}</h1></div>
      <dl><div><dt>{t(locale, "stickersCollected")}</dt><dd>{completedCount} / {missions.length}</dd></div><div><dt>{t(locale, "journeyStatus")}</dt><dd>{completedCount ? t(locale, "inProgress") : t(locale, "readyToDepart")}</dd></div></dl>
    </header>
    <nav className="passport-region-tabs" aria-label={t(locale, "regions")}><button type="button" aria-pressed={activeRegion === "all"} onClick={() => setActiveRegion("all")}>{t(locale, "allRegions")}</button>{grouped.map(({ region }) => <button type="button" key={region} aria-pressed={activeRegion === region} onClick={() => setActiveRegion(region)}>{t(locale, `region_${region}` as const)}</button>)}</nav>
    <div className="passport-spread">{visibleGroups.map(({ region, missions: regionMissions }) => <section className="passport-region" key={region}>
      <div className="passport-region-title"><span /><h2>{t(locale, `region_${region}` as const)}</h2><span /></div>
      <div className="passport-sticker-grid">{regionMissions.map((mission) => {
        const missionProgress = progress[mission.id]; const completed = missionProgress?.completed ?? false;
        return <article className={`passport-slot${newlyCollectedId === mission.id ? " is-newly-collected" : ""}`} key={mission.id}>
          <MissionStickerBadge sticker={mission.sticker} missionNumber={mission.number} completed={completed} rank={missionProgress?.bestRank} />
          <div className="passport-slot-copy"><span>{mission.type.toUpperCase()}</span><strong>{completed ? mission.target.name : mission.title}</strong><p>{completed ? mission.sticker.description : t(locale, "destinationUnknown")}</p>{completed && <small>{t(locale, "bestRank")} {missionProgress?.bestRank} · {t(locale, "attempts")} {missionProgress?.attempts}</small>}<button type="button" onClick={() => onStartMission(mission.id)}>{completed ? t(locale, "replayMission") : t(locale, "startObservation")}</button></div>
        </article>;
      })}</div>
    </section>)}</div>
    <footer className="passport-footer"><span>OBSERVE · UNDERSTAND · CONNECT</span><small>{t(locale, "passportBelongsToEarth")}</small></footer>
  </section>;
}
