# Weapon Attacks -- Bow (SEQ 140-145)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Using frames 119-121, 123 and 124 (front) / 168-170, 172 and 173 (back). No PostGenericAttack: the arrow lands the hit. PlaySound at tick 26 is the shot.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 140 | 0xA6 | Bow High Fwd | 867ms | F119(2) -> F119(8) -> F120(2) -> F121(4) -> F121(10) -> F121(18) -> F121(2) -> F123(2) -> F124(4) |
| 141 | 0xA7 | Bow High Bck | 867ms | F168(2) -> F168(8) -> F169(2) -> F170(4) -> F170(10) -> F170(18) -> F170(2) -> F172(2) -> F173(4) |
| 142 | 0xA8 | Bow Mid Fwd | 833ms | F119(2) -> F119(8) -> F121(2) -> F121(4) -> F123(10) -> F123(18) -> F123(2) -> F124(4) |
| 143 | 0xA9 | Bow Mid Bck | 833ms | F168(2) -> F168(8) -> F170(2) -> F170(4) -> F172(10) -> F172(18) -> F172(2) -> F173(4) |
| 144 | 0xAA | Bow Low Fwd | 833ms | F119(2) -> F119(8) -> F123(2) -> F123(4) -> F124(10) -> F124(18) -> F124(2) -> F124(4) |
| 145 | 0xAB | Bow Low Bck | 833ms | F168(2) -> F168(8) -> F172(2) -> F172(4) -> F173(10) -> F173(18) -> F173(2) -> F173(4) |

## Unit motion (SEQ 140-145)

Every shot winds back 2px (MoveBackward2, `ffcd`), strikes forward with two MoveForward2 (`ffd1`) and settles 1px back (MoveBackward1, `ffce`) on the follow-through. Unit offset (px, + forward along the facing) per draw — Lv1 (140/141): `0, -2, -2, 0, 2, 2, 2, 2, 1`; Lv2/Lv3 (142-145): `0, -2, -2, 0, 2, 2, 2, 1`. Stored as each assembly frame's `move`.
