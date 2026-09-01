# WHY HERE? / SCAN readout

The v0.4 readout is evidence-only. It compares every registered Lens result,
then gives the most distinctive signal the lead without claiming causality.
The local scan radius remains 500 km.

## Deterministic wording table

| Condition | Lead tone | Meaning shown |
| --- | --- | --- |
| No nearby features | Open field | The nearest named feature and its distance are shown; no “nothing found” dead end. |
| One reacting Lens | Single signal | One signal is in the foreground. |
| Two or more categories | Cross-category | Multiple observation categories overlap at the point. |
| One earth-category Lens only | Physical signal | A physical layer leads the readout. |
| A Lens has at least two nearby features and the highest rarity score | Rare local concentration | The densest/most distinctive Lens is named with its nearby/total count and coverage percentage. |

The rarity score is deterministic: nearby count, nearby share of the Lens dataset,
and a small repeat-signal bonus. Ties resolve by nearest feature distance. No
randomness, LLM, network request, or runtime global scan is used.

## Acceptance samples

These are representative fixtures for visual/wording QA; distances and counts
come from the current demo snapshot when the same coordinates are scanned.

| Point | Expected lead shape |
| --- | --- |
| Singapore region | `8 lenses overlap here · 23 nearby features` followed by reacting Lens chips and a closest named feature. |
| Brazil interior | A country/border signal is shown; the readout does not say that nothing is visible. |
| Mid-Pacific | `This field is open…` plus the nearest named feature and its distance outside the 500 km radius. |
| Murmansk region | A physical/sea-ice signal can lead, with the nearest feature distance kept visible. |
| Sahara interior | A physical signal or cross-category lead appears when the arid-region/border evidence reacts. |

Lens-level further-reading links appear only when at least one reacting Lens has
an external guide. This keeps `WHY HERE?` an honest door to deeper material,
not an unsupported explanation of why a place matters.
