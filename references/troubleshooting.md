# Troubleshooting

Find the symptom, then fix it at the earliest step it appears. First compare the moment with `poseAt` (`references/data.md` "Test a Port"): if the tiles match and the screen does not, the fault is in drawing, not in the data. https://3d.internet.dev runs every animation for reference.

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blurred edges, colors bleeding in from neighboring tiles | Linear filtering, or mipmaps | Three.js: `prepareSheet`. Canvas: `imageSmoothingEnabled = false`. CSS: `image-rendering: pixelated`. Other engines: point filtering, no mipmaps |
| Outlines look pale, arms merge into the body | Three.js is reading the sheet as linear | `prepareSheet` sets `SRGBColorSpace`. Check the renderer's `outputColorSpace` is left at sRGB |
| Colors are right but dark and flat in a lit scene | A lit material | Sprites are unlit. Keep `MeshBasicMaterial` |
| A wide black or white box around the unit | The PNG has no alpha, or the transparent color was not keyed | `check-sheet.mjs`. The material needs `transparent: true` and `alphaTest` |
| Fringe of the background color around pixels | Partial alpha from a resampled or feathered export | `check-sheet.mjs` reports `partial-alpha`. Export at exact size, with no filter |
| Parts of the unit missing or swapped for other art | The sheet is a rearranged rip, or another shape of unit | Only the TYPE1 layout fits: `references/own-sheet.md` |
| Hands float away from the body | Tiles placed from their top left by the center values, or the other way | `u, v` is a center. Subtract half the size, or use `pose.tiles`, already top left |
| The unit jumps sideways when it turns or changes pattern | Mirrored about a tile or the frame's bounding box | Mirror the center: `u` becomes `-u`. Add half the size afterward |
| The arm is on the wrong side on half the views | The tile is flipped but its position is not, or the reverse | Mirroring does both: position and pixels |
| The walk has no bob | Frames pinned to their box | Keep each tile's `v` as the data gives it |
| Feet slide over the ground | The unit's speed does not suit the cycle | The drawn cycle does not move the unit. Change how fast your game moves it, or pick `Walk Fast` or `Walk Slow`. Touch no frame |
| A lunge, shiver or hover does nothing | Motion dropped | Add `fb` and `du`. `pose.moveX`, `pose.moveY` on a 2D stage |
| A lunge goes backward on some views | `fb` sign on a mirrored view | `moveX = fb * (mirrored ? 1 : -1)`. A 3D renderer sends `fb` along the world facing |
| Back of the unit shows on the wrong steps | The camera step is computed from the wrong axis | `cameraStep(x, z)` takes a vector toward the camera. Three.js: `update` reads it from the camera. Pass nothing in a fixed view |
| The unit tilts or lies on its side | An old kit under a parent, or a Z-up scene | Update the kit. It needs Y up: `references/threejs.md` |
| The unit always faces the same way | `facing` not set, or the step is always 0 | `player.facing`, 0-7, or `facing: 'NW'` at creation |
| Body parts drawn over each other wrongly | Tiles sorted by something other than their order | Keep the list order. In Three.js set `renderOrder` to `tile.order` |
| Overlays flicker in Three.js | Coplanar planes writing depth | Only the body plane writes depth (`depthWrite: false` on the rest) |
| The unit is cut off by the ground, or sinks | The stance point is at the ground | The stance point is `unit.standHeight` above the soles |
| Dead sinks into the floor | Its tiles reach 8px below the soles | `tactics-sprite-three.mjs` moves them toward the camera. A port does the same along the view axis |
| A character is too tall or squashed | Square pixels, or a per-mode scale | One scale for everything: 0.75 across and 0.9 up, or keep that ratio |
| The sprite lags the camera by a frame | `update` after `render` | Call it before `renderer.render`, or from the scene's `onBeforeRender` |
| Units in a crowd step out of phase with each other | Each reads its own clock | Read the time once per frame and pass that value to all |
| An animation stops on one frame | A last delay of 0 holds: `Dead`, `Casting` | It is meant to. Play the next one when the game moves on |
| `then` skips a pose you wanted held | A held frame is done at once | Pass a `duration`, or drop `then` and play the next one yourself |
| An animation never ends, and `then` never fires | A loop is never done: `{ loop: true }`, or `Taking Damage` | Attacks do not loop by default. Give a loop a `duration` |
| A hit lands early or late | A timer of your own | Read `PostGenericAttack` from `player.events`. See "Time an Event" in `references/animations.md` |
| A prop sits off the hand | A grip from another sheet, or the wrong `arm` | Grips belong to the art: `references/own-sheet.md` "Hands on Another Sheet" |
| A prop covers the fist, or shows through the body | The prop is drawn over or under the whole unit | `unit.carry`, or `unit.itemLayer` and `flattenOntoSprite`: `references/animations.md` "Props in a Hand" |
| A blade stays under a fist while it points straight at the camera | A mesh placed by hand keeps its `itemLayer` at every view | `unit.carry` turns it over by itself. By hand, set `itemLayer` from its direction: `references/animations.md` "Props in a Hand" |
| A shield's back looks like its front | One metal on both sides | `applyItemFaces` in `three-isometric-engine/weapons/item-finish.js`: `references/rebuild-animations.md` "Held Items" |
| A prop lags the hand by a frame | The mesh is placed before `update` | Read `unit.hand` after `update`, or let `carry` move it |
| `Nothing is held` | `carry` was given an animation with no row in `data.holds` | Keys are in `data.holds`. For your own prop use `unit.hand` |
| Colors shift when the scene turns on tone mapping | Tone mapping in a pass, or planes of your own | The kit's materials skip the renderer's. `OutputPass` covers every pixel: `references/threejs.md` "What a Scene Can Change" |
| One unit's arm is painted over by a unit behind it | Tiles of two units sorted together | Keep `update` running on both: it sorts whole units. Do not set `group.renderOrder` |
| `update` clears the events | A second `update` at the same time, for a second camera | Read `player.events` after the first call |
| `Unknown animation` | A name with a facing, or a guess | `Swing High`, not `Swing High Fwd`. `data.animations` has the names |
| `fetch` fails, or a module will not load | The page is on `file://` | Serve the folder |
| JSON import fails in a bundler or in Node | The project needs JSON modules enabled | Fetch it, or import with `with { type: 'json' }` |
| `createAtlas: expected tactics-sprite-data.json` | Passed the wrong object, or a response not yet parsed | `await response.json()` first |
| Slow with many units | One texture per unit, or a sheet uploaded many times | Share one prepared sheet. `tactics-sprite-three.mjs` writes UVs only when a tile changes |

When a value in the data itself looks wrong, it almost never is: `documentation/SPECIAL-SPRITE-REVERSAL-CASES.md` is the worked example. If it is, it is a bug in the repository, not something to patch in a copy.
