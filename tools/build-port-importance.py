#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""港の表示重要度を焼く。Phase 1 は container 軸のみ。

オフライン専用。CI では回さない。外部データはリポジトリに入れず、
ここで作った小さな派生値だけが public/geo/major-ports.geojson に残る。

    pip install openpyxl
    mkdir -p .cache/ports
    curl -L -o .cache/ports/wpi.csv \
      "https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/UpdatedPub150.csv"
    curl -L -o .cache/ports/cppi-2024.xlsx \
      "https://openknowledge.worldbank.org/bitstreams/6d1086f0-13ed-4d69-92ad-11d93f3e7df6/download"
    python tools/build-port-importance.py

npm run data:geo -- major-ports を回すとこの派生値は消える。build-geo.mjs の after フックが
呼び直し、それを素通りしても npm run build が verify-ports-importance.mjs で落ちる。

なぜ必要か（2026-09-13 の実測）:
  Natural Earth の港 scalerank は貨物量ではない。最強の rank 3（67点）には
  上海・シンガポール・寧波・ロッテルダムが1つも入らず、代わりに Cabo San Lucas や
  Gythion（人口4,500人）といった客船の寄港地が並ぶ。
  そのうえ釜山・ポートクラン・タンジュンペラパスは点そのものが無い。
  元データの属性は6つだけで、取扱量も規模も国名も入っていない。

軸について:
  重要度を1つの数に畳まない。container / bulk / energy / connectivity を別々に持ち、
  どれも見た目（色・形）には出さない。軸が決めるのは「どの段に入るか」と
  「地点カードで何と説明するか」だけ。見た目に効くのは tier だけ。
  Phase 1 は container 軸のみ。bulk と energy が入るまで世界段は完成ではない。

補完について:
  外部の明示的な基準を満たすのに Natural Earth に無い港は、出典付きで足す。
  基準を満たすものは全部足す。選ばない。
    (1) World Shipping Council の Top 50 に入っている
    (2) World Bank / S&P の CPPI 2024 の403港に入っている
  座標は World Port Index（パブリックドメイン）か Wikidata（CC0）から引き、
  どちらから引いたかを点ごとに残す。

出典:
  World Shipping Council, The Top 50 Container Ports (2024)
  World Bank & S&P Global, Container Port Performance Index 2024, CC BY 3.0 IGO
  NGA World Port Index (Pub 150), public domain
  Wikidata, CC0
"""
import csv
import io
import json
import math
import os
import re
import sys
import unicodedata

REPOSITORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTS_GEOJSON = os.path.join(REPOSITORY, "public", "geo", "major-ports.geojson")
DATA = os.path.join(REPOSITORY, "tools", "data")
CACHE = os.path.join(REPOSITORY, ".cache", "ports")

# 同じ港湾集積が Natural Earth 側で複数点に割れている（ロッテルダムは Europoort /
# Rotterdam / Dordrecht の3点）。ここまでは「同じ港」とみなして足さない。
#
# 距離だけでは決まらなかった。実測で、タンジュンペラパスはシンガポールの 20.1 km 先に
# あるが別の国の別の港で、天津は既存の「Tianjin」の 32.8 km 先にある同じ港
# （Natural Earth が市街を、World Port Index が新港を指している）。
# なので距離に加えて、名前が一致する場合だけ遠くまで同じ港とみなす。
SAME_PORT_KM = 20.0
SAME_NAME_KM = 45.0


def normalise(name):
    text = unicodedata.normalize("NFKD", str(name or "")).encode("ascii", "ignore").decode().lower()
    text = re.sub(r"\b(port of|port|harbor|harbour|gang|the)\b", " ", text)
    return re.sub(r"[^a-z]", "", text)


def distance_km(lon_a, lat_a, lon_b, lat_b):
    return math.hypot((lon_a - lon_b) * math.cos(math.radians(lat_b)) * 111.0, (lat_a - lat_b) * 111.0)


def load_world_port_index():
    """座標の住所録としてだけ使う。Harbor Size は重要度に使わない。

    2026-09-13 の実測で、寧波舟山（世界3位）が Small、ロッテルダムが Very Small、
    天津が Very Small になった。水面の広さの分類であって取扱量ではない。
    """
    path = os.path.join(CACHE, "wpi.csv")
    rows = list(csv.DictReader(io.open(path, encoding="utf-8-sig")))
    by_name, by_locode = {}, {}
    for row in rows:
        try:
            lon, lat = float(row["Longitude"]), float(row["Latitude"])
        except (TypeError, ValueError):
            continue
        for label in (row["Main Port Name"], row["Alternate Port Name"]):
            key = normalise(label)
            if key:
                by_name.setdefault(key, (lon, lat, row["Main Port Name"]))
        locode = (row["UN/LOCODE"] or "").replace(" ", "").strip()
        if locode:
            by_locode.setdefault(locode, (lon, lat, row["Main Port Name"]))
    return by_name, by_locode


def load_container_axis():
    snapshot = json.load(io.open(os.path.join(DATA, "wsc-top50-container-ports-2024.json"), encoding="utf-8"))
    aliases = json.load(io.open(os.path.join(DATA, "port-location-aliases.json"), encoding="utf-8"))
    return snapshot, aliases


def load_cppi():
    import openpyxl
    workbook = openpyxl.load_workbook(os.path.join(CACHE, "cppi-2024.xlsx"), read_only=True, data_only=True)
    rows = list(workbook["Annex"].iter_rows(values_only=True))
    header = [str(cell) for cell in rows[0]]
    return [dict(zip(header, row)) for row in rows[1:]]


def resolve_location(name, aliases, wpi_by_name):
    """世界段の港の座標を引く。引いた先を出典として返す。"""
    alias = aliases["aliases"].get(name)
    if alias and alias["via"] == "wikidata":
        coordinates = aliases["wikidataCoordinates"].get(alias["key"])
        if coordinates:
            return coordinates[0], coordinates[1], "wikidata", alias["key"]
    lookup_keys = [normalise(alias["key"])] if alias and alias["via"] == "wpi" else []
    lookup_keys.append(normalise(name))
    lookup_keys += [normalise(part) for part in re.split(r"[,/()]", name)]
    for key in lookup_keys:
        if key and key in wpi_by_name:
            lon, lat, matched = wpi_by_name[key]
            return lon, lat, "world-port-index", matched
    return None


def main():
    geojson = json.load(io.open(PORTS_GEOJSON, encoding="utf-8"))
    features = geojson["features"]
    # 前回足した点を落としてから作り直す。二重に足さないため。
    features = [f for f in features if not f["properties"].get("added")]

    wpi_by_name, wpi_by_locode = load_world_port_index()
    snapshot, aliases = load_container_axis()
    cppi = load_cppi()

    def same_port(lon, lat, name):
        """既にある点と同じ港か。距離が近いか、名前が同じで中距離なら同じ港。"""
        key = normalise(name)
        best = None
        for feature in features:
            fx, fy = feature["geometry"]["coordinates"][:2]
            if abs(fx - lon) > 1.0 or abs(fy - lat) > 1.0:
                continue
            gap = distance_km(lon, lat, fx, fy)
            limit = SAME_NAME_KM if normalise(feature["properties"].get("name")) == key else SAME_PORT_KM
            if gap <= limit and (best is None or gap < best[0]):
                best = (gap, feature)
        return best

    added, unresolved = [], []

    # --- container 軸 (1) 世界: World Shipping Council Top 50 ---------------
    for port in snapshot["ports"]:
        located = resolve_location(port["name"], aliases, wpi_by_name)
        if not located:
            unresolved.append(port["name"])
            continue
        lon, lat, location_source, matched = located
        axis = {
            "a": "container", "v": port["teuMillion2024"], "u": "MTEU",
            "y": 2024, "r": port["rank"], "s": "wsc-top50-2024",
        }
        near = same_port(lon, lat, port["name"])
        if near:
            near[1]["properties"].setdefault("ax", []).append(axis)
            near[1]["properties"]["tier"] = 1
        else:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(lon, 4), round(lat, 4)]},
                "properties": {
                    "name": port["name"], "featurecla": "Port", "scalerank": 3, "natlscale": 75,
                    "ne_id": None, "website": None,
                    "tier": 1, "ax": [axis],
                    "added": "wsc-top50-2024", "addedFrom": location_source, "addedAs": matched,
                },
            })
            added.append((port["name"], "world", location_source))

    # --- container 軸 (2) 大陸: CPPI 2024 の403港 --------------------------
    for row in cppi:
        locode = (row["LOCODE"] or "").replace(" ", "").strip()
        located = wpi_by_locode.get(locode)
        if not located:
            continue
        lon, lat, matched = located
        axis = {"a": "container", "u": "roster", "y": 2024, "s": "cppi-2024", "locode": locode}
        near = same_port(lon, lat, row["Port"])
        if near:
            properties = near[1]["properties"]
            properties.setdefault("ax", []).append(axis)
            properties["tier"] = min(properties.get("tier", 3), 2)
        else:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(lon, 4), round(lat, 4)]},
                "properties": {
                    "name": row["Port"], "featurecla": "Port", "scalerank": 5, "natlscale": 30,
                    "ne_id": None, "website": None,
                    "tier": 2, "ax": [axis],
                    "added": "cppi-2024", "addedFrom": "world-port-index", "addedAs": matched,
                },
            })
            added.append((row["Port"], "continent", "world-port-index"))

    # --- 残りは国段 --------------------------------------------------------
    for feature in features:
        feature["properties"].setdefault("tier", 3)

    geojson["features"] = features
    text = json.dumps(geojson, ensure_ascii=False, separators=(",", ":"))
    io.open(PORTS_GEOJSON, "w", encoding="utf-8").write(text)

    tiers = {1: 0, 2: 0, 3: 0}
    for feature in features:
        tiers[feature["properties"]["tier"]] += 1
    print("港 %d 点（うち補完 %d 点）" % (len(features), len(added)))
    print("  世界 %d / 大陸 %d / 国 %d" % (tiers[1], tiers[2], tiers[3]))
    print("  major-ports.geojson %d B" % len(text.encode("utf-8")))
    if added:
        print("  補完した点:")
        for name, tier, source in added:
            print("    %-34s %-10s %s" % (name, tier, source))
    if unresolved:
        print("  !! 座標を引けなかった世界段の港: %s" % ", ".join(unresolved))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
