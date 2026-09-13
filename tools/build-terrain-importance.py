#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""山脈・高原の表示重要度を焼く。標高データはオフラインでしか使わない。

    pip install tifffile imagecodecs numpy
    mkdir -p .cache/terrain
    curl -L -o .cache/terrain/etopo60.tif \
      "https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif"
    python tools/build-terrain-importance.py

npm run data:geo -- physical-features を回すとこの派生値は消える。build-geo.mjs の
after フックが呼び直し、それを素通りしても npm run build が
verify-terrain-importance.mjs で落ちる。

なぜ必要か（2026-09-13 の実測）:
  Natural Earth の SCALERANK は面積とはゆるく相関するが、越えにくさとは相関しない。
  標高の中央値 5,106 m のカラコルム山脈が rank 2 で、445 m のオーストラリアの
  ウェスタン・プラトーが rank 1。ウラル山脈（中央値 401 m）も rank 1。
  元データには標高が一切入っていない。

  面積でも代わりにならない。ブラジル高原は 3,906,404 km2 と巨大だが
  2,000 m 以上は 243 km2（0.0%）しかなく、人はその上に住んでいる。
  ヒマラヤは 472,113 km2 とその8分の1だが、2,000 m 以上を 369,904 km2 もつ。

理由は2つ、別々に持つ（総合スコアにしない）:
  high_elevation_extent  高い地面がどれだけ広いか
  relief_barrier         周囲の低い地面からどれだけ立ち上がるか

  この2つは違うものを拾う。チベット高原・アンデス・ロッキーは前者で、
  アルプス（2,000 m 以上は 34,723 km2 しかない）やコーカサス・ザグロスは後者で入る。
  1つの数に畳むと、どちらの理由で出ているのか説明できなくなる。

ETOPO 2022 について:
  使っているのは surface（**氷床の上面**）であって岩盤ではない。実測で、
  グリーンランドのサミットが 3,200 m、南極のボストークが 3,487 m と出る。
  この層で氷床の上に乗っている地物は Vatnajökull（アイスランド）1件だけで、
  グリーンランド氷床の上には0件。南極は下の理由で対象外にしている。

南極を除く理由:
  このレンズは地形が人の世界にどう効くかを見るもの。極高原は 2,000 m 以上を
  5,926,623 km2 もち、どの指標でもチベットを抜いて世界一になるが、
  その上に日常の移動は無い。REGION == "Antarctica" の25件すべてを一律に外す。
  地物ごとの調整ではない。

出典:
  NOAA NCEI, ETOPO 2022 15/30/60 Arc-Second Global Relief Model
  https://www.ncei.noaa.gov/products/etopo-global-relief-model
"""
import io
import json
import math
import os
import sys

import numpy as np
import tifffile

REPOSITORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEATURES_GEOJSON = os.path.join(REPOSITORY, "public", "geo", "physical-features.geojson")
DEM_PATH = os.path.join(REPOSITORY, ".cache", "terrain", "etopo60.tif")

# 周囲の地面を見る幅。山系の裾から平地までが入る程度。
MARGIN_DEGREES = 1.5

# 「周囲の低い地面」を取る分位。中央値だと、隣が高原のときに引きずられる。
# ヒマラヤの周りにはガンジス平原とチベット高原の両方があり、
# 越える側から見て意味があるのは低いほう。
FLOOR_PERCENTILE = 25

# 段のしきい値。すべて「高さ」と「面積」で、そのままユーザーに見せられる。
WORLD_ABOVE_M, WORLD_AREA_KM2 = 2000, 100_000
CONTINENT_ABOVE_M, CONTINENT_AREA_KM2 = 1500, 50_000
CONTINENT_RELIEF_M = 2000
COUNTRY_ABOVE_M, COUNTRY_AREA_KM2 = 1000, 30_000
COUNTRY_RELIEF_M = 900


def rings_of(feature):
    geometry = feature["geometry"]
    raw = geometry["coordinates"] if geometry["type"] == "Polygon" else [r for p in geometry["coordinates"] for r in p]
    return [ring for ring in raw if len(ring) >= 4]


def inside(rings, x, y):
    hit = False
    for ring in rings:
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


def measure(dem, rows, cols, feature):
    dlon, dlat = 360.0 / cols, 180.0 / rows
    cell_km2 = (dlon * 111.32) * (dlat * 111.32)
    rings = rings_of(feature)
    if not rings:
        return None
    points = [c for ring in rings for c in ring]
    west, east = min(c[0] for c in points), max(c[0] for c in points)
    south, north = min(c[1] for c in points), max(c[1] for c in points)

    c0 = max(0, int((west - MARGIN_DEGREES + 180.0) / dlon))
    c1 = min(cols - 1, int((east + MARGIN_DEGREES + 180.0) / dlon) + 1)
    r0 = max(0, int((90.0 - north - MARGIN_DEGREES) / dlat))
    r1 = min(rows - 1, int((90.0 - south + MARGIN_DEGREES) / dlat) + 1)

    heights, weights, around = [], [], []
    for ri in range(r0, r1 + 1):
        y = 90.0 - (ri + 0.5) * dlat
        weight = math.cos(math.radians(y))
        for ci in range(c0, c1 + 1):
            x = -180.0 + (ci + 0.5) * dlon
            height = float(dem[ri, ci])
            if inside(rings, x, y):
                heights.append(height)
                weights.append(weight)
            elif height >= 0:          # 海は「周囲の地面」ではない
                around.append(height)
    if not heights:
        return None

    heights = np.array(heights)
    weights = np.array(weights, dtype=float)
    order = np.argsort(heights)
    sorted_heights, sorted_weights = heights[order], weights[order]
    cumulative = np.cumsum(sorted_weights) / sorted_weights.sum()

    def quantile(p):
        return float(sorted_heights[min(len(sorted_heights) - 1, int(np.searchsorted(cumulative, p)))])

    floor = float(np.percentile(around, FLOOR_PERCENTILE)) if around else 0.0
    return {
        "median": round(quantile(0.5)),
        "top": round(quantile(0.9)),
        "floor": round(floor),
        "relief": round(quantile(0.9) - floor),
        "above": {metres: round(float(weights[heights >= metres].sum() * cell_km2))
                  for metres in (COUNTRY_ABOVE_M, CONTINENT_ABOVE_M, WORLD_ABOVE_M)},
    }


def classify(stats):
    """段と、そこに入った理由。理由は1つに畳まず、当てはまった側を返す。"""
    above = stats["above"]
    if above[WORLD_ABOVE_M] >= WORLD_AREA_KM2:
        return 1, "high_elevation_extent"
    if above[CONTINENT_ABOVE_M] >= CONTINENT_AREA_KM2:
        return 2, "high_elevation_extent"
    if stats["relief"] >= CONTINENT_RELIEF_M:
        return 2, "relief_barrier"
    if above[COUNTRY_ABOVE_M] >= COUNTRY_AREA_KM2:
        return 3, "high_elevation_extent"
    if stats["relief"] >= COUNTRY_RELIEF_M:
        return 3, "relief_barrier"
    return 4, "none"


def main():
    if not os.path.exists(DEM_PATH):
        print(__doc__)
        print("ETOPO が見つかりません: %s" % DEM_PATH)
        return 1
    page = tifffile.TiffFile(DEM_PATH).pages[0]
    dem = page.asarray()
    rows, cols = dem.shape
    print("DEM %dx%d（1セル 約%.1f km）" % (cols, rows, (360.0 / cols) * 111.32))

    geojson = json.load(io.open(FEATURES_GEOJSON, encoding="utf-8"))
    tiers = {1: 0, 2: 0, 3: 0, 4: 0}
    reasons = {}
    antarctic = 0
    for feature in geojson["features"]:
        properties = feature["properties"]
        if properties.get("REGION") == "Antarctica":
            antarctic += 1
            properties["tier"] = 4
            properties["why"] = "antarctica"
            for key in ("a1", "a15", "a2", "rlf", "med", "flr"):
                properties.pop(key, None)
            tiers[4] += 1
            continue
        stats = measure(dem, rows, cols, feature)
        if stats is None:
            properties["tier"] = 4
            properties["why"] = "none"
            tiers[4] += 1
            continue
        tier, why = classify(stats)
        properties["tier"] = tier
        properties["why"] = why
        properties["a1"] = stats["above"][COUNTRY_ABOVE_M]
        properties["a15"] = stats["above"][CONTINENT_ABOVE_M]
        properties["a2"] = stats["above"][WORLD_ABOVE_M]
        properties["rlf"] = stats["relief"]
        properties["med"] = stats["median"]
        properties["flr"] = stats["floor"]
        tiers[tier] += 1
        reasons[why] = reasons.get(why, 0) + 1

    text = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    io.open(FEATURES_GEOJSON, "w", encoding="utf-8").write(text)
    print("世界 %d / 大陸 %d / 国 %d / 描かない %d（うち南極 %d）"
          % (tiers[1], tiers[2], tiers[3], tiers[4], antarctic))
    print("理由: %s" % reasons)
    print("physical-features.geojson %d B" % len(text.encode("utf-8")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
