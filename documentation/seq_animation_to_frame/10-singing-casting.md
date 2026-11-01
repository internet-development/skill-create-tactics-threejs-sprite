# Confused, Singing, Dancing and Casting (SEQ 62-73)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 62 | 0x4A | Confused Fwd | 1067ms | F11(6) -> F40(8) -> F39(10) -> F40(8) -> F11(6) -> F41(8) -> F42(10) -> F41(8) |
| 63 | 0x4B | Confused Bck | 1067ms | F16(6) -> F44(8) -> F43(10) -> F44(8) -> F16(6) -> F45(8) -> F46(10) -> F45(8) |
| 64 | 0x50 | Singing Fwd | 667ms | F35(20) -> F36(20) | `CH1` <-> `CH2` (mode C tiles) |
| 65 | 0x51 | Singing Bck | 667ms | F37(20) -> F38(20) | `CH3` <-> `CH4` (mode C tiles) |
| 66 | 0x52 | Dancing Fwd | 1667ms | F11(4) -> F1(4) -> F8(4) -> F7(4) -> F6(4) -> F5(4) -> F4(4) -> F3(4) -> F11(4) -> F47(4) -> F48(6) -> F47(4) -> F11(4) -> F3(4) -> F4(4) -> F5(4) -> F6(4) -> F7(4) -> F8(4) -> F1(4) -> F11(4) -> F49(4) -> F50(6) -> F49(4) |
| 67 | 0x53 | Dancing Bck | 1667ms | F16(4) -> F7(4) -> F6(4) -> F5(4) -> F4(4) -> F3(4) -> F2(4) -> F1(4) -> F16(4) -> F51(4) -> F52(6) -> F51(4) -> F16(4) -> F1(4) -> F2(4) -> F3(4) -> F4(4) -> F5(4) -> F6(4) -> F7(4) -> F16(4) -> F53(4) -> F54(6) -> F53(4) |
| 68 | 0x54 | Casting Fwd | 133ms | F55(4) -> F56(4) -> F57(0) |
| 69 | 0x55 | Casting Bck | 133ms | F62(4) -> F63(4) -> F64(0) |
| 70 | 0x56 | Casting Loop Fwd | 267ms | F58(8) -> F57(8) |
| 71 | 0x57 | Casting Loop Bck | 267ms | F64(8) -> F64(8) |
| 72 | 0x58 | Cast Execute Fwd | 667ms | F56(2) -> F19(8) -> F11(4) -> F27(4) -> F28(4) -> F28(6) -> F28(4) -> F28(4) -> F27(4) |
| 73 | 0x59 | Cast Execute Bck | 667ms | F63(2) -> F20(8) -> F16(4) -> F29(4) -> F30(4) -> F30(6) -> F30(4) -> F30(4) -> F29(4) |

Casting opcodes: SEQ 68/69 ends with F57/F64 at delay 0, the raised hand held; SEQ 70/71 ends with IncrementLoop (`ffd5`), the hand waving for as long as the charge lasts. SEQ 72/73 is Cast Execute, with WeaponSheatheCheck2 (`ffd6`) waiting for the effect. Jump 2 SEQ 204/205 shares its first frames.

## Confused Frame Tiles

- F39 = `EFL3` -> `BF1` -> `EFR3`, F40 = `EF2` -> `BF2` -> `EF1`
- F41 = `LF4` -> `BF4` -> `RF2`, F42 = `LF5` -> `BF5` -> `RF1`
- F43 = `EFL4` -> `BB1` -> `EFR4`, F44 = `EFL5` -> `BB2` -> `EFR5`
- F45 = `LB2` -> `BB4` -> `RB4`, F46 = `LB1` -> `BB5` -> `RB5`

## Dancing

Full rotation (through all idle frames) -> action pose -> reverse rotation -> alternate action pose. 24 frames total.
