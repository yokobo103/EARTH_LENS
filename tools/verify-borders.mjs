import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bordersPath = path.join(projectRoot, "public", "geo", "admin0-countries.geojson");
const bordersText = await readFile(bordersPath, "utf8");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.endsWith("/geo/admin0-countries.geojson")) {
    return new Response(bordersText, { status: 200, headers: { "content-type": "application/geo+json" } });
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
} finally {
  await vite.close();
  globalThis.fetch = originalFetch;
}
