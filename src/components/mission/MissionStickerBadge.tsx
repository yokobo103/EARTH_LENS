import type { MissionRank, MissionSticker } from "../../missions/types";

interface MissionStickerBadgeProps { sticker: MissionSticker; missionNumber: number; completed: boolean; rank?: MissionRank; compact?: boolean }

export function MissionStickerBadge({ sticker, missionNumber, completed, rank, compact = false }: MissionStickerBadgeProps) {
  const hasArtwork = completed && Boolean(sticker.image);
  const missionLabel = `MISSION ${String(missionNumber).padStart(2, "0")}`;

  return <div className={`travel-sticker sticker-${sticker.shape} icon-${sticker.icon}${completed ? " is-collected" : " is-unknown"}${compact ? " is-compact" : ""}${hasArtwork ? " has-artwork" : ""}`}>
    {hasArtwork ? <>
      <img src={sticker.image} alt={`${sticker.title} travel sticker`} />
      <span className="sticker-artwork-number">{missionLabel}</span>
    </> : <>
      <span className="sticker-landmark" aria-hidden="true" />
      <span className="sticker-mission">{missionLabel}</span>
      <strong>{completed ? sticker.title : "?"}</strong>
      <small>{completed ? sticker.region : "DESTINATION UNKNOWN"}</small>
      {completed && sticker.coordinateLabel && <em>{sticker.coordinateLabel}</em>}
    </>}
    {rank && <i className={`rank-stamp rank-${rank.toLowerCase()}`}>{rank}</i>}
  </div>;
}
