# SHP Frame-to-Spritesheet Tile Mapping

364 frames reuse 197 of the 200 tile IDs (LG58-LG60 are never drawn). Each frame composes 1-6 tiles as `{ id, reversed }` pairs. Mapping is many-to-many: multiple frames share tiles, and each frame may use multiple tiles.

## Binary Structure

Decoded from `TYPE1.SHP` with the rules of `Shape.cs` and `Frame.cs` (`documentation/AGENTS.md` "Sources" gives the lines).

- **File**: `TYPE1.SHP` (8192 bytes), 364 frames (182 per half). All values are little-endian.
- **Header**: u32 at byte 0 = `jump` (0xEB2), the start of the second half's table. u16 at byte 4 = the first frame of each half with `yOffset` 256 (84).
- **Frame tables**: u32 offsets from byte `0x0C` (first half) and `jump + 4` (second half), each ended by a 0 entry. Each table holds 181 entries, because its first frame has the implied offset 0.
- **Frame data**: a frame starts at `offset + 0x40A` (first half) or `offset + jump + 0x402` (second half). It is a u16 `n`, then `n + 1` tiles.
- **Tile order**: the file lists a frame's tiles front to back, so the decoder reverses them to get the draw order.
- **Tile encoding**: 4 bytes per tile (details in `shp_tile_positions/AGENTS.md`)
- **16 fixed tile sizes**: 8x8 through 56x56 (listed in `shp_tile_positions/AGENTS.md`)

## Two Halves

| Frames | Content | yOffset |
|--------|---------|---------|
| 0-83 | P, BF/BB, LF/RF, CH, KO, DF/DB, SP | 0 |
| 84-181 | LG + TF/AF (4-tile full-body compositions) | 256 |
| 182-265 | Same as 0-83, with SR and HD/HF/HB strips | 0 |
| 266-363 | Same as 84-181, with SR and FF/FB strips | 256 |

F182-F363 follow the order of F0-F181: F(n + 182) redraws F(n), except F74-F83, whose water frames F256-F265 are composites, and 154 of the other 171 drawn frames lose rows at the bottom (2-21px), so this port reads them as a unit standing in water (ST1/ST2 are its dead pose). No SEQ references them; the game adds the offset at render time. `SHP_WATER_OFFSET` does the same on the main route. The cut differs by frame, so the ThreeJS cards take one waterline from the idle water frame, F183, which stops at row 10, and a depth-writing surface cuts every sprite there, assemblies included (`pages/AGENTS.md` "ThreeJS Demos"). The water meaning is inferred from the data.

`constants/sprites/shp-frames.js` holds all 364 frames as data.

## SPRITE_CELLS Coverage

170 primary + 30 sub-region (SR1-SR30) = 200 total. ID prefix breakdown in `constants/sprites/AGENTS.md`.

## Data Files

| File | Content |
|------|---------|
| `first-half-frames-0-83.md` | Frames 0-83 (yOffset=0) |
| `first-half-frames-84-181.md` | Frames 84-181 (yOffset=256) |
| `second-half-frames-182-265.md` | Frames 182-265 (with HF/HB) |
| `second-half-frames-266-363.md` | Frames 266-363 (with FF/FB) |
| `sub-region-tiles.md` | SR1-SR30 documentation |
