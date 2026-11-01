# The Web Service

https://3d.internet.dev serves the skill, its data and its tools. Everything is public, read-only, needs no key and allows any origin. The one POST reads a sheet and stores nothing. Tables carry the copyright `notice`: keep it with anything you save.

An installed skill needs none of this. `tactics-sprite-data.json` holds every table, `poseAt` answers what `/api/v1/draw` answers, and `check-sheet.mjs` runs what `/api/v1/sheets/check` runs. These routes are for a project with no copy.

## For an Agent

| Route | Holds |
|-------|-------|
| `/llms.txt` | The index, in the llms.txt format |
| `/llms-full.txt` | `SKILL.md` and every reference in one file |
| `/SKILL.md` | The skill. Every `.md` in the repository is at its own path, such as `/references/data.md`. Engine `.js` source is not served as files: it comes in the archive below |
| `/index.md` | The home page as markdown. `/` also answers this way to `Accept: text/markdown` |
| `/.well-known/agent-skills/index.json` | Agent Skills discovery, draft 0.2.0: one archive with its sha256 digest |
| `/.well-known/agent-skills/create-tactics-threejs-sprite.tar.gz` | The whole skill: every document, the kit under `assets/` and the engine |
| `/openapi.json` | The data routes as OpenAPI 3.1 |
| `/assets/tactics-sprite.mjs`, `/assets/tactics-sprite-three.mjs`, `/assets/check-sheet.mjs` | The runtime, as modules a browser can import |
| `/static/textures/a1.png`, `/static/textures/marble-black.gif`, `/static/models/set-items.glb` | The sheet, the thrown orbs' texture and Set's held items, which is CC BY 4.0: `README.md` "Licenses" |
| `/robots.txt`, `/sitemap.xml` | For crawlers |

Install the skill with `npx skills add https://3d.internet.dev`, or from the repository with `npx skills add internet-development/skill-create-tactics-threejs-sprite`. The first installs the archive above, kit included. The second copies the repository, and step 2 of `SKILL.md` builds the kit from it.

## Data

All under `/api/v1`, all JSON unless marked.

| Route | Returns |
|-------|---------|
| `GET /api/v1` | Version, counts, the notice and a link to everything |
| `GET /api/v1/data` | All of `tactics-sprite-data.json` |
| `GET /api/v1/cells`, `/cells/{id}` | Every cell, or one |
| `GET /api/v1/frames`, `/frames/{index}` | Every SHP frame, or one, 0-363 |
| `GET /api/v1/sequences?q=`, `/sequences/{seq}` | Every sequence filtered by name, or one, 0-217 |
| `GET /api/v1/animations?q=&category=`, `/animations/{name}` | Every animation, or one with its two sequences |
| `GET /api/v1/draw` | The tiles of one moment |
| `GET /api/v1/kit.tar.gz` | The kit (gzip) |
| `GET /api/v1/sheet-template.svg?scale=` | The layout as labeled boxes (SVG), scale 1-8 |
| `POST /api/v1/sheets/check` | A report on a PNG body, up to 1 MiB |

A failure is `{ "error": { "code", "message" } }` with a 4xx status. A sheet that fails the check is a report with `ok: false` and status 200: the check itself worked.

## Test a Port

`/api/v1/draw` is `poseAt` (`references/data.md` "Test a Port") over HTTP, for a port with no kit beside it. Give it a moment and it returns what to draw:

```sh
curl 'https://3d.internet.dev/api/v1/draw?animation=Swing%20High&view=1&tick=18'
```

```json
{
  "animation": "Swing High", "view": 1, "tick": 18,
  "shp": 88, "frame": 5, "done": false, "back": false, "mirrored": false,
  "fb": 2, "du": 0, "moveX": -2, "moveY": 0,
  "tiles": [
    { "id": "LG2", "sx": 24, "sy": 288, "w": 24, "h": 24, "x": -19, "y": -11, "flipX": false, "order": -1, "body": false },
    { "id": "AF2", "sx": 32, "sy": 256, "w": 32, "h": 32, "x": -16, "y": -12, "flipX": false, "order": 0, "body": true }
  ]
}
```

`tiles` is shortened here. `view` is 0-7, `tick` a number of ticks since it started, and `loop` and `water` are `true` or `false`, defaulting to the animation's own. `animation=Idle` gives the idle frame of that view. Compare `shp` first, then each tile in order: a difference in `x` is a mirror or a center, in order a depth, and in `shp` a clock.

## Use It Without Saving Anything

A prototype can import the runtime straight from the site, in a page served over HTTP:

```js
import { createAtlas, createPlayer, drawPose } from 'https://3d.internet.dev/assets/tactics-sprite.mjs';

const atlas = createAtlas(await (await fetch('https://3d.internet.dev/api/v1/data')).json());
```

Copy the kit into a project that will last: the site can change, and a copy cannot.
