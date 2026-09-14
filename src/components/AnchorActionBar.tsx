import type { GeographicPoint } from "../lenses/types";
import { formatAnchorCoordinates } from "./anchorCoordinates";

export type AnchorActionBarTone = "explore" | "mission";

interface AnchorActionBarProps {
  point: GeographicPoint;
  title: string;
  actionLabel: string;
  tone: AnchorActionBarTone;
  onAction: () => void;
  onClose?: () => void;
  closeLabel?: string;
  isBusy?: boolean;
  busyLabel?: string;
  feedback?: string;
}

export function AnchorActionBar({ point, title, actionLabel, tone, onAction, onClose, closeLabel = "Deselect location", isBusy = false, busyLabel, feedback }: AnchorActionBarProps) {
  return <div className={`anchor-action-bar anchor-action-bar-${tone}`}>
    <span className="anchor-action-marker" aria-hidden="true">◎</span>
    <div className="anchor-action-location">
      <strong>{title}</strong>
      <span>{formatAnchorCoordinates(point)}</span>
    </div>
    <button type="button" className="anchor-action-submit" onClick={onAction} disabled={isBusy}>
      {isBusy ? busyLabel ?? actionLabel : actionLabel}<span aria-hidden="true">→</span>
    </button>
    {onClose && <button type="button" className="anchor-action-close" onClick={onClose} aria-label={closeLabel}>×</button>}
    {feedback && <p className="anchor-action-feedback" aria-live="polite">{feedback}</p>}
  </div>;
}
