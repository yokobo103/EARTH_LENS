import type { MissionPassportDefinition } from "./passportTypes";

export const passportCatalog: readonly MissionPassportDefinition[] = [
  {
    id: "passport-vol-1",
    number: 1,
    titleKey: "passportVol1Title",
    subtitleKey: "passportVol1Subtitle",
    sections: [
      {
        id: "vol-1-discoveries",
        missionIds: [
          "mission-01-malacca",
          "mission-02-himalayas",
          "mission-03-hormuz",
          "mission-04-suez",
          "mission-05-rotterdam",
          "mission-06-gibraltar",
          "mission-07-lithium",
          "mission-08-rift",
        ],
      },
    ],
  },
  {
    id: "passport-vol-2",
    number: 2,
    titleKey: "passportVol2Title",
    subtitleKey: "passportVol2Subtitle",
    sections: [
      {
        id: "vol-2-cradles",
        titleKey: "passportVol2SectionCradles",
        missionIds: [
          "mission-v2-01-nile",
          "mission-v2-02-mesopotamia",
          "mission-v2-03-indus",
          "mission-v2-04-yellow-river",
        ],
      },
      {
        id: "vol-2-megacities",
        titleKey: "passportVol2SectionMegacities",
        missionIds: [
          "mission-v2-05-tokyo",
          "mission-v2-06-new-york",
          "mission-v2-07-mexico-city",
          "mission-v2-08-sao-paulo",
        ],
      },
    ],
  },
];
