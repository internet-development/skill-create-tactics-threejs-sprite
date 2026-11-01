# Reactions (SEQ 80-95)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 80 | 0x66 | Found Item Fwd | 633ms | F11(2) -> F19(4) -> F21(8) -> F19(4) -> F11(4) -> F27(2) -> F28(8) -> F27(2) -> F11(4) |
| 81 | 0x67 | Found Item Bck | 633ms | F16(2) -> F20(4) -> F22(8) -> F20(4) -> F16(4) -> F29(2) -> F30(8) -> F29(2) -> F16(4) |
| 82 | 0x68 | Bounced to Death Fwd | 433ms | F19(4) -> F72(2)x3 -> F23(2)x8 -> F23(0) |
| 83 | 0x69 | Bounced to Death Bck | 433ms | F20(4) -> F73(2)x3 -> F24(2)x8 -> F24(0) |
| 84 | 0x6A | Revived Fwd | 367ms | F72(16) -> F19(6) -> F11(0) |
| 85 | 0x6B | Revived Bck | 367ms | F73(16) -> F20(6) -> F16(0) |
| 86 | 0x6C | Revived Hold Fwd | F72(0) | `OV2` -> `KO3` |
| 87 | 0x6D | Revived Hold Bck | F73(0) | `KO4` |
| 88 | 0x70 | Damaged Shaking Fwd | 67ms | F68(2) -> F68(2) | Same as Flinch |
| 89 | 0x71 | Damaged Shaking Bck | 67ms | F69(2) -> F69(2) | Same as Flinch |
| 90 | 0x72 | Chest Pickup Fwd | F28(0) | Held cast pose, 1px up, object overhead (`ffc4` 2, -32) |
| 91 | 0x73 | Chest Pickup Bck | F30(0) | Held cast pose, 1px up, object overhead (`ffc4` 4, -36) |
| 92 | 0x76 | Null Fwd | F0(0) | `SR1` (placeholder) |
| 93 | 0x77 | Null Bck | F0(0) | `SR1` (placeholder) |
| 94 | 0x78 | Teleport Fwd | 367ms | F10(4) -> F27(6) -> F28(2) -> F27(4) -> F10(6) |
| 95 | 0x79 | Teleport Bck | 367ms | F15(4) -> F29(6) -> F30(2) -> F29(4) -> F15(6) |

Note: `ffc4` (SEQ 80/81, 90/91) takes two parameter bytes the Shishi `Sequence.Jumps` table omits, so the editor shows them as frames with 220-250 tick delays. They are the carried-object track below. The Throw Stone the engine plays is SEQ 208/209; SEQ 80/81 is Found Item, Mode FD.

## Unit motion (SEQ 82/83)

Bounced to Death interleaves MoveUnitDU (`ffef`, signed px), MoveUp2 (`ffcb`) and MoveDown2 (`ffcf`) with its 13 draws. Unit offset (px, + down) per draw: `0, 0, -8, -12, -8, -2, 0, -4, 0, -2, 0, -2, 0` — the unit is knocked 12px up on the kneel frames and bounces on the ground as it lands in the KO pose (`FATAL_ITEM_IMPACT_TIMELINE` in `constants/sprites/assembly.js`). Item Drop 84/85 has no move opcodes.

SEQ 80/81 carry an object with opcode `ffc4` (forward px, height px from the SHP origin row) between `ffc5` and `ffc3`. Front: F21 (2, 0), F19 (2, -6), F11 (3, -10), F27 (8, -16), F28 (2, -32), F27 (8, -16). Back: F22 (2, 0), F20 (6, -8), F16 (7, -12), F29 (8, -20), F30 (4, -36), F29 (8, -20). The object sits on the ground at the kneel and between the two raised hands on F28/F30.
