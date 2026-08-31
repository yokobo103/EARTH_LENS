# EARTH LENS v0.4 — Mission Passport Prototype

異なるデータLensを同じ地球へ重ね、世界の構造や場所の意味を発見するための実験的3D globeです。

単に世界地図を見るのではなく、接続・戦略・資源など別々の情報源を同じ場所で比較し、「なぜこの場所は重要なのか」「何が同じ場所へ集中しているのか」をユーザー自身が調べる地球理解装置を目指しています。

## Core idea — EARTH → RESOURCES → HUMAN → POWER

EARTH LENSが観察するのは、Featureの一覧ではなく、地球の物理条件から戦略的重要性が生まれるまでの構造です。

```text
EARTH
地形・海・気候など、地球そのものが制約をつくる
  ↓
RESOURCES
その条件の中で資源が偏って存在する
  ↓
HUMAN
人間が都市・物流・インフラを構築する
  ↓
POWER
流れや機能の集中から、特定地点に戦略的重要性が生まれる
```

EXPLOREはこの因果の層を自由に重ねる観測モードです。MISSIONは地理当てではなく、好きなLensを観測道具として使い、世界の場所を発見して旅の記録を持ち帰る探索モードです。EARTH LENSは「世界の答えを教えるアプリ」ではなく、「世界を見る方法を増やす装置」を目指します。

## Lens taxonomy

すべてのLensは次の4カテゴリのいずれかを保持します。

- `earth` — Terrain、Physical Features、河川、海峡、プレートなど物理的制約
- `resources` — Critical Minerals、エネルギー、水、農地など偏在する資源
- `human` — 都市、港、Shipping、Cable、鉄道など人間が構築した流れ
- `power` — Chokepoint、国境、軍事、戦略インフラなど集中から生まれる力

UIもこの順序でLensを表示します。カテゴリは説明上の固定因果をFeatureへ埋め込むものではなく、観測の入口です。

## Current prototype

v0.4はPhysical Earth基盤とNatural Earth由来の国境Lensを維持しつつ、MISSIONを「問題一覧」から「世界旅行のPassport」へ再設計しています。Terrain比較とライセンス調査は[`docs/terrain-technical-note-v0.3.md`](docs/terrain-technical-note-v0.3.md)に記録しています。Cesium ion、実標高geometry、GEBCO tile化は使用しません。

- EXPLORE / MISSIONのモード切替
- EN / 日本語の表示切替（選択はブラウザへ保存）
- 地域別の見開きMISSION PASSPORTと、モバイル向け1ページ縦表示
- Mission 01〜08（Malacca / Himalayas / Hormuz / Suez / Rotterdam / Gibraltar / Lithium Triangle / East African Rift）
- すべてのMissionを`globe click → candidate coordinates → submit location`へ統一
- 全LensをMission開始時から自由にON/OFFできる観測ツールキット
- 地表をクリックし、確認してから回答するObservation Point
- 不正解後も探索を継続できる距離判定
- Text / Camera Focus / Region Signalを順番に使う3段階Hint（Lens unlockなし）
- 汎用座標・半径から描画する淡いRegion Signal pulse
- Hint使用数によるS/A/B/C Rankと回答回数
- 正解後の短いEvidence、Travel Sticker獲得、Passportへ貼るCSS演出
- localStorageへcompletion / best rank / best hints / attempts / completed dateを保存
- 取得済みStickerからのMission replayと、再挑戦時のbest rank更新

既存EXPLOREでは以下を使用できます。

- APIキー不要で回転・ズームできるCesiumJS 3D globe
- Natural Earth II shaded reliefを読みやすく調整するTerrain Lens
- NSIDC Sea Ice Index v4の1981–2010年中央値から、南北両極の冬／夏の海氷縁を比較する「凍る海」Lens
- Natural Earth 1:50mの242か国を塗らずに重ねるCountry Borders Lens
- 物理的役割を持つ11件の概略Physical Features
- 遠距離ではsignal、近距離で名称を出すNatural Earth 1:10mの1,081港
- endpointからコード生成する6本のSchematic Shipping Flow
- manifest / registry / rendererで分離したLayer system
- endpointから描画時に生成するDemo submarine cable connections
- Strategic chokepoints 6地点
- 5か国のDemo critical minerals観測カラム
- Feature clickとData Provenance表示
- 任意地点クリックと緯度・経度取得
- 500 km圏をLens横断検索するWHY HERE?
- PRESENT / 250 MaのDeep Time UI prototype
- `PaleoEarthProvider`を差し替え可能にした模式古地球

WHY HERE?は近傍Evidenceを構造化するところまでです。AI/LLMによる解釈は行いません。

### Further reading

展開したFeatureまたはLensの詳細には、データの出典（`source`）とは別に、理解を深めるための外部案内を表示します。案内はこのアプリの根拠や取り込みデータではなく、要約・転載・計測は行いません。リンクの到達確認はアプリ実行時にはせず、必要なときに `npm run check:links` を手動で実行します。

## Language support

ヘッダーの`EN / 日本語`で、Explore、Mission、Hint、Details、WHY HERE?、Deep Timeの表示言語を切り替えられます。切替時もMission進行、Hint使用数、選択地点は維持され、選択言語はブラウザへ保存されます。

Source、License、データセット固有名は出典の同一性を保つため原文を維持します。UI、Lens名、地名、Feature説明、Confidenceは日本語表示へ変換します。外部i18nライブラリは追加していません。

## Mission Passport architecture

MissionはAppやCesium rendererへ固有条件を直書きせず、次の流れへ分離しています。

```text
mission data
  ↓
mission engine        — hint順序・地点距離・attempt・rank
  ↓
generic hint effects  — text / camera focus / region signal
  ↓
Cesium overlays + Mission field
  ↓
progress store        — localStorage / best result
  ↓
Passport + Sticker collection
```

Mission 01〜08の定義は`src/missions/catalog.ts`、共通状態遷移は`src/missions/engine.ts`、保存は`src/missions/progressStore.ts`、Cesium効果は`src/missions/effects/`です。Mission固有のrenderer条件分岐は持ちません。

Mission typeは回答方式ではなく考え方を分類します。現在は`bottleneck | barrier | gateway | shortcut | hub | resource | terrain`を使用し、回答方式はすべてLocationです。

Mission rewardはLens unlockではありません。Lensは観測道具として最初から利用でき、達成報酬は場所固有のTravel Stickerです。現在のMission 01〜08は、プロジェクトオーナー提供のコンセプトシートから透明背景WebPへ切り出したartworkを`src/assets/stickers/`から表示します。未取得Missionは答えを隠すため、従来のMission番号・地理icon・silhouetteによるCSS placeholderを維持します。

`tools/build-stickers.py <owner-supplied-sheet.jpg>`でruntime用WebPを再生成できます。元シートは公開bundleへ含めません。コンセプトシート上のLithium / RiftはMISSION 08 / 09表記ですが、現行catalogでは07 / 08のため、artworkを描き換えずUIのcanonical number tabで覆います。

将来候補（今回は実装しないものを含む）:

- `barrier` — なぜ地域間の物流・人口移動が少ないのかを物理障壁から探る
- `compare` — 2地域を同じ条件で比較する
- `route` — 資源をAからBへ運ぶ経路を考える
- `alternative` — Chokepointが利用不能な場合の別地点を観察する
- `identify-lens` — 分布だけからLensを推理する
- `time` — 現在の地形・資源分布をDeep Timeから考える

Shippingは発明した抽象anchor間をコードで補間する観測用デモです。実船舶、実航路、商用データは使わず、画面にも`SCHEMATIC ACTIVITY / DEMO DATA / NOT ACTUAL SHIPPING ROUTES`と表示します。

## Terrain implementation

Terrain Lensは実標高geometryではありません。Cesium同梱のNatural Earth II imageryへ、低彩度・中程度のcontrast・brightness / gamma調整を適用し、山脈、高原、砂漠、海岸線、大陸配置を読みやすくします。

- provider境界: `TerrainObservationProvider`
- 現在の実装: `NaturalEarthReliefProvider`
- 表示分類: `visual-relief`
- UI表示: `SHADED RELIEF / NO ELEVATION GEOMETRY`
- source / license: Natural Earth II / Public Domain

将来のCesium World Terrainやself-hosted terrainはこの境界の差し替え候補ですが、v0.3では実装しません。vertical exaggerationも使用しません。

## Data inventory

| Lens | 内容 | 分類 | Source / License |
| --- | --- | --- | --- |
| Terrain | Natural Earth II shaded reliefの視覚調整 | `real + derived` | Natural Earth II / Public Domain |
| Physical Features | 11件の代表中心と概略footprint | `demo + derived + schematic` | Project-authored demo / no external geometry |
| Sea Ice | 南北両極の冬／夏の1981–2010月別中央値の海氷縁 | `real + derived` | NSIDC Sea Ice Index v4 / free and open use; citation required |
| Ports | 1,081件の港湾point | `real + derived` | Natural Earth 1:10m Ports / Public Domain |
| Shipping | 地域endpointから生成する6模式flow | `demo + derived + schematic` | Project-authored demo / no external route geometry |
| Country Borders | 242か国の簡略化outline | `real + derived` | Natural Earth 1:50m Admin 0 / Public Domain |

## Geographic data import

国境・港湾・海氷データは`src`へimportせず、生成済みの`public/geo/*.geojson`を各Lensが初回ON時に`fetch`します。これによりデータ本体を初期JavaScript bundleへ含めず、通常の`dev`と`build`はネット接続なしで動きます。国境の`NAME_JA`は配布データに含まれていることを実測済みで、日本語表示では手書き辞書の次に利用します。

再生成時だけ次を実行します。引数なしは全レイヤー、ID指定は1レイヤーだけを更新します。

```bash
npm run data:geo
npm run data:geo -- admin0-countries
npm run data:geo -- major-ports
npm run data:geo -- sea-ice-edges
```

`tools/build-geo.mjs`のレイヤーテーブルだけが公式配布へアクセスし、生データを`.cache/geo/`へ置きます。加工にはmapshaper 0.7.55（MPL-2.0）とadm-zip（MIT）を開発時だけ使用します。出力・解決済みURL・利用条件・加工内容・サイズは[`public/geo/README.md`](public/geo/README.md)へ自動記録します。既存の国境出力は再生成前後のbyte一致を検査し、不一致なら上書きしません。

Sea Ice LensはNSIDC Sea Ice Index v4（G02135）の1981–2010年月別中央値polylineを使用します。北半球は3月＝冬／9月＝夏、南半球は9月＝冬／3月＝夏として統合し、各極投影で25 km densify後にWGS84へ変換します。表示は観測された中央値の「縁」と薄いhaloであり、面積値、現在の海氷、航行可否を表しません。引用: Fetterer et al. (2025), DOI `10.7265/a98x-0f50`。

国境はNatural Earthの編集判断を反映するもので、国家・領域の承認を表明するものではありません。この注記はCountry BordersのFeature Detailsからも確認できます。

ShippingとCableは保存済み実経路を持ちません。どちらもendpointからgeodesicを生成し、Shippingは太い半透明amber帯＋破線、Cableは細いcyan networkとして区別します。

## Run locally

Node.js 22以降を推奨します。

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。Cesium Ion tokenや有料GIS APIは不要です。背景にはCesium同梱のNatural Earth IIを使用します。

## Mobile Phase 1

幅820px以下では、地球を全画面のまま保ち、既存のLens / Details / TimeまたはMission / Observationを1枚のbottom sheetへ収めます。sheetは初期状態で閉じ、Feature・地点の選択時だけ対応タブを自動で開きます。独立したモバイル用パネルやデータコピーは持ちません。

- tap target: 原則44×44px以上
- 本文・操作ラベル: 10px以上（小型badgeのみ8pxを許容）
- safe area: header / sheet / Passportへ反映
- 375×812と812×375で、sheet閉時のglobe可視率80%以上、開時40%以上を実測
- Viteの相対`base`とdocument-relativeな`CESIUM_BASE_URL`により、GitHub Pagesのサブパス配信へ対応

公開版: [https://yokobo103.github.io/20260827_EARTH_LENS/](https://yokobo103.github.io/20260827_EARTH_LENS/)

品質検査:

```bash
npm run validate:geo
npm run lint
npm run typecheck
npm run build
```

## Lens architecture

Lensは次の責務へ分けています。

```text
source data
  ↓
definition / loader  — provenanceと共通LensFeatureへ正規化
  ↓
registry             — App/Globeが参照するmanifest
  ↓
renderer             — Cesium Entityへの変換
```

新Lens追加の基本手順は以下です。

1. `src/data/`へライセンス確認済みデータを置く。
2. `src/lenses/<lens>/definition.ts`で`EarthLensDefinition`とloaderを作る。
3. `renderer.ts`で`LensRenderHandle`を実装する。
4. `src/lenses/registry.ts`へmoduleを1件追加する。

データ本体やCesium Entity群はReact stateへ詰めず、module-level cacheとglobe rendererで管理します。Lensは最初にONになった時だけload＋renderし、OFFではhandleを保持して非表示にします。React stateはLensのON/OFF、選択Feature、座標、WHY HERE?結果など小さなUI状態だけです。

## Submarine cable policy

このLensは海底ケーブルの実敷設経路を表現しません。

- 主データは`src/data/demo/cable-connections.json`の地域endpointと接続関係です。
- 保存済みLineStringや、既存地図から復元した座標列はありません。
- rendererが2 endpoint間をCesium geodesicで接続します。
- 全Featureは`routeType: "schematic"`、`actualRouteRepresented: false`、`demo: true`です。
- Detailsに`SCHEMATIC ROUTE / NOT ACTUAL CABLE PATH`を表示します。
- WHY HERE?は線との距離ではなく、endpointとの距離で関連connectionを探します。

将来、適切なライセンスの経路データを導入できるよう、`routeType`は`schematic | approximate | actual`を保持できます。

## Data policy

すべてのLensは次のprovenanceを保持できます。

- source / source URL
- license
- updated date
- confidence (`high | medium | low | unknown`)
- demo / real
- classifications (`real | demo | derived | schematic`、複数指定可能)
- temporal mode / range

ライセンス不明のWebデータをスクレイピング、トレース、転載しません。このアプリは「世界の真実」を断定する地図ではなく、「このデータソースでは世界がどう見えるか」を比較する装置です。

Critical Mineralsの値はrenderer検証用に発明した正規化デモ指数で、実生産量、埋蔵量、国別順位ではありません。USGS Mineral Commodity Summariesは将来のデータ交換先を示す参照です。

## Deep Time policy

250 Ma表示は科学的復元ではありません。`DemoPaleoEarthProvider`が返す手続き生成の一塊を使い、時間モード切替の体験だけを検証します。画面にも`SCHEMATIC LANDMASS · NOT A SCIENTIFIC RECONSTRUCTION`と表示します。

`PaleoEarthProvider#getSnapshot(ageMa)`を、将来GPlates、pyGPlates、EarthByteモデル、GPlates Web Serviceなどの適法なproviderへ差し替える想定です。

## Future bathymetry

GEBCOは将来の`BATHYMETRY / OCEAN FLOOR` Lens候補として記録します。陸上の物理地理を読む`TERRAIN`とは分離し、v0.3ではdownload、変換、downsample、tile化、配信を行いません。

## Known compromises in v0.4

- Chokepointsは操作検証用の概略中心点で、航行・安全用途には使えません。
- Cable connectionsは実在システム、所有者、容量、landing station、海底経路を表しません。
- Mineralsは国境Polygonではなく国代表点の3Dカラムです。
- WHY HERE?はPoint/endpointにはHaversine距離、areaにはray castingの内外判定と局所平面近似による最近傍辺距離を使います。航法・測量用途の精密GIS演算ではありません。
- Cesiumを単一bundleで読み込むため、初期JavaScriptは大きめです。
- 250 MaはUI予告であり、plate reconstructionではありません。
- Mission正解は海峡Polygonではなく代表座標から500 km以内の距離判定です。手動探索で海峡西側を選んでも意図が通る幅へ調整しています。
- Shipping ActivityとRegional Signalは探索体験用の模式表現で、交通量や地理的影響範囲を定量化していません。
- Mission中の選択地点と開示中Hintはページ再読み込みでリセットされますが、完了記録、best rank、best hint数、累積attemptはブラウザへ保存します。account / cloud syncはありません。
- 完成済みMissionはオーナー提供画像由来のWebP artwork、未取得MissionはCSS silhouetteです。画像の外部配布元や第三者権利は独立検証していないため、公開利用の根拠はオーナーからの明示的な利用依頼です。
- Terrain Lensはimagery調整であり、標高値、斜面、可視遮蔽、3D地形geometryを提供しません。
- Physical Featureのellipseは概略footprintで、実測境界や地質Polygonではありません。
- PortsはNatural Earthの実在港湾pointですが、港湾施設やterminal境界、処理能力、稼働状況、通年の無氷性は示しません。
- Sea Iceは1981–2010年の月別中央値の縁で、特定年・現在の海氷分布、氷厚、航行安全を示しません。ゾーンは夏／冬の縁の相対関係を読む凡例で、塗りPolygonを捏造していません。
- Shippingは交通量を符号化せず、実AIS・実航路・通航頻度を表しません。
- Lens数増加に伴い、左パネルは縦スクロールになります。全球距離では通常ラベルを抑制しますが、近距離の複数Lens重畳では記号競合が残ります。

## Main structure

```text
src/
  app/App.tsx
  i18n/
    types.ts
    copy.ts
    domain.ts
  globe/
    EarthGlobe.tsx
    cesium/createViewer.ts
    cesium/labelVisibility.ts
  lenses/
    types.ts
    registry.ts
    dataStore.ts
    submarine-cables/
    chokepoints/
    critical-minerals/
    terrain/
    physical-features/
    sea-ice/
    ports/
    shipping/
    borders/
  data/demo/
    cable-connections.json
    chokepoints.geojson
    critical-minerals.geojson
    physical-features.json
    shipping-connections.json
  temporal/
    types.ts
    TimeController.ts
    PaleoEarthProvider.ts
    DemoPaleoEarthProvider.ts
  why-here/
    analyzeLocation.ts
    types.ts
  components/
    LayerPanel.tsx
    DetailsPanel.tsx
    Timeline.tsx
    WhyHerePanel.tsx
    mission/
      MissionPanel.tsx
      MissionObservationPanel.tsx
      MissionEffectsReadout.tsx
      MissionResultPanel.tsx
      MissionPassport.tsx
      MissionStickerBadge.tsx
  missions/
    types.ts
    registry.ts
    catalog.ts
    engine.ts
    progressStore.ts
    effects/
public/
  geo/admin0-countries.geojson
  geo/major-ports.geojson
  geo/sea-ice-median-edges.geojson
tools/
  build-geo.mjs
```
