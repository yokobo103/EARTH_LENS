import type { Viewer } from "cesium";

export type ConfidenceLevel = "high" | "medium" | "low" | "unknown";
export type TemporalMode = "present" | "deep-time" | "historical" | "all";
export type LensCategory = "earth" | "resources" | "human" | "power";
export type DataClassification = "real" | "demo" | "derived" | "schematic";
export type ReadingLanguage = "en" | "ja" | "multi";

export interface FurtherReadingLink {
  title: string;
  url: string;
  note: string;
  language: ReadingLanguage;
  checkedAt: string;
}

export interface DataProvenance {
  source: string;
  sourceUrl?: string;
  license: string;
  updatedAt: string;
  confidence: ConfidenceLevel;
  dataKind: "demo" | "real";
  classifications?: DataClassification[];
  note?: string;
}

export interface LensLegendItem {
  label: string;
  color: string;
  symbol: "point" | "line" | "area";
}

export interface LensTimeRange {
  mode: TemporalMode;
  startYear?: number;
  endYear?: number;
  ageMa?: { min: number; max: number };
}

export interface EarthLensDefinition {
  id: string;
  name: string;
  shortName: string;
  category: LensCategory;
  description: string;
  temporal: LensTimeRange;
  provenance: DataProvenance;
  visibleByDefault: boolean;
  legend: LensLegendItem[];
  disclosures?: string[];
  furtherReading?: readonly FurtherReadingLink[];
}

export interface GeographicPoint {
  latitude: number;
  longitude: number;
}

export interface GeographicBoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface GeographicAreaPolygon {
  rings: GeographicPoint[][];
  bbox: GeographicBoundingBox;
}

export interface LensFeature {
  id: string;
  lensId: string;
  name: string;
  description: string;
  geometry:
    | { type: "point"; coordinates: GeographicPoint }
    | { type: "connection"; endpoints: Array<GeographicPoint & { name: string }> }
    | { type: "polyline"; paths: GeographicPoint[][]; bbox: GeographicBoundingBox }
    | {
        type: "area";
        centroid: GeographicPoint;
        polygons: GeographicAreaPolygon[];
        bbox: GeographicBoundingBox;
      };
  provenance: DataProvenance;
  attributes: Record<string, string | number | boolean>;
  furtherReading?: readonly FurtherReadingLink[];
}

export interface LensDataset {
  lensId: string;
  features: LensFeature[];
}

export interface LensRenderHandle {
  setVisible(visible: boolean): void;
  setSelectedFeature?(featureId: string | undefined): void;
  reapplyAppearance?(): void;
  getFeatureForPick(picked: unknown): LensFeature | undefined;
  destroy(): void;
}

export interface LensModule {
  definition: EarthLensDefinition;
  load(): Promise<LensDataset>;
  render(viewer: Viewer, dataset: LensDataset): LensRenderHandle;
}
