# Abilities (SEQ 176-197)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Casting start, abilities, the fall into Critical and a second swing.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 176 | 0xCA | Casting Start Fwd | 200ms | F11(6) -> F27(6) -> F28(0) |
| 177 | 0xCB | Casting Start Bck | 200ms | F16(6) -> F29(6) -> F30(0) |
| 178 | 0xCC | Casting Start 2 Fwd | 300ms | F11(4) -> F19(6) -> F55(4) -> F56(4) -> F58(0) |
| 179 | 0xCD | Casting Start 2 Bck | 300ms | F16(4) -> F20(6) -> F65(4) -> F66(4) -> F67(0) |
| 180 | 0xCE | Pummel Fwd | 633ms | F92(4) -> F93(8) -> F92(2) -> F97(2) -> F98(2) -> F99(2)x4 -> F99(4) -> F98(4) -> F97(4) |
| 181 | 0xCF | Pummel Bck | 633ms | F141(4) -> F142(8) -> F141(2) -> F146(2) -> F147(2) -> F148(2)x4 -> F148(4) -> F147(4) -> F146(4) |
| 182 | 0xD0 | Pummel 2 Fwd | 533ms | F92(4) -> F93(6) -> F92(2) -> F97(2) -> F98(2) -> F99(2) -> F98(4) -> F97(2) -> F97(8) |
| 183 | 0xD1 | Pummel 2 Bck | 533ms | F141(4) -> F142(6) -> F141(2) -> F146(2) -> F147(2) -> F148(2) -> F147(4) -> F146(2) -> F146(8) |
| 184 | 0xD2 | Cast Revive Fwd | 433ms | F19(6) -> F55(4) -> F56(4) -> F28(2) -> F56(4) -> F55(6) |
| 185 | 0xD3 | Cast Revive Bck | 433ms | F20(6) -> F65(4) -> F66(4) -> F30(2) -> F66(4) -> F65(6) |
| 186 | 0xD4 | Rush Fwd | 100ms | F92(2) -> F100(2) -> F100(2) |
| 187 | 0xD5 | Rush Bck | 100ms | F141(2) -> F149(2) -> F149(2) |
| 188 | 0xD6 | Read Book 2 Fwd | 1767ms | F125(6) -> F126(6) -> F127(6) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(8) -> F129(8) -> F128(22) -> F128(2) |
| 189 | 0xD7 | Read Book 2 Bck | 1767ms | F174(6) -> F175(6) -> F176(6) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(8) -> F178(8) -> F177(22) -> F177(2) |
| 190 | 0xD8 | Talk Skill Fwd | 267ms | F128(8) -> F129(8) |
| 191 | 0xD9 | Talk Skill Bck | 267ms | F177(8) -> F178(8) |
| 192 | 0xDA | Fall Critical Fwd | 233ms | F2(6) -> F19(8) -> F21(0) |
| 193 | 0xDB | Fall Critical Bck | 233ms | F8(6) -> F20(8) -> F22(0) |
| 194 | 0xDC | Swing Low 2 Fwd | 667ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(14) -> F90(2) -> F90(4) -> F89(2) |
| 195 | 0xDD | Swing Low 2 Bck | 667ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(14) -> F139(2) -> F139(4) -> F138(2) |
| 196 | 0xDE | Spin Dance Fwd | 6667ms | F27(4) -> F47(4) -> F48(6) -> F47(4) -> F11(4) -> F49(4) -> F50(54) -> F49(4) -> F11(2) -> F1(2) -> F8(2) -> F7(2) -> F6(2) -> F5(2) -> F4(2) -> F3(2) -> F11(2) -> F47(4) -> F48(6) -> F47(4) -> F11(2) -> F3(2) -> F4(2) -> F5(2) -> F6(2) -> F7(2) -> F8(2) -> F1(2) -> F11(2) -> F49(4) -> F50(6) -> F49(4) -> F11(2) -> F47(2) -> F48(240) -> F47(4) -> F11(4) |
| 197 | 0xDF | Spin Dance Bck | 6667ms | F29(4) -> F53(4) -> F54(6) -> F53(4) -> F16(4) -> F51(4) -> F52(54) -> F51(4) -> F16(2) -> F1(2) -> F2(2) -> F3(2) -> F4(2) -> F5(2) -> F6(2) -> F7(2) -> F16(2) -> F53(4) -> F54(6) -> F53(4) -> F16(2) -> F7(2) -> F6(2) -> F5(2) -> F4(2) -> F3(2) -> F2(2) -> F1(2) -> F16(2) -> F51(4) -> F52(6) -> F51(4) -> F16(2) -> F53(2) -> F54(240) -> F53(4) -> F16(4) |

## Spin Dance (SEQ 196-197)

The longest and most complex animation -- 37 frames, 6.67 seconds. Includes two full rotations through idle poses, action pose holds, and a dramatic 4-second freeze (delay=240) near the end.
