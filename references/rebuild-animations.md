# Rebuild an Animation

Every card on https://3d.internet.dev is a sequence and a scene. The sequence is data, and the kit plays any of them exactly. The scene is what stands around it: a target that flinches, a stone in the air, a ledge. There are two ways to get a card, and this file has both.

| You want | Do |
|----------|----|
| The card exactly as the site draws it, in your project | "Take the Card" |
| The same action in your own scene, on the kit | "Rebuild It in Your Scene" and the recipe for its kind in "Every Card" |

## Take the Card

The cards are ordinary modules, and the engine comes with this skill. Copy it and the three assets, alias `@engine`, and mount any card by its title. `three` is its only dependency, and `src/tactics-sprite` is the kit from `SKILL.md` step 2.

```sh
cp -R <skill>/three-isometric-engine src/three-isometric-engine
cp src/tactics-sprite/a1.png src/tactics-sprite/marble-black.gif src/tactics-sprite/set-items.glb public/
```

Vite takes the alias in `vite.config.js`. Next.js, webpack and TypeScript each have the same one line under their own name.

```js
import path from 'node:path';

export default { resolve: { alias: { '@engine': path.resolve('src/three-isometric-engine') } } };
```

```js
import * as THREE from 'three';
import { createSpriteDemoStage, SPRITE_DEMOS } from '@engine/debug/sprite-animation-demos';
import { readSetItems } from '@engine/weapons/set-items';

const loader = new THREE.TextureLoader();
const [spriteSheet, blackMarble, file] = await Promise.all([loader.loadAsync('/a1.png'), loader.loadAsync('/marble-black.gif'), fetch('/set-items.glb').then((response) => response.arrayBuffer())]);

const demos = SPRITE_DEMOS.filter((demo) => demo.title === 'Bow High (P1)');
const stage = createSpriteDemoStage({ canvas, spriteSheet, blackMarble, setItems: readSetItems(file), demos });
stage.setViewports([{ x: 0, y: 0, w: canvas.width, h: canvas.height }], canvas.width, canvas.height);

function frame(ms) {
  stage.frame(ms);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

The stage owns its renderer. It takes the page's controls: `setStep`, `setOrbiting`, `setElevation`, `setPlaying`, `setSpeed`, `stepTick`, `repeat`, `setWater`, `setPhysics` and `setTint`. Leave `demos` out for all of them, and pass one rect per card.

To draw a card with a renderer of your own, use what the stage is made of, which `three-isometric-engine/debug/sprite-animation-demos.js` exports: `createSpriteDemoStations({ textures, now, demos, items })` gives you stations, and each frame `fitStationView` and `aimCamera` set your camera before `station.update(now, dt, step, camera.quaternion)` and `renderer.render(station.scene, camera)`.

Keep `NOTICE.md` with what you take: `set-items.glb` is CC BY 4.0, and it needs its credit.

## Rebuild It in Your Scene

A recipe is a function that returns a card. It starts from `atlas` and `sheet`, loaded as `references/threejs.md` loads them, and needs nothing else unless it says so. Three things hold for all of them:

- **Clock.** A card starts at 0, so call `card.update(now - cardStart, camera)`, with `cardStart` the time you built it. Handing it a page clock of several seconds skips its first pass.
- **Place.** A card stands at the origin with its unit facing +x. To put one elsewhere, pass a `THREE.Group` as `scene`, moved where you want and not rotated: a recipe measures in its parent's space, and facing is a world direction, so a turned group sends a flight the wrong way. To face another way, change the unit's facing and swap the axes in the recipe.
- **Your own units.** A card spawns its units and repeats, because the site does. In a game, keep what its `act` does, pass your units where it calls `spawn`, and drop `start` and the replay.

```js
import * as THREE from 'three';
import { FACING_X, FACING_Z, findAnimation, frameHand } from './tactics-sprite/tactics-sprite.mjs';
import { SCALE_X, SCALE_Y, createTacticsSprite, flattenOntoSprite } from './tactics-sprite/tactics-sprite-three.mjs';

const TICK = 1 / 60;
const GRAVITY = 50;

//NOTE: the site's stage: the floor is y = 0 and a unit faces along x, toward its target. `floor` is the top of a ledge.
function spawn(scene, facing, animation, x = 0, floor = 0, z = 0) {
  const unit = createTacticsSprite(atlas, sheet, { facing, animation });
  unit.group.position.set(x, floor + unit.standHeight, z);
  scene.add(unit.group);
  return unit;
}

//NOTE: a card updates its units, then acts on what they crossed. One update per unit per frame.
const card = (units, act = () => {}) => ({
  units,
  update(now, camera) {
    for (const unit of units) unit.update(now, camera);
    act(now, camera);
  },
});

const ticksOf = (name) => atlas.sequences[findAnimation(atlas, name).front].totalTicks;
const sequenceOf = (name) => atlas.sequences[findAnimation(atlas, name).front];
const hit = (target, now) => target.play('Taking Damage', now, { then: 'Idle', duration: 0.5 });
const heading = (unit) => ({ x: FACING_X[unit.player.facing], z: FACING_Z[unit.player.facing] });
```

### The Stage in Numbers

The test suite holds this table to the source, so a number here is the number the site runs.

| Constant | Value | Means | Source |
|----------|-------|-------|--------|
| `cubeSize` | 32 | One tile of ground, in world units | `three-isometric-engine/constants/index.js` |
| `sphereRadius` | 10 | The big marble | `three-isometric-engine/constants/index.js` |
| `REST_Y` | 18 | A standing unit's stance point above the floor | `three-isometric-engine/debug/sprite-animation-demos.js` |
| `STRIKE_GAP` | 24 | Attacker to target | `three-isometric-engine/debug/sprite-animation-demos.js` |
| `defaultGravity` | -50 | World units per second squared, for everything that flies | `three-isometric-engine/constants/physics.js` |
| `CHAR_HALF_Z` | 4 | A thrown thing lands this far before a target's center | `three-isometric-engine/constants/character.js` |
| `JUMP_LIFT_HEIGHT` | 64 | Height of Jump | `three-isometric-engine/actions/action-timelines.js` |
| `BOW_RANGE` | 80 | Bow and Gun, shooter to target | `three-isometric-engine/debug/sprite-animation-demo-catalog.js` |
| `BOW_LEDGE` | 48 | Bow and Gun, High and Low ledge | `three-isometric-engine/debug/sprite-animation-demo-catalog.js` |
| `JUMP_DOWN_LEDGE` | 64 | Jump Down's ledge | `three-isometric-engine/debug/sprite-animation-demo-catalog.js` |
| `JUMP_DOWN_TRAVEL` | 32 | How far Jump Down crosses | `three-isometric-engine/debug/sprite-animation-demo-catalog.js` |
| `TELEPORT_OFFSET` | 24 | Teleport, either side of the middle | `three-isometric-engine/debug/sprite-animation-demo-catalog.js` |
| `spawnFadeMs` | 600 | Dither in | `three-isometric-engine/constants/physics.js` |
| `despawnFadeMs` | 600 | Dither out | `three-isometric-engine/constants/physics.js` |
| `HELD_ITEM_SCALE` | 4.5 | World units per unit of Set's models | `three-isometric-engine/weapons/held-items.js` |

Between passes a card rests: 400ms after an action, 800ms on a held last frame. A target flinches for 500ms. The site's cards all face a unit `SE` and stand their target `NW` at +x, and the camera's step does the rest.

### Flight

Everything that leaves a hand flies the same way. `solveArc` finds the low arc for a speed. The drawn hand depends on the camera and a flight must not, so a prop flies from a launch point worked out from the unit, and the gap to the hand it left shrinks to nothing over `settle` seconds.

```js
function solveArc(dx, dy, speed) {
  const v2 = speed * speed;
  const root = v2 * v2 - GRAVITY * (GRAVITY * dx * dx + 2 * dy * v2);
  if (root < 0) return null;
  const angle = Math.atan2(v2 - Math.sqrt(root), GRAVITY * dx);
  const vh = speed * Math.cos(angle);
  return { vh, vv: speed * Math.sin(angle), flightS: dx / vh };
}

function flightPoint(launch, from, dir, vh, vv, t, settle, out) {
  const w = t < settle ? 1 - t / settle : 0;
  out.x = launch.x + dir.x * vh * t + (from.x - launch.x) * w;
  out.y = launch.y + vv * t - 0.5 * GRAVITY * t * t + (from.y - launch.y) * w;
  out.z = launch.z + dir.z * vh * t + (from.z - launch.z) * w;
  return out;
}
```

### Hold and Loop

`hold`, `loop` and `pose` cards. The unit plays and that is all. `Critical` and `Dead` stand at the stance height here, and the kit lifts what reaches below the soles.

```js
function createLoopCard(scene, name) {
  const unit = spawn(scene, 'SE', name);
  unit.play(name, 0);
  return card([unit]);
}
```

### Reaction

The sequence once, its last frame held 800ms, then again. Most `SEQUENCE_MODES` rows are this. A Set item in this kind of card goes through `withItem`, under "Held Items".

```js
function createReactionCard(scene, name) {
  const unit = spawn(scene, 'SE', name);
  const pass = ticksOf(name) * TICK + 0.8;
  let startedAt = 0;
  unit.play(name, 0);
  return card([unit], (now) => {
    if (now - startedAt < pass) return;
    startedAt = now;
    unit.play(name, now);
  });
}
```

### Strike

The attacker loops, and the target flinches on the sequence's own `PostGenericAttack`. The site's Poke High stands the target on a ledge of 16 at a gap of 22, and Poke Low stands the attacker on that ledge at a gap of 28.8 (`POKE_STAGES`). The other strikes stand level at `STRIKE_GAP`.

```js
function createStrikeCard(scene, name, { gap = 24, unitFloor = 0, targetFloor = 0 } = {}) {
  const unit = spawn(scene, 'SE', name, 0, unitFloor);
  const target = spawn(scene, 'NW', 'Idle', gap, targetFloor);
  unit.play(name, 0, { loop: true });
  return card([unit, target], (now) => {
    if (unit.player.events.includes('PostGenericAttack')) hit(target, now);
  });
}
```

### Held Items

The Swing, Poke, Gun, Read Book, Play Instrument, Shield Block, Katana Use and recoil cards hold one of Set's seven models: `rifle`, `sword`, `katana`, `spear`, `shield`, `harp` and `tome`. `data.holds[name].item` names it. The file is `set-items.glb` in the kit, a plain glTF binary, CC BY 4.0: `NOTICE.md` has the credit to keep. Serve it as a static file and pass its URL to `loadModels`. Each mesh is named for its item, with vertex colors, and its origin is the hand.

The mythril is a mirror metal, so it needs something to reflect. `RoomEnvironment` is what the site uses. `three-isometric-engine/weapons/held-item-mesh.js` has the veins and the thin film. A shield and a book have two sides, and `three-isometric-engine/weapons/item-finish.js` draws them. It needs only three, so copy it into your project: `createItemFinishBake(renderer)` bakes three tiles, and `applyItemFaces(material, ITEM_FACES.shield, { plate, inside })` lays worked mythril on the outside and dark boards on the inside, with `plate` and `inside` as `{ value: texture }`. Call `bake` again on `webglcontextrestored`.

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

async function loadModels(renderer, url) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const models = {};
  gltf.scene.traverse((object) => {
    if (object.isMesh) models[object.name] = object.geometry;
  });
  const prefilter = new THREE.PMREMGenerator(renderer);
  const metal = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 0.16, envMap: prefilter.fromScene(new RoomEnvironment(), 0.03).texture });
  prefilter.dispose();
  return { models, metal };
}

//NOTE: any card, with its item in the hand of its first unit. A loop or a reaction, a strike or a recoil.
function withItem(scene, built, name, { models, metal }) {
  const mesh = new THREE.Mesh(models[atlas.data.holds[name].item], metal);
  scene.add(mesh);
  built.units[0].carry(mesh, name);
  return { ...built, mesh };
}
```

So `withItem(scene, createStrikeCard(scene, 'Swing High'), 'Swing High', loaded)` is the Swing High card. An item that points along the view stops following `over`, and `carry` handles that: pointing at the camera it stands in front of every tile, and pointing away behind them all. Item Throw holds a marble the same way: `data.holds` names it `marble`, gives its `radius`, and any sphere that size works. High is the small one in one hand, and Mid and Low the big one, on the hand until both hands come down and then between them.

### Recoil

The two Thrust Recoil cards stand what stopped the thrust in front of the attacker: a unit in a Shield Block on Poke's stage, its own shield held. The recoil starts from the contact, where a spark shows, and plays once.

```js
function createRecoilCard(scene, name, blockName, { gap, unitFloor = 0, targetFloor = 0 }, items) {
  const unit = spawn(scene, 'SE', name, 0, unitFloor);
  const blocker = spawn(scene, 'NW', blockName, gap, targetFloor);
  const spear = new THREE.Mesh(items.models[atlas.data.holds[name].item], items.metal);
  const shield = new THREE.Mesh(items.models.shield, items.metal);
  scene.add(spear, shield);
  unit.carry(spear, name);
  blocker.carry(shield, blockName);
  const pass = ticksOf(name) * TICK + 0.8;
  let startedAt = 0;
  const start = (now) => {
    startedAt = now;
    unit.play(name, now);
    blocker.play(blockName, now);
  };
  start(0);
  return card([unit, blocker], (now) => {
    if (now - startedAt >= pass) start(now);
  });
}
```

Thrust Recoil High pairs with `Shield Block High` on Poke High's stage, and Thrust Recoil Low with `Shield Block Mid` on Poke Low's.

### Gun

Bow's three heights with the rifle held on the target. `holds[name].aims` marks the frames whose tilt is the stage's. The muzzle flashes 2 ticks before `PostGenericAttack`, the rifle kicks back 1.6 along its aim, a streak crosses in those 2 ticks and the target flinches on the event. The streak here is a stretched box: `createStreak` in `three-isometric-engine/weapons/held-item-mesh.js` is the site's, with its red tip and glow.

```js
const FLIGHT_TICKS = 2;
const GUN_FLOORS = { high: [0, 48], mid: [0, 0], low: [48, 0] };

function createGunCard(scene, name, height, items) {
  const [unitFloor, targetFloor] = GUN_FLOORS[height];
  const built = withItem(scene, createStrikeCard(scene, name, { gap: 80, unitFloor, targetFloor }), name, items);
  const [unit, target] = built.units;
  const { mesh } = built;
  const hold = atlas.data.holds[name];
  const entry = sequenceOf(name);
  const hitTick = entry.events.find(([, label]) => label === 'PostGenericAttack')[0];
  const streak = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  streak.visible = false;
  scene.add(streak);
  const aimAt = new THREE.Vector3(80, target.group.position.y + 4, 0);
  const along = new THREE.Vector3();
  const across = new THREE.Vector3();
  const up = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  return {
    ...built,
    update(now, camera) {
      built.update(now, camera);
      const ticks = (now * 60) % entry.totalTicks;
      if (hold.aims[unit.player.pose.frame]) {
        along.subVectors(aimAt, mesh.position).normalize();
        across.set(-along.z, 0, along.x).normalize();
        up.crossVectors(across, along);
        mesh.quaternion.setFromRotationMatrix(basis.makeBasis(along, up, across));
      }
      const since = ticks - (hitTick - FLIGHT_TICKS);
      streak.visible = since >= 0 && since < FLIGHT_TICKS;
      if (!streak.visible) return;
      mesh.position.addScaledVector(along, -1.6 * (1 - since / FLIGHT_TICKS));
      streak.quaternion.copy(mesh.quaternion);
      streak.scale.set(aimAt.distanceTo(mesh.position) * Math.min(1, (since + 1) / FLIGHT_TICKS), 1, 1);
      streak.position.copy(mesh.position).addScaledVector(along, streak.scale.x / 2);
    },
  };
}
```

### Throw Stone

`Dragoon Jump 3` with a stone. It rides the hand from the kneel, tick 8, and leaves on `PlaySound`, tick 26, from the hand of the frame before. `holds['Dragoon Jump 3'].hands` has that hand on every frame. The site's small stone has radius 2.4 and leaves at 162.4 on a flat arc to a target 80 away. Its heavy one has radius 10, leaves at 44.7 on each axis and stands the target 95.9 away, where that 45 degree lob comes back to its release height, and `collide` in `three-isometric-engine/weapons/ballistics.js` shares the momentum on contact. `createThrowStation` in `three-isometric-engine/debug/sprite-animation-demos.js` has the bounce and the roll after it.

```js
const STONE_NAME = 'Dragoon Jump 3';
const RELEASE_TICK = 26;
const SETTLE_S = 6 * TICK;

//NOTE: the heavy stone passes its own arc: { radius: 10, range: 95.9, arc: { vh: 44.72, vv: 44.72, flightS: 80 / 44.72 } }.
function createThrowStoneCard(scene, { radius = 2.4, speed = 162.4, range = 80, arc = null } = {}) {
  const unit = spawn(scene, 'SE', STONE_NAME);
  const target = spawn(scene, 'NW', 'Idle', range);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), new THREE.MeshBasicMaterial({ color: 0x151515 }));
  scene.add(stone);
  const dir = heading(unit);
  const [u, v] = atlas.data.holds[STONE_NAME].hands.front[6];
  const launch = new THREE.Vector3(dir.x * Math.abs(u) * SCALE_X, unit.group.position.y - v * SCALE_Y, dir.z * Math.abs(u) * SCALE_X);
  const flight = arc ?? solveArc(range - 4 - radius - Math.abs(u) * SCALE_X, v * SCALE_Y, speed);
  const from = new THREE.Vector3();
  let startedAt = 0;
  let state = 'held';
  const start = (now) => {
    startedAt = now;
    state = 'held';
    unit.carry(stone, STONE_NAME);
    unit.play(STONE_NAME, now, { then: 'Idle' });
  };
  start(0);
  return card([unit, target], (now) => {
    const t = now - startedAt - RELEASE_TICK * TICK;
    if (state === 'held' && t >= 0) {
      unit.release();
      from.copy(stone.position);
      state = 'flying';
    }
    if (state === 'flying') {
      stone.visible = true;
      flightPoint(launch, from, dir, flight.vh, flight.vv, Math.min(t, flight.flightS), SETTLE_S, stone.position);
      if (t >= flight.flightS) {
        hit(target, now);
        stone.visible = false;
        state = 'done';
      }
    }
    if (state === 'done' && t >= flight.flightS + 2) start(now);
  });
}
```

### Quick Throw

`High Jump Start` catches a marble resting half a cube in front of the unit, holds it from the kneel, tick 8, and lets it go overhead on tick 22. It plays for 24 ticks, then idle. The marble then flies the arc of `deflectLaunchVH` and `deflectLaunchVV`, both 49, from the hold point. The site slides the marble onto the hand over the first 8 ticks (`quickThrowMarblePoint`), and here it waits on the floor until the kneel reaches it.

```js
function createQuickThrowCard(scene) {
  const name = 'High Jump Start';
  const unit = spawn(scene, 'SE', name);
  const marble = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshBasicMaterial({ color: 0x151515 }));
  scene.add(marble);
  const rest = new THREE.Vector3(16, 10, 0);
  const from = new THREE.Vector3();
  const launch = new THREE.Vector3();
  let startedAt = 0;
  let state = 'held';
  const start = (now) => {
    startedAt = now;
    state = 'held';
    unit.carry(marble, name);
    unit.play(name, now, { then: 'Idle', duration: 24 * TICK });
  };
  start(0);
  return card([unit], (now) => {
    const ticks = (now - startedAt) * 60;
    if (ticks < 8) {
      marble.visible = true;
      marble.position.copy(rest);
    }
    if (state === 'held' && ticks >= 22) {
      unit.release();
      from.copy(marble.position);
      launch.set(16, from.y, 0);
      state = 'flying';
    }
    if (state === 'flying') {
      marble.visible = true;
      const t = (ticks - 22) * TICK;
      flightPoint(launch, from, heading(unit), 49, 49, t, 2 * TICK, marble.position);
      if (marble.position.y <= 10) start(now);
    }
  });
}
```

### Weapon Throw

The SEQ draws the arm, because the original tactical RPG's effect code flies the item, so a card plans the flight: the sword's middle flies a low arc at 150 to a target 64 away, and turns about that middle `thrown.turns` times, so its point arrives first. It lets go on tick 18, after the last frame that holds it, frame 4, and stays in the target until the next pass.

```js
function planThrow(name, frame) {
  const hold = atlas.data.holds[name];
  const entry = sequenceOf(name);
  const [u, v] = frameHand(atlas, entry.frames[frame], hold.front);
  const tilt = hold.tilt[frame];
  const middle = hold.thrown.middle * atlas.data.heldItemScale;
  const point = (hold.thrown.length - hold.thrown.middle) * atlas.data.heldItemScale;
  const launchForward = (-u + (entry.fb?.[frame] ?? 0)) * SCALE_X + Math.cos(tilt) * middle;
  const launchUp = -v * SCALE_Y + Math.sin(tilt) * middle;
  const plan = { tilt, middle, launchForward, launchUp, arrive: 0, turns: hold.thrown.turns };
  for (let pass = 0; pass < 4; pass++) {
    Object.assign(plan, solveArc(64 - 4 - Math.cos(plan.arrive) * point - launchForward, 4 - Math.sin(plan.arrive) * point - launchUp, 150));
    plan.arrive = Math.atan2(plan.vv - GRAVITY * plan.flightS, plan.vh);
  }
  return plan;
}

function createThrownCard(scene, name, { frame, releaseTick }, items) {
  const built = withItem(scene, card([spawn(scene, 'SE', name), spawn(scene, 'NW', 'Idle', 64)]), name, items);
  const [unit, target] = built.units;
  const { mesh } = built;
  const plan = planThrow(name, frame);
  const dir = heading(unit);
  const forward = new THREE.Vector3();
  const across = new THREE.Vector3(-dir.z, 0, dir.x);
  const up = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const from = new THREE.Vector3();
  const launch = new THREE.Vector3(dir.x * plan.launchForward, unit.group.position.y + plan.launchUp, dir.z * plan.launchForward);
  const middle = new THREE.Vector3();
  const pass = Math.max(ticksOf(name) * TICK, releaseTick * TICK + plan.flightS) + 0.8;
  let startedAt = 0;
  let state = 'held';
  const start = (now) => {
    startedAt = now;
    state = 'held';
    unit.carry(mesh, name);
    unit.play(name, now);
  };
  start(0);
  return {
    ...built,
    update(now, camera) {
      built.update(now, camera);
      const t = now - startedAt - releaseTick * TICK;
      if (state === 'held' && t >= 0) {
        unit.release();
        from.set(1, 0, 0).applyQuaternion(mesh.quaternion).multiplyScalar(plan.middle).add(mesh.position);
        state = 'flying';
      }
      if (state === 'flying') {
        const flown = Math.min(t, plan.flightS);
        const angle = plan.tilt + ((plan.arrive - plan.tilt - Math.PI * 2 * plan.turns) * flown) / plan.flightS;
        forward.set(dir.x * Math.cos(angle), Math.sin(angle), dir.z * Math.cos(angle));
        up.crossVectors(across, forward);
        mesh.quaternion.setFromRotationMatrix(basis.makeBasis(forward, up, across));
        flightPoint(launch, from, dir, plan.vh, plan.vv, flown, 6 * TICK, middle);
        mesh.position.copy(middle).addScaledVector(forward, -plan.middle);
        if (t >= plan.flightS) {
          hit(target, now);
          state = 'stuck';
        }
      }
      if (now - startedAt >= pass) start(now);
    },
  };
}
```

### Item Throw

The three Release cards. The marble leaves the hand, or the two hands, on `PlaySound`, tick 0, on a low arc to a target 64 away, and High, Mid and Low are where the target stands: on a ledge of 16, level, or 16 below a unit on a ledge. One arm throws, so what the marble weighs sets its speed: 162.4 for the small one and 83.0 for the big one. The site's marble then does what Throw Stone's does: it goes off its target, drops, bounces low, rolls out and fades, while the target slides (`createItemThrowStation` in `three-isometric-engine/debug/sprite-animation-demos.js`).

```js
const MARBLE_SPEED = { 2.4: 162.4, 8: 83.03 };

function createItemThrowCard(scene, name, { unitFloor = 0, targetFloor = 0 } = {}) {
  const hold = atlas.data.holds[name];
  const unit = spawn(scene, 'SE', name, 0, unitFloor);
  const target = spawn(scene, 'NW', 'Idle', 64, targetFloor);
  const marble = new THREE.Mesh(new THREE.SphereGeometry(hold.radius, 32, 32), new THREE.MeshBasicMaterial({ color: 0x151515 }));
  scene.add(marble);
  const [u, v] = hold.hands.front[0];
  const forward = (-u + (sequenceOf(name).fb?.[0] ?? 0)) * SCALE_X;
  const flight = solveArc(64 - 4 - hold.radius - forward, targetFloor - unitFloor + 4 + v * SCALE_Y, MARBLE_SPEED[hold.radius]);
  const dir = heading(unit);
  const launch = new THREE.Vector3(dir.x * forward, unit.group.position.y - v * SCALE_Y, dir.z * forward);
  const from = new THREE.Vector3();
  let startedAt = 0;
  let state = 'held';
  const start = (now) => {
    startedAt = now;
    state = 'held';
    marble.visible = true;
    unit.carry(marble, name);
    unit.play(name, now);
  };
  start(0);
  return card([unit, target], (now) => {
    const t = now - startedAt;
    if (state === 'held') {
      unit.release();
      from.copy(marble.position);
      state = 'flying';
    }
    if (state === 'flying') {
      flightPoint(launch, from, dir, flight.vh, flight.vv, Math.min(t, flight.flightS), 6 * TICK, marble.position);
      if (t >= flight.flightS) {
        hit(target, now);
        marble.visible = false;
        state = 'done';
      }
    }
    if (state === 'done' && t >= flight.flightS + 2) start(now);
  });
}
```

So `createItemThrowCard(scene, 'Item Throw Low Release', { unitFloor: 16 })` is the Low card.

### Bow

The bow is simulated, not drawn, so this recipe needs four files of the engine: `three-isometric-engine/weapons/bow.js`, `bow-mesh.js`, `ballistics.js` and `constants/physics.js`, with `@engine` aliased as in "Take the Card". `three-isometric-engine/weapons/AGENTS.md` "The Bow" explains the simulation. The kit supplies the hand and the layers: a fist closes on the grip facing the camera, and the body covers the stave facing away. The arrow nocks on tick 12, the draw is full by tick 20, and the hand opens on `PlaySound`, tick 26. The catalog's `plan` holds the launch, which it works out from these same numbers before any model has loaded.

```js
import { BOW_SPEC, BOW_STEP_S, bowPull, createBow, stepBow } from '@engine/weapons/bow';
import { createArrowGeometries, createArrowMesh, createBowMesh, syncBowMesh } from '@engine/weapons/bow-mesh';
import { BOW_ANCHOR_TICKS, BOW_NOCK_TICKS, BOW_SHOT_TICKS, SPRITE_DEMOS } from '@engine/debug/sprite-animation-demo-catalog';

function createBowCard(scene, title, name) {
  const { plan, archerFloor, targetFloor } = SPRITE_DEMOS.find((demo) => demo.title === title);
  const unit = spawn(scene, 'SE', name, 0, archerFloor);
  const target = spawn(scene, 'NW', 'Idle', 80, targetFloor);
  unit.play(name, 0, { loop: true });
  unit.itemLayer = { front: 1, back: 6 };

  const stave = new THREE.MeshStandardMaterial({ color: 0xd4e0ed, metalness: 0.4, roughness: 0.4 });
  const string = new THREE.MeshBasicMaterial({ color: 0x393939 });
  const simulated = createBow(BOW_SPEC);
  const bow = createBowMesh(simulated, { stave, string });
  stave.onBeforeRender = flattenOntoSprite;
  string.onBeforeRender = flattenOntoSprite;
  bow.traverse((part) => {
    part.userData.sprite = unit;
  });
  const geometries = createArrowGeometries(BOW_SPEC.arrowLength);
  const arrow = createArrowMesh({ shaft: geometries.shaft, head: geometries.head, vanes: geometries.vanes }, { shaft: string, head: stave, vanes: string });
  arrow.visible = false;
  scene.add(bow, arrow);

  const dir = heading(unit);
  const aim = new THREE.Vector3(dir.x * Math.cos(plan.angle), Math.sin(plan.angle), dir.z * Math.cos(plan.angle));
  const across = new THREE.Vector3(-dir.z, 0, dir.x);
  const up = new THREE.Vector3().crossVectors(across, aim);
  bow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(aim, up, across));
  arrow.quaternion.copy(bow.quaternion);

  const cycle = sequenceOf(name).totalTicks;
  const launch = new THREE.Vector3(dir.x * plan.launchForward, unit.group.position.y + plan.launchUp, dir.z * plan.launchForward);
  const from = new THREE.Vector3();
  const tip = new THREE.Vector3();
  let simulatedS = 0;
  let leftAt = -1;
  let wasOn = false;

  return card([unit, target], (now) => {
    while (simulatedS + BOW_STEP_S <= now) {
      simulatedS += BOW_STEP_S;
      const tick = (simulatedS * 60) % cycle;
      stepBow(simulated, bowPull(BOW_SPEC, tick, BOW_NOCK_TICKS, BOW_ANCHOR_TICKS, BOW_SHOT_TICKS));
    }
    syncBowMesh(bow, simulated);
    if (unit.hand('last', 0, bow.position)) bow.parent.worldToLocal(bow.position);
    if (simulated.arrowOn) {
      arrow.visible = true;
      arrow.position.copy(bow.position).addScaledVector(aim, simulated.x[simulated.nodes]);
    } else if (wasOn) {
      leftAt = now;
      from.copy(bow.position).addScaledVector(aim, simulated.arrowX + BOW_SPEC.arrowLength);
    }
    wasOn = simulated.arrowOn;
    if (leftAt < 0) return;
    const t = Math.min(now - leftAt, plan.flightS);
    flightPoint(launch, from, dir, plan.vh, plan.vv, t, 8 * TICK, tip);
    arrow.position.copy(tip).addScaledVector(aim, -BOW_SPEC.arrowLength);
    if (t === plan.flightS) {
      hit(target, now);
      leftAt = -1;
    }
  });
}
```

### Cloth Bag

The bag is simulated too: `three-isometric-engine/weapons/cloth-bag.js` and `cloth-bag-mesh.js`, with `three-isometric-engine/weapons/AGENTS.md` "The Cloth Bag" for the numbers. Port `createBagRig` from `three-isometric-engine/debug/sprite-animation-demos.js` with these swaps, or use "Take the Card".

| In `createBagRig` | On the kit |
|-------------------|------------|
| `heldHand(shp, 'first', out)` | `frameHand(atlas, shp, 'first', out)` |
| `resolveLoopingFrame(entry.delaysS, entry.totalS, seconds).frameIdx` | Find the frame from `entry.ticks`, or use `poseAt` with `view` 1 |
| `billboardPoint(shooter, quaternion, u, v, flip, out, depth)` | `unit.hand('first', depth, out)`, with `depth` 12 toward the camera on a front view and -12 on a back one |
| `ch.seqFront`, `ch.seqBack` | `atlas.sequences[animation.front]`, `atlas.sequences[animation.back]` |

The simulation always reads the front sequence, so the swing does not depend on the camera.

### Jump

Three sequences joined: `Jump 2` on the ground for 22 ticks, its held last frame through 32 ticks of air, and `High Jump Land` for 18. The height is `4 h s (1 - s)`, a constant-gravity arc, and the unit is on the ground on every take-off and landing frame, so the pose and the height always agree.

```js
function createJumpCard(scene) {
  const unit = spawn(scene, 'SE', 'Jump 2');
  const ground = unit.group.position.y;
  let startedAt = 0;
  let landed = false;
  const start = (now) => {
    startedAt = now;
    landed = false;
    unit.play('Jump 2', now);
  };
  start(0);
  return card([unit], (now) => {
    const ticks = (now - startedAt) * 60;
    const s = (ticks - 22) / 32;
    unit.group.position.y = ground + (s > 0 && s < 1 ? 4 * 64 * s * (1 - s) : 0);
    if (!landed && ticks >= 54) {
      landed = true;
      unit.play('High Jump Land', startedAt + 54 * TICK, { then: 'Idle' });
    }
    if (ticks >= 72 + 24) start(now);
  });
}
```

### Leap

`leap` cards. The original tactical RPG chains these while the unit is in the air, so each card plays the chain it belongs to, as Jump does, with its air pose held over the arc. The height rises for `rise` ticks with constant deceleration, holds for `hold`, and falls for `fall` with constant acceleration, to 64.

| Card | Take-off | Air | `rise`, `hold`, `fall` |
|------|----------|-----|------------------------|
| Mid Jump | `Jump 2` | `Mid Jump` | 16, 0, 16 |
| High Jump Hold | `High Jump Start` | `High Jump Hold` | 14, 60, 14 |
| High Jump Land | `High Jump Start` | `High Jump Hold` | 16, 6, 10 |

```js
function leapHeight(ticks, rise, hold, fall) {
  if (ticks <= 0) return 0;
  if (ticks < rise) return 64 * (1 - (1 - ticks / rise) ** 2);
  if (ticks < rise + hold) return 64;
  const fallen = (ticks - rise - hold) / fall;
  return fallen >= 1 ? 0 : 64 * (1 - fallen * fallen);
}

function createLeapCard(scene, takeoff, air, rise, hold, fall) {
  const unit = spawn(scene, 'SE', takeoff);
  const ground = unit.group.position.y;
  const leaveTicks = atlas.sequences[findAnimation(atlas, takeoff).front].ticks.reduce((a, b) => a + b, 0);
  const landTicks = leaveTicks + rise + hold + fall;
  let startedAt = 0;
  let phase = 'takeoff';
  const start = (now) => {
    startedAt = now;
    phase = 'takeoff';
    unit.play(takeoff, now);
  };
  start(0);
  return card([unit], (now) => {
    const ticks = (now - startedAt) * 60;
    if (phase === 'takeoff' && ticks >= leaveTicks) {
      phase = 'air';
      unit.play(air, startedAt + leaveTicks * TICK);
    }
    unit.group.position.y = ground + (phase === 'air' ? leapHeight(ticks - leaveTicks, rise, hold, fall) : 0);
    if (phase === 'air' && ticks >= landTicks) {
      phase = 'landing';
      unit.group.position.y = ground;
      unit.play('High Jump Land', startedAt + landTicks * TICK, { then: 'Idle' });
    }
    if (ticks >= landTicks + 18 + 24) start(now);
  });
}
```

### Jump Down

The unit steps off a ledge 64 high and crosses 32 to the floor while the air frames play, tick 12 to tick 34, on one arc. Nothing walks it back, so the site dithers it away and brings it back on the ledge.

```js
function createJumpDownCard(scene) {
  const unit = spawn(scene, 'SE', 'Jump Down', -32, 64);
  const ground = unit.standHeight;
  let startedAt = 0;
  const start = (now) => {
    startedAt = now;
    unit.play('Jump Down', now);
  };
  start(0);
  return card([unit], (now) => {
    const ticks = (now - startedAt) * 60;
    const s = Math.max(0, Math.min(1, (ticks - 12) / 22));
    unit.group.position.x = 32 * (s - 1);
    unit.group.position.y = ground + 64 * (1 - s) + 4 * 64 * 0.56 * s * (1 - s);
    if (ticks >= 38 + 24) start(now);
  });
}
```

### Teleport

`Teleport` plays through a dither out, the unit is gone for 6 ticks, and it plays again on the other side through a dither in, 24 either side of the middle. `three-isometric-engine/meshes/spawn-effect.js` is the dither. With the engine aliased, import it as below. To take that one file alone, copy it and replace its import line with `const spawnFadeMs = 600; const despawnFadeMs = 600;`, because that import reaches into the engine. A patched material starts fully dithered away, so `createFade` draws the unit whole first. The kit's materials are shared by every unit on a sheet, so a fading unit takes its own.

```js
import { patchGroupSpawnMaterials, updateSpawnProgress } from '@engine/meshes/spawn-effect';

function createFade(unit) {
  unit.group.traverse((object) => {
    if (object.isMesh) object.material = object.material.clone();
  });
  const refs = patchGroupSpawnMaterials(unit.group);
  updateSpawnProgress(refs, 1);
  return (progress) => updateSpawnProgress(refs, progress);
}

function createTeleportCard(scene) {
  const unit = spawn(scene, 'SE', 'Teleport', -24);
  const setFade = createFade(unit);
  const FADE_TICKS = 36;
  const GAP_TICKS = 6;
  let startedAt = 0;
  let side = -1;
  let phase = 'out';
  const start = (now) => {
    startedAt = now;
    phase = 'out';
    unit.play('Teleport', now);
  };
  start(0);
  return card([unit], (now) => {
    const ticks = (now - startedAt) * 60;
    if (phase === 'out' && ticks >= FADE_TICKS) {
      phase = 'gap';
      side = -side;
      unit.group.position.x = side * 24;
      unit.group.visible = false;
    }
    if (phase === 'gap' && ticks >= FADE_TICKS + GAP_TICKS) {
      phase = 'in';
      unit.group.visible = true;
      unit.play('Teleport', startedAt + (FADE_TICKS + GAP_TICKS) * TICK);
    }
    setFade(phase === 'out' ? Math.max(0, 1 - ticks / FADE_TICKS) : phase === 'in' ? Math.min(1, (ticks - FADE_TICKS - GAP_TICKS) / FADE_TICKS) : 1);
    if (ticks >= FADE_TICKS * 2 + GAP_TICKS + 48) start(now);
  });
}
```

### Player

The `player` cards are the responsive versions of a walk, a stab, a cast and a jump, which a game's input would start. Walk is `Walk`. Stab is `Unarmed Low` once. Cast is 40 ticks of `Singing`. The jump leaves the ground as it starts and has no hang at the top: 300ms of cubic ease-out to a height of 48, then a fall at 550 until it lands, on the last two take-off frames and the air pose, with `High Jump Land` drawn on the ground.

```js
function createPlayerJumpCard(scene) {
  const unit = spawn(scene, 'SE', 'Idle');
  const ground = unit.group.position.y;
  const air = sequenceOf('Jump 2').ticks.slice(0, 3).reduce((a, b) => a + b, 0);
  let startedAt = 0;
  let landedAt = -1;
  const start = (now) => {
    startedAt = now;
    landedAt = -1;
    unit.play('Jump 2', now - air * TICK);
  };
  start(0);
  return card([unit], (now) => {
    if (landedAt >= 0) {
      if (now - landedAt >= 18 * TICK + 0.4) start(now);
      return;
    }
    const t = now - startedAt;
    const height = t < 0.3 ? 48 * (1 - (1 - t / 0.3) ** 3) : 48 - 0.5 * 550 * (t - 0.3) ** 2;
    unit.group.position.y = ground + Math.max(0, height);
    if (height > 0) return;
    landedAt = now;
    unit.play('High Jump Land', now, { then: 'Idle' });
  });
}
```

### Contact Shadow

A soft disc on the floor, which shrinks and fades as the unit rises. Give it a `renderOrder` of -10 so it draws before anything else that is transparent. Sprites cast no shadow of their own.

```js
function createShadow(scene) {
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(10.08, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -10;
  scene.add(shadow);
  return (x, z, height, floor = 0) => {
    const s = 1 / (1 + Math.max(0, height) / 32);
    shadow.position.set(x, floor + 0.1, z);
    shadow.scale.setScalar(s);
    shadow.material.opacity = 0.16 * s;
  };
}
```

### Damage Counter

The number over a struck unit is data too: 5x7 digit bitmaps, drawn in art pixels so they sit on the sprite's grid. Each digit hops 6px over 12 ticks, then 2px over 8, starting 4 ticks after the one before it, and the number lasts 48 ticks. `three-isometric-engine/debug/damage-counter.js` is the whole of it, with no image. With the engine aliased, `createDamageCounter({ damageDigits: createDamageDigits(), damageGeometry: createDamageGeometry() }, scene)` gives you `show(now, position)` and `update(now, position)`, with `now` in milliseconds, and `DAMAGE_COUNTER` in the catalog is the number it shows.

### In Water

Every frame has a copy `waterOffset` later that stops at the waterline: `unit.play(name, now, { water: true })`. A unit in water keeps those frames only while it stands at the water. On a ledge or in the air it plays dry, and the surface takes it row by row.

The waterline is 10 sprite pixels below the stance point, the bottom of the idle water frame. The plane leans with the camera, so a surface that cuts every unit on that row stands at `standHeight - 9 * Math.cos(elevation)` above the floor. Make it opaque, or give it `depthWrite: true` and draw it first, and the depth test cuts the sprite for you, overlay tiles included.

The site's water is `three-isometric-engine/debug/water-simulation.js` and `three-isometric-engine/debug/water-surface.js`, with swell, ripples, caustics and foam, and each unit's body moves it. It needs the engine: "Take the Card" with `stage.setWater(true)`. `pages/AGENTS.md` "ThreeJS Demos" describes it.

### Physics Body

A unit's body comes from its own pixels: `three-isometric-engine/physics/AGENTS.md`. With the engine aliased, pass the kit's frame through it, always from the front sequence, so a unit has one body on every pattern.

```js
import { createSheetBodies, readSheetAlpha } from '@engine/physics/sprite-body';

function createBodies(image) {
  const bodies = createSheetBodies(readSheetAlpha(image));
  return (unit) => {
    const { animation, pose } = unit.player;
    return animation.idle ? bodies.shape(2) : bodies.shape(atlas.sequences[animation.front].frames[pose.frame]);
  };
}
```

## Every Card

Find the card's title, then read the recipe for its kind. The test suite compares this table with the catalog, `SPRITE_DEMOS` in `three-isometric-engine/debug/sprite-animation-demo-catalog.js`, row by row.

| Kind | Recipe |
|------|--------|
| `hold`, `loop`, `pose` | "Hold and Loop" |
| `reaction` | "Reaction" |
| `strike` | "Strike" |
| `recoil` | "Recoil" |
| `gun` | "Gun" |
| `bow` | "Bow" |
| `throw` | "Throw Stone" |
| `quick-throw` | "Quick Throw" |
| `weapon-throw` | "Weapon Throw" |
| `item-throw` | "Item Throw" |
| `jump` | "Jump" |
| `leap` | "Leap" |
| `jump-down` | "Jump Down" |
| `teleport` | "Teleport" |
| `player` | "Player" |

A card with a prop adds "Held Items", or "Cloth Bag" for a bag. Quick Throw plays `High Jump Start`, both Throw Stone cards play `Dragoon Jump 3`, and "Player" says what its cards play. Every other title is the animation's name, less the mode in brackets.

| Card | Kind | Prop |
|------|------|------|
| Idle | `hold` |  |
| Frozen Walk 2 (G) | `hold` |  |
| Float (FL) | `hold` |  |
| Walk (A1 / W / I) | `player` |  |
| Player Jump (A1) | `player` |  |
| Player Stab (A1) | `player` |  |
| Player Cast (A1) | `player` |  |
| Singing (C) | `loop` |  |
| Quick Throw (T) | `quick-throw` | marble |
| Taking Damage (H) | `pose` |  |
| Critical (K) | `pose` |  |
| Dead (D) | `pose` |  |
| Jump (J) | `jump` |  |
| Throw Stone (TS) | `throw` | stone |
| Throw Heavy Stone (TS) | `throw` | stone |
| Bow High (P1) | `bow` | bow |
| Bow Mid (P2) | `bow` | bow |
| Bow Low (P3) | `bow` | bow |
| Unarmed High (S1) | `strike` |  |
| Unarmed Mid (S2) | `strike` |  |
| Unarmed Low (S3) | `strike` |  |
| Bounced to Death (FI) | `reaction` |  |
| Revived (ID) | `reaction` |  |
| Walk Fast (WF) | `loop` |  |
| Walk Slow (WS) | `loop` |  |
| Float Fast (FF) | `loop` |  |
| Float Slow (FS) | `loop` |  |
| Walk To (WT) | `loop` |  |
| Walk To Fast (WTF) | `loop` |  |
| Walk To Slow (WTS) | `loop` |  |
| Rotate (RT) | `loop` |  |
| Defend (DF) | `reaction` |  |
| Dodge Defend (DD) | `reaction` |  |
| Mid Jump (MJ) | `leap` |  |
| Jump Up (JU) | `loop` |  |
| Jump Down (JD) | `jump-down` |  |
| High Jump Hold (HH) | `leap` |  |
| High Jump Land (HL) | `leap` |  |
| Charging (CG) | `reaction` |  |
| Sleeping (SL) | `reaction` |  |
| Confused (CF) | `loop` |  |
| Dancing (DN) | `loop` |  |
| Casting (CA) | `reaction` |  |
| Casting Loop (CL) | `loop` |  |
| Cast Execute (CE) | `reaction` |  |
| Frozen Walk 1 (FW) | `reaction` |  |
| Nulled Walk (NW) | `loop` |  |
| Found Item (FD) | `reaction` |  |
| Damaged Shaking (DS) | `reaction` |  |
| Chest Pickup (CP) | `reaction` |  |
| Teleport (TP) | `teleport` |  |
| Swing High (SW1) | `strike` | sword |
| Swing Mid (SW2) | `strike` | sword |
| Swing Low (SW3) | `strike` | sword |
| Item Throw High Start (IT1) | `reaction` | marble |
| Item Throw High Hold (IH1) | `reaction` | marble |
| Item Throw High Release (IR1) | `item-throw` | marble |
| Item Throw Mid Start (IT2) | `reaction` | marble |
| Item Throw Mid Hold (IH2) | `reaction` | marble |
| Item Throw Mid Release (IR2) | `item-throw` | marble |
| Item Throw Low Start (IT3) | `reaction` | marble |
| Item Throw Low Hold (IH3) | `reaction` | marble |
| Item Throw Low Release (IR3) | `item-throw` | marble |
| Weapon Throw (WP) | `weapon-throw` | sword |
| Poke High (PK1) | `strike` | spear |
| Poke Mid (PK2) | `strike` | spear |
| Poke Low (PK3) | `strike` | spear |
| Gun High (GN1) | `gun` | rifle |
| Gun Mid (GN2) | `gun` | rifle |
| Gun Low (GN3) | `gun` | rifle |
| Read Book (RB) | `strike` | tome |
| Play Instrument (PI) | `strike` | harp |
| Shield Block High (SB1) | `reaction` | shield |
| Shield Block Mid (SB2) | `reaction` | shield |
| Shield Block Low (SB3) | `reaction` | shield |
| Swing Recoil High (SV1) | `reaction` | sword |
| Swing Recoil Low (SV3) | `reaction` | sword |
| Punch Recoil High (PV1) | `reaction` |  |
| Punch Recoil Low (PV3) | `reaction` |  |
| Thrust Recoil High (TV1) | `recoil` | spear |
| Thrust Recoil Low (TV3) | `recoil` | spear |
| Flip Ground Switch (FG) | `reaction` |  |
| Casting Start (CS1) | `reaction` |  |
| Casting Start 2 (CS2) | `reaction` |  |
| Pummel (PM1) | `reaction` |  |
| Pummel 2 (PM2) | `reaction` |  |
| Cast Revive (CV) | `reaction` |  |
| Rush (RU) | `reaction` |  |
| Read Book 2 (RB2) | `reaction` | tome |
| Talk Skill (TK) | `reaction` |  |
| Fall Critical (FC) | `reaction` |  |
| Spin Dance (SD) | `reaction` |  |
| Steal (ST) | `reaction` |  |
| Steal Heart (SH) | `reaction` |  |
| Katana Use (KT) | `reaction` | katana |
| Jump 2 (J2) | `reaction` |  |
| Cloth Bag High (CB1) | `strike` | bag |
| Cloth Bag Mid (CB2) | `strike` | bag |
| Cloth Bag Low (CB3) | `strike` | bag |
| Spin Punch (SP) | `strike` |  |
