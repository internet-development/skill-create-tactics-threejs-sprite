# First Half -- Frames 0-83 (Head/Body, yOffset=0)

Source: `TYPE1.SHP`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json` (`documentation/AGENTS.md` "Sources").

These frames use `yOffset=0`, sampling from the top half of the 256x488 sprite sheet (y: 0-255). They contain body-only compositions -- idle tiles, front-facing body compositions (LF+BF+RF), back-facing body compositions (LB+BB+RB), special poses, and placeholder frames. No separate head tiles (HF/HB) or foot strip tiles (FF/FB) are included.

Each frame lists its tiles front to back, the reverse of the draw order in `../shp_tile_positions/`. Tiles marked `reversed` are horizontally flipped.

| Frame | Tiles |
|-------|-------|
| 0 | `SR1` |
| 1 | `P1` |
| 2 | `P2` |
| 3 | `P3` |
| 4 | `P2 reversed` |
| 5 | `P1 reversed` |
| 6 | `P4 reversed` |
| 7 | `P5` |
| 8 | `P4` |
| 9 | `LF1` -> `BF1` -> `RF1` |
| 10 | `LF2` -> `BF2` -> `RF2` |
| 11 | `LF3` -> `BF3` -> `RF3` |
| 12 | `LF4` -> `BF4` -> `RF4` |
| 13 | `LF5` -> `BF5` -> `RF5` |
| 14 | `LB1` -> `BB1` -> `RB1` |
| 15 | `LB2` -> `BB2` -> `RB2` |
| 16 | `LB3` -> `BB3` -> `RB3` |
| 17 | `LB4` -> `BB4` -> `RB4` |
| 18 | `LB5` -> `BB5` -> `RB5` |
| 19 | `SP3` -> `HR1` -> `DF2` |
| 20 | `SP2` -> `HR2` -> `DB2` |
| 21 | `KO3` |
| 22 | `KO4` |
| 23 | `KO1` |
| 24 | `KO2` |
| 25 | `EF6` -> `BF4` |
| 26 | `EF7` -> `BB5` |
| 27 | `EF2` -> `BF3` -> `EF1` |
| 28 | `EFL3` -> `BF3` -> `EFR3` |
| 29 | `EFL5` -> `BB3` -> `EFR5` |
| 30 | `EFL4` -> `BB3` -> `EFR4` |
| 31 | `EFL3` -> `AU1` -> `SR19` -> `EFR3` |
| 32 | `EFL3` -> `BF5` -> `EFR3` |
| 33 | `EFL4` -> `AU2` -> `SR20` -> `EFR4` |
| 34 | `EFL4` -> `BB5` -> `EFR4` |
| 35 | `CH1` -> `SR17` |
| 36 | `CH2` -> `SR17` |
| 37 | `CH3` -> `SR18` |
| 38 | `CH4` -> `SR18` |
| 39 | `EFL3` -> `BF1` -> `EFR3` |
| 40 | `EF2` -> `BF2` -> `EF1` |
| 41 | `LF4` -> `BF4` -> `RF2` |
| 42 | `LF5` -> `BF5` -> `RF1` |
| 43 | `EFL4` -> `BB1` -> `EFR4` |
| 44 | `EFL5` -> `BB2` -> `EFR5` |
| 45 | `LB2` -> `BB4` -> `RB4` |
| 46 | `LB1` -> `BB5` -> `RB5` |
| 47 | `LF2` -> `BF2` -> `EF1` |
| 48 | `EF2` -> `BF1` -> `EFR3` |
| 49 | `EF2` -> `BF4` -> `RF4` |
| 50 | `EFL3` -> `BF5` -> `EF1` |
| 51 | `LB4` -> `BB2` -> `EFR5` |
| 52 | `LB5` -> `BB1` -> `EFR4` |
| 53 | `EFL5` -> `BB4` -> `RB4` |
| 54 | `EFL4` -> `BB5` -> `RB5` |
| 55 | `LF3` -> `BF4` -> `RF4` |
| 56 | `LF2` -> `BF4` -> `EF1` |
| 57 | `LF2` -> `BF4` -> `EFR3` |
| 58 | `OV1` -> `LF2` -> `BF4` -> `EFR3` |
| 59 | `LF1` -> `BF4` -> `RF4` |
| 60 | `EF2` -> `BF4` -> `RF4` |
| 61 | `EFL3` -> `BF4` -> `RF4` |
| 62 | `LB4` -> `BB4` -> `RB1` |
| 63 | `EFL5` -> `BB4` -> `RB4` |
| 64 | `EFL4` -> `BB4` -> `RB5` |
| 65 | `LB3` -> `BB4` -> `RB3` |
| 66 | `LB2` -> `BB4` -> `EFR5` |
| 67 | `LB1` -> `BB4` -> `EFR4` |
| 68 | `DF1` -> `DF2` |
| 69 | `DB1` -> `DB2` |
| 70 | `LF3` -> `BF3` -> `RF3` |
| 71 | `LB3` -> `BB3` -> `RB3` |
| 72 | `OV2` -> `KO3` |
| 73 | `KO4` |
| 74-83 | `SR1` _(empty/placeholder frames)_ |
