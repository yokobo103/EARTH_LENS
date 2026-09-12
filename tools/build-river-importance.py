#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""HydroRIVERS の流量を Natural Earth の河川線へ移し、小さな派生値だけを焼き込む。

オフライン専用。CI では回さない。HydroRIVERS 本体（544 MB）はリポジトリに入れず、
ここで作った数値だけが public/geo/rivers.geojson に残る。

    pip install pyshp
    curl -LO https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_shp.zip
    unzip HydroRIVERS_v10_shp.zip
    python tools/build-river-importance.py HydroRIVERS_v10_shp/HydroRIVERS_v10

npm run data:geo -- rivers を回すとこの派生値は消える。そのあと必ずこれを流し直す。

なぜ必要か（2026-09-13 の実測）:
  Natural Earth の scalerank は「どの縮尺の地図に出すか」という製図の判断で、川の規模ではない。
  全世界で唯一の rank 0 はニュージーランドのトンガリロ川（平均流量 40 m3/s）で、
  アマゾン（rank 1、192,628 m3/s）より強い扱いになっていた。
  逆に贛江は rank 6 で 6,037 m3/s、バラク川は rank 9 で 4,840 m3/s ある。
  元データには川幅も流量も長さも入っていない（strokeweig は全 1,455 本が null）。

出典（表示義務あり）:
  Lehner, B., Grill G. (2013): Global river hydrography and network routing.
  Hydrological Processes 27. https://www.hydrosheds.org
"""
import collections
import io
import json
import math
import os
import statistics
import sys
import time

import shapefile  # pyshp

REPOSITORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RIVERS_GEOJSON = os.path.join(REPOSITORY, "public", "geo", "rivers.geojson")

# 約5.5km。Natural Earth の線は 8% 簡略化されているので、これより細かくしても合わない。
CELL = 0.05
NEIGHBOURS = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]

# 1 m3/s 未満は一番細かい段にも出ないので索引に入れない。2,383,921 本まで落ちる。
MIN_DISCHARGE_CMS = 1.0

# 端点が一致したとみなす精度。Natural Earth の座標は 0.001 度で配信している。
ENDPOINT_PRECISION = 3


def paths_of(feature):
    geometry = feature.get("geometry")
    if not geometry:
        return []
    if geometry["type"] == "LineString":
        return [geometry["coordinates"]]
    return geometry["coordinates"]


def build_index(shapefile_path):
    """HydroRIVERS を (格子 -> 最大流量の reach) と (水系 -> 河口流量) に畳む。"""
    reader = shapefile.Reader(shapefile_path)
    fields = [f[0] for f in reader.fields[1:]]
    i_discharge = fields.index("DIS_AV_CMS")
    i_system = fields.index("MAIN_RIV")
    i_order = fields.index("ORD_CLAS")

    started = time.time()
    system_outlet = collections.defaultdict(float)
    for record in reader.iterRecords():
        discharge = record[i_discharge]
        if discharge and discharge >= MIN_DISCHARGE_CMS:
            system = record[i_system]
            if discharge > system_outlet[system]:
                system_outlet[system] = discharge
    print("水系 %d (%.0f 秒)" % (len(system_outlet), time.time() - started))

    grid = {}
    kept = 0
    for shape, record in zip(reader.iterShapes(), reader.iterRecords()):
        discharge = record[i_discharge]
        if not discharge or discharge < MIN_DISCHARGE_CMS:
            continue
        kept += 1
        value = (discharge, record[i_system], record[i_order])
        for (x, y) in shape.points:
            key = (int(math.floor(x / CELL)), int(math.floor(y / CELL)))
            current = grid.get(key)
            if current is None or discharge > current[0]:
                grid[key] = value
    print("reach %d -> 格子 %d セル (%.0f 秒)" % (kept, len(grid), time.time() - started))
    return grid, system_outlet


def transfer(grid, system_outlet, features):
    """各線の頂点から流量を拾う。名前は使わず、位置だけで対応づける。

    採るのは中央値。最大値や p90 だと合流点の近くで本流の値を拾ってしまい、
    支流が巨大化する（カルカラニャー川 p90 19,078 / 中央値 27 m3/s）。
    """
    transferred = []
    for feature in features:
        discharges, systems, orders, hits, total = [], [], [], 0, 0
        for path in paths_of(feature):
            for (x, y) in path:
                total += 1
                cx, cy = int(math.floor(x / CELL)), int(math.floor(y / CELL))
                best = None
                for dx, dy in NEIGHBOURS:
                    found = grid.get((cx + dx, cy + dy))
                    if found is not None and (best is None or found[0] > best[0]):
                        best = found
                if best:
                    hits += 1
                    discharges.append(best[0])
                    systems.append(best[1])
                    orders.append(best[2])
        if not discharges:
            transferred.append(None)
            continue
        system = collections.Counter(systems).most_common(1)[0][0]
        transferred.append({
            "discharge": round(statistics.median(discharges), 1),
            "systemOutlet": round(system_outlet.get(system, 0.0)),
            "mainstemOrder": int(statistics.median(orders)),
            "coverage": round(hits / total, 3) if total else 0.0,
        })
    return transferred


def spread_along_chains(features, transferred):
    """同じ名前で端点が接する区間を1本の川とみなし、鎖の最大流量を全区間へ配る。

    流量は上流ほど減るので、区間ごとの値でしきい値を切ると大河が途中で終わる
    （1,000 m3/s で切るとミシシッピは 3 区間中 1 区間しか残らない）。
    名前が同じだけでは足りない。無関係な Rio Negro や Rio Grande が各大陸にある。
    だから端点が接していることを条件にする。
    """
    parent = list(range(len(features)))

    def find(node):
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(a, b):
        root_a, root_b = find(a), find(b)
        if root_a != root_b:
            parent[root_a] = root_b

    by_endpoint = {}
    for index, feature in enumerate(features):
        name = (feature.get("properties", {}).get("name") or "").strip()
        if not name:
            continue
        for path in paths_of(feature):
            if len(path) < 2:
                continue
            for point in (path[0], path[-1]):
                key = (name, round(point[0], ENDPOINT_PRECISION), round(point[1], ENDPOINT_PRECISION))
                if key in by_endpoint:
                    union(by_endpoint[key], index)
                else:
                    by_endpoint[key] = index

    strongest = collections.defaultdict(float)
    for index, value in enumerate(transferred):
        discharge = value["discharge"] if value else 0.0
        root = find(index)
        if discharge > strongest[root]:
            strongest[root] = discharge
    return [round(strongest[find(i)], 1) for i in range(len(features))]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    grid, system_outlet = build_index(sys.argv[1])

    geojson = json.load(io.open(RIVERS_GEOJSON, encoding="utf-8"))
    features = geojson["features"]
    transferred = transfer(grid, system_outlet, features)
    chains = spread_along_chains(features, transferred)

    matched = 0
    for index, feature in enumerate(features):
        properties = feature["properties"]
        value = transferred[index]
        # 短い鍵で焼く。読む側は definition.ts が長い名前に直す。
        properties["chain"] = chains[index]
        if value:
            matched += 1
            properties["dis"] = value["discharge"]
            properties["sys"] = value["systemOutlet"]
            properties["clas"] = value["mainstemOrder"]
        else:
            properties.pop("dis", None)
            properties.pop("sys", None)
            properties.pop("clas", None)

    text = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    io.open(RIVERS_GEOJSON, "w", encoding="utf-8").write(text)
    print("照合 %d / %d (%.1f%%)" % (matched, len(features), 100 * matched / len(features)))
    print("rivers.geojson %d B" % len(text.encode("utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
