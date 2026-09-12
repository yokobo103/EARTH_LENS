import shippingText from "../../data/demo/shipping-connections.json?raw";
import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";

interface ShippingSource {
  metadata: DataProvenance;
  connections: Array<{
    id: string;
    name: string;
    endpoints: Array<{ name: string; latitude: number; longitude: number }>;
  }>;
}

const rawData = JSON.parse(shippingText) as ShippingSource;

export const shippingDefinition: EarthLensDefinition = {
  id: "shipping-flows",
  urlCode: "sh",
  name: "SHIPPING",
  shortName: "Shipping",
  category: "human",
  description: "The broad directions goods take across the sea.",
  temporal: { mode: "present" },
  provenance: rawData.metadata,
  visibleByDefault: false,
  legend: [{ label: "Flow between regions", color: "#ffb3de", symbol: "line" }],
  disclosures: ["SCHEMATIC FLOW", "NOT ACTUAL SHIPPING ROUTE", "DEMO DATA"],
};

export async function loadShippingFlows(): Promise<LensDataset> {
  const features: LensFeature[] = rawData.connections.map((connection) => ({
    id: connection.id,
    lensId: shippingDefinition.id,
    name: connection.name,
    description: "Which way goods move when they cross the sea.",
    geometry: { type: "connection", endpoints: connection.endpoints },
    provenance: rawData.metadata,
    attributes: {
      connection: connection.endpoints.map((endpoint) => endpoint.name).join(" ↔ "),
      routeType: "schematic",
      actualRouteRepresented: false,
      flowType: "schematic maritime flow",
    },
  }));
  return { lensId: shippingDefinition.id, features };
}
