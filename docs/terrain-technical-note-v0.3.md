# Terrain technical note — v0.3

調査日: 2026-08-29

## 結論

CesiumJSで全球の実標高geometryを扱う標準的な方法はCesium World Terrainですが、Cesium ionアカウントとaccess tokenが必要です。APIキーなしで実標高を配信するには、Cesium terrain形式の`layer.json`とtile群を自前で生成・配信する基盤が必要です。

このため、v0.3のSTOP条件「API key必須」または「巨大な追加インフラ必須」に該当し、一度実装を停止しました。その後、Natural Earth II shaded reliefを使うkeyless方式が採択されました。v0.3では実標高geometry、Cesium ion、GEBCO tile化を使用しません。

実装は`TerrainObservationProvider`を最小境界とし、現在は`NaturalEarthReliefProvider`がimageryのbrightness / contrast / saturation / gammaを切り替えます。TerrainはLens Registryではなく、ツール内の「地球の見た目」設定として既定ONで提供します。UIには`SHADED RELIEF / NO ELEVATION GEOMETRY / NATURAL EARTH · PUBLIC DOMAIN`を表示します。

## 候補比較

| 方式 | 実標高geometry | API / account | License / provenance | Offline / local | Bundle・性能 |
| --- | --- | --- | --- | --- | --- |
| Cesium World Terrain | あり | Cesium ion accountとaccess tokenが必要 | Cesium ion提供条件に従う | 標準構成では不可 | frontend bundle増は小さいがnetwork配信が必要 |
| Self-hosted Cesium terrain tiles | あり | runtime keyは不要 | 原データと生成物の条件に依存 | 可能 | `layer.json`とquantized-mesh / heightmap tilesの生成・保存・配信が必要 |
| GEBCO_2026を自前変換 | 陸・海底標高の原データになり得る | download自体に有料APIは不要 | Public domain。出典表記、非推奨用途・品質差の明記が必要 | 前処理後は可能 | 全球15 arc-second gridを直接frontendへ入れられない。downsample・tile化・配信が必要 |
| Natural Earth II shaded relief | なし（画像表現） | 不要 | Natural Earth raster/vectorはPublic Domain | Cesium同梱assetで可能 | 追加bundleほぼなし。現行globeと同程度 |

## Cesiumとの統合上の事実

- `CesiumTerrainProvider`はCesium terrain serverのURLから`layer.json`とtileを読みます。quantized-meshとheightmapを扱えます。
- `Terrain.fromWorldTerrain()` / Cesium World TerrainはCesium ionを利用し、ion APIはaccess tokenで認証します。
- 現在使用中のNatural Earth IIはshaded-relief imageryであり、標高geometryではありません。カメラや地表へのocclusionは楕円体のままです。

## データ候補

### Natural Earth

- 公式Termsではraster / vectorともPublic Domainです。
- v0.3のkeyless代替では、同梱Natural Earth II imageryを物理地形の読み取り用に強調できます。
- ただし表示には`SHADED RELIEF`、`NO ELEVATION GEOMETRY`を明記し、Terrain geometryと誤認させません。

### GEBCO

- GEBCO_2026 Gridは2026-04-23公開の全球陸海標高モデルで、15 arc-second gridです。
- Public Domainですが、出典表記、品質・解像度が場所により異なること、航海用途ではないことの明記が必要です。
- v0.3で全球gridを直接同梱しません。導入する場合は別工程でdownsample / tiles / limited resolutionを設計します。

## 選択肢

### A — Keyless shaded-relief appearance（推奨）

現行Natural Earth IIを活用し、Earth Appearance設定ON時にimageryのcontrast / saturation、globe lightingなどを調整します。物理地形の読み取りを改善しますが、実標高geometryやvertical exaggerationは提供しません。

表示:

- `SHADED RELIEF`
- `NO ELEVATION GEOMETRY`
- `PUBLIC DOMAIN · NATURAL EARTH`

### B — Cesium World Terrain

ユーザー提供のCesium ion tokenをruntime設定から読み込み、実標高を表示します。実装量は少ない一方、外部アカウント、token管理、network依存が増えます。

### C — Self-hosted terrain pipeline

GEBCO等をdownsampleし、Cesium terrain tilesへ変換・配信します。keyless runtimeは可能ですが、データ処理、容量、hosting、更新運用を含む独立プロジェクト規模です。v0.3には推奨しません。

## Sources

- [CesiumJS CesiumTerrainProvider](https://cesium.com/learn/cesiumjs/ref-doc/CesiumTerrainProvider.html)
- [Cesium ion access tokens](https://cesium.com/learn/ion/cesium-ion-access-tokens/)
- [CesiumJS quickstart](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)
- [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/)
- [GEBCO gridded bathymetry data](https://www.gebco.net/data-products/gridded-bathymetry-data)
- [GEBCO terms of use](https://www.gebco.net/data-products/gridded-bathymetry/terms-of-use)
