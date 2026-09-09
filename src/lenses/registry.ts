import { chokepointsDefinition, loadChokepoints } from "./chokepoints/definition";
import { renderChokepoints } from "./chokepoints/renderer";
import { criticalMineralsDefinition, loadCriticalMinerals } from "./critical-minerals/definition";
import { renderCriticalMinerals } from "./critical-minerals/renderer";
import { submarineCablesDefinition, loadSubmarineCableConnections } from "./submarine-cables/definition";
import { renderSubmarineCableConnections } from "./submarine-cables/renderer";
import { physicalFeaturesDefinition, loadPhysicalFeatures } from "./physical-features/definition";
import { renderPhysicalFeatures } from "./physical-features/renderer";
import { seaIceDefinition, loadSeaIceEdges } from "./sea-ice/definition";
import { renderSeaIceEdges } from "./sea-ice/renderer";
import { portsDefinition, loadPorts } from "./ports/definition";
import { renderPorts } from "./ports/renderer";
import { shippingDefinition, loadShippingFlows } from "./shipping/definition";
import { renderShippingFlows } from "./shipping/renderer";
import { bordersDefinition, loadBorders } from "./borders/definition";
import { renderBorders } from "./borders/renderer";
import { riversDefinition, loadRivers } from "./rivers/definition";
import { renderRivers } from "./rivers/renderer";
import { desertsDefinition, loadDeserts } from "./deserts/definition";
import { renderDeserts } from "./deserts/renderer";
import { eezDefinition, loadEez } from "./eez/definition";
import { renderEez } from "./eez/renderer";
import type { LensModule } from "./types";

export const lensRegistry: readonly LensModule[] = [
  { definition: physicalFeaturesDefinition, load: loadPhysicalFeatures, render: renderPhysicalFeatures },
  { definition: seaIceDefinition, load: loadSeaIceEdges, render: renderSeaIceEdges },
  { definition: portsDefinition, load: loadPorts, render: renderPorts },
  { definition: shippingDefinition, load: loadShippingFlows, render: renderShippingFlows },
  {
    definition: submarineCablesDefinition,
    load: loadSubmarineCableConnections,
    render: renderSubmarineCableConnections,
  },
  { definition: chokepointsDefinition, load: loadChokepoints, render: renderChokepoints },
  { definition: criticalMineralsDefinition, load: loadCriticalMinerals, render: renderCriticalMinerals },
  { definition: bordersDefinition, load: loadBorders, render: renderBorders },
  { definition: riversDefinition, load: loadRivers, render: renderRivers },
  { definition: desertsDefinition, load: loadDeserts, render: renderDeserts },
  { definition: eezDefinition, load: loadEez, render: renderEez },
] as const;

export function getLensModule(id: string): LensModule | undefined {
  return lensRegistry.find((lens) => lens.definition.id === id);
}

/**
 * 一覧に出す並び。データの種類ではなく「地球が決めた条件の上に、人が線を引く」で分ける。
 * 地政学のレンズを先に置くのは、画面が低いときに切れるなら地形側が切れるべきだから。
 */
export type LensGroupId = "human-lines" | "earth-conditions";

const groupedLensIds: Readonly<Record<LensGroupId, readonly string[]>> = {
  "human-lines": ["major-ports", "strategic-chokepoints", "shipping-flows", "submarine-cable-connections", "eez", "admin0-borders"],
  "earth-conditions": ["sea-ice-edges", "physical-features", "deserts", "rivers", "critical-minerals"],
};

export const lensGroupOrder: readonly LensGroupId[] = ["human-lines", "earth-conditions"];

/** 中身がまだ模式・デモのレンズ。一覧に「サンプル」と出して、触る前に分かるようにする。 */
export const sampleDataLensIds: ReadonlySet<string> = new Set([
  "shipping-flows",
  "submarine-cable-connections",
  "critical-minerals",
]);

/**
 * グループごとのレンズを、指定の順で返す。
 * どのグループにも登録されていないレンズは最後のグループの末尾に回して、
 * 新しいレンズを足したときに一覧から消えないようにする。
 */
export function groupLensesForDisplay<T extends { id: string }>(lenses: readonly T[]): { id: LensGroupId; lenses: T[] }[] {
  const byId = new Map(lenses.map((lens) => [lens.id, lens]));
  const placed = new Set<string>();
  const groups = lensGroupOrder.map((id) => {
    const ordered = groupedLensIds[id].flatMap((lensId) => {
      const lens = byId.get(lensId);
      if (!lens) return [];
      placed.add(lensId);
      return [lens];
    });
    return { id, lenses: ordered };
  });
  const leftover = lenses.filter((lens) => !placed.has(lens.id));
  const last = groups[groups.length - 1];
  if (leftover.length && last) last.lenses.push(...leftover);
  return groups;
}
