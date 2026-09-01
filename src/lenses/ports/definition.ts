import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";
import { portNamesJa } from "./portNamesJa";

const SOURCE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_ports.geojson";

const provenance: DataProvenance = {
  source: "Natural Earth 1:10m Ports",
  sourceUrl: SOURCE_URL,
  license: "Public Domain (Natural Earth terms of use)",
  updatedAt: "2026-08-31 retrieval snapshot",
  confidence: "high",
  dataKind: "real",
  classifications: ["real", "derived"],
  note: "Named port points from Natural Earth 1:10m. Points indicate a mapped port location, not terminal boundaries, capacity, throughput, operating status, or guaranteed ice-free access.",
};

export const portsDefinition: EarthLensDefinition = {
  id: "major-ports",
  urlCode: "po",
  name: "PORTS",
  shortName: "Ports",
  category: "human",
  description: "Global named port points for observing how maritime infrastructure relates to physical constraints.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "Named port", color: "#f1cf70", symbol: "point" }],
  disclosures: ["REAL DATA · NATURAL EARTH 1:10m", "POINT LOCATIONS · NOT PORT BOUNDARIES"],
};

type Position = [number, number];

interface PortsGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: Position };
    properties: {
      scalerank?: number;
      featurecla?: string;
      name?: string;
      website?: string | null;
      natlscale?: number;
      ne_id?: number;
    };
  }>;
}

const stableFeatureIds = new Map<number, string>([
  [1730089479, "port-singapore"], [1730089389, "port-shanghai"], [1730089247, "port-rotterdam"],
  [1730089645, "port-los-angeles"], [1730089531, "port-jebel-ali"], [1730089217, "port-colombo"],
  [1730089613, "port-yokohama"], [1730089573, "port-suez"], [1730089511, "port-durban"],
  [1730088457, "port-mumbai"], [1730089059, "port-santos"], [1730089663, "port-new-york"],
]);

function portFeatureId(name: string, neId: number | undefined, index: number): string {
  return stableFeatureIds.get(neId ?? -1) ?? `port-ne-${neId ?? index}`;
}

export async function loadPorts(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/major-ports.geojson`);
  if (!response.ok) throw new Error(`Natural Earth ports failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as PortsGeoJson;
  const features = geojson.features.flatMap((sourceFeature, index): LensFeature[] => {
    if (sourceFeature.geometry.type !== "Point") return [];
    const [longitude, latitude] = sourceFeature.geometry.coordinates;
    const name = sourceFeature.properties.name?.trim() || `Port ${index + 1}`;
    return [{
      id: portFeatureId(name, sourceFeature.properties.ne_id, index),
      lensId: portsDefinition.id,
      name,
      description: `${name} is a named port point in the Natural Earth 1:10m dataset.`,
      geometry: { type: "point", coordinates: { latitude, longitude } },
      provenance,
      attributes: {
        type: sourceFeature.properties.featurecla ?? "Port",
        scaleRank: sourceFeature.properties.scalerank ?? 0,
        nationalScale: sourceFeature.properties.natlscale ?? 0,
        naturalEarthId: sourceFeature.properties.ne_id ?? index,
        ...(sourceFeature.properties.ne_id !== undefined && portNamesJa[sourceFeature.properties.ne_id]
          ? { nameJa: portNamesJa[sourceFeature.properties.ne_id] }
          : {}),
        ...(sourceFeature.properties.website ? { website: sourceFeature.properties.website } : {}),
      },
    }];
  });
  return { lensId: portsDefinition.id, features };
}
