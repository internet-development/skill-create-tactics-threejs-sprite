# Weapon Attacks -- Unarmed (SEQ 96-101)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Full-body attack animations using frames 92-102 (front) / 141-151 (back). These use LG-series hand tiles + TF/TB heads + AF/AB torsos.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 96 | 0x7A | Unarmed High Fwd | 667ms | F92(4) -> F93(8) -> F92(2) -> F94(2) -> F95(2) -> F96(14) -> F96(2) -> F95(2) -> F94(4) |
| 97 | 0x7B | Unarmed High Bck | 667ms | F141(4) -> F142(8) -> F141(2) -> F143(2) -> F144(2) -> F145(14) -> F145(2) -> F144(2) -> F143(4) |
| 98 | 0x7C | Unarmed Mid Fwd | 667ms | F92(4) -> F93(8) -> F92(2) -> F97(2) -> F98(2) -> F99(14) -> F99(2) -> F98(2) -> F97(4) |
| 99 | 0x7D | Unarmed Mid Bck | 667ms | F141(4) -> F142(8) -> F141(2) -> F146(2) -> F147(2) -> F148(14) -> F148(2) -> F147(2) -> F146(4) |
| 100 | 0x7E | Unarmed Low Fwd | 667ms | F92(4) -> F93(8) -> F97(2) -> F100(2) -> F101(2) -> F102(14) -> F102(2) -> F101(2) -> F97(4) |
| 101 | 0x7F | Unarmed Low Bck | 667ms | F141(4) -> F142(8) -> F146(2) -> F149(2) -> F150(2) -> F151(14) -> F151(2) -> F150(2) -> F146(4) |

## Pattern

Wind-up (F92-93) -> punch -> impact hold (14 ticks) -> recoil. Mid and Low use deeper frames, for a target below the attacker.

## Unit motion (SEQ 96-101)

The unarmed SEQs interleave MoveBackward2 (`ffcd`), MoveForward2/1 (`ffd1`/`ffd2`) and MoveBackward1 (`ffce`). Unit offset (px, + forward along the facing) per draw — Lv1 (96/97): `0, -2, -2, -2, 0, 2, 2, 2, 1`; Lv2 (98/99): `0, -2, -2, 0, 0, 0, 0, 0, 0`; Lv3 (100/101): `0, -2, -2, 0, 1, 1, 1, 1, 1`. Stored as each assembly frame's `move`.
