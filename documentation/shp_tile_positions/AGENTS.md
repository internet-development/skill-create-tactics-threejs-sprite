# SHP Tile Canvas Positions

Pixel-precise canvas positions from `TYPE1.SHP` (8192 bytes, 364 frames). Each frame composites 1+ tiles on a 185x250 canvas. Reverse-engineered binary; not regenerable from higher-level data.

Source: `TYPE1.SHP`. The encoding and the sizes are `Tile.cs` (`documentation/AGENTS.md` "Sources" gives the lines).

## Tile Encoding (4 bytes per tile)

```
byte 0:   signed X dest (-128 to +127)
byte 1:   signed Y dest (-128 to +127)
byte 2-3: flags (LE uint16)
  bits 0-4:   tileX = value * 8
  bits 5-9:   tileY = value * 8 + yOffset
  bits 10-13: sizeIndex (0-15)
  bit 14:     reverseX
  bit 15:     reverseY
```

`sizeIndex` picks a tile size:

| Index | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|-------|---|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|
| Size | 8x8 | 16x8 | 16x16 | 16x24 | 24x8 | 24x16 | 24x24 | 32x8 | 32x16 | 32x24 | 32x32 | 32x40 | 48x16 | 40x32 | 48x48 | 56x56 |

## Canvas Position Formula

```
Canvas X = x_signed + 53
Canvas Y = y_signed + 118
```

Origin offset (53, 118) centers the character reference point on the canvas.

## yOffset by Frame Range

| Range | yOffset |
|-------|---------|
| 0-83, 182-265 | 0 |
| 84-181, 266-363 | 256 |

## Render Order

Back-to-front after `tiles.Reverse()`. Tile 0 = furthest back, last = closest to camera.

## Overlay Offsets (dx/dy)

```
dx = overlay_center_X - body_center_X
dy = overlay_center_Y - body_center_Y

where center = Canvas position + (tile dimension / 2)
```

Body tile is the reference point. All overlays positioned relative to body center. SHP Y-down converts to ThreeJS Y-up: `ThreeJS Y = -(SHP dy) * scaleY`, `ThreeJS X = dx * scaleX * flipX`.

## Canvas → Screen Transform

Every tile of every frame goes through one affine map, so the relative placement of arms, hands and heads on the body is exactly the SHP placement in both renderers:

```
canvas top-left   X = x_signed + 53,  Y = y_signed + 118      (Tile.cs Location)
unit-relative     u = X - SHP_ORIGIN_X (53),  v = Y - STANCE_Y (103)
mirrored (A/D)    u → -(u + w)  and the tile's pixels flip    (SHP F4-F6 = F2/F1/F8; x' = 106 - x - w)
SEQ unit motion   + (fb toward the facing, du down) applied to the whole frame
the main route (CSS)    (u, v) * SCALE (2) on the AnchoredStage, origin at stage (25, 25)
ThreeJS           billboard-local (u * scaleX, -v * scaleY), group origin = stance point,
                  group quaternion = camera quaternion (plane parallel to the screen)
```

`scaleX = SPRITE_WIDTH / 32 = 0.75` and `scaleY = SPRITE_HEIGHT / 40 = 0.9` world units per pixel: the 3D sprite is 1.2× taller than the game's square pixels, uniformly for every tile. Under the orthographic camera a sprite pixel lands on `k·0.75 × k·0.9` screen pixels (k = screen pixels per world unit), so a screenshot sampled on that grid reproduces the SHP frame pixel for pixel. Colors: the sheets are tagged sRGB (`cloneSpriteTexture`), so on screen each palette color is the sheet color times the material tint `SPRITE_TINT`, which is white: the same colors the 2D sections show.

## Walk Hand Offsets (F9-F18)

| Facing | Hand | Layer | dx | dy |
|--------|------|-------|----|----|
| Front | RF | behind | -2 avg | 0 |
| Front | LF | in front | +4 | +4 |
| Back | RB | behind | +4 | 0 |
| Back | LB | in front | -4 | +3 |

Full table: [walk-hand-offsets.md](./walk-hand-offsets.md).

## Frame Ranges

### First Half (0-181)

| Range | Animation |
|-------|-----------|
| F0 | Placeholder (8x8) |
| F1-F8 | Idle poses (P1-P5) |
| F9-F13 | Walk forward (3-tile: RF + body + LF) |
| F14-F18 | Walk backward (3-tile: RB + body + LB) |
| F19-F20 | Crouch |
| F21-F24 | KO/Death |
| F25-F26 | Defend |
| F27-F34 | Jump and cast poses |
| F35-F38 | Magic charge (2-tile: CH + SR) |
| F39-F46 | Confused |
| F47-F54 | Dancing |
| F55-F67 | Casting |
| F68-F69 | Flinch (2-tile: top + bottom) |
| F70-F73 | Walk neutral + KO overlay |
| F74-F83 | Placeholders |
| F84-F181 | Full body + legs (4-5 tiles, yOffset=256) |

### Second Half (182-363)

Redraws the first half in the same order, cut shorter, with HF/HB tiles (182-265) and FF/FB tiles (266-363): F(n + 182) is F(n) for a unit this port reads as standing in water, except F74-F83, whose water frames F256-F265 are composites (`documentation/shp_frame_to_spritesheet_tile/AGENTS.md`).

## Data Files

- [first-half-frames-0-83.md](./first-half-frames-0-83.md)
- [first-half-frames-84-181.md](./first-half-frames-84-181.md)
- [second-half-frames-182-265.md](./second-half-frames-182-265.md)
- [second-half-frames-266-363.md](./second-half-frames-266-363.md)
- [walk-hand-offsets.md](./walk-hand-offsets.md)
