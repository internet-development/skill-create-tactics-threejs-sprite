# Documentation Guide

Reverse-engineered tactical RPG sprite data from `TYPE1.SEQ` (6754 bytes, 218 sequences) and `TYPE1.SHP` (8192 bytes, 364 frames). Neither file is kept here: `tests/fixtures/type1.json` holds them decoded. 200 sprite cells on a 256x488 sheet. 98 Three.js modes are registered: 96 with arrow symbols, plus A1 and SQ. They include Float (FL), Unarmed High/Mid/Low (S1, S2, S3), Bounced to Death (FI), Revived (ID) and the 77 sequence modes (`SEQUENCE_MODES`: Swing, Poke, Gun, Read Book and every other distinct animation, listed in `seq_animation_to_frame/AGENTS.md`). All 218 sequences are ported as data (`constants/sprites/seq-library.js`) and play on the main route, dry or in water, in the Sequence Library section. Paths here start from `three-isometric-engine/`.

See `skills/add-sprite-assembly-from-source` for the full 2D sprite pipeline procedure, invariants, and assembly data contracts, and `skills/reverse-engineer-type1-binaries` for how the data was established.

## Pipeline

```
seq_animation_to_frame/          SEQ sequences → frame indices + per-frame delays
        ↓
shp_frame_to_spritesheet_tile/   SHP frames → 1-6 tile IDs per frame (197 of the 200 cells)
        ↓
shp_tile_positions/              Pixel positions + overlay offsets (dx/dy)
        ↓
constants/sprites/index.js       200 SPRITE_CELLS → pixel regions on sheet
constants/sprites/assembly.js    Per-mode assemblies with dx/dy offsets
        ↓
pages/index.tsx                  2D CSS verification (fix here before 3D)
        ↓
meshes/character-groups/         3D ThreeJS billboard rendering (per-mode)
```

Each subfolder has its own AGENTS.md with format details: the `TYPE1.SHP` header and frame tables in `shp_frame_to_spritesheet_tile/`, its tile encoding in `shp_tile_positions/`, and `TYPE1.SEQ` in `seq_animation_to_frame/`. `tests/helpers/fft-type1.js` is the working decoder.

## Sources

Every fact here is one of four kinds, and a contribution should say which.

**1. The binaries and the Shishi Sprite Editor that reads them.** This work builds on both, and on the contributions of the editor's open-source community. Neither is in this repository. `tests/fixtures/type1.json` is what the decoder read from the two files, with each file's size and SHA-256, and the C# file names below are the editor's source in FFTPatcher, read for the file format.

| Fact | File and line |
|------|---------------|
| Frames: tiles, positions, flips, order | `TYPE1.SHP` |
| Sequences: frames, delays, opcodes | `TYPE1.SEQ` |
| SHP `jump` at byte 0, second half index at byte 4 | `Shape.cs:108-109` |
| First half: offsets at `0x0C`, frames at `offset + 0x40A` | `Shape.cs:123`, `:134` |
| Second half: offsets at `jump + 4`, frames at `offset + jump + 0x402` | `Shape.cs:145`, `:155` |
| `yOffset` 256 from the second half index | `Shape.cs:134`, `:155` |
| A frame is a u16 tile count, then 4 bytes per tile | `Frame.cs:57`, `:68` |
| The 185x250 canvas | `Frame.cs:31` |
| Tiles reversed, so the list is back to front | `Frame.cs:72` |
| The 16 tile sizes | `Tile.cs:32-47` |
| `reverseX`, `reverseY`, size index, sheet position | `Tile.cs:67-71` |
| A tile's canvas position is `(x + 53, y + 118)` | `Tile.cs:73` |
| 218 TYPE1 sequences | `Sequence.cs:46` |
| SEQ offset table, `0xFFFFFFFF`-terminated, data at `0x0406` | `Sequence.cs:76`, `:85` |
| A pointer equal to the next is skipped | `Sequence.cs:89` |
| `[frame, delay]` pairs, `0xFF` opcodes and their parameter counts | `Sequence.cs:28-31`, `:144-148`, `:160` |
| A delay is in 60ths of a second | `Sequence.cs:185` |
| The sheet is 256 wide and 488 tall | `AbstractSprite.cs:62`, `AbstractCompressedSprite.cs:44` |

**2. What the binaries prove on their own.** Each is held by a test. Canvas column 53 is the mirror axis, because F4-F6 are F2/F1/F8 reflected about it. Row 103 is the stance center. `ffc4` takes two bytes, because reading it the editor's way gives impossible frames. F(n + 182) redraws F(n). PlaySound, PostGenericAttack and move opcodes sit on the ticks the tables give them.

**3. The names.** This repository is the reference for them, and for what each opcode is taken to do. Opcodes are in `seq_animation_to_frame/AGENTS.md` "Opcodes". Animations are in `SEQ_LIBRARY` and that folder's data files, and https://3d.internet.dev plays each one under its name. They are labels, not Square's, so check a name against what the data shows, as "Names" does for the animations. Years ago the first names came from the community's FFHacktics wiki. A ThreeJS engine needed more than they gave, so they were ported here and finished against the binaries. Nothing here needs it now, so do not send anyone there. This is the only place that says so: every other document points at this repository's own tables.

**4. This project.** Not from the game. `a1.png` is a custom sheet, so every grip is read from its pixels (`HAND_GRIPS`, `HAND_RESTS`, `THROW_STONE_GRIPS`). Reading F182-F363 as a unit in water is inferred. Item tilts that the art does not draw, what covers what on a held card (`weapons/AGENTS.md` "What Covers What"), every prop and the scenes around them were settled by looking at each card.

## Building on the Binaries

`TYPE1.SHP` and `TYPE1.SEQ` are the foundation, and a partial one. They hold frames, delays and opcode bytes, and the editor reads part of them. Bringing these sprites into real-time combat and three-dimensional scenes took everything else a unit needs, and that was engineered here. This table is all of it, so nobody has to go looking for the answers anywhere else.

| The binaries do not give | So this repository | Where it lives |
|-------------------------|--------------------|----------------|
| Any animation name: `BuildSequences` takes its names as an argument (`Sequence.cs:66`) and neither binary holds one | Named all 218 sequences, against what they draw | `SEQ_LIBRARY`, `seq_animation_to_frame/AGENTS.md` "Names" |
| What an opcode does: `Sequence.cs` lists only how many bytes to skip | Kept every opcode, and named and placed the ones a unit needs | `seq_animation_to_frame/AGENTS.md` "Opcodes" |
| The two bytes of `ffc4`, which the editor's table lacks, so it reads them as a frame | Proved the count from the impossible frames it gave, and read the carried object out of them | "SEQ Control Opcodes and Action Timing", `CARRY_TRACK` |
| Unit motion, which the editor skips | Ported every lunge, hop, hover and shiver | "SEQ Unit Motion", `fb` and `du` in `SEQ_LIBRARY` |
| When a hit lands or a sound plays, which the editor skips too | Read them onto the ticks of each sequence | "SEQ Control Opcodes and Action Timing", `events` in `SEQ_LIBRARY` |
| A mirror axis or a pivot: `Tile.cs` gives only a canvas position | Proved column 53 and row 103 from the frames | "Body Anchors", `SHP_ORIGIN_X`, `STANCE_Y` |
| Any art, cell list or hand: there is no image in either file | Drew `a1.png`, listed its 200 cells and read every grip off its pixels | `SPRITE_CELLS`, `HAND_GRIPS`, `HAND_RESTS`, `THROW_STONE_GRIPS` |
| What F182-F363 are for | Read them as a unit in water, marked as inferred | `shp_frame_to_spritesheet_tile/AGENTS.md` |
| A weapon, or what covers one: TYPE1 draws none | Built the bow and the bag, baked Set's items, and settled each card's layers by looking at it | `three-isometric-engine/weapons/AGENTS.md` |
| A whole jump, a thrown item, a target: the game's effect code does those, and it is not in these files | Staged each one and said where it departs from the original tactical RPG | "Engine Differences From the Original Tactical RPG" |

Three things stay open, and nothing here depends on them: how long a `ffc0` distortion holds, which side `fff0` moves to, and the opcodes "Opcodes" leaves unnamed. Each is marked as such where it appears, so leave them marked rather than filling them in from memory or from an outside source. A new fact comes from the decoded files and a test, as `skills/reverse-engineer-type1-binaries` shows.

## Reversal Levels

Two independent flip mechanisms:

1. **SHP-level** (bit 14): Per-tile `reverseX` baked into binary data.
2. **Engine-level** (pattern symmetry): Patterns A/D reversed, B/C not reversed. CSS: `scaleX(-1)`. ThreeJS: negative `texture.repeat.x`.

A tile can be SHP-reversed AND engine-reversed simultaneously.

## Z-Indexing

SHP tile order after `tiles.Reverse()` = back-to-front rendering. Position in the reversed list determines `renderOrder`, not tile identity.

## Body Anchors

Tiles sit at absolute positions on the canvas, so frames move relative to each other (walk bob, lunges, kneels). Tile.cs places a tile at `(x + 53, y + 118)`: canvas column 53 (`SHP_ORIGIN_X`) is the unit's origin — F0's SR1 ground marker is centered on it and the game mirrors a unit about it (F4-F6 are F2/F1/F8 reflected about x = 53). `BODY_ANCHOR_MAP` in `constants/sprites/assembly.js` records each body tile's center offset from (`SHP_ORIGIN_X`, `STANCE_Y` = 103, the idle stance center row); the walk cycle F9-F18 adds `WALK_BOB_DY`. Renderers place bodies from these anchors and mirror about the origin.

## SEQ Unit Motion

SEQ data interleaves `[frame, delay]` pairs with `0xFF xx` opcodes. The Shishi editor skips them; the game executes them. The move opcodes (`seq_animation_to_frame/AGENTS.md` "Opcodes") translate the whole unit: `ffcb`/`ffcc` MoveUp2/1, `ffcf`/`ffd0` MoveDown2/1, `ffd1`/`ffd2` MoveForward2/1, `ffcd`/`ffce` MoveBackward2/1, `ffee` MoveUnitFB (signed px), `ffef` MoveUnitDU (signed px), `fff0` MoveUnitRL, `fffa` MoveUnit. Every frame drawn after a move is offset. Every sequence that moves the unit forward, back, up or down is ported (118 of 218, for example Float 12/13, 2px hover; Taking Damage 38/39, 1px shiver; Bounced to Death 82/83, 12px hop + bounces; Unarmed 96-101 and Bow 140-145, 2px wind-up, then the lunge): `fb` / `du` in `SEQ_LIBRARY`, which the sequence group plays. Assembly modes also keep theirs in `assembly.js` (`move`, `FLOAT_MOVES`, `HURT_SHIVER_MOVES`, `FATAL_ITEM_IMPACT_TIMELINE`).

## SEQ Control Opcodes and Action Timing

The other opcodes say when things happen; the engine's action timelines follow them (`actions/action-timelines.js`, checked by `tests/sprite-shp-parity.test.js` "SEQ-driven action timing"):

- **IncrementLoop `ffd5`** loops a sequence; **a frame delay of 0** holds that frame until the game moves on. Jump 2 SEQ 204/205 ends on the Mid Jump pose F28/F30 with delay 0: the game holds it while the unit is in the air. The Mid Jump pose is also SEQ 42/43. Mode J stays on the ground through the five take-off frames, flies on that pose (`JUMP_AIR_TICKS`, `jumpLift`) and touches down on the first frame of High Jump Land SEQ 52/53. The A1 jump holds the pose until landing (`playerJumpFrame`).
- **PlaySound `fff6`** in Dragoon Jump 3 SEQ 208/209 sits right before F102/F151, the arm's low follow-through: Mode TS releases the stone there (`THROW_STONE_RELEASE_FRAME` 7), after picking it up on the kneel F21/F22 (`THROW_STONE_SPAWN_FRAME` 2). Between them the stone rides the throwing hand: `THROW_STONE_GRIPS[sheet]` names the tile that draws the throwing hand in each frame and the hand's center pixel on it (per sheet: sheets would share tile rects, not art), and `THROW_STONE_HANDS[sheet]` places that pixel exactly as the renderers place the tile. F102/F151 draw the arm low and the hand empty, so the stone leaves as that frame starts, from the hand of frame 6 (F92/F141), on one arc from a camera-independent release point (`throwStoneFlightPoint`). High Jump Start SEQ 48/49, which Quick Throw plays, draws the same F21/F22, F19/F20, F27/F29 and F31/F33 as frames 2-5, so a caught marble rides the same grips, and leaves on F31/F33, where SEQ 206/207 (the same six frames) run PlaySound.
- **Carried object `ffc4`** (two signed bytes: forward px, height px from the SHP origin row) with `ffc5` / `ffc3` around it: SEQ 80/81 lift an object from the ground under the kneel to between the two raised hands and back. The Shishi table has no entry for it, so the editor reads the bytes as a frame and a delay. `CARRY_TRACK` holds it; a caught marble's hold height follows it.
- **QueueDistortAnim `ffc1` / WaitForDistort `ffc0`**: in 208/209, F31, F92, F102 and F86 (back: F33, F141, F151, F135) are each followed by WaitForDistort, which loops the frame until the queued secondary graphic animation finishes, so in the game those frames are held longer than their 2-tick SEQ delay. PostGenericAttack `ffde` (damage numbers) follows the kneel after the throw; in Unarmed 96-101 it runs right before the extend frame, tick 18, where the engine's hit check sits (`STAB_HIT_FRAME`). Bow 140-145 has no `ffde`, because the arrow lands the hit: its only cue is PlaySound `fff6` at tick 26, the shot (with `ffd9`, whose meaning here is unverified). The distortion durations live in game code, not the SEQ; the port plays the SEQ delays.
- **Animation ids.** The filtered SEQ index used in these docs skips empty and duplicate pointers; the game's animation id is the raw pointer index (`SEQ_RAW_IDS` in `tests/helpers/fft-type1.js`) — e.g. Float SEQ 12/13 is animation 0x12/0x13.

## Engine Differences From the Original Tactical RPG

The SEQ data decides what is drawn and when. What an action does in the world belongs to the ThreeJS scene, which has no game-side ability effects, so these moments stay where the scene needs them and do not follow the SEQ opcodes. "Engine" below means the timelines in `actions/action-timelines.js`, which the demo cards replay. Every frame, delay and unit move the port plays is exact, except what this table lists. The note in `actions/action-timelines.js` points here, and the main route card timelines show the SEQ event and the engine event side by side.

| Action | Game (SEQ data) | Engine |
|--------|-----------------|--------|
| Bow 140-145, played by the engine's punch | Shot sound (PlaySound `fff6`) at tick 26 | Hit check at tick 12 (`PUNCH_HIT_TICKS`), the first extend frame. The Bow cards are what the sequence itself is: a generated bow (`weapons/`) that looses on the PlaySound tick |
| Gun 134-139 | PostGenericAttack `ffde` at tick 24 (Low 20). No weapon in the SEQ or SHP data, and no PlaySound | A streak from Set's rifle (`weapons/AGENTS.md` "Guns") lands on that tick and the target flinches, so the SEQ and engine events on the strip coincide. The muzzle flashes two ticks earlier, when the shot leaves |
| Swing 102-107, Poke 128-133, Read Book 146/147 and 188/189, Play Instrument 148/149, Shield Block 150-155, Swing Recoil 156-161, Katana Use 202/203 | The unit's empty hands | The cards hold models from Set on the hand of each frame (`weapons/AGENTS.md` "Set Items"). Their tilts come from the arms the sprite draws, apart from a sword's swing, a spear's ready pose, a book, a harp and a shield, which are this project's |
| Item Throw 108-125 | The unit's empty hands | The cards hold a black marble on the hand of each frame, the small one on High and the big one on Mid and Low, between the hands once both come down, and Release throws it (`weapons/AGENTS.md` "Item Throw") |
| Item Throw Release 112/113, 118/119, 124/125 | The arm's motion and PlaySound on tick 0, because the game's effect code flies the item | The marble leaves the hand on PlaySound, on a planned arc at a target that stands above the thrower, level with it or below it, and comes off it as Throw Stone's does (`weapons/AGENTS.md` "Item Throw") |
| Weapon Throw 126/127 | The arm's motion and nothing else: no event, because the game's effect code flies the weapon | The sword leaves the hand on tick 18, the end of the last frame that holds it, on a planned arc to a target, and the target flinches where its point arrives (`weapons/AGENTS.md` "Weapon Throw") |
| Thrust Recoil 168-173 | The attacker alone, sent back from a thrust the game has already stopped | The card stands a unit in Shield Block where the thrust ends, on Poke's stage, and plays the recoil from the contact (`weapons/AGENTS.md` "Thrust Recoil") |
| Cloth Bag 210-215 | The unit's empty hands on the Swing frames | The cards swing a generated bag on a simulated cord (`weapons/AGENTS.md` "The Cloth Bag"). It meets the target within two ticks of PostGenericAttack, and the target flinches on the SEQ's tick |
| Every held item, the bow, the marbles | TYPE1 draws no weapon, so the SEQ says nothing of what covers it in these frames | Each card keeps which tiles draw over the item (`weapons/AGENTS.md` "What Covers What"), and the stage draws the item among them |
| Dragoon Jump 3 208/209, played by Throw Stone | No stone in the SEQ or SHP data; PlaySound at tick 26, PostGenericAttack `ffde` (damage numbers) at tick 32 | The stone is a scene object: picked up on the kneel (tick 8), released on PlaySound (tick 26) from a camera-independent point, and it hits on contact, whenever that happens |
| High Jump Start 48/49, played by Quick Throw | No event; MoveUp2, then F31/F33 held (delay 0) until the game ends the action. SEQ 206/207 draw the same frames, PlaySound before F31/F33, 2 ticks on it | F31/F33 drawn for the 2 ticks of SEQ 206/207, then idle. Marble picked up on the kneel (tick 8), released overhead on that sound (tick 22, `QT_RELEASE_TICKS`), on a camera-independent path while the drawn marble rides the hand |
| WaitForDistort `ffc0` | Holds the frame before it until a game-side graphic finishes: F31, F92, F102 and F86 in 208/209 (back: F33, F141, F151, F135), and also in 88/89, 94/95, 186/187 and 206/207 | Not played: the port uses the 2-tick SEQ delays |
| Jump | No TYPE1 sequence is one whole jump: Jump 2 204/205 takes off, Mid Jump 42/43 holds, High Jump Land 52/53 lands | Mode J joins them: 22 ticks on the ground, `JUMP_AIR_TICKS` (32) in the air, 18 on the ground (`JUMP_TICKS`). The A1 jump leaves the ground as the action starts, so it draws only the last two take-off frames, and its landing frames are visual: landing returns control at once |
| WeaponSheatheCheck2 `ffd6` | In Unarmed 96-101, Bow 140-145 and every other sequence that carries it (72/73, 102-107, 128-139, 146-149, 174/175, 184/185, 188-191, 194/195, 200/201, 210-217) it holds the frame before it until the damage numbers finish | Not played: that frame plays once for its SEQ delay |
| Attack loops | Bow 140-145, Unarmed 96-101 and the other attacks end with `ffff`, without IncrementLoop `ffd5` | Modes P1, P2, P3, S1, S2, S3 and every attack sequence mode loop them |
| MoveUnitRL `fff0` | SEQ 36/37 step the unit 8px to one side and back; the data does not say which side is positive | Not played: Dodge Defend (DD) draws its exact frames and ticks in place |

## Parity Tests

`tests/helpers/fft-type1.js` decodes `TYPE1.SHP` and `TYPE1.SEQ` with the Shishi editor's own parsing rules, keeping the opcodes, and `tests/fixtures/type1.json` is its output, frozen. `tests/sprite-shp-parity.test.js` checks every ported frame (tiles, offsets, flips, depth, anchor), SEQ order, delays and unit motion. `tests/sprite-rig-parity.test.js` checks that the ThreeJS character groups render those frames exactly in all 8 directions. `SHP_FRAMES` and `SEQ_LIBRARY` are checked against all of it, and the library group is rendered and read back for all 218 sequences. The markdown tables in this folder are transcriptions; the fixture is the source of truth.

Both suites run on every `npm test`, from the fixture. `TYPE1_DIR=<folder> npm test` decodes your own `TYPE1.SHP` and `TYPE1.SEQ` instead, and the fixture's `source` gives the size and SHA-256 of the originals. "the decoder" in `tests/sprite-shp-parity.test.js` holds `decodeShp` and `decodeSeq` to bytes built by hand. `tests/character.test.js` holds the sheet to `SPRITE_CELLS`, `tests/sprite-kit.test.js` holds the portable runtime in `assets/` to the engine, and `tests/skill-documents.test.js` holds the documents to the code.
