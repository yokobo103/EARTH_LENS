import type { ImageryLayer, Viewer } from "cesium";
import type { TerrainObservationHandle, TerrainObservationProvider } from "./TerrainObservationProvider";

interface ImageryStyle {
  alpha: number;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
}

const normalStyle: ImageryStyle = { alpha: 1, brightness: 1, contrast: 1, saturation: 1, gamma: 1 };
// 地球は下地。レンズの色に主役を譲るところまで彩度を落とす。
const reliefStyle: ImageryStyle = { alpha: 1, brightness: 0.76, contrast: 1.24, saturation: 0.3, gamma: 1.1 };

function applyStyle(layer: ImageryLayer, style: ImageryStyle) {
  layer.alpha = style.alpha;
  layer.brightness = style.brightness;
  layer.contrast = style.contrast;
  layer.saturation = style.saturation;
  layer.gamma = style.gamma;
}

export function reapplyNaturalEarthRelief(viewer: Viewer, enabled: boolean): void {
  const style = enabled ? reliefStyle : normalStyle;
  for (let index = 0; index < viewer.imageryLayers.length; index += 1) applyStyle(viewer.imageryLayers.get(index), style);
}

export class NaturalEarthReliefProvider implements TerrainObservationProvider {
  readonly id = "natural-earth-ii-relief";
  readonly representation = "visual-relief" as const;

  bind(viewer: Viewer): TerrainObservationHandle {
    let enabled = false;
    const restyle = () => {
      reapplyNaturalEarthRelief(viewer, enabled);
    };
    const removeLayerListener = viewer.imageryLayers.layerAdded.addEventListener((layer) => {
      applyStyle(layer, enabled ? reliefStyle : normalStyle);
    });

    return {
      setEnabled(nextEnabled) {
        enabled = nextEnabled;
        restyle();
      },
      reapplyAppearance() {
        restyle();
      },
      destroy() {
        removeLayerListener();
        enabled = false;
        if (!viewer.isDestroyed()) restyle();
      },
    };
  }
}
