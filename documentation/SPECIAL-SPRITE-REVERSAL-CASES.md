# Special Sprite Reversal Cases

Investigation of per-tile horizontal flip anomalies in `TYPE1.SHP` sprite data.

## Background

Two independent flip mechanisms exist in the rendering pipeline:

1. **SHP-level (bit 14)**: Per-tile `reverseX` baked into the binary. Tells the renderer to horizontally flip a specific tile when compositing it onto the 185x250 frame canvas.
2. **Engine-level (pattern symmetry)**: Patterns A/D are mirrored versions of B/C, reflected about the unit origin column (canvas x = 53, `SHP_ORIGIN_X`) — the same axis the game's own mirrored idle frames F4-F6 use. CSS: `scaleX(-1)` plus the mirrored anchor. ThreeJS: negative `texture.repeat.x` plus `flipX` on every position.

These are independent. When both are set, they cancel out (double flip = no flip).

## SHP Binary reverseX Extraction

Parsed all 364 frames from `TYPE1.SHP` using the encoding documented in `shp_tile_positions/AGENTS.md` and verified against the C# reference implementation, `Tile.cs`:

```
byte 2-3: flags (LE uint16)
  bit 14: reverseX = (flags & 0x4000) === 0x4000
```

**Total frames parsed**: 364. **Total tiles with reverseX**: 9.

All 9 cases are idle pose mirroring only (F4-F6, F186-F188). **Zero** overlay tiles in any 4-tile composition frame (punch, stab, throw) have bit 14 set.

### All SHP-level reverseX cases

| Frame | Tile | ID | Size | Canvas Pos | Notes |
|-------|------|----|------|-----------|-------|
| F4 | 0 | P2 | 32x40 | (38, 83) | Idle pose (reversed P2) |
| F5 | 0 | P1 | 32x40 | (38, 83) | Idle pose (reversed P1) |
| F6 | 0 | P4 | 32x40 | (38, 83) | Idle pose (reversed P4) |
| F186 | 0 | SR3 | 32x16 | (38, 83) | Second-half idle (reversed SR3) |
| F186 | 1 | HD2 | 32x16 | (38, 97) | Second-half idle (reversed HD2) |
| F187 | 0 | SR2 | 32x16 | (38, 83) | Second-half idle (reversed SR2) |
| F187 | 1 | HD1 | 32x16 | (38, 97) | Second-half idle (reversed HD1) |
| F188 | 0 | SR5 | 32x16 | (38, 83) | Second-half idle (reversed SR5) |
| F188 | 1 | HD4 | 32x16 | (38, 97) | Second-half idle (reversed HD4) |

## Orientation Anomaly Detection

SHP reverseX (bit 14) cannot catch all visual orientation issues because the flag only records what the original game renderer does — it does not validate whether a tile's pixel content matches its intended facing.

### Method: A/B ↔ C/D counterpart pixel comparison

For 4-tile compositions (punch, stab), each animation frame has a front-facing (A/B) tile and a back-facing (C/D) tile at the same frame position. These depict the same body part from opposite viewing angles, so the back-facing tile should be a **mirrored** version of the front-facing tile (left hand becomes right hand when viewed from behind).

**Test**: For each A/B ↔ C/D tile pair, sum the absolute RGBA differences of the two tiles on the sheet, two ways:
1. `normal diff` = C/D tile vs A/B tile (as-is)
2. `mirrored diff` = horizontally-flipped C/D tile vs A/B tile

If `mirrored diff < normal diff`, the C/D tile has the **same** visual orientation as the A/B tile, meaning the hand faces the same direction in both front and back views.

The figures below are measured on `a1.png`. Tile rects are shared and art is not, so another sheet flags other tiles.

### Results: Punch front tile pairs

| Frame position | A/B tile | C/D tile | Normal diff | Mirrored diff | Orientation |
|---------------|----------|----------|-------------|---------------|-------------|
| **Ready** | **LG17** | **LG48** | **42502** | **27710** | **Flagged: same orientation as A/B** |
| Windup | LG22 | LG43 | 40039 | 42963 | Mirrored |
| Extend | LG24 | LG50 | 58985 | 64577 | Mirrored |
| **Retract** | **LG18** | **LG53** | **55248** | **28390** | **Flagged: same orientation as A/B** |
| Recovery | LG32 | LG35 | 28624 | 41038 | Mirrored |

### Results: farBehind tile pairs

| Frame position | A/B tile | C/D tile | Normal diff | Mirrored diff | Orientation |
|---------------|----------|----------|-------------|---------------|-------------|
| Ready | LG15 | LG55 | 39586 | 42454 | Mirrored |
| Retract | LG16 | LG55 | 46342 | 51520 | Mirrored |

### Conclusion

LG48 and LG53 are the two C/D overlays here whose pixels share the handedness of their A/B counterparts. This heuristic does **not** mean the tiles are drawn wrong: TYPE1.SHP uses both unflipped in every frame that contains them (LG48: F152, F153, F168; LG53: F163, F166, F171, F172, F180). The back view of a pose is simply not a mirror of the front view.

## Current Rule

Per-tile flips follow TYPE1.SHP exactly. No assembly tile carries a manual flip, and no ported overlay tile has bit 14 set, so every overlay renders with only the pattern-level (A/D) reversal. `tests/sprite-shp-parity.test.js` reads the decoded SHP and fails if an assembly tile's flip, offset or depth diverges from its SHP frame, or if a `tileManuallyReversed` flag reappears in `assembly.js`.

LG48 and LG53 appear as the front overlay (unflipped) in:
- **Bow High** (P1): Pattern C/D frames 1-2 (F168) and 8 (F172)
- **Bow Mid** (P2): Pattern C/D frames 1-2 (F168) and 5-7 (F172)
- **Bow Low** (P3): Pattern C/D frames 1-2 (F168) and 3-4 (F172)

## Checking New Modes

Visual handedness heuristics can flag a tile but never override the SHP data. When a pose looks wrong, compare the composite against the decoded SHP frame (tile set, body-relative offsets, reverseX/Y, back-to-front order, body anchor) by extending `tests/sprite-shp-parity.test.js`.
