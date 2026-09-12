import cableConnectionData from "../../data/demo/cable-connections.json";
import type {
  ConfidenceLevel,
  DataProvenance,
  EarthLensDefinition,
  LensDataset,
  LensFeature,
} from "../types";

const CABLE_READING = [
  {
    title: "TeleGeography Submarine Cable Map",
    url: "https://www.submarinecablemap.com/",
    note: "External interactive map for researching real cable systems; it is not the source of this schematic demo layer.",
    language: "en",
    checkedAt: "2026-08-31",
  },
  {
    title: "TeleGeography Submarine Cable FAQs",
    url: "https://www2.telegeography.com/submarine-cable-faqs-frequently-asked-questions",
    note: "External background reading on cable systems and landing points.",
    language: "en",
    checkedAt: "2026-08-31",
  },
] as const;

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
  id: "submarine-cable-connections", urlCode: "cb",
  name: "SUBMARINE CABLE CONNECTIONS",
  shortName: "Cables",
  category: "human",
  description: "How much information ties one region to another across the sea.",
  temporal: { mode: "present" },
  provenance: { ...rawData.metadata, classifications: ["demo", "schematic"] },
  visibleByDefault: true,
  legend: [
    { label: "Link between regions", color: "#7cf6c9", symbol: "line" },
    { label: "Regional end point", color: "#c9fce9", symbol: "point" },
  ],
  disclosures: ["SCHEMATIC ROUTE", "NOT ACTUAL CABLE PATH", "DEMO DATA"],
  furtherReading: CABLE_READING,
};

export async function loadSubmarineCableConnections(): Promise<LensDataset> {
  const features: LensFeature[] = rawData.connections.map((connection) => ({
    id: connection.id,
    lensId: submarineCablesDefinition.id,
    name: connection.name,
    description: "Information crossing the sea to link one region with another.",
    geometry: { type: "connection", endpoints: connection.endpoints },
    provenance: { ...rawData.metadata, confidence: connection.confidence, classifications: ["demo", "schematic"] },
    attributes: {
      connection: connection.endpoints.map((endpoint) => endpoint.name).join(" ↔ "),
      routeType: connection.routeType,
      actualRouteRepresented: connection.actualRouteRepresented,
      demo: connection.demo,
    },
    furtherReading: CABLE_READING,
  }));
  return { lensId: submarineCablesDefinition.id, features };
}
