#!/usr/bin/env node
/**
 * EEZ レイヤーが世界全体を持っていることを確かめる。
 *
 * 以前は太平洋側の19か国だけを WFS の cql_filter で取っていて、北極海の EEZ が
 * 1件も描かれていなかった。取得条件を誰かが絞り直したら、ここで止める。
 *
 * 直し方: npm run data:geo -- eez
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const eezPath = path.join(projectRoot, "public", "geo", "eez.geojson");

const fail = (lines) => {
  console.error(["", ...lines, "", "直し方: npm run data:geo -- eez", ""].join("\n"));
  process.exit(1);
};

const raw = await readFile(eezPath, "utf8").catch(() => null);
if (!raw) fail([`EEZ が見つかりません: ${path.relative(projectRoot, eezPath)}`]);

// 世界の EEZ は Marine Regions v12 で 285 件。これを大きく下回るなら、どこかで絞られている。
const MINIMUM_FEATURES = 250;
// 配信サイズの上限。今は約 1.8 MB。これを超えるなら簡略化の設定を見直す。
const MAXIMUM_BYTES = 3_000_000;

const features = JSON.parse(raw).features ?? [];
if (features.length < MINIMUM_FEATURES) {
  fail([`EEZ が ${features.length} 件しかありません（世界全体は約 285 件）。取得条件が絞られていないか確認してください。`]);
}
if (Buffer.byteLength(raw) > MAXIMUM_BYTES) {
  fail([`eez.geojson が ${Buffer.byteLength(raw).toLocaleString()} B あります（上限 ${MAXIMUM_BYTES.toLocaleString()} B）。簡略化を強めてください。`]);
}

// 北極海の沿岸国。どれか1つでも欠けたら、北極圏の EEZ が描かれない状態に戻っている。
const arctic = [
  { label: "ロシア", territory: "Russia" },
  { label: "カナダ", territory: "Canada" },
  { label: "アメリカ（アラスカ）", territory: "Alaska" },
  { label: "デンマーク王国（グリーンランド）", territory: "Greenland" },
  { label: "ノルウェー", territory: "Norway" },
];
const missing = arctic.filter(({ territory }) => !features.some((feature) => {
  const properties = feature.properties ?? {};
  if (properties.territory1 !== territory || properties.pol_type !== "200NM") return false;
  const rings = feature.geometry.type === "Polygon" ? feature.geometry.coordinates : feature.geometry.coordinates.flat();
  return rings.some((ring) => ring.some(([, latitude]) => latitude > 66.5));
}));
if (missing.length > 0) {
  fail([`北極圏（北緯66.5度以北）に届く EEZ が欠けています: ${missing.map(({ label }) => label).join(" / ")}`]);
}

const withoutLabel = features.filter((feature) => typeof feature.properties?.label_lon !== "number");
if (withoutLabel.length > 0) {
  fail([`名札の位置（label_lon/label_lat）が無い EEZ が ${withoutLabel.length} 件あります。日付変更線をまたぐ海域の名札が大西洋に出ます。`]);
}

console.log(`eez ok: ${features.length} 件 / ${(Buffer.byteLength(raw) / 1024).toFixed(0)} KiB / 北極海沿岸 ${arctic.length} か国あり`);
