import {
  ArcType,
  Cartesian3,
  Color,
  ConstantProperty,
  Entity,
  PolygonHierarchy,
  PolylineDashMaterialProperty,
  type Viewer,
} from "cesium";
import type { GeographicAreaPolygon, LensDataset, LensFeature, LensRenderHandle } from "../types";

type Season = "winter" | "summer";

const fillWinter = Color.fromCssColorString("#55acd2");
const fillSummer = Color.fromCssColorString("#e2fbff");
const medianReference = Color.fromCssColorString("#f4c96b");

interface RenderedArea { entity: Entity; feature: LensFeature; season: Season }
interface RenderedLine { entity: Entity; feature: LensFeature; halo: boolean; season: Season }

function hierarchy(polygon: GeographicAreaPolygon): PolygonHierarchy {
  const [outer = [], ...holes] = polygon.rings;
  const positions = Cartesian3.fromDegreesArray(outer.flatMap((point) => [point.longitude, point.latitude]));
  return new PolygonHierarchy(positions, holes.map((ring) => new PolygonHierarchy(
    Cartesian3.fromDegreesArray(ring.flatMap((point) => [point.longitude, point.latitude])),
  )));
}

function areaMaterial(season: Season): Color {
  return season === "summer" ? fillSummer.withAlpha(0.48) : fillWinter.withAlpha(0.22);
}

function lineMaterial(season: Season, halo: boolean) {
  if (halo) return medianReference.withAlpha(0.11);
  return season === "winter"
    ? new PolylineDashMaterialProperty({ color: medianReference.withAlpha(0.96), dashLength: 16 })
    : medianReference.withAlpha(0.96);
}

export function renderSeaIceEdges(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const areas: RenderedArea[] = [];
  const lines: RenderedLine[] = [];
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "area") continue;
    const season: Season = feature.attributes.extentSeason === "winter" ? "winter" : "summer";
    for (const [polygonIndex, polygon] of feature.geometry.polygons.entries()) {
      const entity = viewer.entities.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:area:${polygonIndex}`,
        name: feature.name,
        polygon: {
          hierarchy: hierarchy(polygon),
          material: areaMaterial(season),
          height: season === "winter" ? 3_500 : 7_500,
          arcType: ArcType.GEODESIC,
          outline: false,
        },
      }));
      areas.push({ entity, feature, season });
    }
  }

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "polyline") continue;
    const season: Season = feature.attributes.edgeSeason === "winter" ? "winter" : "summer";
    for (const [pathIndex, path] of feature.geometry.paths.entries()) {
      const positions = Cartesian3.fromDegreesArrayHeights(path.flatMap((point) => [point.longitude, point.latitude, 12_000]));
      for (const halo of [true, false]) {
        const entity = viewer.entities.add(new Entity({
          id: `${dataset.lensId}:${feature.id}:${pathIndex}:${halo ? "halo" : "edge"}`,
          name: feature.name,
          polyline: {
            positions, width: halo ? 6 : (season === "winter" ? 1.8 : 2.2),
            material: lineMaterial(season, halo), arcType: ArcType.GEODESIC,
          },
        }));
        lines.push({ entity, feature, halo, season });
      }
    }
  }

  const applySelection = () => {
    for (const line of lines) {
      if (!line.entity.polyline) continue;
      const selected = line.feature.id === selectedFeatureId;
      const normalWidth = line.halo ? 6 : (line.season === "winter" ? 1.8 : 2.2);
      line.entity.polyline.width = new ConstantProperty(selected ? normalWidth * 1.8 : normalWidth);
    }
    for (const area of areas) {
      if (!area.entity.polygon) continue;
      const selected = area.feature.id === selectedFeatureId;
      area.entity.polygon.height = new ConstantProperty((area.season === "winter" ? 3_500 : 7_500) + (selected ? 7_000 : 0));
    }
  };

  return {
    setVisible(visible) {
      for (const area of areas) area.entity.show = visible;
      for (const line of lines) line.entity.show = visible;
    },
    setSelectedFeature(featureId) { selectedFeatureId = featureId; applySelection(); },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return areas.find((area) => area.entity.id === picked.id)?.feature
        ?? lines.find((line) => line.entity.id === picked.id)?.feature;
    },
    destroy() {
      for (const area of areas) viewer.entities.remove(area.entity);
      for (const line of lines) viewer.entities.remove(line.entity);
      areas.length = 0; lines.length = 0;
    },
  };
}
