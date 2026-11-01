# Second Half -- Frames 266-363 (Full Body with Legs + FF/FB Strips)

Source: `TYPE1.SHP`, read by `tests/helpers/fft-type1.js` into `tests/fixtures/type1.json` (`documentation/AGENTS.md` "Sources").

These frames redraw the first half (frames 84-181) with **torso strips** (FF/FB series, mid-body tiles whatever their names say) and **torso top strips** (SR21-SR30). The SHP splits a torso into a thin 32x8 SR strip + an FF/FB tile. These are five-tile compositions (six on F311, with WX1), front to back: hand + head (TF/TB) + FF/FB + torso top strip (SR) + hand.

Each frame lists its tiles front to back, the reverse of the draw order in `../shp_tile_positions/`.

| Frame | Tiles |
|-------|-------|
| 266 | `LG5` -> `TF1` -> `FF1` -> `SR21` -> `LG1` |
| 267 | `LG5` -> `TF1` -> `FF1` -> `SR21` -> `LG1` |
| 268 | `LG5` -> `TF1` -> `FF1` -> `SR21` -> `LG2` |
| 269 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG2` |
| 270 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG2` |
| 271 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG3` |
| 272 | `LG8` -> `TF1` -> `FF3` -> `SR23` -> `LG3` |
| 273 | `LG7` -> `TF2` -> `FF4` -> `SR24` -> `LG4` |
| 274 | `LG12` -> `TF1` -> `FF1` -> `SR21` -> `LG16` |
| 275 | `LG12` -> `TF1` -> `FF1` -> `SR21` -> `LG16` |
| 276 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG2` |
| 277 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG9` |
| 278 | `LG13` -> `TF1` -> `FF2` -> `SR22` -> `LG9` |
| 279 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG3` |
| 280 | `LG14` -> `TF1` -> `FF3` -> `SR23` -> `LG10` |
| 281 | `LG14` -> `TF1` -> `FF3` -> `SR23` -> `LG10` |
| 282 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG3` |
| 283 | `LG14` -> `TF1` -> `FF3` -> `SR23` -> `LG11` |
| 284 | `LG30` -> `TF2` -> `FF4` -> `SR24` -> `LG11` |
| 285 | `LG17` -> `TF1` -> `FF1` -> `SR21` -> `LG15` |
| 286 | `LG17` -> `TF1` -> `FF1` -> `SR21` -> `LG15` |
| 287 | `LG23` -> `TF1` -> `FF2` -> `SR22` -> `LG9` |
| 288 | `LG19` -> `TF1` -> `FF3` -> `SR23` -> `LG9` |
| 289 | `LG23` -> `TF1` -> `FF2` -> `SR22` -> `LG16` |
| 290 | `LG20` -> `TF1` -> `FF3` -> `SR23` -> `LG16` |
| 291 | `LG18` -> `TF1` -> `FF2` -> `SR22` -> `LG15` |
| 292 | `LG20` -> `TF1` -> `FF3` -> `SR23` -> `LG16` |
| 293 | `LG21` -> `TF2` -> `FF4` -> `SR24` -> `LG15` |
| 294 | `LG17` -> `TF1` -> `FF1` -> `SR21` -> `LG15` |
| 295 | `LG17` -> `TF1` -> `FF1` -> `SR21` -> `LG15` |
| 296 | `LG22` -> `TF1` -> `FF2` -> `SR22` -> `LG15` |
| 297 | `LG24` -> `TF1` -> `FF2` -> `SR22` -> `LG15` |
| 298 | `LG20` -> `TF1` -> `FF3` -> `SR23` -> `LG15` |
| 299 | `LG23` -> `TF1` -> `FF2` -> `SR22` -> `LG15` |
| 300 | `LG21` -> `TF2` -> `FF4` -> `SR24` -> `LG15` |
| 301 | `LG17` -> `TF1` -> `FF1` -> `SR21` -> `LG15` |
| 302 | `LG22` -> `TF1` -> `FF2` -> `SR22` -> `LG15` |
| 303 | `LG24` -> `TF1` -> `FF2` -> `SR22` -> `LG15` |
| 304 | `LG18` -> `TF1` -> `FF2` -> `SR22` -> `LG16` |
| 305 | `LG18` -> `TF1` -> `FF2` -> `SR22` -> `LG16` |
| 306 | `LG32` -> `TF1` -> `FF2` -> `SR22` -> `LG16` |
| 307 | `LG28` -> `TF1` -> `FF5` -> `SR25` -> `LG2` |
| 308 | `LG28` -> `TF1` -> `FF5` -> `SR25` -> `LG2` |
| 309 | `LG28` -> `TF1` -> `FF5` -> `SR25` -> `LG29` |
| 310 | `LG28` -> `TF1` -> `FF5` -> `SR25` -> `LG29` |
| 311 | `LG28` -> `WX1` -> `TF1` -> `FF5` -> `SR25` -> `LG29` |
| 312 | `LG12` -> `TF1` -> `FF1` -> `SR21` -> `LG25` |
| 313 | `LG6` -> `TF1` -> `FF2` -> `SR22` -> `LG2` |
| 314 | `LG21` -> `TF2` -> `FF4` -> `SR24` -> `LG15` |
| 315 | `LG34` -> `TB1` -> `FB1` -> `SR26` -> `LG37` |
| 316 | `LG34` -> `TB1` -> `FB1` -> `SR26` -> `LG37` |
| 317 | `LG34` -> `TB1` -> `FB1` -> `SR26` -> `LG38` |
| 318 | `LG35` -> `TB1` -> `FB3` -> `SR27` -> `LG38` |
| 319 | `LG35` -> `TB1` -> `FB3` -> `SR27` -> `LG38` |
| 320 | `LG36` -> `TB1` -> `FB3` -> `SR27` -> `LG39` |
| 321 | `LG41` -> `TB1` -> `FB4` -> `SR28` -> `LG39` |
| 322 | `LG31` -> `TB2` -> `FB5` -> `SR29` -> `LG40` |
| 323 | `LG42` -> `TB1` -> `FB1` -> `SR26` -> `LG56` |
| 324 | `LG42` -> `TB1` -> `FB1` -> `SR26` -> `LG56` |
| 325 | `LG35` -> `TB1` -> `FB3` -> `SR27` -> `LG38` |
| 326 | `LG43` -> `TB1` -> `FB3` -> `SR27` -> `LG45` |
| 327 | `LG43` -> `TB1` -> `FB3` -> `SR27` -> `LG45` |
| 328 | `LG43` -> `TB1` -> `FB3` -> `SR27` -> `LG56` |
| 329 | `LG44` -> `TB1` -> `FB4` -> `SR28` -> `LG46` |
| 330 | `LG44` -> `TB1` -> `FB4` -> `SR28` -> `LG46` |
| 331 | `LG43` -> `TB1` -> `FB3` -> `SR27` -> `LG56` |
| 332 | `LG44` -> `TB1` -> `FB4` -> `SR28` -> `LG47` |
| 333 | `LG27` -> `TB2` -> `FB5` -> `SR29` -> `LG47` |
| 334 | `LG48` -> `TB1` -> `FB1` -> `SR26` -> `LG56` |
| 335 | `LG48` -> `TB1` -> `FB1` -> `SR26` -> `LG56` |
| 336 | `LG50` -> `TB1` -> `FB3` -> `SR27` -> `LG56` |
| 337 | `LG26` -> `TB1` -> `FB4` -> `SR28` -> `LG56` |
| 338 | `LG43` -> `TB1` -> `FB3` -> `SR27` -> `LG56` |
| 339 | `LG51` -> `TB1` -> `FB4` -> `SR28` -> `LG56` |
| 340 | `LG35` -> `TB1` -> `FB3` -> `SR27` -> `LG56` |
| 341 | `LG49` -> `TB1` -> `FB4` -> `SR28` -> `LG56` |
| 342 | `LG52` -> `TB2` -> `FB5` -> `SR29` -> `LG56` |
| 343 | `LG54` -> `TB1` -> `FB1` -> `SR26` -> `LG55` |
| 344 | `LG54` -> `TB1` -> `FB1` -> `SR26` -> `LG55` |
| 345 | `LG53` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 346 | `LG50` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 347 | `LG51` -> `TB1` -> `FB4` -> `SR28` -> `LG55` |
| 348 | `LG53` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 349 | `LG52` -> `TB2` -> `FB5` -> `SR29` -> `LG55` |
| 350 | `LG48` -> `TB1` -> `FB1` -> `SR26` -> `LG55` |
| 351 | `LG43` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 352 | `LG50` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 353 | `LG53` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 354 | `LG53` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 355 | `LG35` -> `TB1` -> `FB3` -> `SR27` -> `LG55` |
| 356 | `LG57` -> `TB1` -> `FB2` -> `SR30` -> `LG61` |
| 357 | `LG57` -> `TB1` -> `FB2` -> `SR30` -> `LG61` |
| 358 | `LG33` -> `TB1` -> `FB2` -> `SR30` -> `LG61` |
| 359 | `LG33` -> `TB1` -> `FB2` -> `SR30` -> `LG61` |
| 360 | `LG33` -> `TB1` -> `FB2` -> `SR30` -> `LG61` |
| 361 | `LG34` -> `TB1` -> `FB1` -> `SR26` -> `LG45` |
| 362 | `LG53` -> `TB1` -> `FB3` -> `SR27` -> `LG45` |
| 363 | `LG52` -> `TB2` -> `FB5` -> `SR29` -> `LG46` |
