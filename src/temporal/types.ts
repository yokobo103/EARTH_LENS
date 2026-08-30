import type { DataProvenance, GeographicPoint } from "../lenses/types";

export type TemporalSelection =
  | { mode: "present"; ageMa: 0 }
  | { mode: "deep-time"; ageMa: number };

export interface PaleoPolygon {
  id: string;
  name: string;
  coordinates: GeographicPoint[];
}

export interface PaleoEarthSnapshot {
  ageMa: number;
  title: string;
  description: string;
  provenance: DataProvenance;
  polygons: PaleoPolygon[];
}
