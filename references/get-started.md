# Get Started

What every renderer shares, then Canvas, CSS and other engines. `SKILL.md` covers the decisions and getting the kit. These paths assume the kit is in `src/tactics-sprite`, and that a browser project serves `a1.png` and `tactics-sprite-data.json` as static files. Bundlers that import JSON can import the data instead of fetching it.

## The Clock

Everything runs on one clock in seconds, passed in. The runtime never reads the time itself, so a paused game, a slowed replay or a fixed-step simulation need nothing special. Read the clock once per frame and pass that one value to every unit, or units drift apart by a frame.

## Facing and the Camera

A unit faces `NE`, `SE`, `SW` or `NW`, the four directions of a tactical RPG grid. The camera has 8 steps around the scene. `(facing + step) % 8` is the view, 0-7, which is the only thing that picks what is drawn:

| View | Pattern | Draws | Mirrored |
|------|---------|-------|----------|
| 0, 7 | A | Front sequence | Yes |
| 1, 2 | B | Front sequence | No |
| 3, 4 | C | Back sequence | No |
| 5, 6 | D | Back sequence | Yes |

A fixed camera has one step, 0, and `SE` at step 0 is view 1, the plain front view. `SW`, `NW` and `NE` give the other three. A game with a fixed view passes no step at all.

The facings are also world directions, which is how a lunge knows where to go: `SE` is +x, `NW` is -x, `SW` is +z and `NE` is -z. `FACING_X` and `FACING_Z` hold them by index.

## Three.js

`references/threejs.md` goes from an empty folder to a unit in any scene: Vite, no bundler, an existing game, React and React Three Fiber, with what each camera, light, fog and renderer setting does to a sprite.

## Canvas

`drawPose` draws one pose. Its coordinates are the stance point, and the soles are 20 sprite pixels below it. Use a whole number for `scale`, or the pixels stop being square.

```html
<canvas id="stage" width="360" height="240"></canvas>
<script type="module">
  import { createAtlas, createPlayer, drawPose } from './tactics-sprite/tactics-sprite.mjs';

  const data = await (await fetch('./tactics-sprite/tactics-sprite-data.json')).json();
  const atlas = createAtlas(data);
  const image = new Image();
  image.src = './tactics-sprite/a1.png';
  await image.decode();

  const context = document.querySelector('#stage').getContext('2d');
  const unit = createPlayer(atlas, { facing: 'SE' }).play('Walk', performance.now() / 1000);

  function frame(now) {
    context.clearRect(0, 0, 360, 240);
    drawPose(context, image, unit.update(now / 1000), 180, 120, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
</script>
```

A page loaded from `file://` cannot fetch the JSON or import a module. Serve the folder.

Sort several units back to front by their position on the ground before drawing them. Walk a grid in the order the camera sees it, or sort by `x + y` for an isometric map.

## CSS and React

Each tile is a positioned element. This is how the main route of the site draws: use it to show a unit in a page without a canvas.

```jsx
function Unit({ pose, scale = 2 }) {
  const tiles = [];
  for (let i = 0; i < pose.count; i++) {
    const t = pose.tiles[i];
    tiles.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: (t.x + pose.moveX) * scale,
          top: (t.y + pose.moveY) * scale,
          width: t.w * scale,
          height: t.h * scale,
          backgroundImage: 'url(/a1.png)',
          backgroundSize: `${256 * scale}px ${488 * scale}px`,
          backgroundPosition: `${-t.sx * scale}px ${-t.sy * scale}px`,
          imageRendering: 'pixelated',
          transform: t.flipX ? 'scaleX(-1)' : undefined,
        }}
      />
    );
  }
  return <div style={{ position: 'relative', width: 0, height: 0 }}>{tiles}</div>;
}
```

The element at `position: relative` is the stance point. Later elements paint on top, which is the depth. Copy the pose's fields when handing it to React state, because `update` reuses one object.

## Other Engines

The algorithm is short, and `references/data.md` has it in full. Keep `tactics-sprite-data.json`, port `poseAt`, and draw each tile as the engine's own sprite. Test the port against `poseAt`: `references/data.md` "Test a Port". These mappings are from each engine's documented API and have not been run in this repository:

| Engine | A tile is | Crop | Flip | Depth | Point filtering |
|--------|-----------|------|------|-------|-----------------|
| Phaser 3 | `add.image` of a named frame | `textures.get(key).add(id, 0, x, y, w, h)` | `setFlipX` | `setDepth` | `setFilter(NEAREST)` on the texture |
| PixiJS 8 | `Sprite` | `new Texture({ source, frame: new Rectangle(x, y, w, h) })` | `scale.x = -1` | Child order | `source.scaleMode = 'nearest'` |
| Godot 4 | `Sprite2D` with `region_enabled` | `region_rect` | `flip_h` | `z_index` or child order | Texture filter Nearest |
| Unity | `SpriteRenderer` | `Sprite.Create(tex, rect, pivot, ppu)`, with `y` counted from the bottom | `flipX` | `sortingOrder` | Filter Mode Point |

Keep one node per unit as the stance point and move only that. A 3D engine turns that node to the camera as Three.js does here. A tile's position is its top left, so an engine that pivots on a center adds half the tile's size, and one with y up negates `y`.
