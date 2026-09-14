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
];
