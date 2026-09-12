#!/usr/bin/env node
/**
 * 河川レンズの派生属性が生きていることを確かめる。
 *
 * 河川の表示は Natural Earth の scalerank ではなく、HydroRIVERS から移した平均流量で
 * 決めている。`npm run data:geo -- rivers` を回すと Natural Earth から作り直すので、
 * 焼いた派生値は消える。消えても地図は描けてしまい、黙って scalerank の見え方へ戻る。
 * 静かに戻るのがいちばん困るので、ここで止める。
 *
 * 直し方: python tools/build-river-importance.py <HydroRIVERS のshp>
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const riversPath = path.join(projectRoot, "public", "geo", "rivers.geojson");

/** HydroRIVERS に該当が無い線が数本ある（スエズ運河など）。全部は揃わない。 */
const MINIMUM_COVERAGE = 0.98;

const raw = await readFile(riversPath, "utf8").catch(() => null);
if (!raw) {
  console.error(`rivers.geojson が見つかりません: ${path.relative(projectRoot, riversPath)}`);
  process.exit(1);
}

const features = JSON.parse(raw).features ?? [];
if (features.length === 0) {
  console.error("rivers.geojson に線が1本もありません。");
  process.exit(1);
}

const withChain = features.filter((feature) => typeof feature.properties?.chain === "number");
const withDischarge = features.filter((feature) => typeof feature.properties?.dis === "number");
const coverage = withDischarge.length / features.length;

if (withChain.length === 0) {
  console.error([
    "",
    "河川の派生属性が丸ごとありません。",
    "",
    `  ${path.relative(projectRoot, riversPath)} の ${features.length} 本に chain / dis / sys / clas がひとつも入っていない。`,
    "",
    "このまま出すと、河川レンズは全部 scalerank の逃げ道に落ちます。",
    "つまり全長100kmのトンガリロ川がアマゾンと同じ扱いに戻ります。",
    "",
    "直し方:",
    "  pip install pyshp",
    "  curl -LO https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_shp.zip",
    "  unzip HydroRIVERS_v10_shp.zip -d .cache/geo/",
    "  python tools/build-river-importance.py .cache/geo/HydroRIVERS_v10_shp/HydroRIVERS_v10",
    "",
  ].join("\n"));
  process.exit(1);
}

if (coverage < MINIMUM_COVERAGE) {
  console.error([
    "",
    `河川の平均流量が ${features.length} 本中 ${withDischarge.length} 本にしかありません` +
      `（${(100 * coverage).toFixed(1)}% / 必要 ${(100 * MINIMUM_COVERAGE).toFixed(0)}%）。`,
    "焼き直してください: python tools/build-river-importance.py <HydroRIVERS のshp>",
    "",
  ].join("\n"));
  process.exit(1);
}

console.log(
  `rivers importance ok: ${withDischarge.length} / ${features.length} 本に平均流量 ` +
  `(${(100 * coverage).toFixed(1)}%)`,
);
