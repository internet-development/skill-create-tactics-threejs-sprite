# Weapon Attacks -- Swing and Item Throw (SEQ 102-127)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Full-body swing attacks using frames 84-91 (front) / 133-140 (back). SEQ 108-125 are Item Throw, the same arm motion split into start, hold and release, and SEQ 126/127 is Weapon Throw.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 102 | 0x80 | Swing High Fwd | 633ms | F86(4) -> F84(2) -> F85(8) -> F86(2) -> F87(2) -> F88(14) -> F88(2) -> F88(4) |
| 103 | 0x81 | Swing High Bck | 633ms | F135(4) -> F133(2) -> F134(8) -> F135(2) -> F136(2) -> F137(14) -> F137(2) -> F137(4) |
| 104 | 0x82 | Swing Mid Fwd | 667ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(14) -> F90(2) -> F90(4) -> F89(2) |
| 105 | 0x83 | Swing Mid Bck | 667ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(14) -> F139(2) -> F139(4) -> F138(2) |
| 106 | 0x84 | Swing Low Fwd | 700ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(2) -> F91(14) -> F91(2) -> F90(4) -> F89(2) |
| 107 | 0x85 | Swing Low Bck | 700ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(2) -> F140(14) -> F140(2) -> F139(4) -> F138(2) |
| 108 | 0x86 | Item Throw High Start Fwd | 433ms | F86(4) -> F84(2) -> F85(8) -> F86(2) -> F87(2) -> F88(8) |
| 109 | 0x87 | Item Throw High Start Bck | 433ms | F135(4) -> F133(2) -> F134(8) -> F135(2) -> F136(2) -> F137(8) |
| 110 | 0x88 | Item Throw High Hold Fwd | F88(0) | Single frame at impact |
| 111 | 0x89 | Item Throw High Hold Bck | F137(0) | Single frame at impact |
| 112 | 0x8A | Item Throw High Release Fwd | 133ms | F88(4) -> F88(4) |
| 113 | 0x8B | Item Throw High Release Bck | 133ms | F137(4) -> F137(4) |
| 114 | 0x8C | Item Throw Mid Start Fwd | 433ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(8) |
| 115 | 0x8D | Item Throw Mid Start Bck | 433ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(8) |
| 116 | 0x8E | Item Throw Mid Hold Fwd | F90(0) | Single frame |
| 117 | 0x8F | Item Throw Mid Hold Bck | F139(0) | Single frame |
| 118 | 0x90 | Item Throw Mid Release Fwd | 167ms | F90(2) -> F90(4) -> F89(4) |
| 119 | 0x91 | Item Throw Mid Release Bck | 167ms | F139(2) -> F139(4) -> F138(4) |
| 120 | 0x92 | Item Throw Low Start Fwd | 467ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(2) -> F91(8) |
| 121 | 0x93 | Item Throw Low Start Bck | 467ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(2) -> F140(8) |
| 122 | 0x94 | Item Throw Low Hold Fwd | F91(0) | Single frame |
| 123 | 0x95 | Item Throw Low Hold Bck | F140(0) | Single frame |
| 124 | 0x96 | Item Throw Low Release Fwd | 167ms | F91(2) -> F90(4) -> F89(4) |
| 125 | 0x97 | Item Throw Low Release Bck | 167ms | F140(2) -> F139(4) -> F138(4) |
| 126 | 0x98 | Weapon Throw Fwd | 567ms | F86(4) -> F84(2) -> F85(8) -> F87(2) -> F89(2) -> F90(10) -> F90(4) -> F89(2) |
| 127 | 0x99 | Weapon Throw Bck | 567ms | F135(4) -> F133(2) -> F134(8) -> F136(2) -> F138(2) -> F139(10) -> F139(4) -> F138(2) |

## Swing Frame Progression (front-facing)

- F84/F85: Wind-up (LG5->TF1->AF1->LG1) -- arms back
- F86/F87: Mid-swing (LG5->TF1->AF1->LG2, LG6->TF1->AF2->LG2) -- arms forward
- F88: High impact (LG6->TF1->AF2->LG2) -- full extension
- F89/F90: Mid deeper swing (LG6->TF1->AF2->LG3, LG8->TF1->AF3->LG3)
- F91: Low follow-through (LG7->TF2->AF4->LG4) -- maximum extension with alternate torso
