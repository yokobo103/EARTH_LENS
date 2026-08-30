// Cesium reads this global during module initialization. Resolve it from the
// document base so localhost and GitHub Pages subpaths use the same build.
(globalThis as typeof globalThis & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = new URL("cesiumStatic/", document.baseURI).href;

void import("./bootstrap");
