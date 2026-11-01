# Flip Ground Switch (SEQ 174-175)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 174 | 0xC8 | Flip Ground Switch Fwd | 767ms | F97(8) -> F101(8) -> F102(12) -> F102(2) -> F101(8) -> F97(8) |
| 175 | 0xC9 | Flip Ground Switch Bck | 767ms | F146(8) -> F150(8) -> F151(12) -> F151(2) -> F150(8) -> F146(8) |
