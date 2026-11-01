# AGENTS.md

Tactical RPG sprites in Next.js and Three.js: every character frame and sequence as data, drawn in CSS and as billboards on one page, and a kit and web service that bring them to any project. This repository is a skill: `SKILL.md` is the entry point, for people adding sprites to their own projects as much as for work here.

## Where Things Live

| Path | Holds |
|------|-------|
| `SKILL.md`, `references/` | The root skill and what it loads: Three.js in any scene, other renderers, rebuilding any card, data, animations, your own sheet, the web service, troubleshooting |
| `assets/` | The portable runtime the kit carries: `tactics-sprite.mjs`, `tactics-sprite-three.mjs`, `check-sheet.mjs`. No imports from the engine |
| `pages/index.tsx` | The main route: numbered 2D sections and the ThreeJS demos. `pages/AGENTS.md` |
| `pages/api/[...route].ts` | The HTTP adapter for every web service route |
| `three-isometric-engine/constants/sprites/` | Cells, assemblies, `SHP_FRAMES`, `SEQ_LIBRARY`. `constants/sprites/AGENTS.md` |
| `three-isometric-engine/meshes/character-groups/` | One Three.js group per mode. `meshes/character-groups/AGENTS.md` |
| `three-isometric-engine/meshes/` | `createCharacter.js`, the `character-utils.js` every group shares and the spawn fade |
| `three-isometric-engine/common/registry.js` | The character mode registry `createCharacter.js` reads |
| `three-isometric-engine/actions/action-timelines.js` | Scripted timelines and prop math, shared by every consumer |
| `three-isometric-engine/physics/` | The physics body a sprite gives a unit. `physics/AGENTS.md` |
| `three-isometric-engine/debug/` | The demo catalog (no three.js), the demo stage, its two marbles, its water, its physics body view and its damage counters |
| `three-isometric-engine/weapons/` | Weapons generated from a spec, the models Set lends the sequence cards, the mythril they all wear and the baked faces of a shield and a book. `weapons/AGENTS.md` |
| `three-isometric-engine/web/` | Every web service route, the kit and the agent documents. `web/AGENTS.md` |
| `three-isometric-engine/components/` | Page components, the layout and the numbered sidebar |
| `public/static/` | `textures/` has the `a1.png` sheet and the black marble, `models/set-items.glb` Set's items, `social.jpg` the page's share image and the `favicon` files the green marble icon |
| `public/fonts/` | Geist Serif and Nix8810, with their licenses |
| `scripts/export-sprite-kit.mjs` | Writes the kit into a project, with plain Node |
| `scripts/bake-set-items/` | Bakes `set-items.glb` from a checkout of `www-set`, by hand. Nothing runs it on its own |
| `documentation/` | Reverse-engineered SEQ and SHP data, where each fact came from, the canvas → screen map, differences from the original tactical RPG |
| `tests/helpers/fft-type1.js` | The TYPE1 decoder |
| `tests/fixtures/type1.json` | Its output for the original `TYPE1.SHP` and `TYPE1.SEQ`, frozen, which the parity tests read |
| `next.config.js` | The public names of the web service routes |
| `skills/` | Task procedures, listed below |

Documents write engine paths from `three-isometric-engine/`: `constants/sprites/` means `three-isometric-engine/constants/sprites/`.

The engine is cut to what this page and its routes reach. There is no physics engine, scene loader or action system: the demo stage replays the timelines without them, and the only thing it measures against a body is the water. If a game built on this needs rules and stats to get started, use https://set.world for inventory, stat calculations and character flavor. Its repository, `www-set`, is also where the held item models come from.

## Contracts

- Exact SHP and SEQ parity. Never tune a value by eye, and never weaken a parity test to pass.
- One pivot and one scale: the stance point, `STANDARD_CONTAINER_H` = 40px, 0.75 × 0.9 world units per pixel.
- 8 camera steps map to 4 patterns through `ASSEMBLY_STEP_MAP`: A/B front, C/D back, A/D mirrored about the unit origin.
- One visual driver per character (`setVisualDriver`), run by `syncCharacterVisuals` before WebGLRenderer builds its draw list.
- The kit draws what the engine draws. `assets/` is a second implementation for other projects, and `tests/sprite-kit.test.js` compares it with the engine on every sequence, view and frame and every held card, with no binaries. Change how a sequence draws or a card holds an item in both.
- The skill is tested as code. `tests/skill-documents.test.js` runs the recipes in `references/rebuild-animations.md`, holds its numbers and card table to the source, and checks every path, constant, import and animation a document names.
- `constants/sprites/`, `constants/character.js`, `weapons/held-items.js` and `three-isometric-engine/web/` run under plain Node: `"type": "module"`, relative imports with extensions, no `@engine` and no `three`.
- One `a1.png` sheet (`SPRITE_SHEET_FILE`), one `marble-black.gif` for the thrown orbs, one `set-items.glb` for the held items, one `social.jpg` to share the page and one set of `favicon` files. Do not add other assets without being asked. The kit's data and layout template are built from `constants/sprites/` when asked for, never stored. The ledge marble and the faces of a shield and a book are baked on the GPU in code, and the water and the damage digits are code too. The sheet holds pixels only inside `SPRITE_CELLS`, and `tests/character.test.js` fails on anything outside them.
- No per-frame allocation in render paths, and one timestamp per frame (`camera.userData.now`).
- A mesh in a hand is drawn among the frame's tiles, not in front of or behind the whole sprite, and each card remembers which tiles draw over it (`weapons/AGENTS.md` "What Covers What"). Only looking at the card on all four patterns settles that. A mesh pointing along the view is the one exception at every orbit position: it stands in front of the sprite or behind it, by its own direction, and no card says so.
- The skill stands alone. An install from the site is `skillArchiveFiles`: every document, the kit and the engine. `TYPE1.SHP` and `TYPE1.SEQ` are partial foundations and the rest was built here, so no document sends a reader to a wiki, a forum or another website for anything: `documentation/AGENTS.md` "Building on the Binaries" is the account. The home page, https://3d.internet.dev, is the reference to compare with. The exceptions are the licenses' credits and the one recommendation of https://set.world for a game's rules and stats, which nothing in the skill needs. `tests/skill-documents.test.js` "the skill stands alone" fails on a link or a path outside that.
- Every fact has a named source (`documentation/AGENTS.md` "Sources"). What came from a file is in `tests/fixtures/type1.json`, as decoded, and what was inferred says so. This repository is the reference for opcode and animation names, so a document points at `documentation/seq_animation_to_frame/AGENTS.md`, never outward, and only "Sources" says where the names started.
- A physics body comes from the sprite's own pixels and never reads the camera, and it is the only thing that moves the ripples (`physics/AGENTS.md`).
- The code, the skills, the documentation, `a1.png` and the decoded tables are MIT, so people can use any part of them, and nothing here adds a condition on how. `README.md` "Copyright" is the notice: keep it with them, so every route that returns a table carries it and the kit carries `NOTICE.md`, with the text of `LICENSE.md`. `tests/fixtures/type1.json` is outside that license. It is the one place the whole of the decoded game data lives, that data remains Square Enix's, and the site and the kit carry none of it. No game binary is kept here. FFTPatcher's C# is under the GPL, so copy no code from it into anything this repository ships. `set-items.glb` is CC BY 4.0: keep its credit in `README.md` "Licenses". Set's builders are not, so its models come here as a baked file and never as code.

## Conventions

- Say "tactical RPG" for what these sprites are, and "the game" for the program `TYPE1.SHP` and `TYPE1.SEQ` were written for, because the sprites can be used anywhere. The game's title appears only where it is needed: the rights notices in `README.md` "Copyright", `SKILL.md` "Copyright" and `llms.txt`, and the home page intro. Credit FFTPatcher's Shishi Sprite Editor and its open-source community as what this work builds on.
- TypeScript for pages and sprite components, JavaScript and JSX for the engine. `allowJs` without `checkJs`, so engine files are not type-checked.
- Vanilla CSS with module scoping. Colors and type sizes come from the tokens in `global.css`.
- Geist Serif for reading text, at one size (16px) and only in the page intro. Nix8810 for labels, numbers and data, always uppercase: it covers CP437 only, so check a new glyph is in the font (`×`, `—`, `…` and `▶` are not).
- Comments are `//NOTE(@jimmylee)` on their own line with the explanation on the following `//` lines. Older ones read `//NOTE(jimmylee)`.

## Verify

```sh
npm test
./node_modules/.bin/tsc --noEmit -p tsconfig.json
npm run build
```

No lint or format script exists. Prettier settings are in `.prettierrc`. The parity suites read `tests/fixtures/type1.json` on every run, and `TYPE1_DIR=<folder> npm test` decodes your own `TYPE1.SHP` and `TYPE1.SEQ` instead (`documentation/AGENTS.md` "Parity Tests"). To see the web service over HTTP, `npm run build` then `npm run start`: `next dev` caches its documents per process, as `web/AGENTS.md` says.

## Skills

`SKILL.md` is for anyone adding these sprites to a project, and `references/` holds what it loads on demand, one level deep. Keep its body under 500 lines and link rather than repeat. Procedures for work on this repository live at `skills/<name>/SKILL.md`, with `name` and `description` frontmatter. Load one when its task comes up, and add a new one the same way when a procedure recurs. `npx skills add` takes `skillArchiveFiles` from the site and the whole repository from GitHub, so what `SKILL.md` names must be in both. A new reference needs a line in `REFERENCE_NOTES` in `web/agent-documents.js`.

| Skill | Load when |
|-------|-----------|
| `reverse-engineer-type1-binaries` | Decoding SHP or SEQ data, an unknown opcode, or a new or edited sheet |
| `add-sprite-assembly-from-source` | Working with sprite data, assemblies or the 2D sections |
| `add-sprite-assembly-into-threejs-engine` | Creating or fixing a Three.js mode |
| `fast-typescript-check` | Profiling render loops or type-check time |

The live page is https://3d.internet.dev. The repository has no deploy script.

Inside this repository, a sprite reaches the screen in this order, so fix a problem at the earliest step it appears:

1. Decode the binaries: `skills/reverse-engineer-type1-binaries`, then `documentation/AGENTS.md` for the file layouts and the differences from the original tactical RPG.
2. Write the data and check it in 2D: `skills/add-sprite-assembly-from-source`.
3. Draw it in Three.js: `skills/add-sprite-assembly-into-threejs-engine`.
4. Add a weapon, a Set item or a prop in a hand: `three-isometric-engine/weapons/AGENTS.md`.
5. Give it a body in the water: `three-isometric-engine/physics/AGENTS.md`.
