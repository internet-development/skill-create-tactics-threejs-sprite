# Walk Cycles (SEQ 6-11)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

8-frame ping-pong walk cycles using body frames 9-13 (front) or 14-18 (back). Three speed tiers. These are the basis for `WALK_FRAMES` in `group-walk.js`.

| SEQ | Raw ID | Name | Duration | Frame Sequence |
|-----|-----|------|----------|----------------|
| 6 | 0x06 | Walk Fwd | 1067ms | F11(6) -> F10(8) -> F9(10) -> F10(8) -> F11(6) -> F12(8) -> F13(10) -> F12(8) |
| 7 | 0x07 | Walk Bck | 1067ms | F16(6) -> F15(8) -> F14(10) -> F15(8) -> F16(6) -> F17(8) -> F18(10) -> F17(8) |
| 8 | 0x08 | Walk Fwd Fast | 533ms | F11(2) -> F10(4) -> F9(6) -> F10(4) -> F11(2) -> F12(4) -> F13(6) -> F12(4) |
| 9 | 0x09 | Walk Bck Fast | 533ms | F16(2) -> F15(4) -> F14(6) -> F15(4) -> F16(2) -> F17(4) -> F18(6) -> F17(4) |
| 10 | 0x0A | Walk Fwd Slow | 1600ms | F11(10) -> F10(12) -> F9(14) -> F10(12) -> F11(10) -> F12(12) -> F13(14) -> F12(12) |
| 11 | 0x0B | Walk Bck Slow | 1600ms | F16(10) -> F15(12) -> F14(14) -> F15(12) -> F16(10) -> F17(12) -> F18(14) -> F17(12) |

## Walk Frame Mapping to Sprite Tiles

- F9 = `LF1` -> `BF1` -> `RF1` (arms close, front)
- F10 = `LF2` -> `BF2` -> `RF2`
- F11 = `LF3` -> `BF3` -> `RF3` (neutral stance, front)
- F12 = `LF4` -> `BF4` -> `RF4`
- F13 = `LF5` -> `BF5` -> `RF5` (arms extended, front)
- F14 = `LB1` -> `BB1` -> `RB1` (arms close, back)
- F15 = `LB2` -> `BB2` -> `RB2`
- F16 = `LB3` -> `BB3` -> `RB3` (neutral stance, back)
- F17 = `LB4` -> `BB4` -> `RB4`
- F18 = `LB5` -> `BB5` -> `RB5` (arms extended, back)

## Walk Cycle Structure

All walk cycles start at neutral (F11/F16), sweep to one extreme, return through neutral, sweep to the other extreme, return. The engine's `seqWalkOrder()` function produces this exact 8-frame cycle from 5 base frames, matching SEQ 6/7 ordering.

## Speed Comparison (delay per frame)

- Normal: 6/8/10/8/6/8/10/8 (variable emphasis on extremes)
- Fast: 2/4/6/4/2/4/6/4 (same shape, compressed)
- Slow: 10/12/14/12/10/12/14/12 (same shape, stretched)
