import type { PaleoEarthProvider } from "./PaleoEarthProvider";
import type { PaleoEarthSnapshot } from "./types";
import type { GeographicPoint } from "../lenses/types";

const MODEL_NAME = "ZAHIROVIC2022";
const AVAILABLE_AGES = [0, 50, 100, 150, 200, 250] as const;

interface PaleoGeoJson {
  type: "FeatureCollection" | "GeometryCollection";
  features?: Array<{ geometry?: { type?: string; coordinates?: number[][][] }; }>;
  geometries?: Array<{ type?: string; coordinates?: number[][][] }>;
}

function nearestAvailableAge(ageMa: number): number {
  return AVAILABLE_AGES.reduce((nearest, candidate) => Math.abs(candidate - ageMa) < Math.abs(nearest - ageMa) ? candidate : nearest);
}

function parsePolygons(data: PaleoGeoJson, ageMa: number) {
  const features = data.type === "FeatureCollection"
    ? (data.features ?? [])
    : (data.geometries ?? []).map((geometry) => ({ geometry }));
  return features.flatMap((feature, index) => {
    if (feature.geometry?.type !== "Polygon" || !feature.geometry.coordinates?.[0]) return [];
    const coordinates: GeographicPoint[] = feature.geometry.coordinates[0]
      .filter((point) => point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]))
      .map((point) => ({ longitude: point[0] as number, latitude: point[1] as number }));
    return coordinates.length >= 4 ? [{ id: `earthbyte-${ageMa}-${index}`, name: `EarthByte reconstructed coastline ${index + 1}`, coordinates }] : [];
  });
}

export class DemoPaleoEarthProvider implements PaleoEarthProvider {
  async getSnapshot(ageMa: number): Promise<PaleoEarthSnapshot> {
    const selectedAge = nearestAvailableAge(ageMa);
    const response = await fetch(`/geo/paleo-coastlines-${selectedAge}.json`);
    if (!response.ok) throw new Error(`Paleo coastline snapshot unavailable (${response.status})`);
    const data = await response.json() as PaleoGeoJson;
    return {
      ageMa: selectedAge,
      title: `${selectedAge} MILLION YEARS AGO · ${MODEL_NAME}`,
      description: "Model-derived reconstructed coastlines. Modern lens coordinates remain fixed and are overlaid for comparison; this is not a direct observation of the past.",
      provenance: {
        source: `EarthByte / GPlates ${MODEL_NAME} reconstructed coastlines`,
        sourceUrl: "https://www.earthbyte.org/gplates-2-3-software-and-data-sets/",
        license: "Creative Commons Attribution 3.0 Unported (EarthByte data)",
        updatedAt: "2026-09-02 · static export",
        confidence: selectedAge >= 150 ? "low" : "medium",
        dataKind: "real",
        classifications: ["real", "derived"],
        note: `Offline GeoJSON export from the GPlates Web Service model ${MODEL_NAME}; simplified to 0.001° precision. Older reconstructions carry greater model uncertainty.`,
      },
      polygons: parsePolygons(data, selectedAge),
    };
  }
}
