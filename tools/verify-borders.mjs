import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bordersPath = path.join(projectRoot, "public", "geo", "admin0-countries.geojson");
const bordersText = await readFile(bordersPath, "utf8");
const portsText = await readFile(path.join(projectRoot, "public", "geo", "major-ports.geojson"), "utf8");
const seaIceText = await readFile(path.join(projectRoot, "public", "geo", "sea-ice-median-edges.geojson"), "utf8");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/geo/admin0-countries.geojson")) {
    return new Response(bordersText, { status: 200, headers: { "content-type": "application/geo+json" } });
  }
  if (url.endsWith("/geo/major-ports.geojson")) {
    return new Response(portsText, { status: 200, headers: { "content-type": "application/geo+json" } });
  }
  if (url.endsWith("/geo/sea-ice-median-edges.geojson")) {
    return new Response(seaIceText, { status: 200, headers: { "content-type": "application/geo+json" } });
  }
  return originalFetch(input, init);
};

const vite = await createServer({ root: projectRoot, appType: "custom", server: { middlewareMode: true } });
try {
  const { analyzeLocation } = await vite.ssrLoadModule("/src/why-here/analyzeLocation.ts");
  const checks = [
    { label: "Australia north-west offshore", location: { latitude: -14.46, longitude: 123.80 }, expected: "Australia", maximumDistanceKm: 500 },
    { label: "Kaliningrad", location: { latitude: 54.71, longitude: 20.51 }, expected: "Russia", maximumDistanceKm: 0, relation: "inside-area" },
    { label: "Russia Far East", location: { latitude: 48.5, longitude: 135.1 }, expected: "Russia", maximumDistanceKm: 0, relation: "inside-area" },
  ];
  for (const check of checks) {
    const result = await analyzeLocation(check.location, 500);
    const borders = result.lensResults.find((lens) => lens.lensId === "admin0-borders");
    const match = borders?.features.find((feature) => feature.name === check.expected);
    if (!match || match.distanceKm > check.maximumDistanceKm || (check.relation && match.relation !== check.relation)) {
      throw new Error(`${check.label}: expected ${check.expected} within ${check.maximumDistanceKm} km${check.relation ? ` / ${check.relation}` : ""}, received ${JSON.stringify(borders?.features)}`);
    }
    console.log(`PASS ${check.label}: ${match.name} / ${match.nameJa ?? "no NAME_JA"} / ${match.distanceKm} km / ${match.relation}`);
  }

  const portsGeoJson = JSON.parse(portsText);
  const portNames = new Set(portsGeoJson.features.map((feature) => feature.properties.name));
  const russianPorts = ["Petropavlovsk", "Arkhangelsk", "Murmansk", "Vladivostok"];
  if (portsGeoJson.features.length < 1_000 || russianPorts.some((name) => !portNames.has(name))) {
    throw new Error(`Natural Earth port coverage failed: ${portsGeoJson.features.length} features / ${russianPorts.filter((name) => portNames.has(name)).join(", ")}`);
  }
  console.log(`PASS port coverage: ${portsGeoJson.features.length} named points / ${russianPorts.join(", ")}`);

  const seaIceGeoJson = JSON.parse(seaIceText);
  const pathCountByEdge = Object.fromEntries(seaIceGeoJson.features.map((feature) => [feature.properties.edge, feature.geometry.coordinates.length]));
  if (seaIceGeoJson.features.length !== 2 || pathCountByEdge.winter !== 16 || pathCountByEdge.summer !== 26) {
    throw new Error(`Sea-ice edge coverage failed: ${JSON.stringify(pathCountByEdge)}`);
  }
  const allPaths = seaIceGeoJson.features.flatMap((feature) => feature.geometry.coordinates);
  const latitudeValues = allPaths.flatMap((line) => line.map((position) => position[1]));
  const normalizedGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const maximumLongitudeGap = Math.max(...allPaths.flatMap((line) => line.slice(1).map((position, index) => normalizedGap(position[0], line[index][0]))));
  if (Math.min(...latitudeValues) > -50 || Math.max(...latitudeValues) < 50 || maximumLongitudeGap > 10) {
    throw new Error(`Sea-ice polar/antimeridian validation failed: latitude ${Math.min(...latitudeValues)}..${Math.max(...latitudeValues)}, normalized gap ${maximumLongitudeGap}`);
  }
  console.log(`PASS sea-ice coverage: winter ${pathCountByEdge.winter} paths / summer ${pathCountByEdge.summer} paths / normalized longitude gap ${maximumLongitudeGap.toFixed(2)}°`);

  const greenwichSanity = await analyzeLocation({ latitude: 60, longitude: 0 }, 500);
  const falseAntimeridianMatches = greenwichSanity.lensResults.find((lens) => lens.lensId === "sea-ice-edges")?.features ?? [];
  if (falseAntimeridianMatches.length) {
    throw new Error(`Sea-ice antimeridian distance regression: ${JSON.stringify(falseAntimeridianMatches)}`);
  }
  console.log("PASS sea-ice antimeridian distance: no false Greenwich match");
} finally {
  await vite.close();
  globalThis.fetch = originalFetch;
}
