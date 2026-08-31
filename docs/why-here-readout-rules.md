# WHY HERE? readout rules (v0.4)

The WHY HERE? summary is a deterministic observation readout. It does not call an LLM, make causal claims, or infer intent from the data. The rules below are the current Codex proposal for the prototype; they remain easy to revise as the observation experience is tested.

| Priority | Evidence pattern | Readout tone | Supporting evidence shown |
| --- | --- | --- | --- |
| 1 | `STRATEGIC CHOKEPOINTS` + `PHYSICAL FEATURES` | 「通り道っぽい」 | Reacting lens names, nearest named feature |
| 2 | Two or more human lenses + `STRATEGIC CHOKEPOINTS` | 「流れが集まる要所っぽい」 | Reacting lens names, nearest named feature |
| 3 | Two or more human lenses | 「人が作った流れが重なっているっぽい」 | Reacting lens names, nearest named feature |
| 4 | Earth evidence only (`TERRAIN` or `PHYSICAL FEATURES`) | 「地形の特徴はあるが、人の活動は薄い」 | Reacting lens names, nearest named feature |
| 5 | No nearby evidence in the active Lens set | 「このLensの組み合わせでは、まだ何も見えていない」 | `該当なし` plus collapsed silent-lens list |

Reacting lenses are ordered by their nearest feature distance. The closest named feature is computed across all loaded datasets, so an open-ocean scan can still report the nearest named feature outside the 500 km nearby-evidence radius. The nearby result inclusion radius itself is unchanged.

Japanese port labels use a separate Natural Earth `ne_id` dictionary. Mapped major ports show `日本語名 / Original`; unmapped names remain in their original form rather than being guessed or transliterated.
