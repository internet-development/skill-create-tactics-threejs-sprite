# First Half -- Frames 84-181 (Full Body with Legs, yOffset=256)

Source: `TYPE1.SHP`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json` (`documentation/AGENTS.md` "Sources").

These frames use `yOffset=256`, sampling from the bottom half of the 256x488 sprite sheet (y: 256-487). They contain full body compositions with hand tiles -- typically four-tile compositions: hand + head (TF/TB) + headless torso (AF/AB) + hand. Uses LG-series hand tiles ("LG" is a misnomer, see `constants/sprites/AGENTS.md`) for attacks, reading, playing and blocking. No separate head tiles (HF/HB) or foot strip tiles (FF/FB) are included.

Each frame lists its tiles front to back, the reverse of the draw order in `../shp_tile_positions/`.

| Frame | Tiles |
|-------|-------|
| 84 | `LG5` -> `TF1` -> `AF1` -> `LG1` |
| 85 | `LG5` -> `TF1` -> `AF1` -> `LG1` |
| 86 | `LG5` -> `TF1` -> `AF1` -> `LG2` |
| 87 | `LG6` -> `TF1` -> `AF2` -> `LG2` |
| 88 | `LG6` -> `TF1` -> `AF2` -> `LG2` |
| 89 | `LG6` -> `TF1` -> `AF2` -> `LG3` |
| 90 | `LG8` -> `TF1` -> `AF3` -> `LG3` |
| 91 | `LG7` -> `TF2` -> `AF4` -> `LG4` |
| 92 | `LG12` -> `TF1` -> `AF1` -> `LG16` |
| 93 | `LG12` -> `TF1` -> `AF1` -> `LG16` |
| 94 | `LG6` -> `TF1` -> `AF2` -> `LG2` |
| 95 | `LG6` -> `TF1` -> `AF2` -> `LG9` |
| 96 | `LG13` -> `TF1` -> `AF2` -> `LG9` |
| 97 | `LG6` -> `TF1` -> `AF2` -> `LG3` |
| 98 | `LG14` -> `TF1` -> `AF3` -> `LG10` |
| 99 | `LG14` -> `TF1` -> `AF3` -> `LG10` |
| 100 | `LG6` -> `TF1` -> `AF2` -> `LG3` |
| 101 | `LG14` -> `TF1` -> `AF3` -> `LG11` |
| 102 | `LG30` -> `TF2` -> `AF4` -> `LG11` |
| 103 | `LG17` -> `TF1` -> `AF1` -> `LG15` |
| 104 | `LG17` -> `TF1` -> `AF1` -> `LG15` |
| 105 | `LG23` -> `TF1` -> `AF2` -> `LG9` |
| 106 | `LG19` -> `TF1` -> `AF3` -> `LG9` |
| 107 | `LG23` -> `TF1` -> `AF2` -> `LG16` |
| 108 | `LG20` -> `TF1` -> `AF3` -> `LG16` |
| 109 | `LG18` -> `TF1` -> `AF2` -> `LG15` |
| 110 | `LG20` -> `TF1` -> `AF3` -> `LG16` |
| 111 | `LG21` -> `TF2` -> `AF4` -> `LG15` |
| 112 | `LG17` -> `TF1` -> `AF1` -> `LG15` |
| 113 | `LG17` -> `TF1` -> `AF1` -> `LG15` |
| 114 | `LG22` -> `TF1` -> `AF2` -> `LG15` |
| 115 | `LG24` -> `TF1` -> `AF2` -> `LG15` |
| 116 | `LG20` -> `TF1` -> `AF3` -> `LG15` |
| 117 | `LG23` -> `TF1` -> `AF2` -> `LG15` |
| 118 | `LG21` -> `TF2` -> `AF4` -> `LG15` |
| 119 | `LG17` -> `TF1` -> `AF1` -> `LG15` |
| 120 | `LG22` -> `TF1` -> `AF2` -> `LG15` |
| 121 | `LG24` -> `TF1` -> `AF2` -> `LG15` |
| 122 | `LG18` -> `TF1` -> `AF2` -> `LG16` |
| 123 | `LG18` -> `TF1` -> `AF2` -> `LG16` |
| 124 | `LG32` -> `TF1` -> `AF2` -> `LG16` |
| 125 | `LG28` -> `TF1` -> `AF5` -> `LG2` |
| 126 | `LG28` -> `TF1` -> `AF5` -> `LG2` |
| 127 | `LG28` -> `TF1` -> `AF5` -> `LG29` |
| 128 | `LG28` -> `TF1` -> `AF5` -> `LG29` |
| 129 | `LG28` -> `WX1` -> `TF1` -> `AF5` -> `LG29` |
| 130 | `LG12` -> `TF1` -> `AF1` -> `LG25` |
| 131 | `LG6` -> `TF1` -> `AF2` -> `LG2` |
| 132 | `LG21` -> `TF2` -> `AF4` -> `LG15` |
| 133 | `LG34` -> `TB1` -> `AB1` -> `LG37` |
| 134 | `LG34` -> `TB1` -> `AB1` -> `LG37` |
| 135 | `LG34` -> `TB1` -> `AB1` -> `LG38` |
| 136 | `LG35` -> `TB1` -> `AB2` -> `LG38` |
| 137 | `LG35` -> `TB1` -> `AB2` -> `LG38` |
| 138 | `LG36` -> `TB1` -> `AB2` -> `LG39` |
| 139 | `LG41` -> `TB1` -> `AB3` -> `LG39` |
| 140 | `LG31` -> `TB2` -> `AB4` -> `LG40` |
| 141 | `LG42` -> `TB1` -> `AB1` -> `LG56` |
| 142 | `LG42` -> `TB1` -> `AB1` -> `LG56` |
| 143 | `LG35` -> `TB1` -> `AB2` -> `LG38` |
| 144 | `LG43` -> `TB1` -> `AB2` -> `LG45` |
| 145 | `LG43` -> `TB1` -> `AB2` -> `LG45` |
| 146 | `LG43` -> `TB1` -> `AB2` -> `LG56` |
| 147 | `LG44` -> `TB1` -> `AB3` -> `LG46` |
| 148 | `LG44` -> `TB1` -> `AB3` -> `LG46` |
| 149 | `LG43` -> `TB1` -> `AB2` -> `LG56` |
| 150 | `LG44` -> `TB1` -> `AB3` -> `LG47` |
| 151 | `LG27` -> `TB2` -> `AB4` -> `LG47` |
| 152 | `LG48` -> `TB1` -> `AB1` -> `LG56` |
| 153 | `LG48` -> `TB1` -> `AB1` -> `LG56` |
| 154 | `LG50` -> `TB1` -> `AB2` -> `LG56` |
| 155 | `LG26` -> `TB1` -> `AB3` -> `LG56` |
| 156 | `LG43` -> `TB1` -> `AB2` -> `LG56` |
| 157 | `LG51` -> `TB1` -> `AB3` -> `LG56` |
| 158 | `LG35` -> `TB1` -> `AB2` -> `LG56` |
| 159 | `LG49` -> `TB1` -> `AB3` -> `LG56` |
| 160 | `LG52` -> `TB2` -> `AB4` -> `LG56` |
| 161 | `LG54` -> `TB1` -> `AB1` -> `LG55` |
| 162 | `LG54` -> `TB1` -> `AB1` -> `LG55` |
| 163 | `LG53` -> `TB1` -> `AB2` -> `LG55` |
| 164 | `LG50` -> `TB1` -> `AB2` -> `LG55` |
| 165 | `LG51` -> `TB1` -> `AB3` -> `LG55` |
| 166 | `LG53` -> `TB1` -> `AB2` -> `LG55` |
| 167 | `LG52` -> `TB2` -> `AB4` -> `LG55` |
| 168 | `LG48` -> `TB1` -> `AB1` -> `LG55` |
| 169 | `LG43` -> `TB1` -> `AB2` -> `LG55` |
| 170 | `LG50` -> `TB1` -> `AB2` -> `LG55` |
| 171 | `LG53` -> `TB1` -> `AB2` -> `LG55` |
| 172 | `LG53` -> `TB1` -> `AB2` -> `LG55` |
| 173 | `LG35` -> `TB1` -> `AB2` -> `LG55` |
| 174 | `LG57` -> `TB1` -> `AB5` -> `LG61` |
| 175 | `LG57` -> `TB1` -> `AB5` -> `LG61` |
| 176 | `LG33` -> `TB1` -> `AB5` -> `LG61` |
| 177 | `LG33` -> `TB1` -> `AB5` -> `LG61` |
| 178 | `LG33` -> `TB1` -> `AB5` -> `LG61` |
| 179 | `LG34` -> `TB1` -> `AB1` -> `LG45` |
| 180 | `LG53` -> `TB1` -> `AB2` -> `LG45` |
| 181 | `LG52` -> `TB2` -> `AB4` -> `LG46` |
