# Swing Recoil (SEQ 156-161)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

The attacker recoiling from a shield, from the swing's frames.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 156 | 0xB6 | Swing Recoil High Fwd | 567ms | F87(2) -> F86(4) -> F84(4) -> F85(8) -> F84(10) -> F86(6) |
| 157 | 0xB7 | Swing Recoil High Bck | 567ms | F136(2) -> F135(4) -> F133(4) -> F134(8) -> F133(10) -> F135(6) |
| 158 | 0xB8 | Swing Recoil Mid Fwd | 567ms | F87(2) -> F86(4) -> F84(4) -> F85(8) -> F84(10) -> F86(6) |
| 159 | 0xB9 | Swing Recoil Mid Bck | 567ms | F136(2) -> F135(4) -> F133(4) -> F134(8) -> F133(10) -> F135(6) |
| 160 | 0xBA | Swing Recoil Low Fwd | 633ms | F90(2) -> F89(2) -> F87(2) -> F86(4) -> F84(4) -> F85(8) -> F84(10) -> F86(6) |
| 161 | 0xBB | Swing Recoil Low Bck | 633ms | F139(2) -> F138(2) -> F136(2) -> F135(4) -> F133(4) -> F134(8) -> F133(10) -> F135(6) |
