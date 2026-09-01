import physicalFeaturesText from "../../data/demo/physical-features.json?raw";
import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";

interface PhysicalFeatureSource {
  metadata: DataProvenance;
  features: Array<{
    id: string;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    type: string;
    role: "barrier" | "corridor" | "chokepoint" | "basin" | "plateau" | "desert" | "river-system" | "coast" | "other";
    region: string;
    majorKm: number;
    minorKm: number;
    rotationDeg: number;
  }>;
}

const rawData = JSON.parse(physicalFeaturesText) as PhysicalFeatureSource;

export const physicalFeaturesDefinition: EarthLensDefinition = {
  id: "physical-features",
  urlCode: "pf",
  name: "PHYSICAL FEATURES",
  shortName: "Physical",
  category: "earth",
  description: "Major physical structures classified by their observable geographic role.",
  temporal: { mode: "present" },
  provenance: rawData.metadata,
  visibleByDefault: false,
  legend: [
    { label: "Barrier / plateau", color: "#e7d49b", symbol: "area" },
    { label: "Corridor / chokepoint", color: "#7fe0c6", symbol: "point" },
  ],
  disclosures: ["APPROXIMATE REGIONS"],
};

export async function loadPhysicalFeatures(): Promise<LensDataset> {
  const features: LensFeature[] = rawData.features.map((feature) => ({
    id: feature.id,
    lensId: physicalFeaturesDefinition.id,
    name: feature.name,
    description: feature.description,
    geometry: { type: "point", coordinates: { latitude: feature.latitude, longitude: feature.longitude } },
    provenance: rawData.metadata,
    attributes: {
      type: feature.type,
      physicalRole: feature.role,
      region: feature.region,
      approximateRegion: true,
      footprintMajorKm: feature.majorKm,
      footprintMinorKm: feature.minorKm,
      footprintRotationDeg: feature.rotationDeg,
    },
  }));
  return { lensId: physicalFeaturesDefinition.id, features };
}
