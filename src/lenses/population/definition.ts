import type { DataProvenance, EarthLensDefinition, LensDataset, LensFeature } from "../types";

const SOURCE_URL = "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/";

const provenance: DataProvenance = {
  source: "Natural Earth 1:10m Populated Places",
  sourceUrl: SOURCE_URL,
  license: "Public Domain (Natural Earth terms of use)",
  updatedAt: "2026-09-10 retrieval snapshot",
  confidence: "medium",
  dataKind: "real",
  classifications: ["real"],
  note: "Urban area population estimates compiled by Natural Earth from national censuses and other sources at differing dates. Only the 75 largest are carried, and places without a population figure are dropped. Read as where people are and are not, not as a current census.",
};

export const populationDefinition: EarthLensDefinition = {
  id: "populated-places",
  urlCode: "pp",
  name: "WHERE PEOPLE ARE",
  shortName: "People",
  category: "human",
  description: "The world's largest population centres as light on the globe. The point of this lens is the dark: the places the Earth does not let people gather.",
  temporal: { mode: "present" },
  provenance,
  visibleByDefault: false,
  // 白なのは色が余っていなかったからではない。ここに何かがあると印を置くレンズではなく、
  // 人の気配を浮かべて、その光が途切れるところを見るレンズだから。
  legend: [{ label: "Population, brighter where larger", color: "#ffffff", symbol: "glow" }],
  disclosures: ["URBAN AREA ESTIMATES", "MIXED SURVEY DATES", "NATURAL EARTH · PUBLIC DOMAIN"],
};

interface PlacesGeoJson {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] } | null;
    properties?: { NAME?: string; NAME_JA?: string; ADM0NAME?: string; POP_MAX?: number; SCALERANK?: number };
  }>;
}

export async function loadPopulatedPlaces(): Promise<LensDataset> {
  const response = await fetch(`${import.meta.env.BASE_URL}geo/populated-places.geojson`);
  if (!response.ok) throw new Error(`Natural Earth populated places failed to load: ${response.status} ${response.statusText}`);
  const geojson = await response.json() as PlacesGeoJson;

  const places = geojson.features.flatMap((sourceFeature, index) => {
    const properties = sourceFeature.properties ?? {};
    const population = properties.POP_MAX ?? 0;
    if (!sourceFeature.geometry || population <= 0) return [];
    const [longitude, latitude] = sourceFeature.geometry.coordinates;
    const name = properties.NAME?.trim() || `Place ${index + 1}`;
    return [{ longitude, latitude, name, properties, population }];
  });

  // 引きで出すのは人口の多い順。地図的な重要度（SCALERANK）で選ぶと、
  // 31.8万人のニューデリーが出て1,592万人のデリーが消える。このレンズの主題と逆になる。
  places.sort((a, b) => b.population - a.population);

  // 見せたいのは人の分布であって町の一覧ではない。ズームで小都市を足すと
  // 「都市点群」になり、このレンズが見せたい空白が埋まってしまう。対象は固定する。
  const CARRIED = 75;

  const features: LensFeature[] = places.slice(0, CARRIED).map((place, rank) => ({
    id: `place-${place.longitude.toFixed(3)}-${place.latitude.toFixed(3)}`,
    lensId: populationDefinition.id,
    name: place.name,
    description: `${place.name} holds about ${place.population.toLocaleString("en-US")} people in its urban area.`,
    geometry: { type: "point", coordinates: { longitude: place.longitude, latitude: place.latitude } },
    provenance,
    attributes: {
      ...(place.properties.NAME_JA?.trim() ? { nameJa: place.properties.NAME_JA.trim() } : {}),
      country: place.properties.ADM0NAME ?? "—",
      population: place.population,
      populationRank: rank + 1,
      scaleRank: place.properties.SCALERANK ?? 10,
    },
  }));

  return { lensId: populationDefinition.id, features };
}
