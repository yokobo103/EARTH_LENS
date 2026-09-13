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
  /**
   * この層の数値が別のデータから作られている場合の、その元。
   * ジオメトリの出典（source）とは別に、DATA 側から辿れるようにしておく。
   */
  derivedFrom?: readonly DerivedSource[];
}

/** provenance.source のジオメトリに、あとから属性を移してきた元データ。 */
export interface DerivedSource {
  source: string;
  sourceUrl: string;
  license: string;
  citation?: string;
  note: string;
}

export interface LensLegendItem {
  label: string;
  color: string;
  /**
   * 描き方。色ではなく形で区別するための語彙で、レンズが増えるほどここが効く。
   * glow は輪郭を持たない発光で、印を置くのではなく気配を浮かべる用。
   */
  symbol: "point" | "line" | "area" | "glow";
}

export interface LensTimeRange {
  mode: TemporalMode;
  startYear?: number;
  endYear?: number;
  ageMa?: { min: number; max: number };
}

export interface EarthLensDefinition {
  id: string;
  /** Stable two-character code used in shared URLs. Never recycle a published code. */
  urlCode: string;
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

/**
 * その地点がなぜ描かれているか。軸ごとに、値と出典をそのまま持つ。
 *
 * 重要度を1つの数に畳まない。畳むと、4,110万TEU と 12.6億トンと 77 MTPA を
 * 同じ物差しに載せることになり、そこから先は誰にも説明できなくなる。
 * どれを代表に選ぶかは見せる側の判断で、ここでは決めない。
 */
export interface FeatureAxis {
  /** container / bulk / energy / connectivity */
  axis: string;
  value?: number;
  unit: string;
  year: number;
  rank?: number;
  /** 出典の識別子。値がどの資料から来たか。 */
  source: string;
  locode?: string;
}

export interface LensFeature {
  id: string;
  lensId: string;
  name: string;
  description: string;
  /** 採用の根拠。空でもよい。 */
  axes?: readonly FeatureAxis[];
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
