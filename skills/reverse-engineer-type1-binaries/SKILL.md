---
name: reverse-engineer-type1-binaries
description: Decode tactical RPG sprite binaries into exact data. Use when reading TYPE1.SHP or TYPE1.SEQ, finding the meaning of a SEQ opcode, explaining a frame that looks wrong, mapping a new sprite sheet onto the tile layout, or porting another sprite format the same way. Covers the file layouts, how the facts were established, and how to prove a new one.
---

# Skill: Reverse Engineer TYPE1 Binaries

How the data in this repository was established, and how to extend it. The binaries are the source of truth, and `tests/fixtures/type1.json` holds them decoded. The markdown tables in `documentation/` are transcriptions, and `tests/helpers/fft-type1.js` is the working decoder. The files are partial foundations, so most of what is known came from this method: `documentation/AGENTS.md` "Building on the Binaries" lists it. Everything here is settled by the data and a test, never by looking a fact up elsewhere.

## What You Need

- `TYPE1.SHP` (8192 bytes, 364 frames) and `TYPE1.SEQ` (6754 bytes, 218 sequences), decoded in `tests/fixtures/type1.json` with every opcode. `documentation/AGENTS.md` "Sources" says what each file gave. Never edit the fixture. Neither this repository nor an install holds the files, because those binaries are not ours to hand out, and an install from the site has the decoder and the layouts but no fixture. So decoding anything the fixture does not hold starts from your own copy of the files: `decodeShp` and `decodeSeq` take their bytes, and in this repository `TYPE1_DIR=<folder> npm test` runs the parity suites on them.
- A reference decoder, `tests/helpers/fft-type1.js`. This work followed the C# source of the Shishi sprite editor in FFTPatcher: `Shape.cs`, `Frame.cs`, `Tile.cs` and `Sequence.cs`. `documentation/AGENTS.md` "Sources" gives the line of each fact, and the file layouts below hold what they say, so copy no code from them.
- The names, which this repository keeps: `documentation/seq_animation_to_frame/AGENTS.md` "Opcodes" and its "Names" section.
- For the weapon layer, the ThreeJS code. TYPE1 draws no weapon, so `weapons/AGENTS.md` and the cards on the main route are how this repository draws one.

An editor shows what it was built to show, so it is a guide to the format and the data is the ground truth. This one skips SEQ opcodes that the game executes.

## The Method

1. **Parse the format, then keep what the editor drops.** `fft-type1.js` reads the same offsets as the editor, and keeps every `0xFF xx` opcode as `{ op, args }` instead of skipping it. Most of a unit's motion lives in those opcodes.
2. **Find the fixed points from the data.** Tile.cs places a tile at `(x + 53, y + 118)`. F0's SR1 marker sits on column 53, and F4-F6 are F2/F1/F8 reflected about it (`x' = 106 - x - w`), which proves column 53 is the game's mirror axis. The stance center row 103 comes from the idle frames.
3. **Measure from those points.** Every tile becomes `(u, v)` from `SHP_ORIGIN_X`, `STANCE_Y`. Frames then move against each other as the game draws them, and the walk bob and kneels appear with nothing added by hand.
4. **Transcribe nothing by hand.** `SHP_FRAMES` and `SEQ_LIBRARY` are the binary as data, and a test compares them with it entry by entry.
5. **Test the port against the binary.** A value is known when a parity test fails if it changes. Add the assertion first, in `tests/sprite-shp-parity.test.js`, or `tests/sprite-rig-parity.test.js` for what Three.js draws.

## File Layouts

`documentation/shp_frame_to_spritesheet_tile/AGENTS.md` has the SHP header, its two frame tables, the frame layout and the `yOffset` of each range. `documentation/shp_tile_positions/AGENTS.md` has the 4-byte tile encoding, the 16 tile sizes, the canvas formula and the canvas → screen transform. `documentation/seq_animation_to_frame/AGENTS.md` has the SEQ offset table, the `[frame, delay]` pairs and the opcode rules.

## Rebuilding the Tables

No generator is checked in: the tables change only if the decoder does. To rebuild one, read it off `tests/helpers/fft-type1.js`. A `SHP_FRAMES` entry is `shpTiles(fi)` with each center less (`SHP_ORIGIN_X`, `STANCE_Y`) and a fourth element 1 on `flip`. A `SEQ_LIBRARY` entry comes from `seqFrames`, `seqTicks`, `seqMotion` and `SEQ_RAW_IDS`. `cellIdForRect` names each tile, so a tile it cannot name needs a new `SPRITE_CELLS` entry first. `tests/sprite-shp-parity.test.js` compares the result with the binary entry by entry.

## Reading an Unknown Opcode

1. Find every sequence that uses it, and what surrounds it: a frame, another opcode, the end of a sequence.
2. Check the parameter count. A wrong count shifts every later pair, so a parse that shows a frame past 181 or an implausible delay means the table is wrong. `0xC4` was found this way: the editor's table has no entry, so it read two parameter bytes as a frame with a delay like 250.
3. Form a claim the data can refute, then test it across every use. `0xC4` is a pair of signed bytes that lift an object from the ground to the raised hands across SEQ 80/81, so `CARRY_TRACK` holds it.
4. If nothing refutes it but nothing confirms it, say so. The water reading of F182-F363 and the sign of MoveUnitRL are marked as inferred or unknown in `documentation/`, and the port does not depend on the second.
5. Record what you established in `documentation/seq_animation_to_frame/AGENTS.md` "Opcodes".

## Names

SEQ numbers here are a filtered index that skips empty and duplicate pointers. The game's animation id is the raw pointer index (`SEQ_RAW_IDS`), and `SEQ_LIBRARY` keeps each name beside that id. Check a name against what the frames draw: `documentation/seq_animation_to_frame/AGENTS.md` "Names" has the evidence.

## Hands and Other Pixels

Tile rects are shared and art is not, so a position inside a tile belongs to one sheet. To place a grip, composite the SHP frame from that sheet, find the hand by its colors, and take the pixel holding the centroid of its visible pixels. `visiblePixel(fi, x, y, sheet)` reads a composited pixel. Record the tile and the tile-local pixel, then derive the unit point the way the renderers place the tile.

## A New Sheet

A sheet is a non-interlaced 256x488 PNG, 8-bit RGBA or indexed, the forms `decodePng` in `assets/check-sheet.mjs` reads, which is also how `sheetPixels` in `tests/helpers/fft-type1.js` reads a sheet. Decoded, alpha is 0 or 255 and an empty pixel is `(0, 0, 0, 0)`. Any art that keeps TYPE1's tile layout fits, and only that: a sheet rearranged for viewing, as most ripped sheets are, has no tiles to read.

1. Export the sprite at that size and key its background to alpha 0.
2. Copy each `SPRITE_CELLS` rect onto an empty image, so the pixels inside the cells cannot change. A sprite file also carries art that TYPE1 never draws: a 48x32 portrait at (80, 456), spare tiles and lettering. `tests/character.test.js` "has pixels only inside SPRITE_CELLS" fails on any of it. If the lettering credits an artist, keep the credit in `README.md` "Licenses".
3. Run `node assets/check-sheet.mjs <sheet>.png`, the same checks `references/own-sheet.md` gives anyone outside this repository.
4. Change `SPRITE_SHEET_FILE` and the tests that name the file.
5. Re-derive `THROW_STONE_GRIPS`, `HAND_GRIPS` and `HAND_RESTS` from its pixels and update `HAND_COLORS` in `tests/sprite-shp-parity.test.js` and `tests/set-items.test.js`. Everything computed from the release hand follows, including the stone's launch point. `data.holds` is baked only for `SPRITE_SHEET_FILE`, so it follows too. Re-read the documented timings afterward.

## A Visual Anomaly

Heuristics can flag a tile and can never override the SHP. `documentation/SPECIAL-SPRITE-REVERSAL-CASES.md` is the worked example: LG48 and LG53 fail a mirror test on `a1.png`, and the binary uses them unflipped everywhere. Compare the composite with the decoded frame before changing anything.

## Prevents

- Dropping motion the editor does not show
- Mirroring about a tile center instead of the origin column
- Trusting a transcription over the binary
- Reusing a grip across sheets
- Art left outside the sprite cells
- Stating an inferred meaning as fact
- Editing `tests/fixtures/type1.json`
- A fact with no named source
- A fact taken from a wiki or a forum instead of proved from the binary
