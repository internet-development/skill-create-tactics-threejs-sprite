# High Jump Land and Status (SEQ 52-61)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 52 | 0x40 | High Jump Land Fwd | 300ms | F27(2) -> F21(10) -> F19(6) |
| 53 | 0x41 | High Jump Land Bck | 300ms | F29(2) -> F22(10) -> F20(6) |
| 54 | 0x42 | Charging Fwd | F19(0) | `SP3` -> `HR1` -> `DF2` |
| 55 | 0x43 | Charging Bck | F20(0) | `SP2` -> `HR2` -> `DB2` |
| 56 | 0x44 | Charging Hold Fwd | F19(2) | Same as 54, with 33ms delay |
| 57 | 0x45 | Charging Hold Bck | F20(2) | Same as 55, with 33ms delay |
| 58 | 0x46 | Frozen Fwd | F13(0) | `LF5` -> `BF5` -> `RF5` |
| 59 | 0x47 | Frozen Bck | F18(0) | `LB5` -> `BB5` -> `RB5` |
| 60 | 0x48 | Sleeping Fwd | F72(0) | `OV2` -> `KO3` (stunned/crystal) |
| 61 | 0x49 | Sleeping Bck | F73(0) | `KO4` |
