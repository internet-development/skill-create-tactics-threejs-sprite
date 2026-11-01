# Your Own Sheet

Any art works if it keeps TYPE1's tile layout, because the frame tables read rects off the sheet and know nothing about the art. Draw a new unit and every animation plays.

A new sheet changes the pixels, and only the pixels. The frame and sequence tables stay as they are, so `NOTICE.md` stays with them.

## Which Sheets Fit

| You have | It fits? |
|----------|----------|
| A 256x488 sheet exported from a tactical RPG sprite editor for a TYPE1 unit, or drawn to the layout | Yes |
| A sheet rearranged for viewing, as most ripped sheets are | No: it has no tiles to read |
| A monster, or another shape of unit with its own SHP | No: it needs its own tables, `skills/reverse-engineer-type1-binaries/SKILL.md` |
| A strip of ordinary frames | No: this format is tiles. Draw it to the layout, or use another tool |

## The File

- 256x488 PNG, non-interlaced, 8-bit RGBA or indexed.
- Alpha is 0 or 255. An empty pixel is `(0, 0, 0, 0)`.
- Pixels only inside `SPRITE_CELLS`.
- No limit on colors in a browser. TYPE1 sheets have 15 and a transparent entry.

## Draw It

1. Open `sheet-template.svg` from the kit, or `GET /api/v1/sheet-template.svg?scale=4`, as a guide layer. Every box is a cell with its id.
2. Trace `a1.png` first: it shows what each tile holds and how the tiles meet.
3. Keep the outline where the original has it. Tiles overlap by a few pixels when composited, and hands, heads and torsos are drawn on separate tiles that must meet.

The cell ids are in `three-isometric-engine/constants/sprites/AGENTS.md`. `P` is the idle body, `BF` and `BB` the walk body front and back, `LF`, `RF`, `LB` and `RB` the walk hands, `AF` and `AB` the torsos, `TF` and `TB` the heads and `LG` the hands of the attack frames, whatever the letters suggest.

## Check It

```sh
node src/tactics-sprite/check-sheet.mjs my-sheet.png
```

Or with no Node:

```sh
curl -s -X POST --data-binary @my-sheet.png -H 'Content-Type: image/png' https://3d.internet.dev/api/v1/sheets/check
```

The site reads the file and drops it. Either way, `errors` stop the sheet drawing right, and `warnings` are worth a look: a cell left empty only matters if an animation you play draws it. `a1.png` itself leaves 6 cells empty, LG58-LG60, SR1, SR23 and SR24.

| Error | Fix |
|-------|-----|
| `pixels-outside-cells` | A sprite file also carries art TYPE1 never draws: a 48x32 portrait at (80, 456), spare tiles, lettering. Copy each cell onto an empty image. If the lettering credits an artist, keep the credit |
| `partial-alpha` | Export with no anti-aliasing or feathering. Key the background to alpha 0 |
| `colored-transparent-pixels` | An exporter kept color under transparent pixels. Clear them, or export indexed |
| `empty-sheet` | The file is not on this layout, or its background keyed everything |
| A size, interlace or format error | Export again at 256x488, non-interlaced, 8-bit RGBA |

## Use It

From a checkout, the export checks the sheet and writes a kit around it:

```sh
node <skill>/scripts/export-sprite-kit.mjs src/tactics-sprite --sheet my-sheet.png
```

With only the download, replace `a1.png` with your file, and either keep its name or change `sheet.file` in `tactics-sprite-data.json`. The runtime never loads the sheet: your code does, so a project can load several and draw any unit from any of them. Set `hands` and `holds` to null in that data, or it will place props from `a1.png`'s pixels.

## Hands on Another Sheet

Grips are pixels of the art, so they do not carry over. To put a prop in a hand on your sheet, composite the frame, find the hand by its colors, and take the pixel holding the centroid of its visible pixels. Record it per tile, `{ tileId: [x, y, degrees] }`, in `hands`, in the shape `references/data.md` gives. `degrees` is the way the forearm points, 0 along the facing and 90 up. Only the tiles your animations hold a prop on need one.

## Inside This Repository

Changing the sheet the site itself draws takes more than a file: `skills/reverse-engineer-type1-binaries/SKILL.md` "A New Sheet" has the steps, including the grips and the tests that name the file.
