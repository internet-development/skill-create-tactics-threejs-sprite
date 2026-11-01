# Status Poses (SEQ 32-41)

Source: `TYPE1.SEQ`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json`. Frames and delays are the binary's. Names are this repository's (`documentation/seq_animation_to_frame/AGENTS.md` "Names").

Notation: `F{n}({d})` = SHP frame index `n` displayed for `d` 60ths-of-a-second. `->` separates sequential frames. Duration = total time in milliseconds.

---

Single-frame static poses for combat states.

| SEQ | Raw ID | Name | Frame | Sprite Tiles | Engine Mapping |
|-----|-----|------|-------|-------------|----------------|
| 32 | 0x2C | Critical Fwd | F21(0) | `KO3` | -- |
| 33 | 0x2D | Critical Bck | F22(0) | `KO4` | -- |
| 34 | 0x2E | Defend Fwd | F25(0) | `EF6` -> `BF4` | Mode DF |
| 35 | 0x2F | Defend Bck | F26(0) | `EF7` -> `BB5` | Mode DF |
| 36 | 0x30 | Dodge Defend Fwd | 467ms | F12(2)x2 -> F25(2) -> F25(16) -> F25(2)x3 | Mode DD |
| 37 | 0x31 | Dodge Defend Bck | 467ms | F17(2)x2 -> F26(2) -> F26(16) -> F26(2)x3 | Mode DD |
| 38 | 0x32 | Taking Damage Fwd | 67ms | F68(2) -> F68(2) | `DF1` -> `DF2` (mode H tiles) |
| 39 | 0x33 | Taking Damage Bck | 67ms | F69(2) -> F69(2) | `DB1` -> `DB2` (mode H tiles) |
| 40 | 0x34 | Dead Fwd | F23(0) | `KO1` | DEATH_FRAMES[1] |
| 41 | 0x35 | Dead Bck | F24(0) | `KO2` | DEATH_FRAMES[3] |

## Unit motion

Taking Damage SEQ 38/39 is `MoveUp1 → F68(2) → MoveDown1 → F68(2)`, looping: the unit is redrawn 1px up, then back, every 2 ticks — the game's damage shiver (`HURT_SHIVER_MOVES` in `constants/sprites/assembly.js`). Kneel 32/33 and Dead 40/41 have no move opcodes.
