#!/usr/bin/env node
/**
 * 山脈・高原レンズの派生属性が生きていることを確かめる。
 *
 * このレンズの表示は Natural Earth の SCALERANK ではなく、ETOPO から測った
 * 高地面積と比高で決めている。`npm run data:geo -- physical-features` を回すと
 * Natural Earth から作り直すので、焼いた段と理由が消える。消えても地図は描けてしまい、
 * 黙って「294件を全縮尺で全部描く」状態へ戻る。ここで止める。
 *
 * 直し方: python tools/build-terrain-importance.py
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const featuresPath = path.join(projectRoot, "public", "geo", "physical-features.geojson");

const raw = await readFile(featuresPath, "utf8").catch(() => null);
if (!raw) {
  console.error(`physical-features.geojson が見つかりません: ${path.relative(projectRoot, featuresPath)}`);
  process.exit(1);
}
const features = JSON.parse(raw).features ?? [];

const fail = (lines) => {
  console.error(["", ...lines, ""].join("\n"));
  process.exit(1);
};

const tiered = features.filter((feature) => typeof feature.properties?.tier === "number");
if (tiered.length !== features.length) {
  fail([
    `山脈・高原の派生属性が ${features.length} 件中 ${features.length - tiered.length} 件で欠けています。`,
    "",
    "このまま出すと、294件が全縮尺で全部描かれ、標高445mのオーストラリアの台地が",
    "標高5,106mのカラコルム山脈と同じ強さで出ます。",
    "",
    "直し方:",
    "  pip install tifffile imagecodecs numpy",
    "  mkdir -p .cache/terrain",
    "  curl -L -o .cache/terrain/etopo60.tif \\",
    '    "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif"',
    "  python tools/build-terrain-importance.py",
  ]);
}

// 南極は一律で対象外。1件でも段に入っていたら、除外が効いていない。
const antarctic = features.filter((feature) => feature.properties?.REGION === "Antarctica" && feature.properties?.tier <= 3);
if (antarctic.length > 0) {
  fail([
    `南極の地物が ${antarctic.length} 件、表示される段に入っています。`,
    "極高原は 2,000 m 以上を 5,926,623 km2 もち、どの指標でもチベットを抜いて世界一になります。",
    "焼き直してください: python tools/build-terrain-importance.py",
  ]);
}

const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
const reasons = {};
for (const feature of tiered) {
  counts[feature.properties.tier] += 1;
  if (feature.properties.tier <= 3) {
    const why = feature.properties.why ?? "none";
    reasons[why] = (reasons[why] ?? 0) + 1;
  }
}
if (counts[1] === 0) fail(["世界段に1件も入っていません。焼き直してください。"]);

const parts = Object.entries(reasons).map(([why, n]) => `${why} ${n}`).join(" / ");
console.log(
  `terrain importance ok: 世界 ${counts[1]} / 大陸 ${counts[2]} / 国 ${counts[3]} / 描かない ${counts[4]}（${parts}）`,
);
