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
  description: "The points where sea routes hand over to land routes — and the coasts with none.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  legend: [{ label: "Port", color: "#f1cf70", symbol: "point" }],
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
      ne_id?: number | null;
      /** tools/build-port-importance.py が焼いた派生値。 */
      tier?: number;
      ax?: Array<{ a: string; v?: number; u: string; y: number; r?: number; s: string; locode?: string }>;
      added?: string;
      addedFrom?: string;
      addedAs?: string;
    };
  }>;
}

const stableFeatureIds = new Map<number, string>([
  [1730089479, "port-singapore"], [1730089389, "port-shanghai"], [1730089247, "port-rotterdam"],
  [1730089645, "port-los-angeles"], [1730089531, "port-jebel-ali"], [1730089217, "port-colombo"],
  [1730089613, "port-yokohama"], [1730089573, "port-suez"], [1730089511, "port-durban"],
  [1730088457, "port-mumbai"], [1730089059, "port-santos"], [1730089663, "port-new-york"],
]);

function portFeatureId(name: string, neId: number | undefined | null, index: number): string {
  if (neId === undefined || neId === null) return `port-added-${index}`;
  return stableFeatureIds.get(neId) ?? `port-ne-${neId}`;
}

/**
 * 表示の段。1 = 世界、2 = 大陸、3 = 国。**見た目に効くのはこれだけ。**
 *
 * どの段に入るかは軸が決めるが、軸そのものは色にも形にもしない。
 * 軸ごとに描き分けると、レンズ1枚の中に語彙が4つ生まれて、
 * 他のレンズと重ねたときに何を見ているのか分からなくなる。
 */
export type PortTier = 1 | 2 | 3;

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
      description: "Cargo coming off the sea changes over to land routes here.",
      geometry: { type: "point", coordinates: { latitude, longitude } },
      // 軸は全部残す。順位を比べて代表を選ぶことはここではしない。
      axes: (sourceFeature.properties.ax ?? []).map((entry) => ({
        axis: entry.a, value: entry.v, unit: entry.u, year: entry.y,
        rank: entry.r, source: entry.s, locode: entry.locode,
      })),
      provenance,
      attributes: {
        type: sourceFeature.properties.featurecla ?? "Port",
        displayTier: (sourceFeature.properties.tier ?? 3) as PortTier,
        ...(sourceFeature.properties.added ? {
          addedBy: sourceFeature.properties.added,
          addedFrom: sourceFeature.properties.addedFrom,
          addedAs: sourceFeature.properties.addedAs,
        } : {}),
        scaleRank: sourceFeature.properties.scalerank ?? 0,
        nationalScale: sourceFeature.properties.natlscale ?? 0,
        naturalEarthId: sourceFeature.properties.ne_id ?? index,
        ...(sourceFeature.properties.ne_id != null && portNamesJa[sourceFeature.properties.ne_id]
          ? { nameJa: portNamesJa[sourceFeature.properties.ne_id] }
          : {}),
        ...(sourceFeature.properties.website ? { website: sourceFeature.properties.website } : {}),
      },
    }];
  });
  return { lensId: portsDefinition.id, features };
}
