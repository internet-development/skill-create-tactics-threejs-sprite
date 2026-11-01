# Idle Poses (SEQ 0-5)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second.

---

Single-frame static poses. These map directly to the `IDLE_FRAMES` array in `createCharacter.js`.

| SEQ | Raw ID | Name | Frame | Sprite Tiles | Engine Mapping |
|-----|-----|------|-------|-------------|----------------|
| 0 | 0x00 | Null | F0(0) | `SR1` (placeholder) | -- |
| 1 | 0x01 | Idle South | F3(0) | `P3` | IDLE_FRAMES[0] |
| 2 | 0x02 | Idle SE | F2(0) | `P2` | IDLE_FRAMES[1] |
| 3 | 0x03 | Idle East | F1(0) | `P1` | IDLE_FRAMES[2] |
| 4 | 0x04 | Idle West | F8(0) | `P4` | IDLE_FRAMES[3] |
| 5 | 0x05 | Idle North | F7(0) | `P5` | IDLE_FRAMES[4] |

Note: Idle steps 5-7 in the engine (NW, W-reversed, NE) use P4 reversed, P1 reversed, and P2 reversed -- these aren't separate SEQ animations but are produced by the camera rotation system in `createCharacter.js`.
