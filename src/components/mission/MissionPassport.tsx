import { useMemo } from "react";
import type { EarthMission, MissionProgress } from "../../missions/types";
import type { MissionPassportDefinition, MissionPassportSection } from "../../missions/passportTypes";
import { t } from "../../i18n/copy";
import type { Locale } from "../../i18n/types";
import { MissionStickerBadge } from "./MissionStickerBadge";

interface MissionPassportProps {
  passports: readonly MissionPassportDefinition[];
  selectedPassportId: string;
  onSelectPassport: (passportId: string) => void;
  missions: readonly EarthMission[];
  progress: Record<string, MissionProgress>;
  locale: Locale;
  newlyCollectedId: string | null;
  onStartMission: (missionId: string) => void;
}

interface PassportPage {
  id: string;
  titleKey?: MissionPassportSection["titleKey"];
  missions: readonly EarthMission[];
}

function chunkMissions(missions: readonly EarthMission[], size: number): EarthMission[][] {
  const chunks: EarthMission[][] = [];
  for (let index = 0; index < missions.length; index += size) chunks.push(missions.slice(index, index + size));
  return chunks;
}

export function MissionPassport({ passports, selectedPassportId, onSelectPassport, missions, progress, locale, newlyCollectedId, onStartMission }: MissionPassportProps) {
  const selectedPassport = passports.find((passport) => passport.id === selectedPassportId) ?? passports[0];
  const missionById = useMemo(() => new Map(missions.map((mission) => [mission.id, mission])), [missions]);

  const pages = useMemo<PassportPage[]>(() => {
    if (!selectedPassport) return [];
    return selectedPassport.sections.flatMap((section) => {
      const sectionMissions = section.missionIds.map((missionId) => missionById.get(missionId)).filter((mission): mission is EarthMission => Boolean(mission));
      return chunkMissions(sectionMissions, 4).map((pageMissions, index) => ({
        id: `${section.id}-${index}`,
        titleKey: index === 0 ? section.titleKey : undefined,
        missions: pageMissions,
      }));
    });
  }, [missionById, selectedPassport]);

  const passportMissions = useMemo(() => pages.flatMap((page) => page.missions), [pages]);
  const completedCount = passportMissions.filter((mission) => progress[mission.id]?.completed).length;

  if (!selectedPassport) return null;

  return <section className="mission-passport" aria-label={t(locale, "missionPassport")}>
    <div className="passport-cover-edge" aria-hidden="true" />
    <header className="passport-heading">
      <div>
        <span className="passport-globe-mark" aria-hidden="true">◎</span>
        <p>EARTH LENS</p>
        <h1>{t(locale, "missionPassport")}</h1>
        {selectedPassport.subtitleKey && <small>{t(locale, selectedPassport.subtitleKey)}</small>}
      </div>
      <dl>
        <div><dt>{t(locale, "stickersCollected")}</dt><dd>{completedCount} / {passportMissions.length}</dd></div>
        <div><dt>{t(locale, "journeyStatus")}</dt><dd>{completedCount ? t(locale, "inProgress") : t(locale, "readyToDepart")}</dd></div>
      </dl>
    </header>
    <nav className="passport-volume-selector" aria-label={t(locale, "passportVolumeSelector")}>
      {passports.map((passport) => {
        const volumeMissionCount = passport.sections.reduce((count, section) => count + section.missionIds.length, 0);
        const volumeCompletedCount = passport.sections.flatMap((section) => section.missionIds).filter((missionId) => progress[missionId]?.completed).length;
        return <button type="button" key={passport.id} aria-pressed={passport.id === selectedPassport.id} onClick={() => onSelectPassport(passport.id)}>
          <span>{t(locale, "passportVolumeLabel")} {passport.number}</span>
          <strong>{t(locale, passport.titleKey)}</strong>
          <small>{volumeCompletedCount} / {volumeMissionCount}</small>
        </button>;
      })}
    </nav>
    <div className="passport-spread">
      {pages.map((page) => <section className="passport-page" key={page.id}>
        {page.titleKey && <div className="passport-section-title"><span /><h2>{t(locale, page.titleKey)}</h2><span /></div>}
        <div className="passport-sticker-grid">{page.missions.map((mission) => {
          const missionProgress = progress[mission.id];
          const completed = missionProgress?.completed ?? false;
          return <article className={`passport-slot${newlyCollectedId === mission.id ? " is-newly-collected" : ""}`} key={mission.id}>
            <MissionStickerBadge sticker={mission.sticker} missionNumber={mission.number} completed={completed} rank={missionProgress?.bestRank} />
            <div className="passport-slot-copy"><span>{mission.type.toUpperCase()}</span><strong>{completed ? mission.target.name : mission.title}</strong><p>{completed ? mission.sticker.description : t(locale, "destinationUnknown")}</p>{completed && <small>{t(locale, "bestRank")} {missionProgress?.bestRank} · {t(locale, "attempts")} {missionProgress?.attempts}</small>}<button type="button" onClick={() => onStartMission(mission.id)}>{completed ? t(locale, "replayMission") : t(locale, "startObservation")}</button></div>
          </article>;
        })}</div>
      </section>)}
    </div>
    <footer className="passport-footer"><span>OBSERVE · UNDERSTAND · CONNECT</span><small>{t(locale, "passportBelongsToEarth")}</small></footer>
  </section>;
}
