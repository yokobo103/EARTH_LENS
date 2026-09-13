#!/usr/bin/env node
/**
 * 港レンズの派生属性が生きていることを確かめる。
 *
 * 港の表示は Natural Earth の scalerank ではなく、取扱量の軸で決めている。
 * `npm run data:geo -- major-ports` を回すと Natural Earth から作り直すので、
 * 焼いた段と軸、それに補完した83点が消える。消えても地図は描けてしまい、
 * 黙って「客船の寄港地が世界最大の港」の見え方へ戻る。ここで止める。
 *
 * 直し方: python tools/build-port-importance.py
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const portsPath = path.join(projectRoot, "public", "geo", "major-ports.geojson");
const snapshotPath = path.join(projectRoot, "tools", "data", "wsc-top50-container-ports-2024.json");

const raw = await readFile(portsPath, "utf8").catch(() => null);
if (!raw) {
  console.error(`major-ports.geojson が見つかりません: ${path.relative(projectRoot, portsPath)}`);
  process.exit(1);
}
const features = JSON.parse(raw).features ?? [];
const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));

const fail = (lines) => {
  console.error(["", ...lines, ""].join("\n"));
  process.exit(1);
};

const tiered = features.filter((feature) => typeof feature.properties?.tier === "number");
if (tiered.length === 0) {
  fail([
    "港の派生属性が丸ごとありません。",
    "",
    `  ${path.relative(projectRoot, portsPath)} の ${features.length} 点に tier が入っていない。`,
    "",
    "このまま出すと、港レンズは Natural Earth の scalerank に戻ります。",
    "つまり人口4,500人の Gythion が上海より大きく描かれる状態です。",
    "",
    "直し方:",
    "  pip install openpyxl",
    "  mkdir -p .cache/ports",
    "  curl -L -o .cache/ports/wpi.csv \\",
    '    "https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.csv"',
    "  curl -L -o .cache/ports/cppi-2024.xlsx \\",
    '    "https://openknowledge.worldbank.org/bitstreams/6d1086f0-13ed-4d69-92ad-11d93f3e7df6/download"',
    "  python tools/build-port-importance.py",
  ]);
}

// 世界段は World Shipping Council の Top 50 と一対一で対応しているはず。
// 一部が落ちていたら、補完か照合のどこかが壊れている。
const worldRanks = new Set();
for (const feature of features) {
  for (const axis of feature.properties?.ax ?? []) {
    if (axis.s === "wsc-top50-2024" && typeof axis.r === "number") worldRanks.add(axis.r);
  }
}
const missing = snapshot.ports.filter((port) => !worldRanks.has(port.rank));
if (missing.length > 0) {
  fail([
    `World Shipping Council の Top 50 のうち ${missing.length} 港が地図に乗っていません。`,
    ...missing.slice(0, 10).map((port) => `  ${port.rank}. ${port.name} (${port.country})`),
    "",
    "焼き直してください: python tools/build-port-importance.py",
  ]);
}

const counts = { 1: 0, 2: 0, 3: 0 };
for (const feature of tiered) counts[feature.properties.tier] += 1;
const added = features.filter((feature) => feature.properties?.added).length;
console.log(
  `ports importance ok: 世界 ${counts[1]} / 大陸 ${counts[2]} / 国 ${counts[3]} 点` +
  `（補完 ${added} 点・container 軸のみ / Phase 1）`,
);
