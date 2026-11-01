# Jump (SEQ 42-51)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Mid-air pose, the jump up and down, and the three parts of the high jump: take-off, hold and, in `09-jump-land-status.md`, landing.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 42 | 0x36 | Mid Jump Fwd | F28(0) | `EFL3` -> `BF3` -> `EFR3` (arms spread) |
| 43 | 0x37 | Mid Jump Bck | F30(0) | `EFL4` -> `BB3` -> `EFR4` (arms spread) |
| 44 | 0x38 | Jump Up Fwd | 633ms | F11(6) -> F27(6) -> F31(2)x2 -> F31(4) -> F31(6) -> F31(4) -> F31(2)x2 -> F27(4) |
| 45 | 0x39 | Jump Up Bck | 633ms | F16(6) -> F29(6) -> F33(2)x2 -> F33(4) -> F33(6) -> F33(4) -> F33(2)x2 -> F29(4) |
| 46 | 0x3A | Jump Down Fwd | 633ms | F11(6) -> F27(6) -> F28(4)x2 -> F28(6) -> F28(4)x2 -> F27(4) |
| 47 | 0x3B | Jump Down Bck | 633ms | F16(6) -> F29(6) -> F30(4)x2 -> F30(6) -> F30(4)x2 -> F29(4) |
| 48 | 0x3C | High Jump Start Fwd | 367ms + hold | F2(4) -> F19(4) -> F21(8) -> F19(2) -> F27(4) -> F31(0) |
| 49 | 0x3D | High Jump Start Bck | 367ms + hold | F8(4) -> F20(4) -> F22(8) -> F20(2) -> F29(4) -> F33(0) |
| 50 | 0x3E | High Jump Hold Fwd | F31(0) | `EFL3` -> `AU1` -> `SR19` -> `EFR3` (casting aura) |
| 51 | 0x3F | High Jump Hold Bck | F33(0) | `EFL4` -> `AU2` -> `SR20` -> `EFR4` (casting aura) |

## Key Frame Tiles for the Jump

- F27 = `EF2` -> `BF3` -> `EF1` (arms lowered)
- F28 = `EFL3` -> `BF3` -> `EFR3` (arms spread, the Mid Jump pose)
- F29 = `EFL5` -> `BB3` -> `EFR5` (arms lowered, back)
- F30 = `EFL4` -> `BB3` -> `EFR4` (arms spread, back)
- F31 = `EFL3` -> `AU1` -> `SR19` -> `EFR3` (airborne, front)
- F33 = `EFL4` -> `AU2` -> `SR20` -> `EFR4` (airborne, back)
