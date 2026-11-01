---
name: add-sprite-assembly-from-source
description: Add or fix sprite data, assembly definitions and 2D sections from decoded SHP and SEQ data. Use when working with sprite cells, frame tiles, overlays, anchors, flips, delays, hand-held props or anything drawn on the main route, even for a small visual fix.
---

# Skill: Add Sprite Assembly from Source

Load when working with sprite data, assembly definitions, the 2D verification pipeline, or any visual/billboard rendering code. The result of this skill is a perfect sprite section on the main route. Assembly to ThreeJS is a separate skill (`add-sprite-assembly-into-threejs-engine`).

## Invariants

### Billboard quaternion

All character sprites are 2D. The group quaternion is set exclusively from `camera.quaternion` inside the group's visual driver (`setVisualDriver` in `character-utils.js`). No external system may ever write to a character group's quaternion.

### 8-step / 4-pattern system

`azimuthToStep(camera)` returns 0-7, and `ASSEMBLY_STEP_MAP` maps it to patterns A/B/C/D. Every mode's frame table has exactly 8 entries or indexes through this map. `references/get-started.md` "Facing and the Camera" has the table, and `documentation/AGENTS.md` "Reversal Levels" the two flips, SHP and pattern, which are independent.

### Sprite cell references

All sprite references must use IDs from `SPRITE_CELLS`. `applySpriteFrame(texture, id, reversed)` resolves UVs from `SPRITE_MAP`. Never hardcode pixel coordinates or filenames — use `SPRITE_SHEET_FILE`. The sheet holds pixels only inside those cells (`tests/character.test.js`), so a tile with no cell has nothing to draw.

## Source Data Pipeline

```
SEQ animation (TYPE1.SEQ, 6754 bytes, 218 sequences)
  → Frame indices + per-frame delays (SHP frames 0-181)
    → SHP frame-to-tile mapping (TYPE1.SHP, 8192 bytes, 364 frames)
      → Tile pixel positions + overlay offsets (dx/dy)
        → SPRITE_CELLS / SPRITE_MAP (200 cells on 256x488 sheet)
          → Assembly data in constants/sprites/assembly.js
            → the main route 2D CSS verification
              → ThreeJS billboard composite (separate skill)
```

Each pipeline stage has its own documentation in `documentation/*/AGENTS.md`. Paths below start from `three-isometric-engine/` unless they start with `pages/`, `tests/` or `documentation/`. How the data itself was established is in `skills/reverse-engineer-type1-binaries`.

## Assembly Data Contracts

### Structure

Each assembly export has 4 patterns (A/B/C/D; Idle has its 8 steps) with:
- `name` — pattern identifier with step range and arrow
- `reversed` — boolean, A/D are reversed, B/C are not
- `seq` — SEQ reference (e.g., "SEQ 6")
- `shp` — SHP frame range (e.g., "F9-F13")
- The frames, in the mode's shape: `frames: [{ body: 'X', ...overlays }]` for most modes, `body: [{ id, reversed }]` plus `hands` for Walk, one `body` string for Guard and Float, `top` and `bottom` for Hurt, and `id` for Idle, Kneel and Dead
- Frame-specific overlay fields: `head`, `front`, `behind`, `farBehind`, `over` (varies by mode)
- Each overlay entry: `{ id, dx, dy }` — center-to-center pixel offsets from body center. Cast uses `overlay`, `overlayDx`, `overlayDy` and Hurt `bottom`, `bottomDx`, `bottomDy`
- `anchor: { dx, dy }` — attached to every composite frame (and idle / kneel / dead entry) at module load (never hand-written): the body-tile center offset from the unit origin (`SHP_ORIGIN_X` = canvas column 53, the SHP origin and the game's mirror axis) at the idle stance center row (`STANCE_Y` = 103), where TYPE1.SHP draws it. Source of truth is `BODY_ANCHOR_MAP` (per body tile, like `TORSO_HEAD_MAP`) plus `WALK_BOB_DY` for the walk-cycle frames F9-F18. Guard holds walk frame 5 and keeps its +2 bob. Reversed patterns mirror dx about the origin — exactly the game's mirrored frames (F4-F6 = F2/F1/F8 reflected about x = 53).
- `move: { fb, du }` — SEQ unit motion for frames of sequences with move opcodes (punch, stab, jump, quick throw): pixels forward along the facing / down, accumulated from the sequence start. Sequences that redraw one composition with motion keep a separate playback table (`FLOAT_MOVES`, `HURT_SHIVER_MOVES`, `FATAL_ITEM_IMPACT_TIMELINE`).

### SEQ opcodes are animation data

The Shishi editor skips them and the game executes them, so a new mode must port its motion or the parity test's motion-free list must cover it. `documentation/AGENTS.md` "SEQ Unit Motion" has the opcodes, and `seqMotion(s)` in `tests/helpers/fft-type1.js` decodes them.

### Depth contract

`constants/sprites/AGENTS.md` "Assembly Conventions", with the exceptions the renderers encode.

### Per-tile flips

No ported overlay tile is SHP-reversed (bit 14 is set only on the mirrored idle frames F4-F6 and their water copies F186-F188). Never add a manual per-tile flip to make a pose "look" right — `tests/sprite-shp-parity.test.js` rejects it. See `documentation/SPECIAL-SPRITE-REVERSAL-CASES.md`.

### Offset convention

Positive dx = right, positive dy = down (SHP/CSS convention). Billboard negates: `bodyY + (-dy) * scaleY`. Per-pattern `reversed` applies `scaleX(-1)` in CSS and negative `texture.repeat.x` in Three.js.

### Timing arrays

All timing is in ticks at 60fps. `constants/sprites/AGENTS.md` "Assembly Conventions" has every array.

### Hand-held props

A weapon needs no art: `weapons/AGENTS.md` generates one from a spec or bakes one from Set, and only its anchor comes from here (`HAND_GRIPS`, `BOW_DRAW_GRIPS`). A prop that rides a sprite's hand (the Mode TS stone, the Mode T caught marble, the main route bow, Set's items) is anchored on a pixel of the tile that draws the hand, never on a hand-tuned offset. Tile rects are shared and art is not, so the record is per sheet: per frame, the assembly layer whose tile draws the hand and the hand's center pixel on that tile (`THROW_STONE_GRIPS[sheet].fwd/.bck`: `{ layer, id, x, y }`, tile-local), and derive the unit-pixel point from the frame's anchor and the layer's offset, the way the renderers place the tile (`THROW_STONE_HANDS[sheet]`). `tests/sprite-shp-parity.test.js` checks each grip is a visible hand pixel of that tile in the SHP frame composited from that sheet (`visiblePixel(fi, x, y, sheet)` decodes the PNG). A sequence that draws the same SHP frames reuses the record instead of copying it (Quick Throw frames 2-5 are Throw Stone frames 2-5, asserted in the same test file). The grip ends on the last frame the hand holds the prop: a frame drawn after the release shows an empty hand, so the prop leaves from the frame before it (Throw Stone frame 6, not the follow-through of frame 7). What physics reads never comes from a billboard point: `CARRY_TRACK` (the `0xC4` track of SEQ 80/81) gives forward and height pixels that need no camera or sheet. A held mesh also needs what covers it: it goes between two of the frame's tiles, and only looking at the card on all four patterns says which. Pointing along the view it needs no table, because `heldEnd` reads its direction (`weapons/AGENTS.md` "What Covers What").

## Scale, Offsets and Depth

Every mode uses one scale, derived from the 32x40 body plane: `add-sprite-assembly-into-threejs-engine` "Pattern rules". Overlay offsets from SHP are in `documentation/shp_tile_positions/AGENTS.md` "Overlay Offsets (dx/dy)", with the full canvas to screen map beside them. `renderOrder` comes from a tile's place in the SHP reversed list, not its identity: tile 0 is furthest back.

## The Main Route Page

The main route page is the source of truth for visual correctness. If a sprite looks wrong at the main route, it will look wrong in ThreeJS. Fix 2D before 3D, always.

### Frame placement (stage)

Every composite renders inside `AnchoredStage`: a fixed 50x54 px stage whose center (25, 25) is the unit origin at the stance center row, with a faint ground line at the stance bottom. The body-sized composite container is placed so the body center sits at `stage center + anchor` (dx mirrored for reversed patterns) plus the frame's SEQ `move` (`du` down; `fb` shown screen-horizontal toward the sprite's facing — left for B/C, right for A/D). Single tiles use `AnchoredTile`. Frames of a sequence therefore move exactly as the game draws them.

### Frame placement formula (CSS)

```
width:              cell.w * SCALE
height:             cell.h * SCALE
backgroundSize:     SHEET_W * SCALE, SHEET_H * SCALE
backgroundPosition: -(cell.x * SCALE), -(cell.y * SCALE)
```

This is the 2D equivalent of `applySpriteFrame()` UV mapping.

### Components

`pages/AGENTS.md` "Components" lists them.

### Conventions

- Depth: DOM order = depth (later = on top). ThreeJS equivalent: `renderOrder`.
- Walk order: Ping-pong `[2,1,0,1,2,3,4,3]` with variable timing via `WALK_DELAYS`.
- Composite highlights: Color-coded overlays — blue (heads), pink (hands), orange (waist-to-feet).

## Sequences Without an Assembly

Every TYPE1 sequence is already data (`constants/sprites/seq-library.js`, `shp-frames.js`) and plays on the main route in the Sequence Library section, and every distinct animation TYPE1 draws has a mode; those without an assembly get their mode, 2D section and ThreeJS card from a `SEQUENCE_MODES` row. Write an assembly only for a mode that needs named layers, like a hand-held prop or a mode-specific rig. A mode that only plays its frames needs one row in that table (`add-sprite-assembly-into-threejs-engine`).

## Procedure: Adding a New Mode to 2D

1. Identify SEQ pair (front + back) in `documentation/seq_animation_to_frame/`.
2. Map frame indices to tile IDs via `documentation/shp_frame_to_spritesheet_tile/`.
3. Extract `{ dx, dy }` offsets from `documentation/shp_tile_positions/`.
4. Verify all tile IDs exist in `constants/sprites/index.js` — add any missing.
5. Create `SpriteSheetTable*` component in `SpriteSheetTables.tsx` — forces full pipeline trace.
6. Add assembly data to `constants/sprites/assembly.js` — 4 patterns (A/B/C/D), timing array.
7. Add rendering section to `pages/index.tsx` (wrap composites in `AnchoredStage`) — verify visually.
8. Extend `tests/sprite-shp-parity.test.js` with the new mode (and its SEQ motion). It reads `TYPE1.SHP` and `TYPE1.SEQ`, decoded the same way the Shishi editor does (shared decoder: `tests/helpers/fft-type1.js`, output frozen in `tests/fixtures/type1.json`) and asserts tile set, body-relative offsets, flips, depth order, anchor, SEQ order, delays and unit motion. Add any new body tile to `BODY_ANCHOR_MAP`.

Steps 5-7 are the 2D pipeline: pipeline table, assembly data, the main route rendering. A mode is not ready for 3D until it renders correctly at the main route.

## Prevents

- Rotation overrides on billboards
- Wrong pattern selection (must use `ASSEMBLY_STEP_MAP`)
- UV errors (must use `applySpriteFrame` with `SPRITE_MAP`)
- Scale mismatch between modes (must normalize to `STANDARD_CONTAINER_H`)
- Depth fighting (must set `depthWrite: false` on overlays)
- Broken reversal (A/D reversed, B/C not)
- Skipped 2D verification (fix the main route before 3D)
- Wrong offset signs (positive dy = down in SHP/CSS)
- Missing sprite cells (all IDs must exist in `SPRITE_CELLS`)
- Frames pinned to their own bounding box instead of their SHP anchor (loses the walk bob and lunges)
- Heuristic per-tile flips or reordered layers that diverge from TYPE1.SHP
- Mirroring about anything other than the unit origin column (canvas 53) — mirrored patterns land 2px off the game's axis
- Dropping SEQ move opcodes (static float / flinch, punches without their wind-up and lunge)
