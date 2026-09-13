import {
  ArcType,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  DistanceDisplayCondition,
  Entity,
  PolygonHierarchy,
  type Viewer,
} from "cesium";
import type { GeographicAreaPolygon, LensDataset, LensFeature, LensRenderHandle } from "../types";

const fillColor = Color.fromCssColorString("#d9ad62");

/**
 * 段の高さ。河川・港・山脈と同じ。
 * 世界 6,000 km 超 / 大陸 2,800-6,000 km / 国 2,800 km 未満。
 */
const CONTINENT_BELOW_METRES = 6_000_000;
const COUNTRY_BELOW_METRES = 2_800_000;

/**
 * 濃さは「乾き方」で決める。大きさ（段）では決めない。
 *
 * 段は「いつ出てくるか」だけを決め、濃さは区分だけを表す。
 * こうしないと、サヘル（216万 km2 の半乾燥）が広いという理由で
 * ルブアルハリより濃く出て、面積の話と乾きの話が混ざる。
 *
 * 0.17 では足りなかった。Natural Earth II の陰影図がサハラを砂色で描いているので、
 * その上に薄い砂色を重ねても、レンズを点けたことが画面から分からなかった。
 */
const FILL_ALPHA = { arid: 0.3, semiArid: 0.13 } as const;
const OUTLINE_ALPHA = { arid: 0.66, semiArid: 0.34 } as const;
const SELECTED_FILL_BONUS = 0.16;

function tierOf(feature: LensFeature): number {
  const value = feature.attributes.displayTier;
  return typeof value === "number" ? value : 3;
}

function isArid(feature: LensFeature): boolean {
  return feature.attributes.displayReason !== "semi_arid_climate";
}

function maximumDistanceForTier(tier: number): number {
  if (tier <= 1) return Number.POSITIVE_INFINITY;
  if (tier === 2) return CONTINENT_BELOW_METRES;
  return COUNTRY_BELOW_METRES;
}

function fillAlpha(feature: LensFeature, selected: boolean): number {
  const base = isArid(feature) ? FILL_ALPHA.arid : FILL_ALPHA.semiArid;
  return selected ? base + SELECTED_FILL_BONUS : base;
}

function hierarchy(polygon: GeographicAreaPolygon): PolygonHierarchy {
  const [outer = [], ...holes] = polygon.rings;
  return new PolygonHierarchy(
    Cartesian3.fromDegreesArray(outer.flatMap((point) => [point.longitude, point.latitude])),
    holes.map((ring) => new PolygonHierarchy(Cartesian3.fromDegreesArray(ring.flatMap((point) => [point.longitude, point.latitude])))),
  );
}

export function renderDeserts(viewer: Viewer, dataset: LensDataset): LensRenderHandle {
  const entities = new Map<string, { entity: Entity; feature: LensFeature }>();
  let selectedFeatureId: string | undefined;

  for (const feature of dataset.features) {
    if (feature.geometry.type !== "area") continue;
    const maximumDistance = maximumDistanceForTier(tierOf(feature));
    const outline = fillColor.withAlpha(isArid(feature) ? OUTLINE_ALPHA.arid : OUTLINE_ALPHA.semiArid);
    for (const [polygonIndex, polygon] of feature.geometry.polygons.entries()) {
      // 名札は付けない。測った面には地名が無い（サハラとアラビアは1つの塊）。
      const entity = viewer.entities.add(new Entity({
        id: `${dataset.lensId}:${feature.id}:${polygonIndex}`,
        name: feature.name,
        polygon: {
          hierarchy: hierarchy(polygon),
          material: new ColorMaterialProperty(fillColor.withAlpha(fillAlpha(feature, false))),
          outline: true,
          outlineColor: outline,
          height: 2_800,
          arcType: ArcType.GEODESIC,
          distanceDisplayCondition: new DistanceDisplayCondition(0, maximumDistance),
        },
      }));
      entities.set(entity.id, { entity, feature });
    }
  }

  const applySelection = () => {
    for (const rendered of entities.values()) {
      if (!rendered.entity.polygon) continue;
      const selected = rendered.feature.id === selectedFeatureId;
      rendered.entity.polygon.material = new ColorMaterialProperty(fillColor.withAlpha(fillAlpha(rendered.feature, selected)));
    }
  };

  return {
    setVisible(visible) {
      for (const rendered of entities.values()) rendered.entity.show = visible;
    },
    setSelectedFeature(featureId) {
      selectedFeatureId = featureId;
      applySelection();
    },
    getFeatureForPick(picked) {
      if (!(picked instanceof Entity)) return undefined;
      return entities.get(picked.id)?.feature;
    },
    destroy() {
      for (const rendered of entities.values()) viewer.entities.remove(rendered.entity);
      entities.clear();
    },
  };
}
