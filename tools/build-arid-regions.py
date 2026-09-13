#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""乾燥帯の面を、気候区分から焼く。気候データはオフラインでしか使わない。

    pip install tifffile imagecodecs numpy scipy
    mkdir -p .cache/aridity
    curl -L -o .cache/aridity/koppen_geiger_tif.zip \
      "https://ndownloader.figshare.com/files/61012822"
    python tools/build-arid-regions.py

出力は public/geo/arid-regions.geojson（この1本だけ。実行時に気候データは読まない）。

なぜ必要か（2026-09-13 の実測）:
  これまでは Natural Earth の「名前が Desert の地域」58件を描いていた。
  描いている所の 97% は本当に乾燥帯だったが、逆に**本物の砂漠の 44%**
  （1,191万 km2）が画面に無かった。アラビア半島の大半、オーストラリア内陸、
  イラン、ソマリ、モハベ、グレートベースン、パタゴニア、セチュラ。
  半乾燥のサヘル（216万 km2）は帯として1件も無かった。
  さらに 58件中 22件が大きい砂漠の内側に入れ子で、549万 km2 が二重以上に
  塗られていた（サハラの内側が濃いのは、乾いているからではなく名前が細かいから）。

  名前で拾う限りこれは直らない。面は測って作る。

区分（Köppen-Geiger の B）:
  arid_climate       BW。年の降水が、その土地の気温から決まる必要量の半分に届かない
  semi_arid_climate  BS。半分は超えるが、必要量には届かない

  2つは総合スコアにせず、別の表示理由として持つ。段（大きさ）とも独立。
  サヘルは「小さい砂漠」ではなく「広い semi_arid_climate」として世界段に出る。

極の乾燥について:
  この区分では出ない。実測で、南極 12,560,033 km2 / グリーンランド 2,160,859 /
  カナダ北極諸島 2,081,901 / シベリア北岸 3,314,028 の**どこにも B が 1% も無い**。
  Köppen が E（極）を B より先に判定するため。山脈レンズのように
  地域を手で外す規則を書かなくてよい。

期間について:
  1991-2020 の平年値。**いまの干ばつではない**。「この土地はいつも乾いている」だけを言う。

出典:
  Beck, H.E., McVicar, T.R., Vergopolan, N. et al. (2023)
  High-resolution (1 km) Köppen-Geiger maps for 1901-2099 based on
  constrained CMIP6 projections. Scientific Data 10, 724. CC BY 4.0.
  https://doi.org/10.6084/m9.figshare.21789074
"""
import io
import json
import math
import os
import sys
import zipfile

import numpy as np
import tifffile
from scipy import ndimage

REPOSITORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(REPOSITORY, ".cache", "aridity", "koppen_geiger_tif.zip")
MEMBER = "1991_2020/koppen_geiger_0p1.tif"
OUTPUT = os.path.join(REPOSITORY, "public", "geo", "arid-regions.geojson")

STEP = 0.1                      # 元データの格子（約11 km）
BW_CLASSES = (4, 5)             # BWh / BWk
BS_CLASSES = (6, 7)             # BSh / BSk

# 塊として残す最小面積。これ未満の島と穴は消す。
# 1万 km2 は東京都の5倍弱で、世界地図の上で「帯」と読める下限。
MIN_PATCH_KM2 = 20_000

# 段。面積だけで切る。区分（BW/BS）とは独立させ、サヘルのような
# 大陸規模の半乾燥帯が世界段に出るようにする。
WORLD_KM2 = 500_000
CONTINENT_KM2 = 100_000

# 形の整え方。格子の階段をそのまま出すと11 kmのギザギザになる。
CHAIKIN_PASSES = 2
SIMPLIFY_DEGREES = 0.04         # 約4.5 km
COORDINATE_DIGITS = 2


def load_classes():
    if not os.path.exists(ARCHIVE):
        print(__doc__)
        print("気候区分が見つかりません: %s" % ARCHIVE)
        return None
    with zipfile.ZipFile(ARCHIVE) as archive:
        return tifffile.imread(io.BytesIO(archive.read(MEMBER)))


def cell_area_km2(rows, cols):
    latitudes = 90.0 - (np.arange(rows) + 0.5) * (180.0 / rows)
    row_area = (180.0 / rows * 111.32) * (360.0 / cols * 111.32) * np.cos(np.radians(latitudes))
    return np.repeat(row_area[:, None], cols, axis=1)


def drop_small(mask, weights, minimum):
    labels, count = ndimage.label(mask, structure=np.ones((3, 3)))
    if count == 0:
        return mask
    areas = ndimage.sum(weights, labels, range(1, count + 1))
    keep = np.zeros(count + 1, bool)
    keep[1:] = areas >= minimum
    return keep[labels]


def clean(mask, weights):
    """1セルだけの飛び地とピンホールを消す。気候区分はそのままだと胡椒を撒いたようになる。"""
    smoothed = ndimage.median_filter(mask.astype(np.uint8), size=3).astype(bool)
    islands = drop_small(smoothed, weights, MIN_PATCH_KM2)
    return ~drop_small(~islands, weights, MIN_PATCH_KM2)


def rings_of(mask):
    """塗られたセルの外周を、有向の閉路として取り出す。

    角は整数（列, 行）で持つ。度で持つと 0.1 の足し算の誤差で隣のセルと角が
    一致せず、輪がつながらない。
    """
    padded = np.zeros((mask.shape[0] + 2, mask.shape[1] + 2), bool)
    padded[1:-1, 1:-1] = mask
    edges = {}

    def add(start, end):
        if edges.pop((end, start), None) is None:
            edges[(start, end)] = True

    rows, columns = np.where(mask)
    for row, column in zip(rows.tolist(), columns.tolist()):
        if not padded[row, column + 1]:
            add((column + 1, row), (column, row))
        if not padded[row + 2, column + 1]:
            add((column, row + 1), (column + 1, row + 1))
        if not padded[row + 1, column]:
            add((column, row), (column, row + 1))
        if not padded[row + 1, column + 2]:
            add((column + 1, row + 1), (column + 1, row))

    following = {}
    for start, end in edges:
        following.setdefault(start, []).append(end)

    rings = []
    while following:
        start = next(iter(following))
        ring = [start]
        current = start
        while True:
            options = following.get(current)
            if not options:
                break
            nxt = options.pop()
            if not options:
                following.pop(current, None)
            ring.append(nxt)
            current = nxt
            if nxt == start:
                break
        if len(ring) > 3:
            rings.append([(-180.0 + c * STEP, 90.0 - r * STEP) for c, r in ring])
    return rings


def chaikin(ring):
    """角を落とす。閉じた輪なので端の処理は要らない。"""
    points = ring[:-1] if ring[0] == ring[-1] else ring
    out = []
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        out.append((x1 + (x2 - x1) * 0.25, y1 + (y2 - y1) * 0.25))
        out.append((x1 + (x2 - x1) * 0.75, y1 + (y2 - y1) * 0.75))
    return out + [out[0]]


def simplify(ring, epsilon):
    points = ring[:-1] if ring[0] == ring[-1] else list(ring)
    if len(points) < 5:
        return ring
    array = np.array(points)
    far = int(np.argmax(((array - array[0]) ** 2).sum(1)))

    def walk(sequence, coordinates, keep):
        lo, hi = 0, len(sequence) - 1
        stack = [(lo, hi)]
        while stack:
            lo, hi = stack.pop()
            if hi <= lo + 1:
                continue
            (x1, y1), (x2, y2) = sequence[lo], sequence[hi]
            dx, dy = x2 - x1, y2 - y1
            length = (dx * dx + dy * dy) ** 0.5 or 1e-12
            span = coordinates[lo + 1:hi]
            distance = np.abs(dy * span[:, 0] - dx * span[:, 1] + x2 * y1 - y2 * x1) / length
            at = int(np.argmax(distance))
            if distance[at] > epsilon:
                keep.add(lo + 1 + at)
                stack.append((lo, lo + 1 + at))
                stack.append((lo + 1 + at, hi))

    head, tail = points[:far + 1], points[far:] + [points[0]]
    keep_head, keep_tail = {0, far}, {0, len(tail) - 1}
    walk(head, array[:far + 1], keep_head)
    walk(tail, np.array(tail), keep_tail)
    indexes = sorted(set(list(keep_head) + [far + k for k in keep_tail if 0 < k < len(tail) - 1]))
    out = [points[k % len(points)] for k in indexes]
    return out + [out[0]] if len(out) >= 3 else ring


def ring_area_km2(ring):
    total = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        total += math.radians(x2 - x1) * (2 + math.sin(math.radians(y1)) + math.sin(math.radians(y2)))
    return abs(total * 6371.0088 ** 2 / 2)


def signed_area(ring):
    return sum((x2 - x1) * (y2 + y1) for (x1, y1), (x2, y2) in zip(ring, ring[1:])) / 2


def contains(ring, point):
    x, y = point
    hit = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def polygons_from(mask, weights):
    """塊ごとに1つの地物を作る。塊の中の穴は、その地物の内輪にする。"""
    labels, count = ndimage.label(mask, structure=np.ones((3, 3)))
    features = []
    for index in range(1, count + 1):
        blob = labels == index
        area = float(weights[blob].sum())
        rings = []
        for ring in rings_of(blob):
            for _ in range(CHAIKIN_PASSES):
                ring = chaikin(ring)
            rings.append(simplify(ring, SIMPLIFY_DEGREES))
        rings = [ring for ring in rings if len(ring) >= 4]
        if not rings:
            continue
        outer = [ring for ring in rings if signed_area(ring) < 0]
        inner = [ring for ring in rings if signed_area(ring) >= 0]
        if not outer:
            outer, inner = [max(rings, key=ring_area_km2)], []
        # 穴は、それを囲む外輪の下にぶら下げる。
        polygons = [[ring] for ring in sorted(outer, key=ring_area_km2, reverse=True)]
        for hole in inner:
            for polygon in polygons:
                if contains(polygon[0], hole[0]):
                    polygon.append(hole)
                    break
        rows, columns = np.where(blob)
        features.append({
            "area": area,
            "polygons": polygons,
            "centroid": (-180.0 + (columns.mean() + 0.5) * STEP, 90.0 - (rows.mean() + 0.5) * STEP),
        })
    return features


def tier_of(area):
    if area >= WORLD_KM2:
        return 1
    if area >= CONTINENT_KM2:
        return 2
    return 3


def main():
    classes = load_classes()
    if classes is None:
        return 1
    rows, cols = classes.shape
    weights = cell_area_km2(rows, cols)
    print("気候区分 %dx%d（1セル 約%.1f km）" % (cols, rows, (360.0 / cols) * 111.32))

    features = []
    summary = {}
    for reason, members in (("arid_climate", BW_CLASSES), ("semi_arid_climate", BS_CLASSES)):
        mask = clean(np.isin(classes, members), weights)
        for blob in polygons_from(mask, weights):
            tier = tier_of(blob["area"])
            summary.setdefault((reason, tier), []).append(blob["area"])
            coordinates = [[[round(x, COORDINATE_DIGITS), round(y, COORDINATE_DIGITS)] for x, y in ring]
                           for polygon in blob["polygons"] for ring in polygon]
            multi = [[[[round(x, COORDINATE_DIGITS), round(y, COORDINATE_DIGITS)] for x, y in ring]
                      for ring in polygon] for polygon in blob["polygons"]]
            features.append({
                "type": "Feature",
                "centroid": blob["centroid"],
                "properties": {
                    "why": reason,
                    "tier": tier,
                    "km2": int(round(blob["area"])),
                },
                "geometry": {"type": "MultiPolygon", "coordinates": multi} if len(multi) > 1
                else {"type": "Polygon", "coordinates": coordinates},
            })

    # id は中心の緯度経度から作る。通し番号にすると、しきい値を少し変えて
    # 焼き直すたびに全部ずれて、共有URLとミッションのEvidenceが別の場所を指す。
    features.sort(key=lambda feature: -feature["properties"]["km2"])
    used = set()
    for feature in features:
        longitude, latitude = feature["centroid"]
        prefix = "arid" if feature["properties"]["why"] == "arid_climate" else "semi"
        base = "%s-%s%02d%s%03d" % (prefix, "n" if latitude >= 0 else "s", abs(round(latitude)),
                                    "e" if longitude >= 0 else "w", abs(round(longitude)))
        identifier, suffix = base, 1
        while identifier in used:
            suffix += 1
            identifier = "%s-%d" % (base, suffix)
        used.add(identifier)
        feature["properties"]["id"] = identifier
        del feature["centroid"]

    geojson = {
        "type": "FeatureCollection",
        "metadata": {
            "source": "Köppen-Geiger climate classification 1991-2020 (Beck et al. 2023), 0.1 degree",
            "sourceUrl": "https://doi.org/10.6084/m9.figshare.21789074",
            "license": "CC BY 4.0 (Beck, H.E. et al. 2023, Scientific Data 10, 724)",
            "note": ("Contiguous areas of Köppen class B, traced from the 0.1 degree grid and "
                     "generalised. arid_climate = BW, semi_arid_climate = BS. 1991-2020 normals, "
                     "not current drought."),
        },
        "features": features,
    }
    text = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    io.open(OUTPUT, "w", encoding="utf-8").write(text)

    print()
    for reason in ("arid_climate", "semi_arid_climate"):
        for tier, label in ((1, "世界"), (2, "大陸"), (3, "国")):
            areas = summary.get((reason, tier), [])
            if areas:
                print("  %-18s %s %2d件  最大 %11s km2  最小 %10s km2"
                      % (reason, label, len(areas), "{:,.0f}".format(max(areas)), "{:,.0f}".format(min(areas))))
    total = sum(f["properties"]["km2"] for f in features)
    points = sum(len(ring) for f in features for ring in
                 (f["geometry"]["coordinates"] if f["geometry"]["type"] == "Polygon"
                  else [r for p in f["geometry"]["coordinates"] for r in p]))
    print()
    print("面 %d / 頂点 %d / 合計 %s km2" % (len(features), points, "{:,}".format(total)))
    print("arid-regions.geojson %s B" % "{:,}".format(len(text.encode("utf-8"))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
