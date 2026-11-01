# Walk To Alt (SEQ 24-29)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Same frame sequences as Walk To (SEQ 18-23), at separate SEQ offsets.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 24 | 0x24 | Walk To Alt Fwd | 467ms | F10(4) -> F9(4) -> F10(4) -> F11(2) -> F12(4) -> F13(4) -> F12(4) -> F11(2) |
| 25 | 0x25 | Walk To Alt Bck | 467ms | F15(4) -> F14(4) -> F15(4) -> F16(2) -> F17(4) -> F18(4) -> F17(4) -> F16(2) |
| 26 | 0x26 | Walk To Alt Fast Fwd | 267ms | F10(2) -> F9(2) -> F10(2) -> F11(2) -> F12(2) -> F13(2) -> F12(2) -> F11(2) |
| 27 | 0x27 | Walk To Alt Fast Bck | 267ms | F15(2) -> F14(2) -> F15(2) -> F16(2) -> F17(2) -> F18(2) -> F17(2) -> F16(2) |
| 28 | 0x28 | Walk To Alt Slow Fwd | 933ms | F10(8) -> F9(8) -> F10(8) -> F11(4) -> F12(8) -> F13(8) -> F12(8) -> F11(4) |
| 29 | 0x29 | Walk To Alt Slow Bck | 933ms | F15(8) -> F14(8) -> F15(8) -> F16(4) -> F17(8) -> F18(8) -> F17(8) -> F16(4) |
