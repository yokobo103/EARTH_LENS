import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesiumStatic";

export default defineConfig({
  base: "./",
  build: {
    // CesiumJS is intentionally shipped as one offline-capable client bundle.
    chunkSizeWarningLimit: 5_000,
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: ["ThirdParty", "Workers", "Assets", "Widgets"].map((name) => ({
        src: `${cesiumSource}/${name}/**/*`,
        dest: `${cesiumBaseUrl}/${name}`,
        rename: { stripBase: 5 },
      })),
    }),
  ],
});
