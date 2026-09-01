import { chokepointsDefinition, loadChokepoints } from "./chokepoints/definition";
import { renderChokepoints } from "./chokepoints/renderer";
import { criticalMineralsDefinition, loadCriticalMinerals } from "./critical-minerals/definition";
import { renderCriticalMinerals } from "./critical-minerals/renderer";
import { submarineCablesDefinition, loadSubmarineCableConnections } from "./submarine-cables/definition";
import { renderSubmarineCableConnections } from "./submarine-cables/renderer";
import { terrainDefinition, loadTerrainDataset } from "./terrain/definition";
import { renderTerrainRelief } from "./terrain/renderer";
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
import type { LensModule } from "./types";

export const lensRegistry: readonly LensModule[] = [
  { definition: terrainDefinition, load: loadTerrainDataset, render: renderTerrainRelief },
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
] as const;

export function getLensModule(id: string): LensModule | undefined {
  return lensRegistry.find((lens) => lens.definition.id === id);
}
