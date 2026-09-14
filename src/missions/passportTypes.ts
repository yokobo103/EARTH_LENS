import type { CopyKey } from "../i18n/copy";

export interface MissionPassportSection {
  id: string;
  titleKey?: CopyKey;
  missionIds: readonly string[];
}

/**
 * A presentation layer above the flat mission registry.
 * It owns ordering and thematic grouping, never mission state or progress.
 */
export interface MissionPassportDefinition {
  id: string;
  number: number;
  titleKey: CopyKey;
  subtitleKey?: CopyKey;
  sections: readonly MissionPassportSection[];
}
