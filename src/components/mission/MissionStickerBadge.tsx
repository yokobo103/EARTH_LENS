import type { MissionRank, MissionSticker } from "../../missions/types";

interface MissionStickerBadgeProps { sticker: MissionSticker; missionNumber: number; completed: boolean; rank?: MissionRank; compact?: boolean }

export function MissionStickerBadge({ sticker, missionNumber, completed, rank, compact = false }: MissionStickerBadgeProps) {
  return <div className={`travel-sticker sticker-${sticker.shape} icon-${sticker.icon}${completed ? " is-collected" : " is-unknown"}${compact ? " is-compact" : ""}`}>
    {sticker.image && completed ? <img src={sticker.image} alt="" /> : <span className="sticker-landmark" aria-hidden="true" />}
    <span className="sticker-mission">MISSION {String(missionNumber).padStart(2, "0")}</span><strong>{completed ? sticker.title : "?"}</strong><small>{completed ? sticker.region : "DESTINATION UNKNOWN"}</small>
    {completed && sticker.coordinateLabel && <em>{sticker.coordinateLabel}</em>}{rank && <i className={`rank-stamp rank-${rank.toLowerCase()}`}>{rank}</i>}
  </div>;
}
