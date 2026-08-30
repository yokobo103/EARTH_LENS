import portsText from "../../data/demo/major-ports.json?raw";
import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";

interface PortsSource {
  metadata: DataProvenance;
  features: Array<{ id: string; name: string; latitude: number; longitude: number; region: string; type: string }>;
}

const rawData = JSON.parse(portsText) as PortsSource;

export const portsDefinition: EarthLensDefinition = {
  id: "major-ports",
  name: "MAJOR PORTS",
  shortName: "Ports",
  category: "human",
  description: "A limited set of major port regions for observing maritime infrastructure concentration.",
  temporal: { mode: "present" },
  provenance: rawData.metadata,
  visibleByDefault: false,
  legend: [{ label: "Port signal", color: "#f1cf70", symbol: "point" }],
  disclosures: ["DEMO POINTS"],
};

export async function loadPorts(): Promise<LensDataset> {
  return {
    lensId: portsDefinition.id,
    features: rawData.features.map((feature) => ({
      id: feature.id,
      lensId: portsDefinition.id,
      name: feature.name,
      description: `An approximate observation point for the ${feature.name} port region.`,
      geometry: { type: "point", coordinates: { latitude: feature.latitude, longitude: feature.longitude } },
      provenance: rawData.metadata,
      attributes: { type: feature.type, region: feature.region, approximatePoint: true },
    } satisfies LensFeature)),
  };
}
