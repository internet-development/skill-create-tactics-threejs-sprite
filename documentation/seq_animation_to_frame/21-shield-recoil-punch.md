# Punch Recoil (SEQ 162-167)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 162 | 0xBC | Punch Recoil High Fwd | 567ms | F94(2) -> F94(4) -> F92(4) -> F93(8) -> F93(10) -> F92(6) |
| 163 | 0xBD | Punch Recoil High Bck | 567ms | F143(2) -> F143(4) -> F141(4) -> F142(8) -> F142(10) -> F141(6) |
| 164 | 0xBE | Punch Recoil Mid Fwd | 567ms | F94(2) -> F94(4) -> F92(4) -> F93(8) -> F93(10) -> F92(6) |
| 165 | 0xBF | Punch Recoil Mid Bck | 567ms | F143(2) -> F143(4) -> F141(4) -> F142(8) -> F142(10) -> F141(6) |
| 166 | 0xC0 | Punch Recoil Low Fwd | 633ms | F100(4) -> F94(2) -> F94(4) -> F92(4) -> F93(8) -> F93(10) -> F92(6) |
| 167 | 0xC1 | Punch Recoil Low Bck | 633ms | F149(4) -> F143(2) -> F143(4) -> F141(4) -> F142(8) -> F142(10) -> F141(6) |
