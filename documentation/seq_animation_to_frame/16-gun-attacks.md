# Weapon Attacks -- Gun (SEQ 134-139)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Using frames 112-118 (front) / 161-167 (back). The arm extended and held for 14 ticks.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 134 | 0xA0 | Gun High Fwd | 733ms | F112(4) -> F113(10) -> F112(2) -> F114(2) -> F115(2) -> F115(4) -> F115(14) -> F115(2) -> F117(4) |
| 135 | 0xA1 | Gun High Bck | 733ms | F161(4) -> F162(10) -> F161(2) -> F163(2) -> F164(2) -> F164(4) -> F164(14) -> F164(2) -> F166(4) |
| 136 | 0xA2 | Gun Mid Fwd | 733ms | F112(4) -> F113(10) -> F112(2) -> F117(2) -> F117(2) -> F116(4) -> F116(14) -> F116(2) -> F117(4) |
| 137 | 0xA3 | Gun Mid Bck | 733ms | F161(4) -> F162(10) -> F161(2) -> F166(2) -> F166(2) -> F165(4) -> F165(14) -> F165(2) -> F166(4) |
| 138 | 0xA4 | Gun Low Fwd | 700ms | F112(4) -> F113(10) -> F114(2) -> F117(2) -> F116(2) -> F118(14) -> F118(2) -> F116(4) -> F114(2) |
| 139 | 0xA5 | Gun Low Bck | 700ms | F161(4) -> F162(10) -> F163(2) -> F166(2) -> F165(2) -> F167(14) -> F167(2) -> F165(4) -> F163(2) |
