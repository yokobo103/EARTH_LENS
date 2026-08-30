import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SOURCE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache", "geo");
const outputDirectory = path.join(projectRoot, "public", "geo");
const rawPath = path.join(cacheDirectory, "ne_50m_admin_0_countries.geojson");
const outputPath = path.join(outputDirectory, "admin0-countries.geojson");
const mapshaperBin = path.join(projectRoot, "node_modules", "mapshaper", "bin", "mapshaper");

async function downloadSource() {
  const response = await fetch(SOURCE_URL, { redirect: "follow" });
  if (!response.ok) throw new Error(`Natural Earth download failed: ${response.status} ${response.statusText}`);
  const text = await response.text();
  const parsed = JSON.parse(text);
  if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("Natural Earth download was not a GeoJSON FeatureCollection");
  }
  await writeFile(rawPath, text, "utf8");
  return parsed;
}

function runMapshaper() {
  const args = [
    mapshaperBin,
    rawPath,
    "-filter-fields", "NAME,NAME_JA,ISO_A3,CONTINENT,SUBREGION,POP_EST",
    "-simplify", "12%", "keep-shapes",
    "-o", "format=geojson", "precision=0.001", "force", outputPath,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: projectRoot, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`mapshaper exited with code ${code}`)));
  });
}

await mkdir(cacheDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });
const source = await downloadSource();
const hasJapaneseNames = source.features.some((feature) => typeof feature?.properties?.NAME_JA === "string" && feature.properties.NAME_JA.trim() !== "");
await runMapshaper();

const output = JSON.parse(await readFile(outputPath, "utf8"));
const outputStats = await stat(outputPath);
const sizeKiB = outputStats.size / 1024;
console.log(`Natural Earth source: ${SOURCE_URL}`);
console.log(`Features: ${output.features.length}`);
console.log(`NAME_JA available: ${hasJapaneseNames ? "yes" : "no (English NAME fallback required)"}`);
console.log(`Output: ${path.relative(projectRoot, outputPath)} (${sizeKiB.toFixed(1)} KiB / ${outputStats.size} bytes)`);
if (outputStats.size > 1_200_000) {
  throw new Error(`Output exceeds the 1.2 MB target: ${outputStats.size} bytes`);
}
