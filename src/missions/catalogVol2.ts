import type { EarthMission } from "./types";
import nileSticker from "../assets/stickers/vol2/mission-v2-01-nile.png";
import mesopotamiaSticker from "../assets/stickers/vol2/mission-v2-02-mesopotamia.png";
import indusSticker from "../assets/stickers/vol2/mission-v2-03-indus.png";
import yellowRiverSticker from "../assets/stickers/vol2/mission-v2-04-yellow-river.png";
import tokyoSticker from "../assets/stickers/vol2/mission-v2-05-tokyo.png";
import newYorkSticker from "../assets/stickers/vol2/mission-v2-06-new-york.png";
import mexicoCitySticker from "../assets/stickers/vol2/mission-v2-07-mexico-city.png";
import saoPauloSticker from "../assets/stickers/vol2/mission-v2-08-sao-paulo.png";

export const missionCatalogVol2: readonly EarthMission[] = [
  {
    id: "mission-v2-01-nile", number: 1, type: "find", title: "FIND THE RIVER THROUGH THE DESERT",
    prompt: "Find the great river that cuts through one of the world's broadest dry zones.",
    region: "africa", recommendedLensIds: ["rivers", "deserts"],
    target: { name: "NILE RIVER", latitude: 26.8, longitude: 31.2, successRadiusKm: 600 },
    hints: [
      { id: "v2-nile-feature", number: 1, title: "LANDSCAPE CLUE", text: "Look for a major river crossing a vast dry region." },
      { id: "v2-nile-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward North Africa.", effect: { type: "camera-focus", location: { latitude: 26, longitude: 30 }, altitude: 6_000_000, label: "NORTH AFRICA" } },
      { id: "v2-nile-region", number: 3, title: "RIVER SIGNAL", text: "Search for the long green corridor between the desert and the sea.", effect: { type: "region-signal", location: { latitude: 26.8, longitude: 31.2 }, radiusKm: 700, label: "NILE CORRIDOR" } },
    ],
    sticker: { id: "sticker-v2-nile", missionId: "mission-v2-01-nile", title: "NILE RIVER", region: "Egypt / Northeast Africa", image: nileSticker, shape: "oval", icon: "strait", description: "Nile, desert and ancient civilization", coordinateLabel: "26.8°N / 31.2°E" },
    completion: {
      answer: "The desert is almost continuous, but this one river carries water through it. That narrow contrast let people, farming, and cities gather along a single green line.",
      evidenceChain: [
        { lensId: "rivers", featureId: "river-ne-731", relationship: "corridor", title: "NILE", text: "A major river corridor through North Africa" },
        { lensId: "deserts", featureId: "arid-n22e021", relationship: "overlap", title: "DRY ZONE", text: "Long-term arid climate surrounding the corridor" },
      ],
    },
  },
  {
    id: "mission-v2-02-mesopotamia", number: 2, type: "find", title: "FIND THE LAND BETWEEN TWO RIVERS",
    prompt: "Find the lowland shaped by the two great rivers of Mesopotamia.",
    region: "middle-east", recommendedLensIds: ["rivers"],
    target: { name: "MESOPOTAMIA", latitude: 32.5, longitude: 44.5, successRadiusKm: 550 },
    hints: [
      { id: "v2-meso-feature", number: 1, title: "TWO-RIVER CLUE", text: "Look for a lowland defined by two large rivers running toward one another." },
      { id: "v2-meso-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward the Middle East.", effect: { type: "camera-focus", location: { latitude: 32, longitude: 44 }, altitude: 5_500_000, label: "TWO-RIVER LOWLAND" } },
      { id: "v2-meso-region", number: 3, title: "RIVER PLAIN SIGNAL", text: "Search the broad plain between the Tigris and Euphrates.", effect: { type: "region-signal", location: { latitude: 32.5, longitude: 44.5 }, radiusKm: 650, label: "TIGRIS–EUPHRATES PLAIN" } },
    ],
    sticker: { id: "sticker-v2-mesopotamia", missionId: "mission-v2-02-mesopotamia", title: "MESOPOTAMIA", region: "Tigris–Euphrates", image: mesopotamiaSticker, shape: "custom", icon: "canal", description: "Two rivers and ancient cities", coordinateLabel: "32.5°N / 44.5°E" },
    completion: {
      answer: "Mesopotamia means the land between rivers. The Tigris and Euphrates made a wide, connected plain where water could turn a difficult landscape into a place for early cities.",
      evidenceChain: [
        { lensId: "rivers", featureId: "river-ne-209", relationship: "connected", title: "TIGRIS", text: "One side of the two-river system" },
        { lensId: "rivers", featureId: "river-ne-880", relationship: "connected", title: "EUPHRATES", text: "The other river shaping the plain" },
      ],
    },
  },
  {
    id: "mission-v2-03-indus", number: 3, type: "find", title: "FIND THE INDUS CIVILIZATION",
    prompt: "Find the river valley where a major early urban civilization grew across South Asia.",
    region: "asia", recommendedLensIds: ["rivers"],
    target: { name: "INDUS VALLEY", latitude: 27.5, longitude: 68.5, successRadiusKm: 600 },
    hints: [
      { id: "v2-indus-feature", number: 1, title: "WATER SYSTEM CLUE", text: "Start with a river system in a dry lowland south of a high mountain wall." },
      { id: "v2-indus-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward South Asia.", effect: { type: "camera-focus", location: { latitude: 27, longitude: 69 }, altitude: 6_000_000, label: "SOUTH ASIA" } },
      { id: "v2-indus-region", number: 3, title: "VALLEY SIGNAL", text: "Search along the lower Indus and its broad surrounding plain.", effect: { type: "region-signal", location: { latitude: 27.5, longitude: 68.5 }, radiusKm: 700, label: "INDUS VALLEY" } },
    ],
    sticker: { id: "sticker-v2-indus", missionId: "mission-v2-03-indus", title: "INDUS VALLEY", region: "South Asia", image: indusSticker, shape: "shield", icon: "mountain", description: "River valley and ancient city", coordinateLabel: "27.5°N / 68.5°E" },
    completion: {
      answer: "The Indus is a long water system crossing the dry northwest of South Asia. Its river valley, rather than a present-day border, explains where early cities could take root.",
      evidenceChain: [
        { lensId: "rivers", featureId: "river-ne-811", relationship: "corridor", title: "INDUS", text: "A major South Asian river system" },
      ],
    },
  },
  {
    id: "mission-v2-04-yellow-river", number: 4, type: "find", title: "FIND THE YELLOW RIVER CIVILIZATION",
    prompt: "Follow a major river through northern China to find the region where early cities gathered.",
    region: "asia", recommendedLensIds: ["rivers"],
    target: { name: "YELLOW RIVER", latitude: 34.6, longitude: 112.5, successRadiusKm: 600 },
    hints: [
      { id: "v2-yellow-feature", number: 1, title: "RIVER CLUE", text: "Follow a large east-flowing river through a broad northern plain." },
      { id: "v2-yellow-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward East Asia.", effect: { type: "camera-focus", location: { latitude: 35, longitude: 112 }, altitude: 6_000_000, label: "NORTH CHINA" } },
      { id: "v2-yellow-region", number: 3, title: "YELLOW RIVER SIGNAL", text: "Search around the middle course of the major river.", effect: { type: "region-signal", location: { latitude: 34.6, longitude: 112.5 }, radiusKm: 700, label: "YELLOW RIVER BASIN" } },
    ],
    sticker: { id: "sticker-v2-yellow-river", missionId: "mission-v2-04-yellow-river", title: "YELLOW RIVER", region: "North China", image: yellowRiverSticker, shape: "custom", icon: "rift", description: "Yellow River and ancient civilization", coordinateLabel: "34.6°N / 112.5°E" },
    completion: {
      answer: "The Yellow River draws a visible path through the northern Chinese plain. Following the waterway makes the location of early settlement legible without needing to start from a modern national border.",
      evidenceChain: [
        { lensId: "rivers", featureId: "river-ne-1326", relationship: "corridor", title: "HUANG", text: "The major river known as the Yellow River" },
      ],
    },
  },
  {
    id: "mission-v2-05-tokyo", number: 5, type: "hub", title: "FIND THE BAY MEGACITY",
    prompt: "Find the enormous population cluster gathered around a bay on the Japanese archipelago.",
    region: "asia", recommendedLensIds: ["populated-places"],
    target: { name: "TOKYO", latitude: 35.68, longitude: 139.69, successRadiusKm: 250 },
    hints: [
      { id: "v2-tokyo-feature", number: 1, title: "POPULATION CLUE", text: "Look for the brightest population cluster on an island chain." },
      { id: "v2-tokyo-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward Japan.", effect: { type: "camera-focus", location: { latitude: 35, longitude: 139 }, altitude: 4_500_000, label: "JAPAN" } },
      { id: "v2-tokyo-region", number: 3, title: "BAY SIGNAL", text: "Search on the eastern side of the largest Japanese island.", effect: { type: "region-signal", location: { latitude: 35.68, longitude: 139.69 }, radiusKm: 320, label: "TOKYO BAY" } },
    ],
    sticker: { id: "sticker-v2-tokyo", missionId: "mission-v2-05-tokyo", title: "TOKYO", region: "Japan", image: tokyoSticker, shape: "rectangle", icon: "port", description: "Tokyo Bay and megacity skyline", coordinateLabel: "35.7°N / 139.7°E" },
    completion: {
      answer: "The population lens makes this bay glow as one of the largest human concentrations on Earth. The city is not just a point on Japan; it is a bright regional mass gathered around the coast.",
      evidenceChain: [
        { lensId: "populated-places", featureId: "place-139.749-35.687", relationship: "overlap", title: "TOKYO", text: "A major population concentration on the Japanese archipelago" },
      ],
    },
  },
  {
    id: "mission-v2-06-new-york", number: 6, type: "hub", title: "FIND THE ATLANTIC MEGACITY",
    prompt: "Find the enormous population cluster on the Atlantic side of North America.",
    region: "north-america", recommendedLensIds: ["populated-places"],
    target: { name: "NEW YORK CITY", latitude: 40.71, longitude: -74.01, successRadiusKm: 250 },
    hints: [
      { id: "v2-new-york-feature", number: 1, title: "COASTAL POPULATION CLUE", text: "Look for a bright population cluster where a major river reaches the Atlantic." },
      { id: "v2-new-york-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward the eastern United States.", effect: { type: "camera-focus", location: { latitude: 40, longitude: -74 }, altitude: 4_500_000, label: "NORTH AMERICAN EAST COAST" } },
      { id: "v2-new-york-region", number: 3, title: "HARBOR SIGNAL", text: "Search around the large harbor at the northeastern edge of the continent.", effect: { type: "region-signal", location: { latitude: 40.71, longitude: -74.01 }, radiusKm: 320, label: "ATLANTIC MEGACITY" } },
    ],
    sticker: { id: "sticker-v2-new-york", missionId: "mission-v2-06-new-york", title: "NEW YORK", region: "North America", image: newYorkSticker, shape: "oval", icon: "port", description: "Manhattan skyline and harbor", coordinateLabel: "40.7°N / 74.0°W" },
    completion: {
      answer: "On the eastern edge of North America, one population point burns far brighter than the surrounding coast. The harbor and river mouth helped turn this location into a city with a continental reach.",
      evidenceChain: [
        { lensId: "populated-places", featureId: "place--73.996-40.722", relationship: "overlap", title: "NEW YORK", text: "A major Atlantic-side population concentration" },
      ],
    },
  },
  {
    id: "mission-v2-07-mexico-city", number: 7, type: "hub", title: "FIND THE HIGHLAND MEGACITY",
    prompt: "Find the giant population cluster in a high basin far from the coast and surrounded by mountains.",
    region: "north-america", recommendedLensIds: ["populated-places", "physical-features"],
    target: { name: "MEXICO CITY", latitude: 19.43, longitude: -99.13, successRadiusKm: 250 },
    hints: [
      { id: "v2-mexico-feature", number: 1, title: "HIGHLAND CLUE", text: "Look for a dense population cluster in a basin between high terrain." },
      { id: "v2-mexico-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward central Mexico.", effect: { type: "camera-focus", location: { latitude: 20, longitude: -99 }, altitude: 4_500_000, label: "MEXICAN HIGHLANDS" } },
      { id: "v2-mexico-region", number: 3, title: "BASIN SIGNAL", text: "Search inland, between the mountain belts of central Mexico.", effect: { type: "region-signal", location: { latitude: 19.43, longitude: -99.13 }, radiusKm: 320, label: "HIGHLAND BASIN" } },
    ],
    sticker: { id: "sticker-v2-mexico-city", missionId: "mission-v2-07-mexico-city", title: "MEXICO CITY", region: "Mexican Highlands", image: mexicoCitySticker, shape: "custom", icon: "mountain", description: "Highland megacity and volcanoes", coordinateLabel: "19.4°N / 99.1°W" },
    completion: {
      answer: "This is a megacity away from the coast, gathered high in a basin ringed by mountains. Population and terrain together reveal a different kind of urban concentration from the great port cities.",
      evidenceChain: [
        { lensId: "populated-places", featureId: "place--99.133-19.444", relationship: "overlap", title: "MEXICO CITY", text: "A major population concentration in the central highlands" },
        { lensId: "physical-features", featureId: "physical-ne-1159103945", relationship: "nearby", title: "HIGHLANDS", text: "Mountain terrain around the basin" },
      ],
    },
  },
  {
    id: "mission-v2-08-sao-paulo", number: 8, type: "hub", title: "FIND THE SOUTH AMERICAN GIANT",
    prompt: "Find the enormous population cluster in southeastern South America.",
    region: "south-america", recommendedLensIds: ["populated-places"],
    target: { name: "SÃO PAULO", latitude: -23.55, longitude: -46.63, successRadiusKm: 250 },
    hints: [
      { id: "v2-sao-feature", number: 1, title: "CONTINENTAL CLUE", text: "Look for a major population cluster south of the equator." },
      { id: "v2-sao-camera", number: 2, title: "CAMERA SIGNAL", text: "Observation focus is narrowing toward southeastern South America.", effect: { type: "camera-focus", location: { latitude: -23, longitude: -47 }, altitude: 5_000_000, label: "SOUTHEASTERN SOUTH AMERICA" } },
      { id: "v2-sao-region", number: 3, title: "SOUTH AMERICAN SIGNAL", text: "Search in the bright southeastern core of Brazil.", effect: { type: "region-signal", location: { latitude: -23.55, longitude: -46.63 }, radiusKm: 320, label: "BRAZILIAN MEGACITY" } },
    ],
    sticker: { id: "sticker-v2-sao-paulo", missionId: "mission-v2-08-sao-paulo", title: "SÃO PAULO", region: "Brazil", image: saoPauloSticker, shape: "oval", icon: "port", description: "South American megacity skyline", coordinateLabel: "23.6°S / 46.6°W" },
    completion: {
      answer: "South America also has a population core visible from the scale of the globe. In southeastern Brazil, one bright urban mass gathers far beyond the footprint of a single neighborhood.",
      evidenceChain: [
        { lensId: "populated-places", featureId: "place--46.627--23.557", relationship: "overlap", title: "SÃO PAULO", text: "A major population concentration in southeastern Brazil" },
      ],
    },
  },
];
