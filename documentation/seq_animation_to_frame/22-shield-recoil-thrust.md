# Thrust Recoil (SEQ 168-173)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 168 | 0xC2 | Thrust Recoil High Fwd | 567ms | F105(2) -> F105(4) -> F103(4) -> F104(8) -> F104(10) -> F103(6) |
| 169 | 0xC3 | Thrust Recoil High Bck | 567ms | F154(2) -> F154(4) -> F152(4) -> F153(8) -> F153(10) -> F152(6) |
| 170 | 0xC4 | Thrust Recoil Mid Fwd | 567ms | F105(2) -> F105(4) -> F103(4) -> F104(8) -> F104(10) -> F103(6) |
| 171 | 0xC5 | Thrust Recoil Mid Bck | 567ms | F154(2) -> F154(4) -> F152(4) -> F153(8) -> F153(10) -> F152(6) |
| 172 | 0xC6 | Thrust Recoil Low Fwd | 633ms | F110(4) -> F109(2) -> F109(4) -> F103(4) -> F104(8) -> F104(10) -> F103(6) |
| 173 | 0xC7 | Thrust Recoil Low Bck | 633ms | F159(4) -> F158(2) -> F158(4) -> F152(4) -> F153(8) -> F153(10) -> F152(6) |
