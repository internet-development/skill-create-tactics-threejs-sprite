---
name: add-sprite-assembly-into-threejs-engine
description: Create or fix a Three.js billboard mode from verified sprite data. Use when adding a character group, wiring a mode into the demo cards, or debugging a layer, pattern, draw order, mirrored direction or hand-held prop in Three.js.
---

# Skill: Add Sprite Assembly into ThreeJS Engine

Load when creating a new ThreeJS billboard group file from existing assembly data, or connecting a completed 2D sprite mode into the 3D engine. Assumes assembly data and the main route verification are already complete (see `add-sprite-assembly-from-source` skill). Paths below start from `three-isometric-engine/` unless they start with `tests/` or `documentation/`.

## Procedure: Creating a 3D Mode

### 0. A mode that only plays its SEQ frames

Add one `SEQUENCE_MODE_ROWS` row to `constants/sprites/seq-library.js`: `{ seq: frontSeq, mode: 'XX' }`. `group-sequence.js` registers the mode, which draws the sequence tile by tile with SEQ unit motion, idle-at-spawn and all 8 steps, and the main route gets its 2D section and ThreeJS card from the row, with no group file, assembly or table of its own. The row reaches the kit by itself (`assets/`, `three-isometric-engine/web/`). A sequence with a PostGenericAttack is an attack: it loops and its card's target flinches on that tick. Titles are the SEQ name without its facing, plus the mode ("Swing High (SW1)"). Add the row to `documentation/seq_animation_to_frame/AGENTS.md` "Sequence Modes". The rig parity, card coverage and framing tests read the table, apart from `COVERED_BY_OTHER_CARDS` in `tests/sprite-animation-demos.test.js`, the SEQ numbers no row shows: a new row's pair comes out of that list. The steps below are for a mode with its own rig.

### 1. Create group file

`meshes/character-groups/group-*.js` — billboard composite or single mesh depending on tile count.

### 2. Build composite structure

For composite modes: body mesh + overlay meshes via `createBillboardOverlay()`.
- Scale factors from body plane: `scaleX = spriteWidth / BODY_W`, `scaleY = spriteHeight / STANDARD_CONTAINER_H`. The body plane is the 32x40 idle stance for every mode, so all modes share one pixel scale.
- Body position from the frame's SHP anchor: `anchorBodyX(frame.anchor, scaleX, flipX)` / `anchorBodyY(frame.anchor, scaleY)`; `body.scale.y = bodyH / STANDARD_CONTAINER_H`. Add the frame's SEQ unit motion when it has one: `const move = seqMoveLocal(frame.move, ch.directionOffset, camera, scaleY)` → `bodyX += move.x`, `bodyY += move.y` (overlays follow because they are placed relative to the body).
- Idle branches call `placeIdleBody(this, idx, scaleX, scaleY)` (P1-P5 anchor, mirrored for reversed idles), never `position.set(0, 0, 0)`.
- Quick Throw and Throw Stone also carry an invisible buffer mesh. Jump and the sequence group vary their body heights without one, so a new mode needs none.

### 3. Register the visual driver

`setVisualDriver(group, bodyMesh, function (renderer, _scene, camera) { ... })` (from `character-utils.js`) — never assign `onBeforeRender` directly (`tests/sprite-animation-demos.test.js` fails on a raw assignment in a group file). The update billboards the group via `camera.quaternion`, resolves the frame from assembly data, positions and shows/hides the overlays, applies sprite UVs and ends with `this.parent.updateMatrixWorld(true)`. It runs once per rendered frame from the scene's `syncCharacterVisuals` hook, before WebGLRenderer builds its draw list — so every layer is drawn from the same frame (see Draw Order). The group must be added at the scene root.

**Must be visual-only, with no side effects.** The update is skipped for hidden characters and returns early off-screen (`isCharacterOnScreen`). What an action does in the world belongs to its caller: the demo station here, an action system in a scene with physics.

**Per-frame timestamps come from the parent.** Read `camera.userData.now` inside the update (the render loop primes it once per frame). At construction time, accept `now` from the factory options object and read `(now - walkStart) / 1000` for any initial-frame resolution — never call `performance.now()` inside a group file. `createCharacter` threads `now` into the registered mode factory; copying the existing `group-quick-throw.js` shape is the safest pattern.

### 4. Export and self-register

Export the create function. At the bottom of the `group-*.js` module body call `registerCharacterMode('<MODE>', createMyGroup)` (from `@engine/common/registry`). Add one bare side-effect import of the new file to `createCharacter.js` (next to `group-float` / `group-stab`) so the module is evaluated and registers; no dispatch edits — `createCharacter.js` is a single `getCharacterModeFactory(mode)` lookup with a fallthrough idle renderer. Two tests name what is registered, so update them: `BUILT_IN_MODES` in `tests/character-mode-registry.test.js` and the `setVisualDriver` count in `tests/sprite-animation-demos.test.js`. Pass `{ directional: false }` only when the mode has standalone (non-arrow) meshData symbols like A1.

### 5. Register mode code

`registerCharacterMode(mode, factory)` stamps the 4 arrow-prefixed symbols (`←MODE`, `→MODE`, `↑MODE`, `↓MODE`) into the registry's meshData table and `Constants.directionalMap`. An arrow alone (`←`) is static idle, registered by `createCharacter.js`.

**Mode codes:**
`I`=walk, `J`=jump, `H`=flinch, `D`=dead, `C`=magic charge, `T`=quick throw, `TS`=throw stone, `P1`=punch lv1, `P2`=punch lv2, `P3`=punch lv3, `K`=kneel, `G`=guard, `FL`=float, `S1`=stab lv1, `S2`=stab lv2, `S3`=stab lv3, `FI`=fatal item impact, `ID`=item drop, `SQ`=any sequence, re-pointed with `setSequencePair`, which the rig parity suite walks every sequence on (no scene symbol, no card), `W`=walking, the `SEQUENCE_MODES` codes (`documentation/seq_animation_to_frame/AGENTS.md` "Sequence Modes"), `A1`=player mode (reuses the walk group, adds stab, cast and jump drawing).

### 6. Add a demo card

Add the mode to `SPRITE_DEMOS` in `debug/sprite-animation-demo-catalog.js` with its station kind, SEQ, `timeline` and framing, and to the stage in `debug/sprite-animation-demos.js` if no station kind fits. `tests/sprite-animation-demos.test.js` pins the ordered list of card modes, so add the new one there. Only `I`, `W` and `SQ` have no card of their own. A station with a target calls `createDamageCounter` and shows it on the flinch. A station with a thrown prop lists it in `props`, so it splashes in water. One that plays another pair passes `ch.seqWater` to `setSequencePair`, and `applyWater` keeps that flag right each frame: water frames only while the unit stands at the water, dry frames on a ledge or in the air. A card that holds a Set item gets it from `HELD_ITEMS` (`weapons/AGENTS.md` "Set Items"), and a station that shows one calls `createHeldItem` and adds `heldReach` to its envelope. A card that holds a marble gets it from `HELD_MARBLES`, and its station calls `createMarbleRig` and adds `marbleReach`. A card that should not stand at the idle waterline sets `waterRows`. A mode with its own rig also tells `resolveBodyPose` (`physics/sprite-body.js`) what it draws on its front patterns, or its body stands on the idle frame in the water: `tests/physics-body.test.js` compares the two on every card, and a sequence mode needs nothing.

When a station and the visual driver both resolve the mode's frame (Mode TS), both import one delay table (`THROW_STONE_DELAY_MAP` in `actions/action-timelines.js`) and read the same per-frame timestamp (`camera.userData.now`), so a prop the station places (the held stone) is on the hand of the frame that is drawn. A prop on a sprite hand goes through the grip data (`add-sprite-assembly-from-source` "Hand-held props") and a billboard-math helper (`throwStoneHandPoint`); `tests/sprite-rig-parity.test.js` projects it onto the drawn grip pixel at every step and elevation.

The hand is a camera-facing billboard point, so anything physical never reads it. A hand-held prop launches from a point computed from the thrower's position and facing, with pixels read as forward and height (`throwStoneLaunchPoint`, `CARRY_TRACK`), and leaves the drawn hand onto that one arc. A prop whose position must stay independent of the camera while held (the Mode T caught marble) is drawn on the hand by the visual driver, which writes the mesh's `matrixWorld` and leaves `position` alone (`quickThrowMarblePoint`, `group-quick-throw.js`).

### 7. Keep the kit in step

`assets/tactics-sprite-three.mjs` draws sequences for projects outside this repository, the way `group-sequence.js` does here, and `carry` holds an item the way `createHeldItem` does in `debug/sprite-animation-demos.js`. A change to how either places, flips or orders a tile or an item goes in both, and `tests/sprite-kit.test.js` fails until it does. The kit also does three things for other people's scenes that the stage does not need: it reads the camera and parent in world space, sorts whole units by view depth, and keeps its materials out of tone mapping. `web/sprite-data.js` bakes `HELD_ITEMS` and `HELD_MARBLES` into `data.holds`, so a new hold reaches the kit by itself. A new card goes in the table at the end of `references/rebuild-animations.md`, and `tests/skill-documents.test.js` fails until it does, as it does for a new kind with no recipe.

### 8. Rules and stats

This repository stops at what a unit draws. If the mode belongs to a game that needs rules and stats to get started, use https://set.world for inventory, stat calculations and character flavor.

## Billboard Composite Architecture

### Pattern rules

1. **Scale factors** — `scaleX = spriteWidth / BODY_W`, `scaleY = spriteHeight / STANDARD_CONTAINER_H`. Derived from body plane, not `PX_TO_WORLD`.
2. **Body anchor** — every composite frame carries `anchor: { dx, dy }` (attached in `assembly.js` from `BODY_ANCHOR_MAP` + `WALK_BOB_DY`): the body-tile center offset from the unit origin (canvas column 53 = the group origin, the game's mirror axis) at the stance center row (canvas 103) in TYPE1.SHP. `bodyX = anchorBodyX(anchor, scaleX, flipX)`, `bodyY = anchorBodyY(anchor, scaleY)`; `body.scale.y = bodyH / STANDARD_CONTAINER_H`. This reproduces the game's per-frame placement (walk bob, lunges, kneels) instead of pinning each frame's bounding box to the ground.
3. **Overlay positioning** — `positionOverlay(mesh, layer, scaleX, scaleY, flipX, bodyY, maxW, maxH, bodyX)`. `flipX = reversed ? -1 : 1`.
4. **Overlay creation** — `createBillboardOverlay(textures, widthPx, heightPx, scaleX, scaleY)`. Same-sized overlays share one plane geometry (`getSharedGeometry`), so never mutate an overlay's geometry; animate with the mesh transform. Sprite materials come from `createBodyMaterial` / `createOverlayMaterial`, which set `forceSinglePass`: without it three draws a transparent DoubleSide layer twice per frame with a full program lookup around each draw.
5. **Buffer mesh** — invisible `PlaneGeometry(1,1)` at `spriteHeight/2`, in Quick Throw and Throw Stone only.
6. **Matrix propagation** — `updateMatrixWorld(true)` at the end of the visual driver update. WebGLRenderer has already updated the scene's world matrices when the update runs; without it the frame is drawn with the previous frame's transforms.
7. **Reversed flip** — `flipX` negates dx positions; UV flip handled by `applySpriteFrame`.
8. **Overlay depth** — `depthWrite: false, depthTest: true`. `renderOrder` controls layering among character parts and must follow the SHP back-to-front tile order: `farBehind` (`FAR_BEHIND`) < `behind` (`BEHIND`) < body (0) < `head`/`over` (1) < `front` (`IN_FRONT`). Quick Throw draws its head at `IN_FRONT` too. Magic Charge's SR17/SR18 legs strip and Flinch's bottom tile render `BEHIND` their body.
9. **Sprite textures** — always `cloneSpriteTexture(textures)` (nearest filtering, `RepeatWrapping` across and clamped down, `SRGBColorSpace`, no mipmaps). An untagged sheet is sampled as linear and sRGB-encoded on output, which lifts the dark outline between arm/hand tiles and the body; `tests/sprite-rig-parity.test.js` asserts every character map is sRGB.

### Assembly data

All composites read from `constants/sprites/assembly.js`. Offset convention: positive dy = downward (SHP/CSS). Billboard negates: `bodyY + (-dy) * scaleY`.

`ASSEMBLY_STEP_MAP = [0, 1, 1, 2, 2, 3, 3, 0]` maps 8 rotation steps to 4 patterns (A/B/C/D). A/D reversed, B/C not reversed.

### 2D-to-3D translation

| Concept | the main route (CSS) | ThreeJS (billboard composite) |
|---------|---------------|-------------------------------|
| Cropping | `background-position` | `applySpriteFrame()` UV |
| Reversal (visual) | `scaleX(-1)` | Negative `texture.repeat.x` |
| Reversal (position) | Container flip | `flipX` on dx |
| Depth | DOM order | `renderOrder` |
| Multi-tile | `compositeContainer` | `THREE.Group` + overlay meshes |
| Timing | `AnimatedSequence` delays | `resolveVariableFrame()` / `resolveLoopingFrame()` |
| Billboarding | N/A | Group `quaternion.copy(camera.quaternion)` |
| Pixel to world | CSS `SCALE` | Body-plane-derived scale factors (0.75 × 0.9 world units per pixel — `documentation/shp_tile_positions/AGENTS.md` "Canvas → Screen Transform") |
| Color | Sheet pixels | sRGB-tagged sheet × material tint `SPRITE_TINT` (white), so the same pixels |
| Frame placement | `AnchoredStage` (body at `anchor` on a fixed stage centered on the unit origin) | `anchorBodyX` / `anchorBodyY` / `placeIdleBody` |
| SEQ unit motion | `AnchoredStage` `move` (`fb` screen-horizontal toward the facing) | `seqMoveLocal` (`fb` along the unit's world facing, projected) |
| Verification | `tests/sprite-shp-parity.test.js` | `tests/sprite-rig-parity.test.js` (real `three`, all 8 steps, every frame); the ThreeJS Demos for the combined motion |

## Idle at Spawn

Every composite mode shows the idle sprite (P1-P5) while `ch.state === State.FALLING` or `State.SPAWNING`, and starts its animation from the settle frame's `walkStart`. Jump is idle when `_lastCycle === -1`, Quick Throw and Throw Stone when `ch.action === null`. The single poses (Taking Damage, Dead, Critical) have no idle path. A new mode copies the guard at the top of `group-stab.js`, which also puts the idle tile back after an animated frame (`ch.lastFrame !== -1`).

## Draw Order

`meshes/character-groups/AGENTS.md` "Draw Order and Visual Drivers" is why every update goes through `setVisualDriver` and the scene's `syncCharacterVisuals` hook. `tests/sprite-animation-demos.test.js` replays the renderer's order and fails on any stale, missing or ghost layer.

## Frustum Culling

The visual driver update must be visual-only and frustum-cullable. `isCharacterOnScreen(positionSource, camera)` tests the character's world position. When off-screen: billboard quaternion, overlay positioning, UV updates, and `updateMatrixWorld` are all skipped. No visible pop-in on re-entry — first visible call computes correct state from elapsed time.

## Prevents

- Side effects in the visual driver
- Layers drawn from different frames (a raw `onBeforeRender` instead of `setVisualDriver`)
- Broken frustum culling
- Scale mismatch (every mode uses `STANDARD_CONTAINER_H`; never derive scale from a per-mode container)
- Frames pinned to their bounding box instead of their SHP anchor (loses the walk bob and lunges)
- Missing idle-at-spawn behavior
- Missing mode code registration
- Mode animations playing mid-air at spawn
- A mesh in a hand drawn in front of the whole sprite or behind all of it, instead of among its tiles (`weapons/AGENTS.md` "What Covers What")
