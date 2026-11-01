# Rotation (SEQ 30-31)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Full 360-degree rotation through all idle poses.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 30 | 0x2A | Rotate CW | 533ms | F2(4) -> F1(4) -> F8(4) -> F7(4) -> F6(4) -> F5(4) -> F4(4) -> F3(4) |
| 31 | 0x2B | Rotate CCW | 533ms | F8(4) -> F7(4) -> F6(4) -> F5(4) -> F4(4) -> F3(4) -> F2(4) -> F1(4) |

## Frame-to-Idle Mapping

F1=P1, F2=P2, F3=P3, F4=P2r, F5=P1r, F6=P4r, F7=P5, F8=P4 (where `r` = reversed).
