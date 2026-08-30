import type { EarthLensDefinition, LensDataset } from "../types";

export const terrainDefinition: EarthLensDefinition = {
  id: "terrain-relief",
  name: "TERRAIN / RELIEF",
  shortName: "Terrain",
  category: "earth",
  description: "A visual relief treatment for reading major landforms and physical constraints.",
  temporal: { mode: "present" },
  provenance: {
    source: "Natural Earth II",
    sourceUrl: "https://www.naturalearthdata.com/downloads/10m-raster-data/10m-natural-earth-2/",
    license: "Public Domain",
    updatedAt: "2026-08-29",
    confidence: "high",
    dataKind: "real",
    classifications: ["real", "derived"],
    note: "Visual enhancement of public-domain shaded relief. No elevation geometry is represented.",
  },
  visibleByDefault: true,
  legend: [{ label: "Shaded relief", color: "#c8b98b", symbol: "area" }],
  disclosures: ["SHADED RELIEF", "NO ELEVATION GEOMETRY", "NATURAL EARTH · PUBLIC DOMAIN"],
};

export async function loadTerrainDataset(): Promise<LensDataset> {
  return { lensId: terrainDefinition.id, features: [] };
}
