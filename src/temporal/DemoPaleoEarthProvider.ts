import type { PaleoEarthProvider } from "./PaleoEarthProvider";
import type { PaleoEarthSnapshot } from "./types";

const schematicPangaeaOutline = [
  { longitude: -55, latitude: 55 },
  { longitude: -35, latitude: 67 },
  { longitude: -10, latitude: 62 },
  { longitude: 4, latitude: 49 },
  { longitude: 24, latitude: 55 },
  { longitude: 41, latitude: 38 },
  { longitude: 35, latitude: 22 },
  { longitude: 51, latitude: 7 },
  { longitude: 39, latitude: -6 },
  { longitude: 30, latitude: -20 },
  { longitude: 20, latitude: -37 },
  { longitude: 4, latitude: -50 },
  { longitude: -15, latitude: -42 },
  { longitude: -26, latitude: -25 },
  { longitude: -44, latitude: -20 },
  { longitude: -53, latitude: -4 },
  { longitude: -40, latitude: 9 },
  { longitude: -59, latitude: 22 },
  { longitude: -45, latitude: 36 },
  { longitude: -55, latitude: 55 },
];

export class DemoPaleoEarthProvider implements PaleoEarthProvider {
  async getSnapshot(ageMa: number): Promise<PaleoEarthSnapshot> {
    return {
      ageMa,
      title: `${ageMa} MILLION YEARS AGO`,
      description: "Procedurally authored schematic landmass for interaction testing. It is not a plate reconstruction or scientific boundary dataset.",
      provenance: {
        source: "EARTH LENS procedural deep-time demo",
        license: "CC0-1.0",
        updatedAt: "2026-08-27",
        confidence: "unknown",
        dataKind: "demo",
        note: "Replace this provider with a licensed GPlates, pyGPlates, EarthByte, or reconstruction-service implementation.",
      },
      polygons: [{ id: "schematic-pangaea", name: "Schematic Pangaea mass", coordinates: [...schematicPangaeaOutline].reverse() }],
    };
  }
}
