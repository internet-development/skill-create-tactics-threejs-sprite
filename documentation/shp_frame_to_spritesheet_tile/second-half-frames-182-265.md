# Second Half -- Frames 182-265 (Head+Body, with HF/HB strips)

Source: `TYPE1.SHP`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json` (`documentation/AGENTS.md` "Sources").

These frames redraw the first half (frames 0-83) with **body strips** (HF/HB series, which sit under the head, whatever their names say). Their 32x16 top-of-head strips are SR (sub-region) tiles in the engine. The SHP splits a body into a 32x16 top (SR2-SR16) + 32x16 middle (the HD/HF/HB series).

Each frame lists its tiles front to back, the reverse of the draw order in `../shp_tile_positions/`. Tiles marked `reversed` are horizontally flipped.

| Frame | Tiles |
|-------|-------|
| 182 | `SR1` |
| 183 | `HD1` -> `SR2` |
| 184 | `HD2` -> `SR3` |
| 185 | `HD3` -> `SR4` |
| 186 | `HD2 reversed` -> `SR3 reversed` |
| 187 | `HD1 reversed` -> `SR2 reversed` |
| 188 | `HD4 reversed` -> `SR5 reversed` |
| 189 | `HD5` -> `SR6` |
| 190 | `HD4` -> `SR5` |
| 191 | `LF1` -> `HF1` -> `SR7` -> `RF1` |
| 192 | `LF2` -> `HF2` -> `SR8` -> `RF2` |
| 193 | `LF3` -> `HF3` -> `SR9` -> `RF3` |
| 194 | `LF4` -> `HF4` -> `SR10` -> `RF4` |
| 195 | `LF5` -> `HF5` -> `SR11` -> `RF5` |
| 196 | `LB1` -> `HB1` -> `SR12` -> `RB1` |
| 197 | `LB2` -> `HB2` -> `SR13` -> `RB2` |
| 198 | `LB3` -> `HB3` -> `SR14` -> `RB3` |
| 199 | `LB4` -> `HB4` -> `SR15` -> `RB4` |
| 200 | `LB5` -> `HB5` -> `SR16` -> `RB5` |
| 201 | `SP3` -> `HR1` |
| 202 | `SP2` -> `HR2` |
| 203 | `SP4` |
| 204 | `SP1` |
| 205 | `ST1` |
| 206 | `ST2` |
| 207 | `EF6` -> `HF4` -> `SR10` |
| 208 | `EF7` -> `HB5` -> `SR16` |
| 209 | `EF2` -> `HF3` -> `SR9` -> `EF1` |
| 210 | `EFL3` -> `HF3` -> `SR9` -> `EFR3` |
| 211 | `EFL5` -> `HB3` -> `SR14` -> `EFR5` |
| 212 | `EFL4` -> `HB3` -> `SR14` -> `EFR4` |
| 213 | `EFL3` -> `AU1` -> `SR19` -> `EFR3` |
| 214 | `EFL3` -> `BF5` -> `EFR3` |
| 215 | `EFL4` -> `AU2` -> `SR20` -> `EFR4` |
| 216 | `EFL4` -> `BB5` -> `EFR4` |
| 217 | `CH1` |
| 218 | `CH2` |
| 219 | `CH3` |
| 220 | `CH4` |
| 221 | `EFL3` -> `HF1` -> `SR7` -> `EFR3` |
| 222 | `EF2` -> `HF2` -> `SR8` -> `EF1` |
| 223 | `LF4` -> `HF4` -> `SR10` -> `RF2` |
| 224 | `LF5` -> `HF5` -> `SR11` -> `RF1` |
| 225 | `EFL4` -> `HB1` -> `SR12` -> `EFR4` |
| 226 | `EFL5` -> `HB2` -> `SR13` -> `EFR5` |
| 227 | `LB2` -> `HB4` -> `SR15` -> `RB4` |
| 228 | `LB1` -> `HB5` -> `SR16` -> `RB5` |
| 229 | `LF2` -> `HF2` -> `SR8` -> `EF1` |
| 230 | `EF2` -> `HF1` -> `SR7` -> `EFR3` |
| 231 | `EF2` -> `HF4` -> `SR10` -> `RF4` |
| 232 | `EFL3` -> `HF5` -> `SR11` -> `EF1` |
| 233 | `LB4` -> `HB2` -> `SR13` -> `EFR5` |
| 234 | `LB5` -> `HB1` -> `SR12` -> `EFR4` |
| 235 | `EFL5` -> `HB4` -> `SR15` -> `RB4` |
| 236 | `EFL4` -> `HB5` -> `SR16` -> `RB5` |
| 237 | `LF3` -> `HF4` -> `SR10` -> `RF4` |
| 238 | `LF2` -> `HF4` -> `SR10` -> `EF1` |
| 239 | `LF2` -> `HF4` -> `SR10` -> `EFR3` |
| 240 | `OV1` -> `LF2` -> `HF4` -> `SR10` -> `EFR3` |
| 241 | `LF1` -> `HF4` -> `SR10` -> `RF4` |
| 242 | `EF2` -> `HF4` -> `SR10` -> `RF4` |
| 243 | `EFL3` -> `HF4` -> `SR10` -> `RF4` |
| 244 | `LB4` -> `HB4` -> `SR15` -> `RB1` |
| 245 | `EFL5` -> `HB4` -> `SR15` -> `RB4` |
| 246 | `EFL4` -> `HB4` -> `SR15` -> `RB5` |
| 247 | `LB3` -> `HB4` -> `SR15` -> `RB3` |
| 248 | `LB2` -> `HB4` -> `SR15` -> `EFR5` |
| 249 | `LB1` -> `HB4` -> `SR15` -> `EFR4` |
| 250 | `DF1` |
| 251 | `DB1` |
| 252 | `SP3` |
| 253 | `SP2` |
| 254 | `OV2` -> `SP4` |
| 255 | `SP1` |
| 256 | `LF1` -> `HF1` -> `SR7` -> `RF5` |
| 257 | `LF1` -> `HF2` -> `SR8` -> `RF5` |
| 258 | `LF1` -> `HF3` -> `SR9` -> `RF5` |
| 259 | `LF1` -> `HF4` -> `SR10` -> `RF5` |
| 260 | `LF1` -> `HF5` -> `SR11` -> `RF5` |
| 261 | `LB5` -> `HB1` -> `SR12` -> `RB1` |
| 262 | `LB5` -> `HB2` -> `SR13` -> `RB1` |
| 263 | `LB5` -> `HB3` -> `SR14` -> `RB1` |
| 264 | `LB5` -> `HB4` -> `SR15` -> `RB1` |
| 265 | `LB5` -> `HB5` -> `SR16` -> `RB1` |
