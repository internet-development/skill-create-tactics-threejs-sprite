# Frozen Walk (SEQ 74-79)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 74 | 0x60 | Frozen Walk 1 Fwd | F9(0) | `LF1` -> `BF1` -> `RF1` |
| 75 | 0x61 | Frozen Walk 1 Bck | F14(0) | `LB1` -> `BB1` -> `RB1` |
| 76 | 0x62 | Frozen Walk 2 Fwd | F13(0) | `LF5` -> `BF5` -> `RF5` |
| 77 | 0x63 | Frozen Walk 2 Bck | F18(0) | `LB5` -> `BB5` -> `RB5` |
| 78 | 0x64 | Nulled Walk Fwd | 1067ms | F76(6) -> F75(8) -> F74(10) -> F75(8) -> F76(6) -> F77(8) -> F78(10) -> F77(8) |
| 79 | 0x65 | Nulled Walk Bck | 1067ms | F81(6) -> F80(8) -> F79(10) -> F80(8) -> F81(6) -> F82(8) -> F83(10) -> F82(8) |

Note: Nulled Walk (SEQ 78-79) uses frames 74-83, which are `SR1` placeholders in TYPE1. Their water frames F256-F265 are real composites, so Mode NW plays those.
