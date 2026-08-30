import cableConnectionData from "../../data/demo/cable-connections.json";
import type {
  ConfidenceLevel,
  DataProvenance,
  EarthLensDefinition,
  LensDataset,
  LensFeature,
} from "../types";

export type CableRouteType = "schematic" | "approximate" | "actual";

export interface CableConnection {
  id: string;
  name: string;
  endpoints: Array<{ name: string; latitude: number; longitude: number }>;
  routeType: CableRouteType;
  actualRouteRepresented: boolean;
  confidence: ConfidenceLevel;
  demo: boolean;
}

interface CableConnectionData {
  metadata: DataProvenance;
  connections: CableConnection[];
}

const rawData = cableConnectionData as CableConnectionData;

export const submarineCablesDefinition: EarthLensDefinition = {
  id: "submarine-cable-connections",
  name: "SUBMARINE CABLE CONNECTIONS",
  shortName: "Cable connections",
  category: "human",
  description: "Regional communication relationships drawn as conceptual geodesic links.",
  temporal: { mode: "present" },
  provenance: { ...rawData.metadata, classifications: ["demo", "schematic"] },
  visibleByDefault: true,
  legend: [
    { label: "Schematic route", color: "#55d8ff", symbol: "line" },
    { label: "Regional endpoint", color: "#b8f3ff", symbol: "point" },
  ],
};

export async function loadSubmarineCableConnections(): Promise<LensDataset> {
  const features: LensFeature[] = rawData.connections.map((connection) => ({
    id: connection.id,
    lensId: submarineCablesDefinition.id,
    name: connection.name,
    description: "A demo communication relationship between abstract regions. The line is generated from endpoints and is not an actual cable path.",
    geometry: { type: "connection", endpoints: connection.endpoints },
    provenance: { ...rawData.metadata, confidence: connection.confidence, classifications: ["demo", "schematic"] },
    attributes: {
      connection: connection.endpoints.map((endpoint) => endpoint.name).join(" ↔ "),
      routeType: connection.routeType,
      actualRouteRepresented: connection.actualRouteRepresented,
      demo: connection.demo,
    },
  }));
  return { lensId: submarineCablesDefinition.id, features };
}
