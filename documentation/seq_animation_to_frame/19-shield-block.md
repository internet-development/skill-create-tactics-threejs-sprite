# Shield Block (SEQ 150-155)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. Duration = total time in milliseconds.

---

The unit holds out a shield to block, or guards with a weapon, one pose per height.

| SEQ | Raw ID | Name | Duration | Frame | Front/Back Tiles |
|-----|-----|------|----------|-------|-----------------|
| 150 | 0xB0 | Shield Block High Fwd | 267ms | F130(16) | LG12->TF1->AF1->LG25 |
| 151 | 0xB1 | Shield Block High Bck | 267ms | F179(16) | LG34->TB1->AB1->LG45 |
| 152 | 0xB2 | Shield Block Mid Fwd | 267ms | F131(16) | LG6->TF1->AF2->LG2 |
| 153 | 0xB3 | Shield Block Mid Bck | 267ms | F180(16) | LG53->TB1->AB2->LG45 |
| 154 | 0xB4 | Shield Block Low Fwd | 267ms | F132(16) | LG21->TF2->AF4->LG15 |
| 155 | 0xB5 | Shield Block Low Bck | 267ms | F181(16) | LG52->TB2->AB4->LG46 |
