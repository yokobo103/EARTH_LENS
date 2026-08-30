import type { EarthMission } from "./types";
import malaccaSticker from "../assets/stickers/mission-01-malacca.webp";
import himalayasSticker from "../assets/stickers/mission-02-himalayas.webp";
import hormuzSticker from "../assets/stickers/mission-03-hormuz.webp";
import suezSticker from "../assets/stickers/mission-04-suez.webp";
import rotterdamSticker from "../assets/stickers/mission-05-rotterdam.webp";
import gibraltarSticker from "../assets/stickers/mission-06-gibraltar.webp";
import lithiumSticker from "../assets/stickers/mission-07-lithium.webp";
import riftSticker from "../assets/stickers/mission-08-rift.webp";

export const missionCatalog: readonly EarthMission[] = [
  {
    id: "mission-01-malacca", number: 1, type: "bottleneck", title: "FIND THE BOTTLENECK",
    prompt: "Find where major maritime traffic between East Asia and the Indian Ocean is squeezed most tightly by geography.",
    region: "asia", recommendedLensIds: ["terrain-relief", "shipping-flows", "strategic-chokepoints"],
    target: { name: "STRAIT OF MALACCA", latitude: 2.5, longitude: 101.2, successRadiusKm: 450 },
    hints: [
      { id: "malacca-oceans", number: 1, title: "OCEAN CLUE", text: "The passage links the Indian Ocean with the Pacific side of Asia." },
      { id: "malacca-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward Southeast Asia.", effect: { type: "camera-focus", location: { latitude: 8, longitude: 103 }, altitude: 7_500_000, label: "SOUTHEAST ASIA" } },
      { id: "malacca-region", number: 3, title: "REGION SIGNAL", text: "Look for a narrow corridor beside a major port city.", effect: { type: "region-signal", location: { latitude: 3, longitude: 102 }, radiusKm: 650, label: "MARITIME CORRIDOR REGION" } },
    ],
    sticker: { id: "sticker-malacca", missionId: "mission-01-malacca", title: "MALACCA", region: "Southeast Asia", image: malaccaSticker, shape: "oval", icon: "strait", description: "Container ship and tropical strait", coordinateLabel: "2.5°N / 101.2°E" },
    completion: { evidenceChain: [
      { lensId: "physical-features", featureId: "physical-malacca", relationship: "corridor", title: "TERRAIN", text: "Narrow maritime corridor" },
      { lensId: "shipping-flows", featureId: "flow-east-asia-europe", relationship: "overlap", title: "SHIPPING", text: "Major flow concentration" },
      { lensId: "strategic-chokepoints", featureId: "strait-of-malacca", relationship: "connected", title: "CHOKEPOINT", text: "Strategic bottleneck" },
    ] },
  },
  {
    id: "mission-02-himalayas", number: 2, type: "barrier", title: "FIND THE BARRIER",
    prompt: "Find the immense natural barrier between South Asia and the Tibetan Plateau.",
    region: "asia", recommendedLensIds: ["terrain-relief", "physical-features"],
    target: { name: "HIMALAYAS", latitude: 28.2, longitude: 86.5, successRadiusKm: 650 },
    hints: [
      { id: "himalayas-scale", number: 1, title: "SCALE CLUE", text: "The answer is a mountain system, not a border or a city." },
      { id: "himalayas-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward South and Central Asia.", effect: { type: "camera-focus", location: { latitude: 30, longitude: 84 }, altitude: 7_800_000, label: "SOUTH / CENTRAL ASIA" } },
      { id: "himalayas-region", number: 3, title: "ELEVATION SIGNAL", text: "Search along the southern edge of a vast high plateau.", effect: { type: "region-signal", location: { latitude: 29, longitude: 84 }, radiusKm: 1_050, label: "HIGH ELEVATION BELT" } },
    ],
    sticker: { id: "sticker-himalayas", missionId: "mission-02-himalayas", title: "HIMALAYAS", region: "High Asia", image: himalayasSticker, shape: "shield", icon: "mountain", description: "Snow mountains and expedition motif", coordinateLabel: "28.2°N / 86.5°E" },
    completion: { evidenceChain: [
      { lensId: "terrain-relief", featureId: "terrain-himalayas", relationship: "barrier", title: "TERRAIN", text: "Extreme high-relief belt" },
      { lensId: "physical-features", featureId: "himalayas", relationship: "overlap", title: "PHYSICAL FEATURE", text: "Continental-scale mountain barrier" },
    ] },
  },
  {
    id: "mission-03-hormuz", number: 3, type: "gateway", title: "FIND THE GATEWAY",
    prompt: "Find the narrow gateway energy shipping must first cross when leaving the Persian Gulf for the open ocean.",
    region: "middle-east", recommendedLensIds: ["terrain-relief", "shipping-flows", "strategic-chokepoints"],
    target: { name: "STRAIT OF HORMUZ", latitude: 26.56, longitude: 56.25, successRadiusKm: 380 },
    hints: [
      { id: "hormuz-text", number: 1, title: "REGIONAL CLUE", text: "This gateway lies in the Middle East." },
      { id: "hormuz-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward the Arabian Peninsula.", effect: { type: "camera-focus", location: { latitude: 25, longitude: 52 }, altitude: 7_000_000, label: "ARABIAN PENINSULA" } },
      { id: "hormuz-region", number: 3, title: "PERSIAN GULF SIGNAL", text: "Search around the seaward exit of the Persian Gulf.", effect: { type: "region-signal", location: { latitude: 27, longitude: 52 }, radiusKm: 850, label: "PERSIAN GULF REGION" } },
    ],
    sticker: { id: "sticker-hormuz", missionId: "mission-03-hormuz", title: "HORMUZ", region: "Persian Gulf", image: hormuzSticker, shape: "arch", icon: "tanker", description: "Tanker and Persian Gulf sunset", coordinateLabel: "26.6°N / 56.3°E" },
    completion: { evidenceChain: [
      { lensId: "terrain-relief", featureId: "physical-hormuz", relationship: "corridor", title: "TERRAIN", text: "Confined gulf exit" },
      { lensId: "shipping-flows", featureId: "flow-middle-east-europe", relationship: "overlap", title: "SHIPPING", text: "Outbound maritime flow" },
      { lensId: "strategic-chokepoints", featureId: "strait-of-hormuz", relationship: "connected", title: "GATEWAY", text: "Strategic energy passage" },
    ] },
  },
  {
    id: "mission-04-suez", number: 4, type: "shortcut", title: "FIND THE SHORTCUT",
    prompt: "Find the passage that lets Europe–Indian Ocean shipping avoid the long voyage around Africa.",
    region: "middle-east", recommendedLensIds: ["terrain-relief", "shipping-flows", "strategic-chokepoints"],
    target: { name: "SUEZ CANAL", latitude: 30.58, longitude: 32.3, successRadiusKm: 300 },
    hints: [
      { id: "suez-text", number: 1, title: "ROUTE CLUE", text: "The answer joins two seas across an arid isthmus." },
      { id: "suez-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward northeast Africa.", effect: { type: "camera-focus", location: { latitude: 28, longitude: 31 }, altitude: 6_500_000, label: "NORTHEAST AFRICA" } },
      { id: "suez-region", number: 3, title: "ISTHMUS SIGNAL", text: "Search between the Mediterranean and the Red Sea.", effect: { type: "region-signal", location: { latitude: 29, longitude: 32 }, radiusKm: 650, label: "TWO-SEAS CORRIDOR" } },
    ],
    sticker: { id: "sticker-suez", missionId: "mission-04-suez", title: "SUEZ CANAL", region: "Egypt", image: suezSticker, shape: "rectangle", icon: "canal", description: "Cargo ship crossing a desert canal", coordinateLabel: "30.6°N / 32.3°E" },
    completion: { evidenceChain: [
      { lensId: "shipping-flows", featureId: "flow-middle-east-europe", relationship: "corridor", title: "SHIPPING", text: "Intercontinental shortcut" },
      { lensId: "strategic-chokepoints", featureId: "suez-canal", relationship: "overlap", title: "CANAL", text: "Artificial passage across an isthmus" },
    ] },
  },
  {
    id: "mission-05-rotterdam", number: 5, type: "hub", title: "FIND THE HUB",
    prompt: "Find the logistics hub where the North Sea connects with Europe's inland distribution network.",
    region: "europe", recommendedLensIds: ["major-ports", "shipping-flows"],
    target: { name: "ROTTERDAM", latitude: 51.95, longitude: 4.14, successRadiusKm: 250 },
    hints: [
      { id: "rotterdam-text", number: 1, title: "COASTAL CLUE", text: "The hub faces the North Sea." },
      { id: "rotterdam-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward Western Europe.", effect: { type: "camera-focus", location: { latitude: 51, longitude: 5 }, altitude: 5_500_000, label: "WESTERN EUROPE" } },
      { id: "rotterdam-region", number: 3, title: "DELTA SIGNAL", text: "Look around a low-lying river delta with a major port signal.", effect: { type: "region-signal", location: { latitude: 51.7, longitude: 4.5 }, radiusKm: 450, label: "NORTH SEA DELTA" } },
    ],
    sticker: { id: "sticker-rotterdam", missionId: "mission-05-rotterdam", title: "ROTTERDAM", region: "North Sea", image: rotterdamSticker, shape: "oval", icon: "port", description: "Port cranes and containers", coordinateLabel: "52.0°N / 4.1°E" },
    completion: { evidenceChain: [
      { lensId: "major-ports", featureId: "port-rotterdam", relationship: "overlap", title: "PORT", text: "Major maritime infrastructure" },
      { lensId: "shipping-flows", featureId: "flow-atlantic-europe", relationship: "connected", title: "SHIPPING", text: "North Sea gateway" },
    ] },
  },
  {
    id: "mission-06-gibraltar", number: 6, type: "gateway", title: "FIND THE GATEWAY",
    prompt: "Find where maritime traffic concentrates between the Mediterranean Sea and the Atlantic Ocean.",
    region: "europe", recommendedLensIds: ["terrain-relief", "shipping-flows"],
    target: { name: "STRAIT OF GIBRALTAR", latitude: 36.0, longitude: -5.6, successRadiusKm: 320 },
    hints: [
      { id: "gibraltar-text", number: 1, title: "SEA CLUE", text: "The passage separates Europe and Africa." },
      { id: "gibraltar-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward the western Mediterranean.", effect: { type: "camera-focus", location: { latitude: 36, longitude: -3 }, altitude: 5_800_000, label: "WESTERN MEDITERRANEAN" } },
      { id: "gibraltar-region", number: 3, title: "GATEWAY SIGNAL", text: "Search near the Atlantic entrance to the Mediterranean.", effect: { type: "region-signal", location: { latitude: 36, longitude: -5 }, radiusKm: 520, label: "MEDITERRANEAN GATEWAY" } },
    ],
    sticker: { id: "sticker-gibraltar", missionId: "mission-06-gibraltar", title: "GIBRALTAR", region: "Western Mediterranean", image: gibraltarSticker, shape: "shield", icon: "rock", description: "Rock and passing ship", coordinateLabel: "36.0°N / 5.6°W" },
    completion: { evidenceChain: [
      { lensId: "terrain-relief", featureId: "gibraltar-terrain", relationship: "corridor", title: "TERRAIN", text: "Narrow opening between land masses" },
      { lensId: "shipping-flows", featureId: "flow-mediterranean-atlantic", relationship: "overlap", title: "SHIPPING", text: "Sea traffic converges at the gateway" },
    ] },
  },
  {
    id: "mission-07-lithium", number: 7, type: "resource", title: "FIND THE RESOURCE REGION",
    prompt: "Find the high-altitude salt-flat region where Chile, Bolivia, and Argentina meet.",
    region: "south-america", recommendedLensIds: ["terrain-relief", "critical-minerals", "admin0-borders"],
    target: { name: "LITHIUM TRIANGLE", latitude: -23.5, longitude: -67.5, successRadiusKm: 700 },
    hints: [
      { id: "lithium-text", number: 1, title: "LANDSCAPE CLUE", text: "Look for an arid plateau beside the Andes." },
      { id: "lithium-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward western South America.", effect: { type: "camera-focus", location: { latitude: -23, longitude: -68 }, altitude: 7_000_000, label: "CENTRAL ANDES" } },
      { id: "lithium-region", number: 3, title: "PLATEAU SIGNAL", text: "Search around the borders of Chile, Bolivia, and Argentina.", effect: { type: "region-signal", location: { latitude: -23.5, longitude: -67.5 }, radiusKm: 900, label: "HIGH-ALTITUDE SALT FLATS" } },
    ],
    sticker: { id: "sticker-lithium", missionId: "mission-07-lithium", title: "LITHIUM TRIANGLE", region: "Central Andes", image: lithiumSticker, shape: "custom", icon: "salt-flat", description: "Salt flat and Andes", coordinateLabel: "23.5°S / 67.5°W" },
    completion: { evidenceChain: [
      { lensId: "terrain-relief", featureId: "andes", relationship: "nearby", title: "TERRAIN", text: "High arid plateau beside the Andes" },
      { lensId: "critical-minerals", featureId: "chile-copper-demo", relationship: "nearby", title: "MINERALS", text: "Prototype coverage is demo-only and incomplete" },
      { lensId: "admin0-borders", featureId: "country-bol", relationship: "overlap", title: "BORDERS", text: "Three-country resource region" },
    ] },
  },
  {
    id: "mission-08-rift", number: 8, type: "terrain", title: "FIND THE RIFT",
    prompt: "Find the immense terrain belt where the African continent is slowly pulling apart.",
    region: "africa", recommendedLensIds: ["terrain-relief", "physical-features"],
    target: { name: "EAST AFRICAN RIFT", latitude: -1.5, longitude: 36.2, successRadiusKm: 900 },
    hints: [
      { id: "rift-text", number: 1, title: "TECTONIC CLUE", text: "The feature runs through eastern Africa rather than along a coastline." },
      { id: "rift-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward the Great Lakes and East Africa.", effect: { type: "camera-focus", location: { latitude: -2, longitude: 35 }, altitude: 7_500_000, label: "EAST AFRICA" } },
      { id: "rift-region", number: 3, title: "RIFT SIGNAL", text: "Look for a long north–south zone of valleys and highlands.", effect: { type: "region-signal", location: { latitude: -1, longitude: 36 }, radiusKm: 1_200, label: "RIFT VALLEY BELT" } },
    ],
    sticker: { id: "sticker-rift", missionId: "mission-08-rift", title: "EAST AFRICAN RIFT", region: "East Africa", image: riftSticker, shape: "arch", icon: "rift", description: "Rift valley and volcano", coordinateLabel: "1.5°S / 36.2°E" },
    completion: { evidenceChain: [
      { lensId: "terrain-relief", featureId: "east-african-rift", relationship: "overlap", title: "TERRAIN", text: "Long valley-and-highland system" },
      { lensId: "physical-features", featureId: "east-african-rift", relationship: "corridor", title: "PHYSICAL GEOGRAPHY", text: "Future plate-boundary data will deepen this evidence" },
    ] },
  },
] as const;
