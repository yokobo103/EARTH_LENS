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
type IceStyle = "density" | "contour" | "edge";

const fillWinter = Color.fromCssColorString("#55acd2");
const fillSummer = Color.fromCssColorString("#e2fbff");
const medianWinter = Color.fromCssColorString("#f4c96b");
const medianSummer = Color.fromCssColorString("#ff8e72");

interface RenderedArea { entity: Entity; feature: LensFeature; season: Season }
interface RenderedLine { entity: Entity; feature: LensFeature; halo: boolean; season: Season }
interface RenderedBoundary { entity: Entity; feature: LensFeature }

function selectedStyle(): IceStyle {
  const requested = new URLSearchParams(window.location.search).get("iceStyle");
  return requested === "contour" || requested === "edge" ? requested : "density";
}

function hierarchy(polygon: GeographicAreaPolygon): PolygonHierarchy {
  const [outer = [], ...holes] = polygon.rings;
  const positions = Cartesian3.fromDegreesArray(outer.flatMap((point) => [point.longitude, point.latitude]));
  return new PolygonHierarchy(positions, holes.map((ring) => new PolygonHierarchy(
    Cartesian3.fromDegreesArray(ring.flatMap((point) => [point.longitude, point.latitude])),
  )));
}

function areaMaterial(season: Season, style: IceStyle): Color {
  if (season === "summer") return fillSummer.withAlpha(style === "edge" ? 0.35 : style === "contour" ? 0.44 : 0.48);
  return fillWinter.withAlpha(style === "edge" ? 0.10 : style === "contour" ? 0.15 : 0.22);
}

function lineMaterial(season: Season, halo: boolean) {
  const color = season === "winter" ? medianWinter : medianSummer;
  if (halo) return color.withAlpha(0.11);
  return season === "winter"
    ? new PolylineDashMaterialProperty({ color: color.withAlpha(0.96), dashLength: 16 })
    : color.withAlpha(0.96);
}

export function renderSeaIceEdges(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const style = selectedStyle();
  const areas: RenderedArea[] = [];
  const observedBoundaries: RenderedBoundary[] = [];
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
          material: areaMaterial(season, style),
          height: season === "winter" ? 3_500 : 7_500,
          arcType: ArcType.GEODESIC,
          outline: style === "edge",
          outlineColor: (season === "winter" ? fillWinter : fillSummer).withAlpha(style === "edge" ? 0.72 : 0),
        },
      }));
      areas.push({ entity, feature, season });
      if (style === "contour") {
        const outerRing = polygon.rings[0] ?? [];
        const boundary = viewer.entities.add(new Entity({
          id: `${dataset.lensId}:${feature.id}:observed-boundary:${polygonIndex}`,
          name: feature.name,
          polyline: {
            positions: Cartesian3.fromDegreesArrayHeights(outerRing.flatMap((point) => [point.longitude, point.latitude, 10_000])),
            width: season === "winter" ? 1.6 : 2,
            material: season === "winter"
              ? new PolylineDashMaterialProperty({ color: fillWinter.withAlpha(0.88), dashLength: 10 })
              : fillSummer.withAlpha(0.92),
            arcType: ArcType.GEODESIC,
          },
        }));
        observedBoundaries.push({ entity: boundary, feature });
      }
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
      for (const boundary of observedBoundaries) boundary.entity.show = visible;
      for (const line of lines) line.entity.show = visible;
    },
    setSelectedFeature(featureId) { selectedFeatureId = featureId; applySelection(); },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return areas.find((area) => area.entity.id === picked.id)?.feature
        ?? observedBoundaries.find((boundary) => boundary.entity.id === picked.id)?.feature
        ?? lines.find((line) => line.entity.id === picked.id)?.feature;
    },
    destroy() {
      for (const area of areas) viewer.entities.remove(area.entity);
      for (const boundary of observedBoundaries) viewer.entities.remove(boundary.entity);
      for (const line of lines) viewer.entities.remove(line.entity);
      areas.length = 0; observedBoundaries.length = 0; lines.length = 0;
    },
  };
}
