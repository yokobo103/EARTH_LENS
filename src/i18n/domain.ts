import type { EarthLensDefinition, LensDataset, LensFeature } from "../lenses/types";
import type { EarthMission } from "../missions/types";
import type { WhyHereNearbyFeature } from "../why-here/types";
import type { Locale } from "./types";

const lensJa: Record<string, { name: string; category: string; legends: string[] }> = {
  "terrain-relief": { name: "地形・起伏", category: "地球", legends: ["陰影起伏表現"] },
  "physical-features": { name: "主要物理地形", category: "地球", legends: ["障壁・高原", "回廊・狭窄部"] },
  "major-ports": { name: "主要港湾", category: "人間活動", legends: ["港湾シグナル"] },
  "shipping-flows": { name: "海上物流フロー", category: "人間活動", legends: ["模式フロー"] },
  "submarine-cable-connections": { name: "海底通信接続", category: "人間活動", legends: ["模式ルート", "地域エンドポイント"] },
  "strategic-chokepoints": { name: "戦略的チョークポイント", category: "戦略・権力", legends: ["戦略的通過地点"] },
  "critical-minerals": { name: "重要鉱物", category: "資源", legends: ["国別デモ指数", "高さ = 正規化指数"] },
  "admin0-borders": { name: "国境", category: "戦略・権力", legends: ["国境線"] },
};

const featureJa: Record<string, { name: string; description?: string }> = {
  himalayas: { name: "ヒマラヤ山脈", description: "南アジアと中央アジアの間に大きな物理障壁をつくる高山系。" },
  "tibetan-plateau": { name: "チベット高原", description: "ヒマラヤに接し、流域と移動を形づくる広大な高原。" },
  andes: { name: "アンデス山脈", description: "南アメリカ西縁に沿って延びる長大な山岳障壁。" },
  "rocky-mountains": { name: "ロッキー山脈", description: "北米西部を南北に延びる主要な山岳系。" },
  alps: { name: "アルプス山脈", description: "限られた回廊や峠で横断されるヨーロッパの山岳障壁。" },
  "zagros-mountains": { name: "ザグロス山脈", description: "イラン高原西側に沿って明瞭な障壁をつくる山岳帯。" },
  sahara: { name: "サハラ砂漠", description: "居住・インフラ・陸上移動を制約する広大な乾燥地域。" },
  gobi: { name: "ゴビ砂漠", description: "モンゴルから中国北部に広がる大規模な乾燥地域。" },
  "physical-malacca": { name: "マラッカ海峡", description: "マレー半島とスマトラ島の間にある狭い自然海上回廊。" },
  "physical-hormuz": { name: "ホルムズ海峡", description: "ペルシャ湾とオマーン湾を結ぶ狭い自然出口。" },
  "physical-bosporus": { name: "ボスポラス海峡", description: "黒海とマルマラ海を結ぶ狭い自然水路。" },
  "port-singapore": { name: "シンガポール港" },
  "port-shanghai": { name: "上海港" },
  "port-rotterdam": { name: "ロッテルダム港" },
  "port-los-angeles": { name: "ロサンゼルス／ロングビーチ港" },
  "port-busan": { name: "釜山港" },
  "port-jebel-ali": { name: "ジュベル・アリ港" },
  "port-klang": { name: "ポート・クラン" },
  "port-colombo": { name: "コロンボ港" },
  "port-yokohama": { name: "横浜／東京湾" },
  "port-suez": { name: "スエズ／ポートサイド" },
  "port-durban": { name: "ダーバン港" },
  "port-mumbai": { name: "ムンバイ／ナバシェバ港" },
  "port-panama": { name: "パナマ運河港湾" },
  "port-santos": { name: "サントス港" },
  "port-new-york": { name: "ニューヨーク／ニュージャージー港" },
  "strait-of-malacca": { name: "マラッカ海峡", description: "インド洋と南シナ海を結ぶ狭い海上通路。" },
  "strait-of-hormuz": { name: "ホルムズ海峡", description: "ペルシャ湾とオマーン湾を結ぶ狭い出口。" },
  "suez-canal": { name: "スエズ運河", description: "地中海と紅海を結ぶ人工水路。" },
  "panama-canal": { name: "パナマ運河", description: "大西洋と太平洋を結ぶ人工水路。" },
  "bab-el-mandeb": { name: "バブ・エル・マンデブ海峡", description: "紅海とアデン湾の間にある通過地点。" },
  "bosporus": { name: "ボスポラス海峡", description: "黒海とマルマラ海を結ぶ狭い水路。" },
  "pacific-demo": { name: "太平洋デモ接続" },
  "japan-sea-demo": { name: "日本–東南アジア デモ接続" },
  "singapore-india-demo": { name: "シンガポール–インド デモ接続" },
  "singapore-middle-east-demo": { name: "シンガポール–中東 デモ接続" },
  "middle-east-europe-demo": { name: "中東–西ヨーロッパ デモ接続" },
  "atlantic-demo": { name: "大西洋デモ接続" },
  "americas-demo": { name: "南北アメリカ デモ接続" },
  "australia-asia-demo": { name: "オーストラリア–東南アジア デモ接続" },
  "china-rare-earths-demo": { name: "中国 · レアアース", description: "レアアースLensの表示検証用となる国単位の模式マーカー。" },
  "australia-lithium-demo": { name: "オーストラリア · リチウム", description: "リチウムLensの表示検証用となる国単位の模式マーカー。" },
  "chile-copper-demo": { name: "チリ · 銅", description: "銅Lensの表示検証用となる国単位の模式マーカー。" },
  "drc-cobalt-demo": { name: "コンゴ民主共和国 · コバルト", description: "コバルトLensの表示検証用となる国単位の模式マーカー。" },
  "indonesia-nickel-demo": { name: "インドネシア · ニッケル", description: "ニッケルLensの表示検証用となる国単位の模式マーカー。" },
};

const valueJa: Record<string, string> = {
  barrier: "障壁",
  corridor: "回廊",
  chokepoint: "狭窄部",
  plateau: "高原",
  desert: "砂漠",
  "Mountain barrier": "山岳障壁",
  "High plateau": "高原",
  "Desert region": "砂漠地域",
  "Natural maritime corridor": "自然海上回廊",
  "Major port region": "主要港湾地域",
  "Canal port region": "運河港湾地域",
  "schematic maritime flow": "模式海上物流フロー",
  "East Asia": "東アジア",
  "Singapore / Malacca": "シンガポール／マラッカ",
  "Indian Ocean": "インド洋",
  Suez: "スエズ",
  "South China Sea": "南シナ海",
  "Atlantic Ocean": "大西洋",
  "Maritime strait": "海峡",
  Canal: "運河",
  schematic: "模式",
  Japan: "日本",
  "US West Coast": "米国西海岸",
  "US East Coast": "米国東海岸",
  "Southeast Asia": "東南アジア",
  Singapore: "シンガポール",
  India: "インド",
  "Middle East": "中東",
  "Western Europe": "西ヨーロッパ",
  "South America": "南アメリカ",
  "United States": "米国",
  Australia: "オーストラリア",
  China: "中国",
  Chile: "チリ",
  "Democratic Republic of the Congo": "コンゴ民主共和国",
  Indonesia: "インドネシア",
  "Rare earths": "レアアース",
  Lithium: "リチウム",
  Copper: "銅",
  Cobalt: "コバルト",
  Nickel: "ニッケル",
  "normalized demo index": "正規化デモ指数",
};

export function localizeLensName(lensId: string, fallback: string, locale: Locale): string {
  return locale === "ja" ? lensJa[lensId]?.name ?? fallback : fallback;
}

export function localizeLensDefinition(lens: EarthLensDefinition, locale: Locale): EarthLensDefinition {
  if (locale === "en") return lens;
  const localized = lensJa[lens.id];
  if (!localized) return lens;
  return {
    ...lens,
    name: localized.name,
    legend: lens.legend.map((item, index) => ({ ...item, label: localized.legends[index] ?? item.label })),
  };
}

export function localizeLensCategory(lens: EarthLensDefinition, locale: Locale): string {
  return locale === "ja" ? lensJa[lens.id]?.category ?? lens.category : lens.category;
}

export function localizeFeatureName(featureId: string, fallback: string, locale: Locale): string {
  return locale === "ja" ? featureJa[featureId]?.name ?? fallback : fallback;
}

export function localizeFeatureDescription(feature: LensFeature, locale: Locale): string {
  if (locale === "en") return feature.description;
  const localizedDescription = featureJa[feature.id]?.description;
  if (localizedDescription) return localizedDescription;
  if (feature.geometry.type === "connection") return "抽象化した地域間の通信接続です。線はendpointから生成した模式表現で、実際のケーブル経路ではありません。";
  return feature.description;
}

export function localizeDataset(dataset: LensDataset, locale: Locale): LensDataset {
  if (locale === "en") return dataset;
  return {
    ...dataset,
    features: dataset.features.map((feature) => ({
      ...feature,
      name: featureJa[feature.id]?.name
        ?? (typeof feature.attributes.nameJa === "string" ? feature.attributes.nameJa : feature.name),
      description: localizeFeatureDescription(feature, locale),
      geometry: feature.geometry.type === "connection"
        ? { ...feature.geometry, endpoints: feature.geometry.endpoints.map((endpoint) => ({ ...endpoint, name: localizeValue(endpoint.name, locale) })) }
        : feature.geometry,
      attributes: Object.fromEntries(Object.entries(feature.attributes).map(([key, value]) => [key, typeof value === "string" ? localizeValue(value, locale) : value])),
    })),
  };
}

export function localizeValue(value: string | number | boolean | undefined, locale: Locale): string {
  if (value === undefined) return "—";
  if (typeof value === "boolean") return locale === "ja" ? (value ? "はい" : "いいえ") : (value ? "Yes" : "No");
  if (typeof value === "number") return String(value);
  if (locale === "en") return value;
  return value.split(" ↔ ").map((part) => valueJa[part] ?? part).join(" ↔ ");
}

export function localizeRelation(feature: WhyHereNearbyFeature, locale: Locale, fallback: string): string {
  if (locale === "en") return feature.relationLabel ?? fallback;
  if (feature.relation === "associated-endpoint") {
    const endpoint = feature.relationLabel?.replace(/^Associated endpoint: /, "") ?? "";
    return `関連エンドポイント: ${valueJa[endpoint] ?? endpoint}`;
  }
  if (feature.relation === "near-area") return "周辺エリア";
  if (feature.relation === "inside-area") return "領域内";
  return fallback;
}

export function localizeConfidence(value: string, locale: Locale): string {
  if (locale === "en") return value.toUpperCase();
  return ({ high: "高", medium: "中", low: "低", unknown: "不明" } as Record<string, string>)[value] ?? value;
}

const missionJa: Record<string, {
  title: string; prompt: string; target: string;
  sticker: [string, string, string];
  hints: [string, string, string][];
  evidence: [string, string][];
}> = {
  "mission-01-malacca": { title: "狭窄部を探せ", prompt: "東アジアとインド洋を結ぶ主要海上交通が、地形によって最も狭く絞られる地点を探してください。", target: "マラッカ海峡", sticker: ["マラッカ", "東南アジア", "コンテナ船と熱帯の海峡"], hints: [["海域の手掛かり", "インド洋とアジアの太平洋側を結ぶ通過地点です。", ""], ["観測フォーカス", "観測範囲を東南アジアへ絞ります。", "東南アジア"], ["地域シグナル", "大きな港湾都市のそばにある狭い回廊を探してください。", "海上回廊地域"]], evidence: [["地形", "狭い海上回廊"], ["海上物流", "主要フローの集中"], ["チョークポイント", "戦略的狭窄部"]] },
  "mission-02-himalayas": { title: "巨大障壁を探せ", prompt: "南アジアとチベット高原の間で、巨大な自然障壁となっている地点を探してください。", target: "ヒマラヤ山脈", sticker: ["ヒマラヤ", "高地アジア", "雪山と遠征のモチーフ"], hints: [["規模の手掛かり", "答えは国境や都市ではなく、山岳系です。", ""], ["観測フォーカス", "観測範囲を南・中央アジアへ絞ります。", "南・中央アジア"], ["標高シグナル", "広大な高原の南縁を探してください。", "高標高帯"]], evidence: [["地形", "極端に高い起伏帯"], ["物理地形", "大陸規模の山岳障壁"]] },
  "mission-03-hormuz": { title: "海への出口を探せ", prompt: "ペルシャ湾から外洋へ向かうエネルギー輸送が、最初に通過する狭い地点を探してください。", target: "ホルムズ海峡", sticker: ["ホルムズ", "ペルシャ湾", "タンカーとペルシャ湾の夕景"], hints: [["地域の手掛かり", "この出口は中東にあります。", ""], ["観測フォーカス", "観測範囲をアラビア半島へ絞ります。", "アラビア半島"], ["湾岸シグナル", "ペルシャ湾から海へ出る地点を探してください。", "ペルシャ湾地域"]], evidence: [["地形", "湾の狭い出口"], ["海上物流", "外洋へ向かう流れ"], ["ゲートウェイ", "戦略的エネルギー通路"]] },
  "mission-04-suez": { title: "大陸間の近道を探せ", prompt: "ヨーロッパとインド洋を結ぶ海上ルートで、アフリカを大きく迂回せずに通過できる地点を探してください。", target: "スエズ運河", sticker: ["スエズ運河", "エジプト", "砂漠の運河を通る貨物船"], hints: [["ルートの手掛かり", "乾燥した地峡を横切り、二つの海を結びます。", ""], ["観測フォーカス", "観測範囲を北東アフリカへ絞ります。", "北東アフリカ"], ["地峡シグナル", "地中海と紅海の間を探してください。", "二つの海の回廊"]], evidence: [["海上物流", "大陸間ルートの近道"], ["運河", "地峡を横切る人工通路"]] },
  "mission-05-rotterdam": { title: "物流ハブを探せ", prompt: "北海とヨーロッパ内陸の物流網が接続し、巨大な物流拠点となっている地点を探してください。", target: "ロッテルダム", sticker: ["ロッテルダム", "北海", "港湾クレーンとコンテナ"], hints: [["沿岸の手掛かり", "このハブは北海に面しています。", ""], ["観測フォーカス", "観測範囲を西ヨーロッパへ絞ります。", "西ヨーロッパ"], ["デルタのシグナル", "低地の河川デルタにある主要港を探してください。", "北海デルタ"]], evidence: [["港湾", "主要な海上インフラ"], ["海上物流", "北海のゲートウェイ"]] },
  "mission-06-gibraltar": { title: "海の玄関を探せ", prompt: "地中海と大西洋の間で、海上交通が狭く集中する地点を探してください。", target: "ジブラルタル海峡", sticker: ["ジブラルタル", "西地中海", "岩山と通過する船"], hints: [["海域の手掛かり", "ヨーロッパとアフリカを隔てる通路です。", ""], ["観測フォーカス", "観測範囲を西地中海へ絞ります。", "西地中海"], ["玄関シグナル", "地中海の大西洋側の入口を探してください。", "地中海ゲートウェイ"]], evidence: [["地形", "陸塊の間にある狭い開口部"], ["海上物流", "海上交通が入口へ収束"]] },
  "mission-07-lithium": { title: "資源地域を探せ", prompt: "南アメリカで、高地の塩湖とリチウム資源が集中する地域を探してください。", target: "リチウム・トライアングル", sticker: ["リチウム・トライアングル", "中央アンデス", "塩湖とアンデス山脈"], hints: [["景観の手掛かり", "アンデスに隣接する乾燥高原を探してください。", ""], ["観測フォーカス", "観測範囲を南アメリカ西部へ絞ります。", "中央アンデス"], ["高原シグナル", "チリ、ボリビア、アルゼンチンの国境周辺です。", "高地の塩湖群"]], evidence: [["地形", "アンデスに隣接する乾燥高原"], ["鉱物", "試作データは限定的なデモ"], ["国境", "三か国にまたがる資源地域"]] },
  "mission-08-rift": { title: "大地の裂け目を探せ", prompt: "アフリカ大陸で、大地が引き裂かれつつある巨大な地形帯を探してください。", target: "東アフリカ大地溝帯", sticker: ["東アフリカ大地溝帯", "東アフリカ", "地溝谷と火山"], hints: [["地殻の手掛かり", "海岸線ではなくアフリカ東部の内陸を走ります。", ""], ["観測フォーカス", "観測範囲を東アフリカと大湖沼地域へ絞ります。", "東アフリカ"], ["地溝シグナル", "南北に延びる谷と高地の帯を探してください。", "地溝帯"]], evidence: [["地形", "長い谷と高地のシステム"], ["物理地理", "将来のプレート境界データでEvidenceを強化"]] },
};

export function localizeMission(mission: EarthMission, locale: Locale): EarthMission {
  if (locale === "en") return mission;
  const translation = missionJa[mission.id];
  if (!translation) return mission;
  return {
    ...mission,
    title: translation.title,
    prompt: translation.prompt,
    target: { ...mission.target, name: translation.target },
    sticker: { ...mission.sticker, title: translation.sticker[0], region: translation.sticker[1], description: translation.sticker[2] },
    hints: mission.hints.map((hint, index) => ({
      ...hint,
      title: translation.hints[index]?.[0] ?? hint.title,
      text: translation.hints[index]?.[1] ?? hint.text,
      effect: hint.effect && translation.hints[index]?.[2] ? { ...hint.effect, label: translation.hints[index][2] } : hint.effect,
    })),
    completion: { evidenceChain: mission.completion.evidenceChain.map((evidence, index) => ({ ...evidence, title: translation.evidence[index]?.[0] ?? evidence.title, text: translation.evidence[index]?.[1] ?? evidence.text })) },
  };
}
