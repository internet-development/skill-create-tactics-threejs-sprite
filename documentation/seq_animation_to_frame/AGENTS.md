# SEQ Animation-to-Frame Mapping

`TYPE1.SEQ` (6754 bytes): 218 animation sequences for the generic character sprite. Modes are listed below.

## Resolution Chain

```
SEQ Animation (218 total)
  → Frame indices + delays (SHP frames 0-181)
    → Sprite tile compositions (shp_frame_to_spritesheet_tile/)
      → Pixel regions on sprite sheet (constants/sprites/index.js)
```

## Binary Structure

Decoded from `TYPE1.SEQ` with the rules of `Sequence.cs` (`documentation/AGENTS.md` "Sources" gives the lines).

- **Offset table**: Byte 4, 4-byte LE uint32 entries, `0xFFFFFFFF`-terminated. 252 raw, 218 unique: a pointer equal to the next one, or whose data draws no frame, is skipped. Offsets count from the animation data, and the last sequence runs to the end of the file.
- **Animation data**: Starts at byte `0x0406` (1030).
- **Frame encoding**: Byte pairs `[frame_index, delay]`. Index 0-181, delay in 60ths of a second.
- **Opcodes**: `0xFF xx` followed by xx's parameter bytes (Shishi `Sequence.Jumps` table, plus the two bytes of `ffc4`, which it lacks: `SEQ_JUMPS` in `tests/helpers/fft-type1.js`). The editor skips them; the game executes them. Move opcodes translate the whole unit (MoveUp/Down/Forward/Backward 1/2 = `ffcb`-`ffd2`, MoveUnitFB/DU = `ffee`/`ffef`); `ffd5` IncrementLoop loops the sequence. "Opcodes" below lists every one. See `documentation/AGENTS.md` "SEQ Unit Motion" and "SEQ Control Opcodes and Action Timing".
- **Indices**: SEQ numbers here are the filtered index (empty/duplicate pointers skipped); the game's animation id is the raw pointer index (SEQ 12 = animation 0x12). The data files give both, in the `SEQ` and `Raw ID` columns.

## Conventions

- **Front/Back Pairs**: Even = front-facing, odd = back-facing.
- **Speed Tiers**: Normal (6/8/10 ticks), haste (2/4/6), slow (10/12/14).
- **Frame Halves**: SEQ references first-half only (0-181). Second-half (+182) added at render time.
- **Repeats**: In the data files `F21(6)x2` is that frame drawn twice.
- **Delay Conversion**: `ms = delay * 1000 / 60`, unrounded in `assembly.js`. Common values: 6=100ms, 8=133.33ms, 10=166.67ms, 20=333.33ms.

## Opcodes

Every `0xFF xx` opcode in `TYPE1.SEQ`, plus `fffa`, which `SEQ_JUMPS` lists and no sequence uses. A `[frame, delay]` pair is LoadFrameAndWait. Bytes are the parameter bytes in `SEQ_JUMPS`, and an opcode not listed there takes none. Uses count across the 218 sequences. Unnamed means this repository has no name for the opcode, because nothing here needs it. `Carried Object` and `End` are named for what they do. In the port gives the `SEQ_LIBRARY` field or the constant that carries the opcode. Not read means nothing here uses it. Not played means the port skips it on purpose (`documentation/AGENTS.md` "SEQ Control Opcodes and Action Timing" and "Engine Differences From the Original Tactical RPG").

| Opcode | Bytes | Name | Uses | SEQ | In the port |
|--------|-------|------|------|-----|-------------|
| `ffc0` | 1 | WaitForDistort | 22 | 88/89, 94/95, 186/187, 206-209 | Not played |
| `ffc1` | 2 | QueueDistortAnim | 28 | 88/89, 94/95, 186/187, 198/199, 206-209 | Not played |
| `ffc3` | 0 | Unnamed | 2 | 80/81 | Not read |
| `ffc4` | 2 | Carried Object | 14 | 80/81, 90/91 | `CARRY_TRACK`, from 80/81 |
| `ffc5` | 0 | Unnamed | 4 | 80/81, 90/91 | Not read |
| `ffc6` | 1 | Unnamed | 2 | 80/81 | Not read |
| `ffcb` | 0 | MoveUp2 | 10 | 44/45, 48/49, 82/83 | `du` |
| `ffcc` | 0 | MoveUp1 | 47 | 12-17, 38/39, 46/47, 72/73, 80/81, 90/91, 94/95, 196, 204/205 | `du` |
| `ffcd` | 0 | MoveBackward2 | 102 | 96-109, 112-115, 120/121, 126-145, 150-155, 162-175, 180/181, 184/185, 194/195, 198/199, 202/203, 210-217 | `fb` |
| `ffce` | 0 | MoveBackward1 | 55 | 62/63, 66/67, 96/97, 134/135, 140-145, 156-161, 182/183, 196/197 | `fb` |
| `ffcf` | 0 | MoveDown2 | 10 | 44/45, 82/83 | `du` |
| `ffd0` | 0 | MoveDown1 | 40 | 12-17, 38/39, 46/47, 72/73, 80/81, 94/95 | `du` |
| `ffd1` | 0 | MoveForward2 | 110 | 96-109, 112-115, 120/121, 126-145, 162-175, 180/181, 184/185, 194/195, 198/199, 202/203, 210-217 | `fb` |
| `ffd2` | 0 | MoveForward1 | 58 | 62/63, 66/67, 100/101, 106/107, 120/121, 132/133, 138/139, 156-161, 182/183, 196/197, 214/215 | `fb` |
| `ffd3` | 1 | Unnamed | 20 | 102-109, 114/115, 120/121, 126/127, 174/175, 182/183, 194/195 | Not read |
| `ffd4` | 1 | PlayAttackSound | 110 | 96-109, 114/115, 120/121, 126-149, 156-173, 180/181, 194/195, 208-217 | Not read |
| `ffd5` | 0 | IncrementLoop | 44 | 6-31, 38/39, 44-47, 56/57, 62-67, 70/71, 78/79 | `loop` |
| `ffd6` | 1 | WeaponSheatheCheck2 | 56 | 72/73, 96-107, 128-149, 174/175, 184/185, 188-191, 194/195, 200/201, 210-217 | Not played |
| `ffd7` | 1 | Unnamed | 6 | 82-87 | Not read |
| `ffd8` | 1 | Unnamed | 4 | 180/181 | Not read |
| `ffd9` | 2 | Unnamed | 14 | 108/109, 114/115, 120/121, 126/127, 140-145 | Not read |
| `ffde` | 0 | PostGenericAttack | 40 | 96-107, 128-139, 146-149, 194/195, 208-217 | `events` |
| `ffe2` | 1 | Unnamed | 72 | 102-109, 112-115, 118-121, 124-161, 168-173, 188/189, 194/195, 202/203, 210-215 | Not read |
| `ffec` | 0 | Unnamed | 4 | 180/181 | Not read |
| `ffee` | 1 | MoveUnitFB | 14 | 126/127, 156-161 | `fb` |
| `ffef` | 1 | MoveUnitDU | 20 | 44/45, 82/83 | `du` |
| `fff0` | 1 | MoveUnitRL | 16 | 36/37 | Not played |
| `fff2` | 2 | Unnamed | 72 | 102-109, 112-115, 118-121, 124-161, 168-173, 188/189, 194/195, 202/203, 210-215 | Not read |
| `fff6` | 1 | PlaySound | 20 | 112/113, 118/119, 124/125, 140-149, 206-209 | `events` |
| `fffa` | 3 | MoveUnit | 0 | None | Nothing to play |
| `fffc` | 2 | Unnamed | 4 | 180-183 | Not read |
| `ffff` | 0 | End | 119 | 36/37, 52/53, 72/73, 80/81, 88/89, 93-109, 112-115, 118-121, 124-175, 180-191, 194-201, 206-217 | Where the sequence stops |

**Weapon sequences.** `ffe2` and `fff2` sit on the same 72 sequences, near the start: Swing, Item Throw, Weapon Throw, Poke, Gun, Bow, Read Book, Play Instrument, Shield Block, Swing Recoil, Thrust Recoil, Katana Use and Cloth Bag. Punch Recoil 162-167 and Unarmed 96-101 have neither. `ffe2` is 11, 17, 18 or 23: 17 on most front sequences and 11 on most back ones, 18 on the front of Read Book and Shield Block, and 23 on 124/125 and 202, which suggests a layer order. The first byte of `fff2` is 1, or 2 on Weapon Throw 126/127. Which families have them suggests they cue a weapon the game draws. That is inferred, and nothing here reads either one. TYPE1 draws no weapon, so the weapon layer here is the ThreeJS code in `weapons/AGENTS.md`, as the cards on https://3d.internet.dev show it.

## Names

`SEQ_LIBRARY` holds the name of every animation in `name`, beside its animation id (`raw`, the pointer index), and the data files in this folder list them. High, Mid and Low are height modifiers: how far above or below the attacker the target stands. Every name is a label, not Square's. Float, Walk To, Bounced to Death and Nulled Walk are inferred from what the sequences draw. Three things hold the names to the binary, checked by `tests/sprite-shp-parity.test.js` "SEQ names agree with what the sequences draw":

- Bow 140-145 has no PostGenericAttack, because the arrow lands the hit; Unarmed, Swing, Poke and Gun each have one.
- Punch Recoil 162-165 draws Unarmed frames F92-F94, and Thrust Recoil 168-171 draws Poke frames F103-F105. So F92-F102 are the punch and F103-F111 the thrust.
- Read Book 146/147 repeats F128/F129 by hand instead of looping, Read Book 2 188/189 draws the same frames, and Talk Skill 190/191 is those two frames alone.

Some names tell parts of one animation apart: the Start, Hold and Release parts of High Jump and Item Throw, the High/Mid/Low order of Shield Block, and `Frozen Walk 1/2`, `Charging Hold`, `Revived Hold`, `Pummel 2`, `Casting Start 2`, `Casting Loop` and `Walk To Alt` for the second pair of a family. Rotate is named for what it draws.

Engine names stay where a mode does something in a scene: Punch `P1`-`P3` draw Bow, Stab `S1`-`S3` and A1's stab draw Unarmed, Magic Charge `C` and A1's cast draw Singing, Quick Throw `T` draws High Jump Start, Throw Stone `TS` draws Dragoon Jump 3, Guard `G` draws Frozen Walk 2, Flinch `H` draws Taking Damage, Kneel `K` draws Critical, Fatal Item Impact `FI` draws Bounced to Death and Item Drop `ID` draws Revived. Constants such as `PUNCH_ASSEMBLY`, `STAB_LV3_ASSEMBLY` and `CAST_ASSEMBLY` keep those names too. Main route titles use the SEQ name, with the engine name in the card's SEQ line; Quick Throw, Throw Stone and the player cards keep the engine name in the title, because they replay an engine action.

## Implemented Modes

| Mode | SEQ | Frames | Timing |
|------|-----|--------|--------|
| Idle | 1-5 | Static pose | N/A |
| Walk (I) | 6/7 | 8 frames, ping-pong | [6,8,10,8,6,8,10,8] ticks |
| Critical (K) | 32/33 | Static pose | N/A |
| Taking Damage (H) | 38/39 | 2-tile pose, 1px shiver loop | [2,2] ticks |
| Dead (D) | 40/41 | Static terminal | N/A |
| High Jump Start, played by Quick Throw (T) | 48/49 | 6-frame non-looping; marble picked up on frame 2, released on frame 5, 2px rise on frame 5 | [4,4,8,2,4,2] ticks (last delay from 206/207; 48/49 hold) |
| Singing (C) | 64/65 | 2-frame loop | 20 ticks (333.33ms) |
| Jump (J) | 204 + 42 + 52 / 205 + 43 + 53 | Take-off 5, Mid Jump 1, land 3, one pass per jump (`JUMP_TICKS`) | [2,8,4,4,4,32,2,10,6] ticks (72, 1200ms) |
| Dragoon Jump 3, played by Throw Stone (TS) | 208/209 | 12-frame non-looping; stone picked up on frame 2, released on frame 7 (after PlaySound) | FWD:38/BCK:42 ticks |
| Bow High (P1) | 140/141 | 9-frame loop, 2px wind-up + lunge | [2,8,2,4,10,18,2,2,4] ticks (52 total) |
| Bow Mid (P2) | 142/143 | 8-frame loop, 2px wind-up + lunge | [2,8,2,4,10,18,2,4] ticks (50 total) |
| Bow Low (P3) | 144/145 | 8-frame loop, 2px wind-up + lunge | [2,8,2,4,10,18,2,4] ticks (50 total) |
| Frozen Walk 2 (G) | 76/77 | Static pose | N/A |
| Float (FL) | 12/13 | One pose, whole unit hovers 0-2px, loop (animation 0x12/0x13) | [6,8,10,8,6,8,10,8] ticks |
| Unarmed High (S1) | 96/97 | 9-frame loop, 2px wind-up + lunge | [4,8,2,2,2,14,2,2,4] ticks (40 total) |
| Unarmed Mid (S2) | 98/99 | 9-frame loop, 2px wind-up | [4,8,2,2,2,14,2,2,4] ticks (40 total) |
| Unarmed Low (S3) | 100/101 | 9 frames, 2px wind-up + 1px thrust | [4,8,2,2,2,14,2,2,4] ticks (40 total); loops as S3, non-looping on A1 |
| Bounced to Death (FI) | 82/83 | 3 compositions replayed 13 times, 12px hop + bounces, non-looping | [4,2×11,0] ticks (per composition [4,6,16]) |
| Revived (ID) | 84/85 | 3-frame non-looping, last frame held | [16,6,0] ticks |

## Sequence Modes

`SEQUENCE_MODES` in `constants/sprites/seq-library.js` gives every other distinct animation TYPE1 draws a mode with no assembly. The mode draws the sequence tile by tile (`meshes/character-groups/group-sequence.js`), and the main route builds its 2D section and ThreeJS card from the row. Titles drop the facing: SEQ 102/103 "Swing High Fwd/Bck" shows as "Swing High (SW1)" and "Swing High (102, 103)". A second pair on a row is the same animation, so it has no card of its own. SEQ 30/31 has the row name Rotate, so its title does not read as one facing.

**Attack** rows have a PostGenericAttack: they loop, as the punches and stabs do, and their card's target flinches on that tick. **Loop** rows follow the SEQ's IncrementLoop. **Once** rows play, hold the last frame and start over; a single held frame is the same cycle with nothing to play.

| Mode | Name | SEQ | Draws | Ticks | Card |
|------|------|-----|-------|-------|------|
| WF | Walk Fast | 8/9 | 8 | 32 | Loop |
| WS | Walk Slow | 10/11 | 8 | 96 | Loop |
| FF | Float Fast | 14/15 | 8 | 32 | Loop |
| FS | Float Slow | 16/17 | 8 | 96 | Loop |
| WT | Walk To | 18/19 · 24/25 | 8 | 28 | Loop |
| WTF | Walk To Fast | 20/21 · 26/27 | 8 | 16 | Loop |
| WTS | Walk To Slow | 22/23 · 28/29 | 8 | 56 | Loop |
| RT | Rotate | 30/31 | 8 | 32 | Loop |
| DF | Defend | 34/35 | 1 | 0 | Once |
| DD | Dodge Defend | 36/37 | 7 | 28 | Once |
| MJ | Mid Jump | 42/43 | 1 | 0 | Once |
| JU | Jump Up | 44/45 | 10 | 38 | Loop |
| JD | Jump Down | 46/47 | 8 | 38 | Loop |
| HH | High Jump Hold | 50/51 | 1 | 0 | Once |
| HL | High Jump Land | 52/53 | 3 | 18 | Once |
| CG | Charging | 54/55 · 56/57 | 1 | 0 | Once |
| SL | Sleeping | 60/61 · 86/87 | 1 | 0 | Once |
| CF | Confused | 62/63 | 8 | 64 | Loop |
| DN | Dancing | 66/67 | 24 | 100 | Loop |
| CA | Casting | 68/69 | 3 | 8 | Once |
| CL | Casting Loop | 70/71 | 2 | 16 | Loop |
| CE | Cast Execute | 72/73 | 9 | 40 | Once |
| FW | Frozen Walk 1 | 74/75 | 1 | 0 | Once |
| NW | Nulled Walk | 78/79 · in water | 8 | 64 | Loop |
| FD | Found Item | 80/81 | 9 | 38 | Once |
| DS | Damaged Shaking | 88/89 | 2 | 4 | Once |
| CP | Chest Pickup | 90/91 | 1 | 0 | Once |
| TP | Teleport | 94/95 | 5 | 22 | Once |
| SW1 | Swing High | 102/103 | 8 | 38 | Attack (hit tick 18) |
| SW2 | Swing Mid | 104/105 · 194/195 | 9 | 40 | Attack (hit tick 18) |
| SW3 | Swing Low | 106/107 | 10 | 42 | Attack (hit tick 20) |
| IT1 | Item Throw High Start | 108/109 | 6 | 26 | Once |
| IH1 | Item Throw High Hold | 110/111 | 1 | 0 | Once |
| IR1 | Item Throw High Release | 112/113 | 2 | 8 | Once |
| IT2 | Item Throw Mid Start | 114/115 | 6 | 26 | Once |
| IH2 | Item Throw Mid Hold | 116/117 | 1 | 0 | Once |
| IR2 | Item Throw Mid Release | 118/119 | 3 | 10 | Once |
| IT3 | Item Throw Low Start | 120/121 | 7 | 28 | Once |
| IH3 | Item Throw Low Hold | 122/123 | 1 | 0 | Once |
| IR3 | Item Throw Low Release | 124/125 | 3 | 10 | Once |
| WP | Weapon Throw | 126/127 | 8 | 34 | Once |
| PK1 | Poke High | 128/129 | 8 | 38 | Attack (hit tick 18) |
| PK2 | Poke Mid | 130/131 | 8 | 38 | Attack (hit tick 18) |
| PK3 | Poke Low | 132/133 | 9 | 40 | Attack (hit tick 18) |
| GN1 | Gun High | 134/135 | 9 | 44 | Attack (hit tick 24) |
| GN2 | Gun Mid | 136/137 | 9 | 44 | Attack (hit tick 24) |
| GN3 | Gun Low | 138/139 | 9 | 42 | Attack (hit tick 20) |
| RB | Read Book | 146/147 | 15 | 114 | Attack (hit tick 98) |
| PI | Play Instrument | 148/149 | 13 | 104 | Attack (hit tick 88) |
| SB1 | Shield Block High | 150/151 | 1 | 16 | Once |
| SB2 | Shield Block Mid | 152/153 | 1 | 16 | Once |
| SB3 | Shield Block Low | 154/155 | 1 | 16 | Once |
| SV1 | Swing Recoil High | 156/157 · 158/159 | 6 | 34 | Once |
| SV3 | Swing Recoil Low | 160/161 | 8 | 38 | Once |
| PV1 | Punch Recoil High | 162/163 · 164/165 | 6 | 34 | Once |
| PV3 | Punch Recoil Low | 166/167 | 7 | 38 | Once |
| TV1 | Thrust Recoil High | 168/169 · 170/171 | 6 | 34 | Once |
| TV3 | Thrust Recoil Low | 172/173 | 7 | 38 | Once |
| FG | Flip Ground Switch | 174/175 | 6 | 46 | Once |
| CS1 | Casting Start | 176/177 | 3 | 12 | Once |
| CS2 | Casting Start 2 | 178/179 | 5 | 18 | Once |
| PM1 | Pummel | 180/181 | 12 | 38 | Once |
| PM2 | Pummel 2 | 182/183 | 9 | 32 | Once |
| CV | Cast Revive | 184/185 | 6 | 26 | Once |
| RU | Rush | 186/187 | 3 | 6 | Once |
| RB2 | Read Book 2 | 188/189 | 13 | 106 | Once |
| TK | Talk Skill | 190/191 | 2 | 16 | Once |
| FC | Fall Critical | 192/193 | 3 | 14 | Once |
| SD | Spin Dance | 196/197 | 37 | 400 | Once |
| ST | Steal | 198/199 | 5 | 40 | Once |
| SH | Steal Heart | 200/201 | 6 | 72 | Once |
| KT | Katana Use | 202/203 | 6 | 24 | Once |
| J2 | Jump 2 | 204/205 | 6 | 22 | Once |
| CB1 | Cloth Bag High | 210/211 | 9 | 34 | Attack (hit tick 18) |
| CB2 | Cloth Bag Mid | 212/213 | 10 | 36 | Attack (hit tick 18) |
| CB3 | Cloth Bag Low | 214/215 | 11 | 38 | Attack (hit tick 20) |
| SP | Spin Punch | 216/217 | 17 | 56 | Attack (hit tick 34) |

SEQ pairs with no row, because a card already plays them: Idle 1-5, Walk 6/7, Float 12/13, Critical 32/33 (Mode K), Taking Damage 38/39 (Mode H), Dead 40/41, High Jump Start 48/49 and Dragoon Jump 2 206/207 (Mode T), Frozen 58/59 and Frozen Walk 2 76/77 (Mode G), Singing 64/65 (Mode C), Bounced to Death 82/83 (Mode FI), Revived 84/85 (Mode ID), Unarmed 96-101 (Modes S1-S3), Bow 140-145 (Modes P1-P3) and Dragoon Jump 3 208/209 (Mode TS). Null 0 and 92/93 have no row because TYPE1 draws only the `SR1` origin marker for them. All of them still play in the Sequence Library.

Mid Jump, Jump Down, High Jump Hold, High Jump Land and Teleport are staged, whatever the Card column says: the game plays them while something else moves the unit, so `SEQUENCE_STAGES` in the catalog gives them a scene (`pages/AGENTS.md` "ThreeJS Demos").

Nulled Walk (NW) plays F(n + 182): its dry frames F74-F83 are `SR1` placeholders, and F256-F265 are the only frames that draw it. It is the one row that sets `water`.

Dodge Defend (DD, SEQ 36/37) plays exact frames and ticks without its MoveUnitRL side step: 8px out and back, and nothing in the data says which side is positive.

To add a mode with its own assembly, see `skills/add-sprite-assembly-from-source`.

## SEQ Categories

| Category | SEQ Range | Count | Named mode |
|----------|-----------|-------|-------------|
| Idle | 0-5 | 6 | Yes (1-5; Null 0 draws only the `SR1` marker) |
| Walk (3 speeds) | 6-11 | 6 | Yes |
| Float | 12-17 | 6 | Yes |
| Walk To | 18-29 | 12 | Yes (24-29 are the same animation as 18-23) |
| Rotation | 30-31 | 2 | Yes |
| Status Poses | 32-41 | 10 | Yes |
| Jump | 42-53 | 12 | Yes |
| Charging / Status | 54-63 | 10 | Yes |
| Singing / Dancing | 64-67 | 4 | Yes |
| Casting | 68-73 | 6 | Yes |
| Frozen Walk | 74-79 | 6 | Yes (Nulled Walk in water) |
| Reactions | 80-95 | 16 | Yes (Null 92-93 draws only the `SR1` marker) |
| Unarmed | 96-101 | 6 | Yes |
| Swing | 102-107 | 6 | Yes |
| Item Throw | 108-127 | 20 | Yes |
| Poke | 128-133 | 6 | Yes |
| Gun | 134-139 | 6 | Yes |
| Bow | 140-145 | 6 | Yes |
| Book / Instrument | 146-149 | 4 | Yes |
| Shield | 150-173 | 24 | Yes |
| Abilities | 174-205 | 32 | Yes |
| Dragoon Jump | 206-209 | 4 | Yes |
| Cloth / Bag | 210-215 | 6 | Yes |
| Spin Punch | 216-217 | 2 | Yes |
| **Total** | **0-217** | **218** | **96 modes with scene symbols; all 218 in the library** |

## Data Files

| File | SEQ Range |
|------|-----------|
| `01-idle-poses.md` | 0-5 |
| `02-walk-cycles.md` | 6-11 |
| `03-float.md` | 12-17 |
| `04-walk-to.md` | 18-23 |
| `05-walk-to-alt.md` | 24-29 |
| `06-rotation.md` | 30-31 |
| `07-status-poses.md` | 32-41 |
| `08-jump.md` | 42-51 |
| `09-jump-land-status.md` | 52-61 |
| `10-singing-casting.md` | 62-73 |
| `11-frozen-walk.md` | 74-79 |
| `12-reactions.md` | 80-95 |
| `13-unarmed-attacks.md` | 96-101 |
| `14-swing-attacks.md` | 102-127 |
| `15-poke-attacks.md` | 128-133 |
| `16-gun-attacks.md` | 134-139 |
| `17-bow-attacks.md` | 140-145 |
| `18-book-instrument.md` | 146-149 |
| `19-shield-block.md` | 150-155 |
| `20-shield-recoil-swing.md` | 156-161 |
| `21-shield-recoil-punch.md` | 162-167 |
| `22-shield-recoil-thrust.md` | 168-173 |
| `23-flip-ground-switch.md` | 174-175 |
| `24-transition-sequences.md` | 176-197 |
| `25-combo-special.md` | 198-217 |
