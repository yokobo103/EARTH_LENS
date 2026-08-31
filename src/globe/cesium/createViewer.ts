import {
  Cartesian3,
  Color,
  Credit,
  EllipsoidTerrainProvider,
  Ion,
  TileMapServiceImageryProvider,
  Viewer,
  buildModuleUrl,
} from "cesium";

Ion.defaultAccessToken = "";

export function createEarthViewer(container: HTMLElement): Viewer {
  const viewer = new Viewer(container, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    terrainProvider: new EllipsoidTerrainProvider(),
    baseLayer: false,
  });

  void TileMapServiceImageryProvider.fromUrl(
    buildModuleUrl("Assets/Textures/NaturalEarthII"),
    { credit: new Credit("Natural Earth II · public domain") },
  ).then((provider) => {
    if (!viewer.isDestroyed()) viewer.imageryLayers.addImageryProvider(provider);
  });

  viewer.scene.globe.baseColor = Color.fromCssColorString("#071216");
  viewer.scene.backgroundColor = Color.fromCssColorString("#030709");
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
  const isPortrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth * 1.08;
  const openingHeight = isPortrait ? 12_500_000 : 18_500_000;
  viewer.camera.setView({ destination: Cartesian3.fromDegrees(101.5, 8, openingHeight) });

  return viewer;
}
