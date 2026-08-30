import chokepointsGeoJsonText from "../../data/demo/chokepoints.geojson?raw";
import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";

interface ChokepointGeoJson {
  metadata: DataProvenance;
  features: Array<{
    id: string;
    geometry: { coordinates: [number, number] };
    properties: { name: string; type: string; description: string };
  }>;
}

const rawData = JSON.parse(chokepointsGeoJsonText) as ChokepointGeoJson;

export const chokepointsDefinition: EarthLensDefinition = {
  id: "strategic-chokepoints",
  name: "STRATEGIC CHOKEPOINTS",
  shortName: "Chokepoints",
  category: "power",
  description: "Narrow passages where maritime movement is geographically concentrated.",
  temporal: { mode: "present" },
  provenance: { ...rawData.metadata, classifications: ["demo", "derived"] },
  visibleByDefault: true,
  legend: [{ label: "Strategic passage", color: "#ffb454", symbol: "point" }],
};

export async function loadChokepoints(): Promise<LensDataset> {
  const features: LensFeature[] = rawData.features.map((feature) => ({
    id: feature.id,
    lensId: chokepointsDefinition.id,
    name: feature.properties.name,
    description: feature.properties.description,
    geometry: {
      type: "point",
      coordinates: {
        longitude: feature.geometry.coordinates[0],
        latitude: feature.geometry.coordinates[1],
      },
    },
    provenance: { ...rawData.metadata, classifications: ["demo", "derived"] },
    attributes: { type: feature.properties.type },
  }));

  return { lensId: chokepointsDefinition.id, features };
}
