import criticalMineralsText from "../../data/demo/critical-minerals.geojson?raw";
import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";

interface MineralsGeoJson {
  metadata: DataProvenance;
  features: Array<{
    id: string;
    geometry: { coordinates: [number, number] };
    properties: {
      country: string;
      mineral: string;
      productionIndex: number;
      unit: string;
      description: string;
    };
  }>;
}

const rawData = JSON.parse(criticalMineralsText) as MineralsGeoJson;

export const criticalMineralsDefinition: EarthLensDefinition = {
  id: "critical-minerals",
  urlCode: "cm",
  name: "CRITICAL MINERALS",
  shortName: "Minerals",
  category: "resources",
  description: "Country-level demo columns proving color and height encoding for mineral data.",
  temporal: { mode: "present" },
  provenance: { ...rawData.metadata, classifications: ["demo", "derived"] },
  visibleByDefault: false,
  legend: [
    { label: "Country demo index", color: "#d99cff", symbol: "area" },
    { label: "Height = normalized index", color: "#f3ddff", symbol: "line" },
  ],
};

export async function loadCriticalMinerals(): Promise<LensDataset> {
  const features: LensFeature[] = rawData.features.map((feature) => ({
    id: feature.id,
    lensId: criticalMineralsDefinition.id,
    name: `${feature.properties.country} · ${feature.properties.mineral}`,
    description: feature.properties.description,
    geometry: {
      type: "point",
      coordinates: { longitude: feature.geometry.coordinates[0], latitude: feature.geometry.coordinates[1] },
    },
    provenance: { ...rawData.metadata, classifications: ["demo", "derived"] },
    attributes: {
      country: feature.properties.country,
      mineral: feature.properties.mineral,
      productionIndex: feature.properties.productionIndex,
      unit: feature.properties.unit,
      demo: true,
    },
  }));
  return { lensId: criticalMineralsDefinition.id, features };
}
