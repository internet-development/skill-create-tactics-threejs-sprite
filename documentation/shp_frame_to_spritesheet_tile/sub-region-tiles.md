# Sub-Region Tiles (SR1 through SR30)

Source: `TYPE1.SHP`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json` (`documentation/AGENTS.md` "Sources").

The 30 `SR`-prefixed tiles below are sub-regions of existing sprites -- the SHP references them at finer granularity than the original tile definitions. Visually verify at the main route to confirm they overlap parent tiles.

---

## Sub-Region Categories

### 1. Cursor/Placeholder -- SR1

`SR1` = (240,176) 8x8 -- a tiny tile used as empty/placeholder frames.

**Frames**: 0, 74-83, 182 _(12 frames)_

---

### 2. Head Top-Halves -- SR2 through SR16

The top 16px strip of each 32x40 body sprite. The SHP splits heads into a 32x16 top paired with a 32x16 HD/HF/HB tile. These are the top halves that sit above those tiles.

| ID | Region | Overlaps Top Of | Frames |
|----|--------|-----------------|--------|
| `SR2` | (0,0) 32x16 | P1 | 183, 187 |
| `SR3` | (32,0) 32x16 | P2 | 184, 186 |
| `SR4` | (64,0) 32x16 | P3 | 185 |
| `SR5` | (96,0) 32x16 | P4 | 188, 190 |
| `SR6` | (128,0) 32x16 | P5 | 189 |
| `SR7` | (160,0) 32x16 | BF1 | 191, 221, 230, 256 |
| `SR8` | (192,0) 32x16 | BF2 | 192, 222, 229, 257 |
| `SR9` | (0,40) 32x16 | BF3 | 193, 209, 210, 258 |
| `SR10` | (32,40) 32x16 | BF4 | 194, 207, 223, 231, 237-243, 259 |
| `SR11` | (64,40) 32x16 | BF5 | 195, 224, 232, 260 |
| `SR12` | (96,40) 32x16 | BB1 | 196, 225, 234, 261 |
| `SR13` | (128,40) 32x16 | BB2 | 197, 226, 233, 262 |
| `SR14` | (160,40) 32x16 | BB3 | 198, 211, 212, 263 |
| `SR15` | (192,40) 32x16 | BB4 | 199, 227, 235, 244-249, 264 |
| `SR16` | (0,80) 32x16 | BB5 | 200, 208, 228, 236, 265 |

---

### 3. Body Sub-Regions -- SR17 through SR20

Partial overlaps with body sprites. These appear in CH-series (magic charge) and AU-series (casting) frames.

| ID | Region | Overlaps | Frames |
|----|--------|----------|--------|
| `SR17` | (0,64) 32x16 | Bottom of BF3 | 35, 36 |
| `SR18` | (160,64) 32x16 | Bottom of BB3 | 37, 38 |
| `SR19` | (0,40) 32x32 | Top of BF3 | 31, 213 |
| `SR20` | (160,40) 32x32 | Top of BB3 | 33, 215 |

---

### 4. AF/AB Torso Top Strips -- SR21 through SR30

The top 8px strip of each AF/AB torso, drawn with the FF/FB tiles in frames 266-363.

| ID | Region | Overlaps Top Of | Frames |
|----|--------|-----------------|--------|
| `SR21` | (0,256) 32x8 | AF1 | 266-268, 274-275, 285-286, 294-295, 301, 312 |
| `SR22` | (32,256) 32x8 | AF2 | 269-271, 276-279, 282, 287, 289, 291, 296-297, 299, 302-306, 313 |
| `SR23` | (64,256) 32x8 | AF3 | 272, 280-281, 283, 288, 290, 292, 298 |
| `SR24` | (96,256) 32x8 | AF4 | 273, 284, 293, 300, 314 |
| `SR25` | (128,256) 32x8 | AF5 | 307-311 |
| `SR26` | (192,304) 32x8 | AB1 | 315-317, 323-324, 334-335, 343-344, 350, 361 |
| `SR27` | (192,336) 32x8 | AB2 | 318-320, 325-328, 331, 336, 338, 340, 345-346, 348, 351-355, 362 |
| `SR28` | (192,368) 32x8 | AB3 | 321, 329-330, 332, 337, 339, 341, 347 |
| `SR29` | (192,400) 32x8 | AB4 | 322, 333, 342, 349, 363 |
| `SR30` | (192,432) 32x8 | AB5 | 356-360 |

---

## Why These Are Sub-Regions

These tiles are **partial sub-regions** that the SHP defines at a finer granularity. The SHP splits sprites into the PSX hardware's fixed tile sizes (from the 16-size lookup table), while the original SPRITE_CELLS define larger, semantically meaningful regions. Each `SR` tile overlaps a portion of an existing tile -- visually verify at the main route to confirm.
