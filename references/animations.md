# Animations

Names are the `name` field of `GET /api/v1/animations`, case-insensitive in `findAnimation`, `play` and `/api/v1/draw`. They are this repository's names for the TYPE1 animations, not Square's, and every animation runs live on https://3d.internet.dev. "Ticks" are at 60 to the second. This file is how a game plays one. `references/rebuild-animations.md` rebuilds the site's scenes around them.

## What a Game Plays

| The game wants | Play | Notes |
|----------------|------|-------|
| Stand | `Idle` | One frame per view |
| Move a tile | `Walk`, `Walk Fast`, `Walk Slow` | Loops, 64, 32 and 96 ticks. The drawn cycle does not move the unit: slide the unit along the ground yourself |
| Hover | `Float`, `Float Fast`, `Float Slow` | Loops. The whole unit bobs up to 2px |
| Turn on the spot | `Rotate` | Loops through the 8 idle frames |
| Melee, bare hands | `Unarmed High`, `Unarmed Mid`, `Unarmed Low` | Hit on tick 18 |
| Melee, a sword's arm | `Swing High`, `Swing Mid`, `Swing Low` | Hit on tick 18, Low on 20 |
| Melee, a spear's arm | `Poke High`, `Poke Mid`, `Poke Low` | Hit on tick 18 |
| Melee, a swung bag | `Cloth Bag High`, `Cloth Bag Mid`, `Cloth Bag Low` | Hit on tick 18, Low on 20 |
| Fire a gun | `Gun High`, `Gun Mid`, `Gun Low` | Hit on tick 24, Low on 20 |
| Shoot a bow | `Bow High`, `Bow Mid`, `Bow Low` | `PlaySound` on tick 26 is the shot. There is no hit event: the arrow lands it |
| Throw a weapon | `Weapon Throw` | No event: the throw is yours to time |
| Throw an item | `Item Throw High Start`, `Item Throw High Hold`, `Item Throw High Release`, `Item Throw Mid Start`, `Item Throw Mid Hold`, `Item Throw Mid Release`, `Item Throw Low Start`, `Item Throw Low Hold`, `Item Throw Low Release` | The hold stays until you release. `Release` has `PlaySound` on tick 0. High draws one arm, so the site holds a small marble. Mid and Low end with both hands low, so it holds a big one between them: `references/rebuild-animations.md` "Item Throw" |
| Throw a stone, catch and throw a marble | `Dragoon Jump 3`, `High Jump Start` | `data.holds` has the hand for each: `references/rebuild-animations.md` "Throw Stone" and "Quick Throw" |
| Cast | `Casting`, then `Casting Loop`, then `Cast Execute` | `Casting` holds its last frame, which `Casting Loop` carries on from. The loop runs as long as the charge does. The order is read from their frames |
| Sing, charge | `Singing`, `Charging` | `Singing` loops. `Charging` is a held pose |
| Be hit | `Taking Damage` | A 1px shiver that loops: give it a `duration` |
| Block | `Defend`, `Dodge Defend`, `Shield Block High`, `Shield Block Mid`, `Shield Block Low` | |
| Recoil off a block | `Swing Recoil High`, `Swing Recoil Mid`, `Swing Recoil Low`, `Punch Recoil High`, `Punch Recoil Mid`, `Punch Recoil Low`, `Thrust Recoil High`, `Thrust Recoil Mid`, `Thrust Recoil Low` | The attacker's side of a stopped blow |
| Near death | `Critical` | Held kneel |
| Die | `Dead`, or `Bounced to Death` for the hop first | Both end held |
| Get back up | `Revived` | Ends on the standing frame |
| Status | `Sleeping`, `Frozen`, `Confused` | `Confused` loops, the others are held |
| Pick something up | `Found Item`, `Chest Pickup` | |
| Move a short way | `Walk To`, `Walk To Fast`, `Walk To Slow`, `Walk To Alt`, `Walk To Alt Fast`, `Walk To Alt Slow` | Loops. The game moves the unit |
| Leave and reach the ground | `Jump 2`, `Mid Jump`, `Jump Up`, `Jump Down`, `High Jump Hold`, `High Jump Land` | The game moves the unit: "Chains" below |
| Hold or freeze a pose | `Charging Hold`, `Revived Hold`, `Frozen Walk 1`, `Frozen Walk 2` | One held frame |
| Stagger or fall | `Damaged Shaking`, `Fall Critical` | |
| Cast, other forms | `Casting Start`, `Casting Start 2`, `Cast Revive` | |
| Rush, or a second form of a move | `Rush`, `Swing Low 2`, `Pummel 2`, `Read Book 2`, `Dragoon Jump 2` | |
| Switch or use an item | `Flip Ground Switch`, `Katana Use` | |
| Other abilities | `Steal`, `Steal Heart`, `Talk Skill`, `Read Book`, `Play Instrument`, `Dancing`, `Spin Dance`, `Spin Punch`, `Pummel`, `Teleport` | |

**High, Mid and Low** are where the target stands: above the attacker, level or below. They are not how hard the blow is.

## Props in a Hand

TYPE1 draws no weapon. `Swing` and `Poke` draw a unit swinging empty hands, and the item is a separate 3D object or sprite on the hand. `data.holds` says, for every animation the site draws with something in its hand, which arm holds it, how it tilts on each frame and what covers it.

### Props in Three.js

`carry` does all of it: the hand of each frame, the tilt, the slide of a thrust, the tiles drawn over the item. The mesh's own axes are the item's, with the hand at its origin, +x along it and +y its up.

```js
const sword = new THREE.Mesh(models.sword, metal);
scene.add(sword);
unit.carry(sword, 'Swing High');
unit.play('Swing High', now, { then: 'Idle' });
```

`update` moves the mesh, and hides it while another animation plays or the frame has no hand. `unit.release()` lets go and leaves it where it is, for a throw. Set's seven models, `models` here, are one file: `references/rebuild-animations.md` "Held Items" loads them, and any mesh in the same frame works, or none of Set's at all.

A mesh you place yourself reads `unit.hand('first')` or `unit.hand('last')` each frame, a world point, and sets `unit.itemLayer` to how many tiles from the top draw over it. Set `flattenOntoSprite` as its material's `onBeforeRender` and `mesh.userData.sprite = unit`, so its depth fits between them.

### Props on a 2D Stage

```js
const hand = handPoint(atlas, pose, 'last'); // [x, y] from the stance point, null if that tile has no grip
if (hand) context.drawImage(sword, stanceX + hand[0] * scale, stanceY + hand[1] * scale);
```

### What Covers What

A hand closes on what it holds, so an item is not simply in front of a unit or behind it. Draw it among the tiles: under the tile that draws the gripping hand, over the torso, and under every tile when the unit faces away, so its body stands between the item and the camera. A big item goes under the head too, and a shield over everything, because the hand grips its far side. Under an orthographic camera, moving a tile along the view axis changes what covers what and moves nothing on screen, which is the whole mechanism in Three.js.

That answer holds while the item lies across the view. When the camera orbits until an item points along the view, it goes in front of every tile, or behind them all when it points away, as one piece: a spear coming straight at the camera hides the fist on it. `carry` does this by itself, with `ITEM_END_ON` as the limit. A mesh you place yourself sets `unit.itemLayer` to 0 or to the tile count for those views. The game's own views never reach it, so a card keeps what you settled by looking at it.

`arm` picks the tile: `'first'` is the back one, `'last'` the front one. Which arm holds a weapon depends on the sequence and the facing. `three-isometric-engine/weapons/AGENTS.md` explains every table `data.holds` is baked from. Grips are `a1.png`'s: on another sheet find them again (`references/own-sheet.md`).

## Time an Event, Do Not Guess It

`unit.player.events` holds the labels the last update crossed:

```js
unit.play('Swing High', now, { then: 'Idle' });

// each frame
const pose = unit.update(now, camera);
if (unit.player.events.includes('PostGenericAttack')) applyDamage(target);
```

- An animation with `hitTick: null` and a shot to land, such as `Bow`, waits for `PlaySound` and flies a projectile.
- An attack with no PostGenericAttack in your hands is a timing you chose: say so in a comment, because the data will not show it.
- Check the event after every update. A slow frame can skip a tick, and `events` still reports what was crossed.

## Chains

`then` follows one animation with another when it is done. `done` means past its last tick, so a held last frame counts straight away, and a loop is never done. `duration` ends either after that many seconds.

```js
unit.play('Unarmed High', now, { then: 'Idle' });                     // attack, then stand
unit.play('Casting', now, { then: 'Casting Loop' });                  // into the charge
unit.play('Taking Damage', now, { then: 'Idle', duration: 0.5 });     // a shiver, stopped
unit.play('Revived', now);                                            // ends standing
```

**A jump** is no one sequence. The unit stays down through `Jump 2`'s take-off frames, 22 ticks, and its last frame is the pose in the air, held. Move the unit up and over on that pose, then play `High Jump Land` on touchdown. `references/rebuild-animations.md` "Jump" has the arc.

`Jump Up`, `Jump Down` and `Teleport` are the same kind of thing: the game moves the unit while they play.

## Standing in Water

Every frame has a copy `waterOffset` later that stops at the waterline. Pass `{ water: true }` to `play`. The water meaning is inferred from the data. It is how this repository uses those frames, and `Nulled Walk`, whose dry frames are placeholders, always plays them.

## Loops

`loop` in the data is what the sequence itself does. The site's cards loop attacks so they can be watched: pass `{ loop: true }` to `play` for the same. `{ loop: false }` plays a looping animation once.

The original tactical RPG holds some frames longer than their ticks, for effects that live in its code, not in these files. `documentation/AGENTS.md` "Engine Differences From the Original Tactical RPG" lists every one, so a timing that looks short against a video of it is not a bug.
