#!/usr/bin/env node
/**
 * 乾燥帯レンズの面が、気候区分から焼いたものであることを確かめる。
 *
 * このレンズは Natural Earth の「名前が Desert の58件」をやめて、Köppen-Geiger の
 * B（乾燥帯）を焼いた面を描いている。`public/geo/arid-regions.geojson` が無い、
 * あるいは段と区分が欠けていると、レンズは黙って何も描かない状態になる。
 * 元データ（deserts.geojson）はまだリポジトリに残っているので、
 * 「気づかないうちに名前ベースへ戻る」経路も残っている。ここで止める。
 *
 * 直し方: python tools/build-arid-regions.py
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const featuresPath = path.join(projectRoot, "public", "geo", "arid-regions.geojson");

const fail = (lines) => {
  console.error(["", ...lines, ""].join("\n"));
  process.exit(1);
};

const rebuild = [
  "",
  "直し方:",
  "  pip install tifffile imagecodecs numpy scipy",
  "  mkdir -p .cache/aridity",
  "  curl -L -o .cache/aridity/koppen_geiger_tif.zip \\",
  '    "https://ndownloader.figshare.com/files/61012822"',
  "  python tools/build-arid-regions.py",
];

const raw = await readFile(featuresPath, "utf8").catch(() => null);
if (!raw) {
  fail([
    `乾燥帯の面が見つかりません: ${path.relative(projectRoot, featuresPath)}`,
    "このファイルが無いと、乾燥帯レンズは何も描きません。",
    ...rebuild,
  ]);
}

const geojson = JSON.parse(raw);
const features = geojson.features ?? [];
const reasons = new Set(["arid_climate", "semi_arid_climate"]);

const broken = features.filter((feature) => {
  const properties = feature.properties ?? {};
  return !reasons.has(properties.why) || typeof properties.tier !== "number" || typeof properties.km2 !== "number";
});
if (features.length === 0 || broken.length > 0) {
  fail([
    `乾燥帯の面 ${features.length} 件のうち ${broken.length} 件で、段（tier）か区分（why）か面積（km2）が欠けています。`,
    "段が無いと54件すべてが全縮尺で描かれ、区分が無いと砂漠と半乾燥が同じ濃さで出ます。",
    ...rebuild,
  ]);
}

// 極域は Köppen では B にならない。1件でも出ていたら、別のデータを焼いている。
const polar = features.filter((feature) => {
  const rings = feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
  return rings.some((ring) => ring.some(([, latitude]) => latitude < -60));
});
if (polar.length > 0) {
  fail([
    `南緯60度より南に ${polar.length} 件が出ています。Köppen は極(E)を B より先に判定するので、ここに乾燥帯は出ません。`,
    ...rebuild,
  ]);
}

const counts = { 1: 0, 2: 0, 3: 0 };
const byReason = {};
for (const feature of features) {
  counts[feature.properties.tier] = (counts[feature.properties.tier] ?? 0) + 1;
  byReason[feature.properties.why] = (byReason[feature.properties.why] ?? 0) + 1;
}
if (counts[1] === 0) fail(["世界段に1件も入っていません。焼き直してください。", ...rebuild]);

const parts = Object.entries(byReason).map(([why, n]) => `${why} ${n}`).join(" / ");
console.log(
  `arid regions ok: 世界 ${counts[1]} / 大陸 ${counts[2]} / 国 ${counts[3]}（${parts}）`,
);
