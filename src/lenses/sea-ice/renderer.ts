import {
  ArcType,
  Cartesian3,
  Color,
  ConstantProperty,
  Entity,
  PolylineDashMaterialProperty,
  type Viewer,
} from "cesium";
import type { LensDataset, LensFeature, LensRenderHandle } from "../types";

const winterColor = Color.fromCssColorString("#68afd1");
const summerColor = Color.fromCssColorString("#d7f5ff");

interface RenderedLine {
  entity: Entity;
  feature: LensFeature;
  halo: boolean;
  season: "winter" | "summer";
}

function lineMaterial(season: "winter" | "summer", halo: boolean) {
  const color = season === "winter" ? winterColor : summerColor;
  if (halo) return color.withAlpha(season === "winter" ? 0.07 : 0.05);
  return season === "winter"
    ? new PolylineDashMaterialProperty({ color: color.withAlpha(0.82), dashLength: 14 })
    : color.withAlpha(0.90);
}

export function renderSeaIceEdges(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const rendered: RenderedLine[] = [];
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "polyline") continue;
    const season = feature.attributes.edgeSeason === "winter" ? "winter" : "summer";
    for (const [pathIndex, path] of feature.geometry.paths.entries()) {
      const positions = Cartesian3.fromDegreesArrayHeights(path.flatMap((point) => [point.longitude, point.latitude, 6_500]));
      for (const halo of [true, false]) {
        const entity = viewer.entities.add(new Entity({
          id: `${dataset.lensId}:${feature.id}:${pathIndex}:${halo ? "halo" : "edge"}`,
          name: feature.name,
          polyline: {
            positions,
            width: halo ? (season === "winter" ? 6 : 5) : (season === "winter" ? 1.5 : 1.9),
            material: lineMaterial(season, halo),
            arcType: ArcType.GEODESIC,
          },
        }));
        rendered.push({ entity, feature, halo, season });
      }
    }
  }

  const applySelection = () => {
    for (const line of rendered) {
      if (!line.entity.polyline) continue;
      const selected = line.feature.id === selectedFeatureId;
      const normalWidth = line.halo ? (line.season === "winter" ? 6 : 5) : (line.season === "winter" ? 1.5 : 1.9);
      line.entity.polyline.width = new ConstantProperty(selected ? normalWidth * 1.8 : normalWidth);
    }
  };

  return {
    setVisible(visible) {
      for (const line of rendered) line.entity.show = visible;
    },
    setSelectedFeature(featureId) {
      selectedFeatureId = featureId;
      applySelection();
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return rendered.find((line) => line.entity.id === picked.id)?.feature;
    },
    destroy() {
      for (const line of rendered) viewer.entities.remove(line.entity);
      rendered.length = 0;
    },
  };
}
