import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";
import proj4 from "proj4";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache", "geo");
const buildDirectory = path.join(cacheDirectory, "build");
const outputDirectory = path.join(projectRoot, "public", "geo");
const mapshaperBin = path.join(projectRoot, "node_modules", "mapshaper", "bin", "mapshaper");
const naturalEarthRepository = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const nsidcArchive = "https://noaadata.apps.nsidc.org/NOAA/G02135";
const seaIceExtentYear = 2025;
const polarStereographic = {
  north: "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +x_0=0 +y_0=0 +a=6378273 +rf=298.279411123064 +units=m +no_defs",
  south: "+proj=stere +lat_0=-90 +lat_ts=-70 +lon_0=0 +x_0=0 +y_0=0 +a=6378273 +rf=298.279411123064 +units=m +no_defs",
};

const seaIceSources = [
  { key: "north-march", hemisphere: "north", month: "03", season: "winter", file: "median_extent_N_03_1981-2010_polyline_v4.0.zip" },
  { key: "north-september", hemisphere: "north", month: "09", season: "summer", file: "median_extent_N_09_1981-2010_polyline_v4.0.zip" },
  { key: "south-march", hemisphere: "south", month: "03", season: "summer", file: "median_extent_S_03_1981-2010_polyline_v4.0.zip" },
  { key: "south-september", hemisphere: "south", month: "09", season: "winter", file: "median_extent_S_09_1981-2010_polyline_v4.0.zip" },
].map((source) => ({
  ...source,
  sourceUrl: `${nsidcArchive}/${source.hemisphere}/monthly/shapefiles/shp_median/${source.file}`,
  shapefileBase: source.file.replace(/\.zip$/, ""),
}));

const seaIceExtentSources = [
  { key: "north-march-2025", hemisphere: "north", month: "03", monthDirectory: "03_Mar", season: "winter", file: "extent_N_202503_polygon_v4.0.zip" },
  { key: "north-september-2025", hemisphere: "north", month: "09", monthDirectory: "09_Sep", season: "summer", file: "extent_N_202509_polygon_v4.0.zip" },
  { key: "south-march-2025", hemisphere: "south", month: "03", monthDirectory: "03_Mar", season: "summer", file: "extent_S_202503_polygon_v4.0.zip" },
  { key: "south-september-2025", hemisphere: "south", month: "09", monthDirectory: "09_Sep", season: "winter", file: "extent_S_202509_polygon_v4.0.zip" },
].map((source) => ({
  ...source,
  sourceUrl: `${nsidcArchive}/${source.hemisphere}/monthly/shapefiles/shp_extent/${source.monthDirectory}/${source.file}`,
  shapefileBase: source.file.replace(/\.zip$/, ""),
}));

const layers = [
  {
    id: "admin0-countries",
    sourceUrls: [`${naturalEarthRepository}/ne_50m_admin_0_countries.geojson`],
    outputPath: path.join(outputDirectory, "admin0-countries.geojson"),
    license: "Natural Earth · Public Domain",
    retrievedAt: "2026-08-30",
    processing: "6 fields · simplify 12% keep-shapes · precision 0.001°",
    steps: ["-filter-fields", "NAME,NAME_JA,ISO_A3,CONTINENT,SUBREGION,POP_EST", "-simplify", "12%", "keep-shapes"],
    precision: "0.001",
    preserveExistingBytes: true,
    build: buildNaturalEarthLayer,
  },
  {
    id: "major-ports",
    sourceUrls: [`${naturalEarthRepository}/ne_10m_ports.geojson`],
    outputPath: path.join(outputDirectory, "major-ports.geojson"),
    license: "Natural Earth · Public Domain",
    retrievedAt: "2026-08-31",
    processing: "6 source fields · precision 0.0001°",
    steps: ["-filter-fields", "scalerank,featurecla,name,website,natlscale,ne_id"],
    precision: "0.0001",
    build: buildNaturalEarthLayer,
  },
  {
    id: "rivers",
    sourceUrls: [`${naturalEarthRepository}/ne_10m_rivers_lake_centerlines.geojson`],
    outputPath: path.join(outputDirectory, "rivers.geojson"),
    license: "Natural Earth · Public Domain",
    retrievedAt: "2026-09-01",
    processing: "3 source fields · simplify 8% keep-shapes · precision 0.001°",
    steps: ["-filter-fields", "name,featurecla,scalerank", "-simplify", "8%", "keep-shapes"],
    precision: "0.001",
    build: buildNaturalEarthLayer,
  },
  {
    id: "sea-ice-edges",
    sourceUrls: seaIceSources.map((source) => source.sourceUrl),
    outputPath: path.join(outputDirectory, "sea-ice-median-edges.geojson"),
    license: "Free and open use; Sea Ice Index citation required (NSIDC policy)",
    retrievedAt: "2026-08-31",
    processing: "densify 25 km before EPSG:3411/3412 → WGS84 · precision 0.0001° · seasonal hemisphere merge",
    steps: ["-densify", "25000", "-proj", "wgs84"],
    precision: "0.0001",
    build: buildSeaIceEdges,
  },
  {
    id: "sea-ice-extent-2025",
    sourceUrls: seaIceExtentSources.map((source) => source.sourceUrl),
    outputPath: path.join(outputDirectory, "sea-ice-extent-2025.geojson"),
    license: "Free and open use; Sea Ice Index citation required (NSIDC policy)",
    retrievedAt: "2026-08-31",
    processing: "densify 25 km before EPSG:3411/3412 → WGS84 · precision 0.0001° · seasonal hemisphere merge",
    steps: ["-densify", "25000"],
    precision: "0.0001",
    build: buildSeaIceExtent,
  },
];

async function download(url, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(destination, buffer);
      return buffer;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  const cachedBuffer = await readFile(destination).catch(() => null);
  if (cachedBuffer?.length) {
    console.warn(`Download unavailable; using cached source: ${path.relative(projectRoot, destination)}`);
    return cachedBuffer;
  }
  throw new Error(`Download failed after 4 attempts: ${url}\n${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function runMapshaper(inputPath, steps, precision, outputPath) {
  const args = [mapshaperBin, inputPath, ...steps, "-o", "format=geojson", `precision=${precision}`, "force", outputPath];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: projectRoot, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`mapshaper exited with code ${code}`)));
  });
}

function verifyGeoJson(text, label) {
  const parsed = JSON.parse(text);
  if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error(`${label} was not a GeoJSON FeatureCollection`);
  }
  return parsed;
}

async function buildNaturalEarthLayer(layer) {
  const sourceUrl = layer.sourceUrls[0];
  const rawPath = path.join(cacheDirectory, `${layer.id}.source.geojson`);
  const temporaryOutput = path.join(buildDirectory, `${layer.id}.geojson`);
  const sourceBuffer = await download(sourceUrl, rawPath);
  const source = verifyGeoJson(sourceBuffer.toString("utf8"), layer.id);
  await runMapshaper(rawPath, layer.steps, layer.precision, temporaryOutput);
  const outputBuffer = await readFile(temporaryOutput);
  const output = verifyGeoJson(outputBuffer.toString("utf8"), `${layer.id} output`);

  if (layer.preserveExistingBytes) {
    const existingBuffer = await readFile(layer.outputPath).catch(() => null);
    if (existingBuffer && !existingBuffer.equals(outputBuffer)) {
      const before = createHash("sha256").update(existingBuffer).digest("hex");
      const after = createHash("sha256").update(outputBuffer).digest("hex");
      throw new Error(`${layer.id} byte regression: existing ${existingBuffer.length} bytes / ${before}, generated ${outputBuffer.length} bytes / ${after}`);
    }
    if (!existingBuffer) await copyFile(temporaryOutput, layer.outputPath);
  } else {
    await copyFile(temporaryOutput, layer.outputPath);
  }

  const hasJapaneseNames = source.features.some((feature) => typeof feature?.properties?.NAME_JA === "string" && feature.properties.NAME_JA.trim());
  return {
    featureCount: output.features.length,
    notes: layer.id === "major-ports"
      ? [`NAME_JA available: ${hasJapaneseNames ? "yes" : "no (English name retained)"}`]
      : [`NAME_JA available: ${hasJapaneseNames ? "yes" : "no"}`, "Existing committed output: byte-identical"],
  };
}

function extractMultiLineStrings(geojson, label) {
  const paths = [];
  for (const feature of geojson.features) {
    if (feature.geometry?.type === "LineString") paths.push(feature.geometry.coordinates);
    else if (feature.geometry?.type === "MultiLineString") paths.push(...feature.geometry.coordinates);
    else throw new Error(`${label} contained unsupported ${feature.geometry?.type ?? "missing"} geometry`);
  }
  return paths;
}

function extractMultiPolygons(geojson, label) {
  const polygons = [];
  for (const feature of geojson.features) {
    if (feature.geometry?.type === "Polygon") polygons.push(feature.geometry.coordinates);
    else if (feature.geometry?.type === "MultiPolygon") polygons.push(...feature.geometry.coordinates);
    else throw new Error(`${label} contained unsupported ${feature.geometry?.type ?? "missing"} geometry`);
  }
  return polygons;
}

function inspectPolygons(polygons) {
  let holes = 0;
  let poleVertices = 0;
  let antimeridianSegments = 0;
  for (const polygon of polygons) {
    holes += Math.max(0, polygon.length - 1);
    for (const ring of polygon) {
      for (let index = 0; index < ring.length; index += 1) {
        const current = ring[index];
        const next = ring[(index + 1) % ring.length];
        if (Math.abs(current[1]) >= 89.9999) poleVertices += 1;
        if (next && Math.abs(next[0] - current[0]) > 180) antimeridianSegments += 1;
      }
    }
  }
  return { holes, poleVertices, antimeridianSegments };
}

function pointInProjectedRing([x, y], ring) {
  let inside = false;
  for (let currentIndex = 0, previousIndex = ring.length - 1; currentIndex < ring.length; previousIndex = currentIndex, currentIndex += 1) {
    const current = ring[currentIndex];
    const previous = ring[previousIndex];
    const intersects = ((current[1] > y) !== (previous[1] > y))
      && (x < (previous[0] - current[0]) * (y - current[1]) / (previous[1] - current[1]) + current[0]);
    if (intersects) inside = !inside;
  }
  return inside;
}

function projectPolygons(polygons, hemisphere) {
  const projection = polarStereographic[hemisphere];
  return polygons.map((polygon) => polygon.map((ring) => ring.map((coordinate) => {
    const [longitude, latitude] = proj4(projection, "WGS84", coordinate);
    return [Number(longitude.toFixed(4)), Number(latitude.toFixed(4))];
  })));
}

async function buildSeaIceEdges(layer) {
  const pathsBySeason = { winter: [], summer: [] };
  const sourceSummary = [];
  for (const source of seaIceSources) {
    const zipPath = path.join(cacheDirectory, "nsidc", source.file);
    const extractDirectory = path.join(cacheDirectory, "nsidc", source.key);
    const projectedOutput = path.join(buildDirectory, `${source.key}.geojson`);
    const zipBuffer = await download(source.sourceUrl, zipPath);
    new AdmZip(zipBuffer).extractAllTo(extractDirectory, true);
    const shapefilePath = path.join(extractDirectory, `${source.shapefileBase}.shp`);
    await runMapshaper(shapefilePath, layer.steps, layer.precision, projectedOutput);
    const geojson = verifyGeoJson(await readFile(projectedOutput, "utf8"), source.key);
    const paths = extractMultiLineStrings(geojson, source.key);
    pathsBySeason[source.season].push(...paths);
    sourceSummary.push(`${source.key}: ${paths.length} paths`);
  }

  const output = {
    type: "FeatureCollection",
    metadata: {
      dataset: "NSIDC Sea Ice Index, Version 4 (G02135)",
      doi: "10.7265/a98x-0f50",
      climatology: "1981-2010 monthly median ice extent",
      processing: layer.processing,
    },
    features: [
      {
        type: "Feature",
        id: "winter-median-edge",
        properties: { edge: "winter", northMonth: "March", southMonth: "September" },
        geometry: { type: "MultiLineString", coordinates: pathsBySeason.winter },
      },
      {
        type: "Feature",
        id: "summer-median-edge",
        properties: { edge: "summer", northMonth: "September", southMonth: "March" },
        geometry: { type: "MultiLineString", coordinates: pathsBySeason.summer },
      },
    ],
  };
  await writeFile(layer.outputPath, `${JSON.stringify(output)}\n`, "utf8");
  return { featureCount: 2, notes: sourceSummary };
}

async function buildSeaIceExtent(layer) {
  const polygonsBySeason = { winter: [], summer: [] };
  const sourceSummary = [];
  const inspection = { holes: 0, poleVertices: 0, antimeridianSegments: 0 };
  for (const source of seaIceExtentSources) {
    const zipPath = path.join(cacheDirectory, "nsidc", source.file);
    const extractDirectory = path.join(cacheDirectory, "nsidc", source.key);
    const densifiedOutput = path.join(buildDirectory, `${source.key}-densified-native.geojson`);
    const zipBuffer = await download(source.sourceUrl, zipPath);
    new AdmZip(zipBuffer).extractAllTo(extractDirectory, true);
    const shapefilePath = path.join(extractDirectory, `${source.shapefileBase}.shp`);
    await runMapshaper(shapefilePath, layer.steps, layer.precision, densifiedOutput);
    const geojson = verifyGeoJson(await readFile(densifiedOutput, "utf8"), source.key);
    const nativePolygons = extractMultiPolygons(geojson, source.key);
    const polarOuterRings = nativePolygons.filter((polygon) => polygon[0] && pointInProjectedRing([0, 0], polygon[0])).length;
    const polarInteriorRings = nativePolygons.reduce((count, polygon) => count + polygon.slice(1).filter((ring) => pointInProjectedRing([0, 0], ring)).length, 0);
    const polygons = projectPolygons(nativePolygons, source.hemisphere);
    polygonsBySeason[source.season].push(...polygons);
    const sourceInspection = inspectPolygons(polygons);
    inspection.holes += sourceInspection.holes;
    inspection.poleVertices += sourceInspection.poleVertices;
    inspection.antimeridianSegments += sourceInspection.antimeridianSegments;
    sourceSummary.push(`${source.key}: ${polygons.length} polygons / ${sourceInspection.holes} holes / ${polarOuterRings} polar outer rings / ${polarInteriorRings} polar interior rings / ${sourceInspection.antimeridianSegments} antimeridian segments`);
  }

  const output = {
    type: "FeatureCollection",
    metadata: {
      dataset: "NSIDC Sea Ice Index, Version 4 (G02135)",
      doi: "10.7265/a98x-0f50",
      observationYear: seaIceExtentYear,
      processing: layer.processing,
      poleHoleTreatment: "The 2025 Northern Hemisphere extent source includes the AMSR2 pole hole in extent, following the NSIDC product definition. Source ring topology is preserved through projection; the application fills no holes and adds no artificial polar closure.",
      inspection,
    },
    features: [
      {
        type: "Feature",
        id: "winter-observed-extent-2025",
        properties: { extent: "winter", observationYear: seaIceExtentYear, northMonth: "March", southMonth: "September" },
        geometry: { type: "MultiPolygon", coordinates: polygonsBySeason.winter },
      },
      {
        type: "Feature",
        id: "summer-observed-extent-2025",
        properties: { extent: "summer", observationYear: seaIceExtentYear, northMonth: "September", southMonth: "March" },
        geometry: { type: "MultiPolygon", coordinates: polygonsBySeason.summer },
      },
    ],
  };
  await writeFile(layer.outputPath, `${JSON.stringify(output)}\n`, "utf8");
  return { featureCount: 2, notes: [...sourceSummary, `aggregate inspection: ${inspection.holes} holes / ${inspection.poleVertices} pole vertices / ${inspection.antimeridianSegments} antimeridian segments`] };
}

async function writeGeoReadme() {
  const rows = [];
  for (const layer of layers) {
    const outputStats = await stat(layer.outputPath).catch(() => null);
    const sources = layer.sourceUrls.map((url, index) => `[${index + 1}](${url})`).join("<br>");
    rows.push(`| \`${layer.id}\` | ${sources} | ${layer.license} | ${layer.processing} | \`${path.relative(projectRoot, layer.outputPath).replaceAll("\\", "/")}\` | ${outputStats ? `${(outputStats.size / 1024).toFixed(1)} KiB / ${outputStats.size} bytes` : "not built"} |`);
  }
  const readme = `# Derived geographic data\n\nThis directory contains web-delivery derivatives produced by \`npm run data:geo\`. Raw downloads stay under \`.cache/geo/\` and are not committed. Run all layers with \`npm run data:geo\`, or one layer with \`npm run data:geo -- <id>\`.\n\n| layer | resolved source URL(s) | license / use condition | processing | output | size |\n| --- | --- | --- | --- | --- | ---: |\n${rows.join("\n")}\n\n## Sea Ice Index citation\n\nFetterer, F., Knowles, K., Meier, W. N., Savoie, M., Windnagel, A. K. & Stafford, T. (2025). *Sea Ice Index* (G02135, Version 4) [Data Set]. National Snow and Ice Data Center. https://doi.org/10.7265/a98x-0f50. Retrieved 2026-08-31.\n\nTwo distinct official products are shown without conflation:\n\n- **Areas:** observed monthly ice-extent polygons from the latest complete year available at retrieval, 2025. Global winter combines Northern Hemisphere March 2025 with Southern Hemisphere September 2025; global summer combines Northern Hemisphere September 2025 with Southern Hemisphere March 2025.\n- **Lines:** 1981–2010 monthly median extent polylines for March and September, both hemispheres. These climatological edges are unchanged from the earlier build.\n\nBoth products are densified by 25 km in their native polar stereographic projection before WGS84 conversion, then grouped into global winter/summer observations. Source polygon topology is preserved: holes are not filled and no artificial polar closure is added. This is not current ice conditions or a navigation product.\n`;
  await writeFile(path.join(outputDirectory, "README.md"), readme, "utf8");
}

await mkdir(cacheDirectory, { recursive: true });
await mkdir(buildDirectory, { recursive: true });
await mkdir(outputDirectory, { recursive: true });

const selectedId = process.argv[2];
const selectedLayers = selectedId ? layers.filter((layer) => layer.id === selectedId) : layers;
if (selectedId && selectedLayers.length === 0) {
  throw new Error(`Unknown geographic layer: ${selectedId}. Available: ${layers.map((layer) => layer.id).join(", ")}`);
}

for (const layer of selectedLayers) {
  console.log(`\n[${layer.id}]`);
  const result = await layer.build(layer);
  const outputStats = await stat(layer.outputPath);
  console.log(`Source URL(s): ${layer.sourceUrls.join(" | ")}`);
  console.log(`License: ${layer.license}`);
  console.log(`Retrieved: ${layer.retrievedAt}`);
  console.log(`Features: ${result.featureCount}`);
  for (const note of result.notes) console.log(note);
  console.log(`Output: ${path.relative(projectRoot, layer.outputPath)} (${(outputStats.size / 1024).toFixed(1)} KiB / ${outputStats.size} bytes)`);
}

await writeGeoReadme();
