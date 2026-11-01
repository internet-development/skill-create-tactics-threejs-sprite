# Float (SEQ 12-17)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

8-frame sequences that repeat the same single frame (70 or 71) with walk timing while the whole unit hovers. Between draws the SEQ issues MoveUp1 (`ffcc`), MoveUp1, MoveDown1 (`ffd0`), MoveDown1 and loops (`ffd5` IncrementLoop), so the unit rises 0 / -1 / -2 / -1 px and returns — the feet leave the ground line; the motion comes from the move opcodes, not from the frame data (`FLOAT_MOVES` in `constants/sprites/assembly.js`). In the raw TYPE1.SEQ pointer table these are animations 0x12-0x17 (the filtered index used here skips the six empty pointers 0x0C-0x11), with normal / Haste / Slow variants exactly like Walk (0x06-0x0B). A looping, speed-tiered stand-in-place bob is the idle of a floating unit (Float status); the game's ordinary stand idle (SEQ 1-5) is a single held frame. The animation name is inferred from this structure.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 12 | 0x12 | Float Fwd | 1067ms | F70(6) -> F70(8) -> F70(10) -> F70(8) -> F70(6) -> F70(8) -> F70(10) -> F70(8) |
| 13 | 0x13 | Float Bck | 1067ms | F71(6) -> F71(8) -> F71(10) -> F71(8) -> F71(6) -> F71(8) -> F71(10) -> F71(8) |
| 14 | 0x14 | Float Fwd Fast | 533ms | F70(2) -> F70(4) -> F70(6) -> F70(4) -> F70(2) -> F70(4) -> F70(6) -> F70(4) |
| 15 | 0x15 | Float Bck Fast | 533ms | F71(2) -> F71(4) -> F71(6) -> F71(4) -> F71(2) -> F71(4) -> F71(6) -> F71(4) |
| 16 | 0x16 | Float Fwd Slow | 1600ms | F70(10) -> F70(12) -> F70(14) -> F70(12) -> F70(10) -> F70(12) -> F70(14) -> F70(12) |
| 17 | 0x17 | Float Bck Slow | 1600ms | F71(10) -> F71(12) -> F71(14) -> F71(12) -> F71(10) -> F71(12) -> F71(14) -> F71(12) |

## Frame Tile Mapping

- F70 = `LF3` -> `BF3` -> `RF3` (same as walk neutral F11)
- F71 = `LB3` -> `BB3` -> `RB3` (same as walk neutral F16)
