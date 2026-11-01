# Weapon Attacks -- Poke (SEQ 128-133)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Using frames 103-111 (front) / 152-160 (back). Spear and pole thrusts: both hands, which is why these read like a punch without the weapon drawn.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 128 | 0x9A | Poke High Fwd | 633ms | F103(4) -> F104(8) -> F103(2) -> F105(2) -> F105(2) -> F106(14) -> F106(2) -> F105(4) |
| 129 | 0x9B | Poke High Bck | 633ms | F152(4) -> F153(8) -> F152(2) -> F154(2) -> F154(2) -> F155(14) -> F155(2) -> F154(4) |
| 130 | 0x9C | Poke Mid Fwd | 633ms | F103(4) -> F104(8) -> F103(2) -> F107(2) -> F107(2) -> F108(14) -> F108(2) -> F107(4) |
| 131 | 0x9D | Poke Mid Bck | 633ms | F152(4) -> F153(8) -> F152(2) -> F156(2) -> F156(2) -> F157(14) -> F157(2) -> F156(4) |
| 132 | 0x9E | Poke Low Fwd | 667ms | F103(4) -> F104(8) -> F107(2) -> F109(2) -> F110(2) -> F111(14) -> F111(2) -> F110(4) -> F109(2) |
| 133 | 0x9F | Poke Low Bck | 667ms | F152(4) -> F153(8) -> F156(2) -> F158(2) -> F159(2) -> F160(14) -> F160(2) -> F159(4) -> F158(2) |
