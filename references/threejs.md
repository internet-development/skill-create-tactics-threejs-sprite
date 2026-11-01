# Three.js

From an empty folder to a unit that walks, attacks and holds a weapon, then the same unit in any scene you already have. The paths assume the kit is in `src/tactics-sprite`. `SKILL.md` step 2 has the other ways to get it.

## From an Empty Folder

```sh
mkdir tactics && cd tactics
npm init -y
npm pkg set type=module
npm install three vite
mkdir -p src/tactics-sprite public
```

Put the kit in `src/tactics-sprite` the first way `SKILL.md` step 2 allows. With this skill installed that is a copy of `assets/`, which is the kit these documents describe, and with only a URL it is the download. Then serve the sheet:

```sh
cp src/tactics-sprite/a1.png public/a1.png
```

`index.html`:

```html
<!doctype html>
<body style="margin: 0">
  <canvas id="stage" style="width: 100vw; height: 100vh; display: block"></canvas>
  <script type="module" src="/src/main.js"></script>
</body>
```

`src/main.js`, which is a whole game loop: a floor, a tactical RPG camera, a unit that walks, and one that attacks when you press a key.

```js
import * as THREE from 'three';
import { createAtlas } from './tactics-sprite/tactics-sprite.mjs';
import { createTacticsSprite, prepareSheet } from './tactics-sprite/tactics-sprite-three.mjs';
import data from './tactics-sprite/tactics-sprite-data.json';

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f4f4);
scene.add(new THREE.GridHelper(320, 10, 0xa8a8a8, 0xc6c6c6));

//NOTE: a tactical RPG camera. Orthographic, about 23 degrees above the ground, 8 steps of 45 degrees around it.
const camera = new THREE.OrthographicCamera(-40, 40, 40, -40, 1, 2000);
function aimCamera(step, focus) {
  const elevation = Math.atan2(0.3, Math.SQRT1_2);
  const azimuth = Math.atan2(0.5, -0.5) + (step * Math.PI) / 4;
  const flat = Math.cos(elevation) * 400;
  camera.position.set(focus.x + Math.sin(azimuth) * flat, focus.y + Math.sin(elevation) * 400, focus.z + Math.cos(azimuth) * flat);
  camera.lookAt(focus);
}
let step = 0;
aimCamera(step, new THREE.Vector3(0, 18, 0));

function resize() {
  const { clientWidth: width, clientHeight: height } = canvas;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height, false);
  const aspect = width / height;
  camera.left = camera.bottom * aspect;
  camera.right = camera.top * aspect;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const atlas = createAtlas(data);
const sheet = prepareSheet(await new THREE.TextureLoader().loadAsync('/a1.png'));

const hero = createTacticsSprite(atlas, sheet, { facing: 'SE', animation: 'Walk' });
hero.group.position.set(0, hero.standHeight, 0);
scene.add(hero.group);

const foe = createTacticsSprite(atlas, sheet, { facing: 'NW', animation: 'Idle' });
foe.group.position.set(24, foe.standHeight, 0);
scene.add(foe.group);

window.addEventListener('keydown', (event) => {
  const now = performance.now() / 1000;
  if (event.key === ' ') hero.play('Swing High', now, { then: 'Walk' });
  if (event.key === 'q') aimCamera((step += 7) % 8, new THREE.Vector3(0, 18, 0));
  if (event.key === 'e') aimCamera((step += 1) % 8, new THREE.Vector3(0, 18, 0));
});

renderer.setAnimationLoop((ms) => {
  const now = ms / 1000;
  hero.update(now, camera);
  foe.update(now, camera);
  if (hero.player.events.includes('PostGenericAttack')) foe.play('Taking Damage', now, { then: 'Idle', duration: 0.5 });
  renderer.render(scene, camera);
});
```

Run `npx vite` and open the address it prints. Space attacks, and Q and E turn the camera. `SKILL.md` step 5 is the checklist for what you should see.

### With No Bundler

A page needs no build. `npm install three` puts Three.js beside the page, an import map names it, the page loads the JSON with `fetch`, and any static server hosts the folder, because a `file://` page cannot import modules.

```html
<script type="importmap">
  { "imports": { "three": "./node_modules/three/build/three.module.js", "three/addons/": "./node_modules/three/examples/jsm/" } }
</script>
<script type="module">
  import * as THREE from 'three';
  import { createAtlas } from './src/tactics-sprite/tactics-sprite.mjs';
  import { createTacticsSprite, prepareSheet } from './src/tactics-sprite/tactics-sprite-three.mjs';

  const atlas = createAtlas(await (await fetch('./src/tactics-sprite/tactics-sprite-data.json')).json());
  const sheet = prepareSheet(await new THREE.TextureLoader().loadAsync('./src/tactics-sprite/a1.png'));
</script>
```

## Into a Scene You Already Have

A unit needs five things from a scene, and everything else is yours.

1. Load the data once, and load the sheet once through `prepareSheet`. Every unit shares both.
2. `createTacticsSprite(atlas, sheet, options)` for each unit, and add `unit.group` anywhere in the scene.
3. Stand it by its stance point: `unit.group.position.y = groundHeight + unit.standHeight`.
4. Each frame, before `renderer.render`, call `unit.update(seconds, camera)` with one clock value for every unit.
5. Call `unit.dispose()` when it leaves. `sheet.dispose()` is yours when the last unit has gone.

Move a unit by its position and by nothing else. `update` writes its rotation.

### What a Scene Can Change

| Your scene has | What happens | What to do |
|----------------|--------------|------------|
| An orthographic camera | What the sprites were drawn for | Nothing |
| A perspective camera | Works. Planes stay parallel to the screen, so a unit near the edge of a wide view stands at a slightly different angle from the walls around it | Keep the field of view narrow, 30 degrees or less, for the tactical RPG look |
| A free or orbit camera | The step comes from the camera's rotation, so all units change together, wherever they stand | Nothing. Elevation can be anything short of straight down, where the back and front patterns lose meaning |
| A camera on a rig or inside a group | Works: `update` reads the world rotation | Nothing |
| A unit inside a group | Works, and the unit stays turned to the camera when the group moves or turns | Facing and SEQ motion stay world directions, so a turned group does not turn them: a unit on a turning ship keeps its feet, and a target at the group's +x is not in front of it. Set `player.facing` yourself. A scaled group scales the sprite |
| Several units | They sort by view depth as whole units: `update` writes `group.renderOrder` | Leave `group.renderOrder` alone |
| Transparent objects | A unit draws after the scene's other transparent objects, so a shadow or water on the ground stays under it | To draw something transparent over a unit, put it in a `THREE.Group` and give that group a `renderOrder` above 1e6 |
| Opaque meshes | The body plane writes depth, so walls hide a unit. Arm and head planes test depth and do not write it | Nothing |
| Lights | Sprites are unlit | Nothing. Use `MeshBasicMaterial` if you build your own planes |
| Tone mapping | Sprites keep their palette: their materials set `toneMapped: false` | Nothing, unless you tone map in a pass: `OutputPass` covers every pixel of the frame, sprites included |
| Fog | Fades sprites like everything else | To exempt them, set `fog = false` on `unit.group`'s materials, once per sheet |
| Shadow maps | A plane that turns with the camera casts a shadow that turns too, so planes cast none | A contact shadow: `references/rebuild-animations.md` "Contact Shadow" |
| Post-processing | Works. A blur or an upscale filter softens the pixels, as it does anything | Render sprites crisp first, and keep any resample nearest |
| Several viewports or cameras | Works: call `update` for each camera before its render, with the same seconds | Read `unit.player.events` after the first call. The next call, at the same time, crosses nothing and clears them |
| Render targets | Works | Tag the target's texture sRGB if you read it back |
| `antialias: true` | Edges are alpha tested, so they stay hard. Nothing is lost | Nothing |
| A world in metres, or any other size | Pass `scaleX` and `scaleY`, keeping their ratio of 5:6: `{ scaleX: 0.75 / 32, scaleY: 0.9 / 32 }` makes a cube of 1 | Held items, lifts and depth gaps follow `scaleX` |
| Z up | The step and facing are read in the x, z plane, so the kit needs Y up | Keep sprites in a Y-up scene, or rewrite `cameraStep` and `FACING_X/Z` for your axes |
| `WebGPURenderer` | Tiles drew through its WebGL2 fallback in this repository. A real WebGPU adapter is not verified, and `flattenOntoSprite` needs `onBeforeRender` and `modelViewMatrix`, which that renderer does not use | Use `WebGLRenderer` for held items |

### A Perspective Camera

Stand the camera far enough back for a narrow field of view to see what an orthographic view of the same height would. A rig needs nothing more than a parent: `lookAt` allows for it.

```js
const fov = 25;
const halfHeight = 40;
const distance = halfHeight / Math.tan(((fov / 2) * Math.PI) / 180);
const perspective = new THREE.PerspectiveCamera(fov, canvas.clientWidth / canvas.clientHeight, 1, distance * 4);
const elevation = Math.atan2(0.3, Math.SQRT1_2);
const azimuth = Math.atan2(0.5, -0.5);
const rig = new THREE.Group();
rig.position.set(0, 18, 0);
rig.add(perspective);
scene.add(rig);
perspective.position.set(Math.sin(azimuth) * Math.cos(elevation) * distance, Math.sin(elevation) * distance, Math.cos(azimuth) * Math.cos(elevation) * distance);
perspective.lookAt(rig.position);
```

A nearer unit draws larger, so sprite pixels stop being whole numbers of screen pixels, and "Crisp Pixels" below holds only for an orthographic camera.

### Crisp Pixels

Pixels stay crisp because of `prepareSheet`. They stay even only when one sprite pixel covers whole screen pixels. A sprite pixel is 0.75 by 0.9 world units, so with an orthographic camera `k = canvasHeight / (top - bottom)` screen pixels per world unit, it lands on `0.75 k` by `0.9 k` screen pixels. `k = 6.67` gives 5 by 6, the smallest whole size that keeps the sprite's real proportions, and multiples of it scale up from there.

### Moving Across a Grid

One tile of ground is a cube of 32 at the default scale, where a unit stands 36 tall. The drawn walk does not move the unit: slide it yourself and let the cycle play, then turn the unit to the way it moves.

```js
import { FACING } from './tactics-sprite/tactics-sprite.mjs';

//NOTE: the four facings are the world axes: SE +x, NW -x, SW +z, NE -z.
function faceToward(unit, dx, dz) {
  unit.player.facing = Math.abs(dx) >= Math.abs(dz) ? (dx >= 0 ? FACING.SE : FACING.NW) : dz >= 0 ? FACING.SW : FACING.NE;
}

function walk(unit, from, to, startedAt, seconds, now) {
  const s = Math.min(1, (now - startedAt) / seconds);
  unit.group.position.x = from.x + (to.x - from.x) * s;
  unit.group.position.z = from.z + (to.z - from.z) * s;
  faceToward(unit, to.x - from.x, to.z - from.z);
  return s === 1;
}
```

Pick the speed that suits the cycle: one tile over one 64-tick `Walk`, about a second, reads well, with `Walk Fast` and `Walk Slow` for a haste or slow status. How fast a unit crosses a tile belongs to the game.

## React

`useEffect` runs only in the browser, so the same code works under server rendering. In Next.js, keep the canvas in a client component and put `a1.png` in `public/`.

```jsx
function Stage() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    (async () => {
      const THREE = await import('three');
      const { createAtlas } = await import('./tactics-sprite/tactics-sprite.mjs');
      const { createTacticsSprite, prepareSheet } = await import('./tactics-sprite/tactics-sprite-three.mjs');
      const data = (await import('./tactics-sprite/tactics-sprite-data.json')).default;
      const sheet = prepareSheet(await new THREE.TextureLoader().loadAsync('/a1.png'));
      if (cancelled) return;
      const renderer = new THREE.WebGLRenderer({ canvas: ref.current, alpha: true });
      //NOTE: build the scene, the camera and the unit here, as in the page above.
      stop = () => {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        sheet.dispose();
      };
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />;
}
```

### React Three Fiber

The unit lives in a ref and draws through a `primitive`. A priority below 0 keeps the render loop R3F's, and runs before it draws.

```jsx
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createAtlas } from './tactics-sprite/tactics-sprite.mjs';
import { createTacticsSprite, prepareSheet } from './tactics-sprite/tactics-sprite-three.mjs';
import data from './tactics-sprite/tactics-sprite-data.json';

const atlas = createAtlas(data);

function Unit({ name = 'Walk', facing = 'SE', position = [0, 0, 0] }) {
  const texture = useLoader(THREE.TextureLoader, '/a1.png');
  const camera = useThree((state) => state.camera);
  const sheet = React.useMemo(() => prepareSheet(texture), [texture]);
  const unit = React.useMemo(() => createTacticsSprite(atlas, sheet, { facing, animation: name }), [sheet, facing]);
  React.useEffect(() => void unit.play(name, performance.now() / 1000), [unit, name]);
  React.useEffect(() => () => unit.dispose(), [unit]);
  useFrame(() => unit.update(performance.now() / 1000, camera), -1);
  return <primitive object={unit.group} position={[position[0], position[1] + unit.standHeight, position[2]]} />;
}

export const App = () => (
  <Canvas orthographic flat camera={{ position: [260, 170, -260], zoom: 5, near: 1, far: 2000 }}>
    <React.Suspense fallback={null}>
      <Unit />
    </React.Suspense>
  </Canvas>
);
```

`flat` turns off R3F's default tone mapping for the whole canvas. The sprites do not need it, and the scene around them may.

## The Unit

`createTacticsSprite(atlas, sheet, options)` returns the unit. Options are `facing` (`'SE'` by default, or `NE`, `SW`, `NW`, or a number 0-7), `animation` (`'Idle'`), `seconds`, the clock it starts on, and `scaleX` and `scaleY`.

| Field or method | Is |
|-----------------|----|
| `group` | The `THREE.Group` at the stance point. Position it, show or hide it, never rotate it |
| `standHeight` | How far the stance point sits above the soles: 18 at the default scale |
| `play(name, seconds, options)` | Starts an animation. Options: `loop`, `water`, `then`, `duration`. `references/animations.md` |
| `update(seconds, camera)` | Turns the group, picks the pose, places the tiles and returns the pose |
| `player` | The clock under it: `animation`, `facing`, `events` (what the last update crossed), `pose` |
| `pointAt(u, v, depth, out)` | Where sprite pixel `(u, v)` from the stance point is in the world this frame, with the SEQ motion, `depth` toward the camera |
| `hand(arm, depth, out)` | The hand `'first'` or `'last'` in the world, or null when that tile has no grip |
| `carry(mesh, name)` | Puts a mesh in the hand while `name` plays: `references/animations.md` "Props in Three.js" |
| `release()` | Lets go. The mesh stays where it is, for a throw |
| `itemLayer` | For a mesh you place yourself: how many tiles from the top draw over it, as a number or `{ front, back }` |
| `dispose()` | Frees the planes and leaves the scene |

The module also exports `prepareSheet`, `flattenOntoSprite`, `SCALE_X`, `SCALE_Y`, `ITEM_LAYER_GAP`, `ITEM_FLATTEN`, `ITEM_END_ON` and `AROUND_BODY`. `tactics-sprite.mjs` holds what needs no renderer: `references/data.md` "The Runtime".

## Verified Here

Run in headless Chromium against this repository, with Three.js r187: this page's Vite project, the import map page, a perspective camera, a camera on a rotated rig, a unit under a rotated group, `ACESFilmicToneMapping`, 176 overlapping pairs of units, R3F 9 with React 19, and the mount in `references/rebuild-animations.md`. Each compared its pixels with a plain unit at the scene root, or with the units drawn one at a time. `WebGPURenderer` ran on its WebGL2 fallback only, because the test machine had no adapter.
