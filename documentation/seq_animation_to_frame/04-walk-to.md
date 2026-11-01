# Walk To (SEQ 18-23)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Walk-in-place cycles for floating/levitating units. Same walk frames as SEQ 6-11 but with asymmetric timing -- the neutral frame has the shortest delay.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 18 | 0x18 | Walk To Fwd | 467ms | F10(4) -> F9(4) -> F10(4) -> F11(2) -> F12(4) -> F13(4) -> F12(4) -> F11(2) |
| 19 | 0x19 | Walk To Bck | 467ms | F15(4) -> F14(4) -> F15(4) -> F16(2) -> F17(4) -> F18(4) -> F17(4) -> F16(2) |
| 20 | 0x1A | Walk To Fast Fwd | 267ms | F10(2) -> F9(2) -> F10(2) -> F11(2) -> F12(2) -> F13(2) -> F12(2) -> F11(2) |
| 21 | 0x1B | Walk To Fast Bck | 267ms | F15(2) -> F14(2) -> F15(2) -> F16(2) -> F17(2) -> F18(2) -> F17(2) -> F16(2) |
| 22 | 0x1C | Walk To Slow Fwd | 933ms | F10(8) -> F9(8) -> F10(8) -> F11(4) -> F12(8) -> F13(8) -> F12(8) -> F11(4) |
| 23 | 0x1D | Walk To Slow Bck | 933ms | F15(8) -> F14(8) -> F15(8) -> F16(4) -> F17(8) -> F18(8) -> F17(8) -> F16(4) |

Key difference from regular walk: starts at F10/F15 (not F11/F16 neutral), and the neutral frame has minimal delay (2 ticks) -- creating a "glide" feel.
