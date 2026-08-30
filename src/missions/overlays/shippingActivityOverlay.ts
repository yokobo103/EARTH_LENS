import {
  ArcType,
  Cartesian3,
  Color,
  Entity,
  PolylineGlowMaterialProperty,
} from "cesium";
import type { MissionOverlayModule } from "./types";

interface SchematicFlow {
  start: [longitude: number, latitude: number];
  focus: [longitude: number, latitude: number];
  end: [longitude: number, latitude: number];
}

const schematicFlows: SchematicFlow[] = [
  { start: [55, -9], focus: [99.8, 3.5], end: [118, 13] },
  { start: [62, 4], focus: [100.2, 3.1], end: [121, 8] },
  { start: [68, -15], focus: [100.7, 2.8], end: [115, 17] },
  { start: [74, 10], focus: [101.1, 2.4], end: [124, 15] },
  { start: [80, -8], focus: [101.5, 2.0], end: [118, 22] },
  { start: [86, 6], focus: [102, 1.7], end: [127, 5] },
];

export const shippingActivityOverlay: MissionOverlayModule = {
  id: "mission-shipping-activity",
  name: "SHIPPING ACTIVITY",
  render(viewer) {
    const entities: Entity[] = schematicFlows.map((flow, index) => viewer.entities.add(new Entity({
      id: `mission-overlay:shipping:${index}`,
      name: "Schematic shipping activity",
      polyline: {
        positions: [flow.start, flow.focus, flow.end].map(([longitude, latitude]) =>
          Cartesian3.fromDegrees(longitude, latitude, 18_000 + index * 700),
        ),
        width: 1.6,
        arcType: ArcType.GEODESIC,
        material: new PolylineGlowMaterialProperty({
          glowPower: 0.16,
          taperPower: 0.35,
          color: Color.fromCssColorString("#ffc65e").withAlpha(0.4),
        }),
      },
    })));
    return {
      destroy() {
        for (const entity of entities) viewer.entities.remove(entity);
      },
    };
  },
};
