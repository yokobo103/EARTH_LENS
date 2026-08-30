# AGENTS.md

## このプロジェクト

- 名前: `EARTH LENS v0.3 — Physical Earth Foundation`
- 目的: EARTH → RESOURCES → HUMAN → POWERの関係をLensとMissionで発見する3D地球観測装置を検証する。
- 正本: `src/` と `README.md`
- 主な実行入口: `npm run dev`
- HQ台帳名: `20260827_EARTH_LENS`

## 基本ルール

- 親ディレクトリの `AGENTS.md` と `_LAB_HQ/AGENTS.md` に従う。
- v0.3のPhysical Earth基盤とMission 01〜03を優先し、バックエンド、LLM、ライブデータを追加しない。
- ライセンス不明の地図・GISデータをスクレイピング、トレース、転載しない。
- 海底ケーブルはendpoint中心の模式的な接続データとして扱い、実敷設経路を表現しない。
- ユーザー差分や既存成果物を勝手に削除、移動、改名しない。

## 触ってよい範囲

- `src/` — アプリ、Lens、デモデータ、UI
- ルート設定ファイルと `README.md` — ビルド、品質検査、説明

## 実行・検証

```text
セットアップ: npm install
通常実行:     npm run dev
lint:         npm run lint
型検査:       npm run typecheck
ビルド:       npm run build
```

- UI・3Dはコマンド検査だけで完了にせず、実ブラウザ表示をAI側で確認する。
- `node_modules/` と `dist/` は生成物でありGit対象外。

## このrepo固有ルール

- 新Lensは共通定義とregistryを通じて追加し、個別LensをAppへベタ書きしない。
- provenance（source、URL、license、updated、confidence、demo/real）を失わない。
- cableの `routeType` はv0.1では `schematic` のみ。UIで実経路ではないことを明示する。
- Missionはdata → engine → effect renderer → UIを分離し、Mission固有条件をAppへ増殖させない。
- Shipping Activityは模式表現のみとし、実航路を再現しない。
- 英語・日本語のUI文言は`src/i18n/`で管理し、データ出典名とLicense原文は改変しない。
