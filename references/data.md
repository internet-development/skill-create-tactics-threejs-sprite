# The Data

`tactics-sprite-data.json`, from the kit or `GET /api/v1/data`. Pixels are sprite pixels and time is ticks, 60 to the second. The repository's `constants/sprites/` holds the same tables, and its parity suites hold those to the decoded `TYPE1.SHP` and `TYPE1.SEQ`.

## Top Level

| Field | Holds |
|-------|-------|
| `format`, `formatVersion`, `version` | `tactics-sprite-data`, the shape's version, the repository's version |
| `notice` | The copyright notice. Keep it with the data |
| `sheet` | `file`, `width` (256), `height` (488) |
| `stage` | `originColumn` (53), `stanceRow` (103), `stanceWidth` (32), `stanceHeight` (40), `ticksPerSecond` (60) |
| `waterOffset` | 182: add it to a frame index for the frame of a unit standing in water |
| `idleFrames` | 8 frame indices, one per view: idle has no sequence pair |
| `cells` | 200 `{ id, x, y, w, h }`: every rect on the sheet a frame can draw |
| `frames` | 364 SHP frames. Each is its tiles back to front |
| `sequences` | 218 SEQ sequences |
| `animations` | 112 named front and back pairs |
| `hands` | `{ tileId: [x, y, degrees] }`, the hand on `a1.png`, or null for another sheet |
| `holds` | `{ animationName: hold }`, what each animation holds and how, or null for another sheet |
| `heldItemScale` | 4.5: world units per unit of Set's models |

## A Frame

`frames[n]` is a list of `[id, u, v]` or `[id, u, v, 1]`, first tile furthest back.

- `(u, v)` is the tile's **center**, in pixels from the stance point: `u` right, `v` down. Column 53 and row 103 of the SHP canvas are that point, so they are already taken out.
- A fourth element of `1` means the tile draws mirrored in place. Only the idle frames F4-F6 and their water copies use it.
- The stance point is 20px above the soles, the middle of a 40px standing unit. A tile may reach past that box: a dead unit lies 8px below it.
- The biggest tile is the body, the first one on a tie. In a depth-buffered renderer it is the one that writes depth.

## A Sequence

| Field | Holds |
|-------|-------|
| `seq` | Its index here, 0-217, a filtered index |
| `raw` | The animation id, the raw pointer index in `TYPE1.SEQ` |
| `name` | Name with its facing, such as `Swing High Fwd` |
| `loop` | The sequence's own IncrementLoop |
| `frames` | Frame indices, 0-181 |
| `ticks` | Delay per frame. A last delay of 0 holds that frame until the game moves on |
| `fb`, `du` | Per frame, pixels forward along the facing and pixels down, accumulated from the start. Absent on a sequence that does not move |
| `events` | `[tick, label]` pairs: `PlaySound`, and `PostGenericAttack`, the tick a hit lands |

## An Animation

| Field | Holds |
|-------|-------|
| `name`, `category` | Display name and group, such as `Swing High` in `Swing` |
| `front`, `back` | Indices into `sequences` |
| `loop` | Whether it loops on its own. Attacks do not: the site's demo cards loop them, and a game plays them once |
| `hitTick` | The first `PostGenericAttack`, or null |
| `water` | True when it only draws in its water frames: Nulled Walk |
| `mode` | Its code on the site, when it has its own card |

## A Hold

`holds['Swing High']` says what the site draws in that animation's hand. Per-frame lists run along the front sequence, and `carry` reads all of it.

| Field | Holds |
|-------|-------|
| `item` | `rifle`, `sword`, `katana`, `spear`, `shield`, `harp`, `tome`, `marble` or `stone` |
| `front`, `back` | The arm on each sequence: `first` is the frame's first tile, `last` its last |
| `over` | `{ front, back }`, per frame: how many tiles from the top draw over the item. A negative number counts tiles from the bottom that stay under it, and `-99` is a ball between two hands: the hands and the head draw over it and the torso does not. An item pointing along the view stops following this, so an end-on item is in front of every tile or behind them all |
| `tilt` | Per frame, radians in the plane of the facing and world up, 0 along the facing. Absent on a marble and a stone |
| `slide`, `offset` | Per frame, world units: how far it runs through the hand, and `[x, y, z]` from the hand along its own axes |
| `across`, `roll` | It turns in the plane across the body instead, and about its own length, in radians |
| `steady` | The sequence index whose hand it stays on, for an item another hand plays |
| `thrown`, `aims` | `{ middle, length, turns }` of a thrown item, in Set's units. A rifle's frames that a stage aims |
| `hands`, `depth` | Marbles and stones: `{ front, back }`, `[u, v]` per frame or null, where it sits, between the hands on a frame that holds it in both. How far toward the camera a stone rides |
| `radius` | Marbles only: its size in world units |

## The Draw Algorithm

This is all of `poseAt`, for porting. The tests hold the JavaScript to the engine on every sequence, view and frame.

```
view     = (facing + cameraStep) % 8         facing: NE 7, SE 1, SW 3, NW 5
pattern  = [0, 1, 1, 2, 2, 3, 3, 0][view]
back     = pattern >= 2
mirrored = pattern == 0 or pattern == 3

entry    = sequences[back ? animation.back : animation.front]
total    = sum(entry.ticks)
elapsed  = loop and total > 0 ? ticks % total : ticks
index    = the first i where elapsed < sum(entry.ticks[0..i]), else the last frame
shp      = entry.frames[index] + (water ? waterOffset : 0)

for each [id, u, v, reversed] in frames[shp], in order:
  cell  = cells[id]
  x     = (mirrored ? -u : u) - cell.w / 2      top left from the stance point
  y     = v - cell.h / 2
  flipX = mirrored != (reversed == 1)

on a flat 2D stage, add to every tile:
  moveX = entry.fb[index] * (mirrored ? 1 : -1)
  moveY = entry.du[index]
```

Idle takes one branch instead: `shp = idleFrames[view]`, with `mirrored` false, because those frames carry their own flips.

## Test a Port

`poseAt` is the reference for a port in any language, and it needs no network. Run it at a moment and compare, here `Swing High` at view 1, tick 18:

```sh
node --input-type=module -e "
import fs from 'node:fs';
import { createAtlas, findAnimation, poseAt } from './src/tactics-sprite/tactics-sprite.mjs';
const atlas = createAtlas(JSON.parse(fs.readFileSync('./src/tactics-sprite/tactics-sprite-data.json', 'utf8')));
const { tiles, count, ...pose } = poseAt(atlas, findAnimation(atlas, 'Swing High'), 1, 18);
console.log(JSON.stringify({ ...pose, tiles: tiles.slice(0, count) }));
"
```

Compare `shp` first, then each tile in order: a difference in `x` is a mirror or a center, in `order` a depth, and in `shp` a clock. `GET /api/v1/draw` is this same call over HTTP.

## The Runtime

`tactics-sprite.mjs` exports the algorithm and its parts: `createAtlas`, `findAnimation`, `poseAt`, `createPose`, `createPlayer`, `eventsBetween`, `drawPose`, `handPoint`, `frameHand`, `cameraStep`, `viewOf`, `isBackView`, `isMirroredView`, `FACING`, `FACING_X`, `FACING_Z`, `TICKS_PER_SECOND` and `STANCE_HALF_H`.

## The Screen

**2D.** Multiply by a whole number and draw. On a flat stage a unit faces left on patterns B and C and right on A and D, which is what the sign of `moveX` says.

**3D.** The unit's group sits at the stance point and copies the camera's rotation. A tile's center is at `(cx * 0.75, -cy * 0.9)` in the group, because a tactical RPG camera looks down on the unit: its pixels are 1.2 times taller than wide. The texture coordinates count up from the bottom of the sheet: `v = 1 - y / 488`.

`fb` is a move in the world, so a 3D renderer sends it along the facing, `(FACING_X[facing], 0, FACING_Z[facing]) * fb * 0.75`, and projects that into the group. Treat `du` as screen-vertical, `-du * 0.9`. `tactics-sprite-three.mjs` is both.

## Camera Step

The step is the camera's direction, not the unit's: `atan2(x, z)` of a horizontal vector from the scene toward the camera, less `atan2(0.5, -0.5)`, plus `π / 36`, divided by `π / 4`, rounded, modulo 8. `cameraStep` does this.

## Hands

`hands[id]` is `[x, y, degrees]` for a tile that draws a hand: the center pixel of the hand on that tile, and the way the forearm points, 0 along the facing and 90 up. `handPoint(atlas, pose, arm)` turns it into a point from the stance point, and `frameHand(atlas, shp, arm)` reads it from a frame, before any mirror or motion. These pixels were read off `a1.png` and belong to it.
