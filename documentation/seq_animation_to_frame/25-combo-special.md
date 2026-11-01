# Steal, Jump 2, Dragoon Jump and Cloth / Bag (SEQ 198-217)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 198 | 0xE2 | Steal Fwd | 667ms | F21(6)x2 -> F21(16) -> F19(6) -> F47(6) |
| 199 | 0xE3 | Steal Bck | 667ms | F22(6)x2 -> F22(16) -> F20(6) -> F53(6) |
| 200 | 0xE4 | Steal Heart Fwd | 1200ms | F21(20) -> F90(6) -> F88(6) -> F125(8) -> F35(16) -> F36(16) |
| 201 | 0xE5 | Steal Heart Bck | 1200ms | F22(20) -> F139(6) -> F138(6) -> F65(8) -> F37(16) -> F38(16) |
| 202 | 0xE6 | Katana Use Fwd | 400ms | F11(4) -> F47(6)x2 -> F27(4)x2 -> F28(0) |
| 203 | 0xE7 | Katana Use Bck | 400ms | F16(4) -> F51(6)x2 -> F29(4)x2 -> F30(0) |
| 204 | 0xE8 | Jump 2 Fwd | 367ms | F56(2) -> F19(8) -> F11(4) -> F27(4) -> F28(4) -> F28(0) |
| 205 | 0xE9 | Jump 2 Bck | 367ms | F63(2) -> F20(8) -> F16(4) -> F29(4) -> F30(4) -> F30(0) |
| 206 | 0xEA | Dragoon Jump 2 Fwd | 400ms | F2(4) -> F19(4) -> F21(8) -> F19(2) -> F27(4) -> F31(2) |
| 207 | 0xEB | Dragoon Jump 2 Bck | 400ms | F8(4) -> F20(4) -> F22(8) -> F20(2) -> F29(4) -> F33(2) |
| 208 | 0xEC | Dragoon Jump 3 Fwd | 633ms | F2(4) -> F19(4) -> F21(8) -> F19(2) -> F27(4) -> F31(2) -> F92(2) -> F102(2) -> F21(4) -> F89(2) -> F86(2) -> F19(2) |
| 209 | 0xED | Dragoon Jump 3 Bck | 700ms | F8(4) -> F20(4) -> F22(8) -> F20(2) -> F29(4) -> F33(2) -> F141(2) -> F151(2) -> F22(4) -> F138(2) -> F135(2) -> F20(6) |

SEQ 208/209 (animation 0xEC/0xED) opcodes, in order (front; back is the same with F8/F20/F22/F29/F33/F141/F151/F138/F135): F2, F19, F21, F19, F27, QueueDistortAnim(15, 8), F31, WaitForDistort, QueueDistortAnim(6, 1), F92, WaitForDistort, PlaySound(28), QueueDistortAnim(11, 8), F102, WaitForDistort, F21, PostGenericAttack, PlayAttackSound(1), QueueDistortAnim(14, 10), F89, F86, WaitForDistort, F19, end. The engine picks the stone up on the kneel F21 (frame 2) and releases it on F102 (frame 7, right after PlaySound); the WaitForDistort holds are game-side durations the port does not have (it plays the 2-tick SEQ delays).
| 210 | 0xEE | Cloth Bag High Fwd | 567ms | F86(4) -> F84(2) -> F85(8) -> F86(2) -> F87(2) -> F88(6) -> F88(2) -> F88(4)x2 |
| 211 | 0xEF | Cloth Bag High Bck | 567ms | F135(4) -> F133(2) -> F134(8) -> F135(2) -> F136(2) -> F137(6) -> F137(2) -> F137(4)x2 |
| 212 | 0xF0 | Cloth Bag Mid Fwd | 600ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(6) -> F90(2)x2 -> F90(4) -> F89(4) |
| 213 | 0xF1 | Cloth Bag Mid Bck | 600ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(6) -> F139(2)x2 -> F139(4) -> F138(4) |
| 214 | 0xF2 | Cloth Bag Low Fwd | 633ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(2) -> F91(6) -> F91(2)x2 -> F90(4) -> F89(4) |
| 215 | 0xF3 | Cloth Bag Low Bck | 633ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(2) -> F140(6) -> F140(2)x2 -> F139(4) -> F138(4) |
| 216 | 0xFA | Spin Punch Fwd | 933ms | F2(2) -> F1(2) -> F8(2) -> F7(2) -> F6(2) -> F5(2) -> F4(2) -> F3(2) -> F92(4) -> F93(8) -> F92(2) -> F97(2) -> F98(2) -> F99(14) -> F99(2) -> F98(2) -> F97(4) |
| 217 | 0xFB | Spin Punch Bck | 933ms | F8(2) -> F7(2) -> F6(2) -> F5(2) -> F4(2) -> F3(2) -> F2(2) -> F1(2) -> F141(4) -> F142(8) -> F141(2) -> F146(2) -> F147(2) -> F148(14) -> F148(2) -> F147(2) -> F146(4) |

## Spin Punch (SEQ 216-217)

A full rotation through the idle frames, then Unarmed Mid: Goblin Punch.
