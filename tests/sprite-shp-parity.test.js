//NOTE(jimmylee)
//SHP and SEQ parity for the sprite port. Checks every ported assembly frame against the decoded TYPE1.SHP /
//TYPE1.SEQ (tests/helpers/fft-type1.js, which reads them the way the Shishi sprite editor does): tile
//set, body-relative offsets, per-tile flips, back-to-front depth, body anchor, SEQ order and timing.

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import * as A from '@engine/constants/sprites/assembly';
import { SHEET_W, SHEET_H, SPRITE_CELLS } from '@engine/constants/sprites';
import { FRAMES, SEQS, SEQ_RAW_IDS, decodeShp, decodeSeq, shpTiles, mirrorTiles, seqFrames, seqTicks, seqMotion, visiblePixel, sheetPixels, SHP_ORIGIN_X, STANCE_Y } from './helpers/fft-type1';
import { SHP_FRAMES, SEQ_LIBRARY, SEQ_PAIRS, SHP_WATER_OFFSET, shpBodyIndex } from '@engine/constants/sprites/seq-library';
import { JUMP_AIR_FRAME, JUMP_TAKEOFF_S, JUMP_TOUCHDOWN_S, JUMP_LIFT_HEIGHT, jumpLift, THROW_STONE_SPAWN_FRAME, THROW_STONE_RELEASE_FRAME, THROW_STONE_LAST_HELD_FRAME, THROW_LAUNCH_UP, THROW_LAUNCH_FORWARD, PUNCH_HIT_MS, PUNCH_CYCLE_MS, QT_PICKUP_FRAME, QT_PICKUP_MS, QT_RELEASE_FRAME, QT_RELEASE_MS, QT_RELEASE_TICKS, QT_CYCLE_MS, STAB_HIT_FRAME, playerJumpFrame, playerLandFrame, quickThrowHoldHeight } from '@engine/actions/action-timelines';

const msToTicks = (arr) => arr.map((ms) => Math.round((ms * 60) / 1000));

//NOTE(jimmylee)
//Renderer depth contract (back → front). Every renderer draws these fields in this order.
const LAYER_ORDER = ['farBehind', 'behind', 'body', 'head', 'over', 'front', 'face'];
const layered = (f) => LAYER_ORDER.flatMap((L) => (L === 'body' ? [{ id: f.body, dx: 0, dy: 0 }] : f[L] ? [f[L]] : []));

//NOTE(jimmylee)
//Asserts an ordered body-relative composition (back → front) reproduces SHP frame `fi` exactly.
function expectComposite(label, fi, bodyId, anchor, tiles) {
  const shp = shpTiles(fi);
  const body = shp.find((t) => t.id === bodyId);
  expect(body, `${label} F${fi}: body ${bodyId}`).toBeDefined();
  const expected = shp.map((t) => `${t.id}@${t.cx - body.cx},${t.cy - body.cy}${t.flip ? '~' : ''}${t.flipY ? '^' : ''}`);
  const actual = tiles.map((t) => `${t.id}@${t.dx},${t.dy}`);
  expect(actual, `${label} F${fi}`).toEqual(expected);
  expect({ dx: body.cx - SHP_ORIGIN_X, dy: body.cy - STANCE_Y }, `${label} F${fi} anchor`).toEqual(anchor);
}

const PATTERN = ['A', 'B', 'C', 'D'];

function describeFramesMode(name, assembly, frontFrames, backFrames) {
  describe(name, () => {
    it('A/D mirror B/C exactly with reversed flags', () => {
      assembly.forEach((p, pi) => {
        expect(p.reversed).toBe(pi === 0 || pi === 3);
        expect(p.frames).toEqual(assembly[[1, 0, 3, 2][pi]].frames);
      });
    });

    it('every frame matches its TYPE1.SHP frame (tiles, offsets, flips, depth, anchor)', () => {
      for (const pi of [1, 2]) {
        const list = pi === 1 ? frontFrames : backFrames;
        expect(assembly[pi].frames).toHaveLength(list.length);
        assembly[pi].frames.forEach((f, i) => expectComposite(`${name} ${PATTERN[pi]}${i}`, list[i], f.body, f.anchor, layered(f)));
      }
    });
  });
}

describe('TYPE1 binary decode', () => {
  it('decodes 364 SHP frames and 218 SEQ sequences like the editor', () => {
    expect(FRAMES).toHaveLength(364);
    expect(SEQS).toHaveLength(218);
  });

  it('the game mirrors about the origin column: F4/F5/F6 are F2/F1/F8 reflected about x = SHP_ORIGIN_X', () => {
    for (const [src, mirrored] of [[2, 4], [1, 5], [8, 6]]) {
      expect(shpTiles(mirrored)).toEqual(mirrorTiles(shpTiles(src)));
    }
    //NOTE(jimmylee)
    //F0 is the 8x8 SR1 ground marker, centered on the origin.
    expect(shpTiles(0)).toEqual([{ id: 'SR1', cx: SHP_ORIGIN_X, cy: 118, flip: false, flipY: false }]);
  });

  it('every first-half SHP tile resolves to exactly one SPRITE_CELLS rect', () => {
    for (let fi = 0; fi < 182; fi++) {
      for (const t of shpTiles(fi)) expect(t.id, `F${fi}`).toBeDefined();
    }
  });
});

describe('static compositions', () => {
  it('Walk base frames match F9-F13 / F14-F18 including the walk bob', () => {
    for (const pi of [1, 2]) {
      const p = A.WALK_ASSEMBLY[pi];
      p.body.forEach((b, i) => {
        const behind = p.hands[i].find((h) => h.id.startsWith('R'));
        const front = p.hands[i].find((h) => !h.id.startsWith('R'));
        expectComposite(`WALK ${PATTERN[pi]}${i}`, (pi === 1 ? 9 : 14) + i, b.id, b.anchor, [behind, { id: b.id, dx: 0, dy: 0 }, front]);
      });
    }
  });

  it('Guard matches F13/F18 and Float matches F70/F71', () => {
    for (const [asm, front, back] of [[A.GUARD_ASSEMBLY, 13, 18], [A.FLOAT_ASSEMBLY, 70, 71]]) {
      for (const pi of [1, 2]) {
        const p = asm[pi];
        expectComposite(`${p.seq}`, pi === 1 ? front : back, p.body, p.anchor, [p.behind, { id: p.body, dx: 0, dy: 0 }, p.front]);
      }
    }
  });

  it('Flinch matches F68/F69 (bottom behind top)', () => {
    for (const pi of [1, 2]) {
      const p = A.HURT_ASSEMBLY[pi];
      expectComposite(`HURT ${PATTERN[pi]}`, pi === 1 ? 68 : 69, p.top, p.anchor, [{ id: p.bottom, dx: p.bottomDx, dy: p.bottomDy }, { id: p.top, dx: 0, dy: 0 }]);
    }
  });

  it('Magic Charge matches F35-F38 with the SR legs strip behind the CH body', () => {
    for (const pi of [1, 2]) {
      A.CAST_ASSEMBLY[pi].frames.forEach((f, i) => {
        expectComposite(`CAST ${PATTERN[pi]}${i}`, (pi === 1 ? 35 : 37) + i, f.body, f.anchor, [{ id: f.overlay, dx: f.overlayDx, dy: f.overlayDy }, { id: f.body, dx: 0, dy: 0 }]);
      });
    }
  });

  it('Kneel, Dead and Idle tiles match their SHP frames', () => {
    for (const [asm, front, back] of [[A.KNEEL_ASSEMBLY, 21, 22], [A.DEATH_ASSEMBLY, 23, 24]]) {
      for (const pi of [1, 2]) expect(shpTiles(pi === 1 ? front : back).map((t) => t.id)).toEqual([asm[pi].id]);
    }
    for (const entry of A.IDLE_ASSEMBLY) {
      const [t] = shpTiles(Number(entry.shp.slice(1)));
      expect([t.id, t.flip]).toEqual([entry.id, entry.reversed]);
      //NOTE(jimmylee)
      //Mirrored idles (F4-F6) land at the anchor mirrored about the origin column.
      const sign = entry.reversed ? -1 : 1;
      expect({ dx: t.cx - SHP_ORIGIN_X, dy: t.cy - STANCE_Y }, entry.shp).toEqual({ dx: entry.anchor.dx * sign, dy: entry.anchor.dy });
    }
    for (const asm of [A.KNEEL_ASSEMBLY, A.DEATH_ASSEMBLY]) {
      for (const entry of asm) {
        const [t] = shpTiles(Number(entry.shp.slice(1)));
        expect({ dx: t.cx - SHP_ORIGIN_X, dy: t.cy - STANCE_Y }, entry.shp).toEqual(entry.anchor);
      }
    }
  });
});

describeFramesMode('Quick Throw', A.QUICK_THROW_ASSEMBLY, seqFrames(48), seqFrames(49));
describeFramesMode('Throw Stone', A.THROW_STONE_ASSEMBLY, seqFrames(208), seqFrames(209));
describeFramesMode('Punch Lv1', A.PUNCH_ASSEMBLY, seqFrames(140), seqFrames(141));
describeFramesMode('Punch Lv2', A.PUNCH_LV2_ASSEMBLY, seqFrames(142), seqFrames(143));
describeFramesMode('Punch Lv3', A.PUNCH_LV3_ASSEMBLY, seqFrames(144), seqFrames(145));
describeFramesMode('Stab Lv1', A.STAB_ASSEMBLY, seqFrames(96), seqFrames(97));
describeFramesMode('Stab Lv2', A.STAB_LV2_ASSEMBLY, seqFrames(98), seqFrames(99));
describeFramesMode('Stab Lv3', A.STAB_LV3_ASSEMBLY, seqFrames(100), seqFrames(101));
describeFramesMode('Item Drop', A.ITEM_DROP_ASSEMBLY, seqFrames(84), seqFrames(85));
describeFramesMode('Fatal Item Impact', A.FATAL_ITEM_IMPACT_ASSEMBLY, [...new Set(seqFrames(82))], [...new Set(seqFrames(83))]);
//NOTE(jimmylee)
//Jump joins the take-off of Jump 2 (SEQ 204/205, its last frame is the Mid Jump pose of SEQ 42/43) and
//High Jump Land (SEQ 52/53).
describeFramesMode('Jump', A.JUMP_ASSEMBLY, [...seqFrames(204), ...seqFrames(52)], [...seqFrames(205), ...seqFrames(53)]);

describe('SEQ order and timing', () => {
  it('walk plays the SEQ 6/7 ping-pong order', () => {
    expect(seqFrames(6)).toEqual([2, 1, 0, 1, 2, 3, 4, 3].map((i) => 9 + i));
    expect(seqFrames(7)).toEqual([2, 1, 0, 1, 2, 3, 4, 3].map((i) => 14 + i));
  });

  it('delay arrays equal the SEQ ticks', () => {
    expect(msToTicks(A.WALK_DELAYS)).toEqual(seqTicks(6));
    expect(msToTicks(A.QUICK_THROW_DELAYS)).toEqual(seqTicks(206));
    expect(seqFrames(206)).toEqual(seqFrames(48));
    expect(seqFrames(207)).toEqual(seqFrames(49));
    expect(msToTicks(A.THROW_STONE_DELAYS_FWD)).toEqual(seqTicks(208));
    expect(msToTicks(A.THROW_STONE_DELAYS_BCK)).toEqual(seqTicks(209));
    expect(msToTicks(A.PUNCH_DELAYS)).toEqual(seqTicks(140));
    expect(msToTicks(A.PUNCH_LV2_DELAYS)).toEqual(seqTicks(142));
    expect(msToTicks(A.PUNCH_LV3_DELAYS)).toEqual(seqTicks(144));
    expect(msToTicks(A.STAB_DELAYS)).toEqual(seqTicks(96));
    expect(msToTicks(A.STAB_LV2_DELAYS)).toEqual(seqTicks(98));
    expect(msToTicks(A.STAB_LV3_DELAYS)).toEqual(seqTicks(100));
    expect(msToTicks(A.ITEM_DROP_DELAYS)).toEqual(seqTicks(84).slice(0, 2));
    expect(seqTicks(64)).toEqual([20, 20]);
    expect(seqTicks(65)).toEqual([20, 20]);
  });
});

//NOTE(@jimmylee)
//The tables every sequence mode and the demo library play from. They are the binary, transcribed:
//nothing downstream re-reads it at runtime.
describe('sequence library', () => {
  it('SHP_FRAMES is every TYPE1.SHP frame, back to front, from the unit origin', () => {
    expect(SHP_FRAMES).toHaveLength(FRAMES.length);
    SHP_FRAMES.forEach((tiles, fi) => {
      expect(tiles.map(([id, u, v, flip]) => ({ id, cx: u + SHP_ORIGIN_X, cy: v + STANCE_Y, flip: flip === 1, flipY: false })), `F${fi}`).toEqual(shpTiles(fi));
    });
  });

  it('SEQ_LIBRARY is every TYPE1.SEQ sequence: frames, ticks, motion, loop and events', () => {
    expect(SEQ_LIBRARY).toHaveLength(SEQS.length);
    SEQ_LIBRARY.forEach((entry, s) => {
      expect(entry.seq).toBe(s);
      expect(entry.raw).toBe(SEQ_RAW_IDS[s]);
      expect(entry.frames, `SEQ ${s}`).toEqual(seqFrames(s));
      expect(entry.ticks, `SEQ ${s}`).toEqual(seqTicks(s));
      expect(entry.loop === true, `SEQ ${s}`).toBe(SEQS[s].at(-1).op === 0xd5);
      const motion = seqMotion(s, { lateral: 'skip' });
      expect(entry.fb ?? motion.map(() => 0), `SEQ ${s}`).toEqual(motion.map((m) => m.fb));
      expect(entry.du ?? motion.map(() => 0), `SEQ ${s}`).toEqual(motion.map((m) => m.du));
      let tick = 0;
      const events = [];
      for (const x of SEQS[s]) {
        if (x.op === undefined) tick += x.delay;
        else if (x.op === 0xf6) events.push([tick, 'PlaySound']);
        else if (x.op === 0xde) events.push([tick, 'PostGenericAttack']);
      }
      expect(entry.events ?? [], `SEQ ${s}`).toEqual(events);
    });
  });

  it('only a sequence end holds a frame, and every frame fits the 6 planes of the sequence group', () => {
    for (const entry of SEQ_LIBRARY) entry.ticks.slice(0, -1).forEach((t, k) => expect(t, `SEQ ${entry.seq} frame ${k}`).toBeGreaterThan(0));
    for (const tiles of SHP_FRAMES) expect(tiles.length).toBeLessThanOrEqual(6);
  });

  //NOTE(@jimmylee)
  //The water frames only play in the demo library, which draws meshes directly.
  it('the draw order slots of the frames a mode can draw stay inside the sprite batcher slots', () => {
    SHP_FRAMES.slice(0, SHP_WATER_OFFSET).forEach((tiles, fi) => {
      const body = shpBodyIndex(tiles);
      expect(body, `F${fi}`).toBeLessThanOrEqual(2);
      expect(tiles.length - 1 - body, `F${fi}`).toBeLessThanOrEqual(3);
    });
  });

  it('the frames reach all but 3 sprite cells; the F182+ cut-off tiles and the head strips appear nowhere earlier', () => {
    const used = new Set(SHP_FRAMES.flat().map((t) => t[0]));
    expect(SPRITE_CELLS.filter((c) => !used.has(c.id)).map((c) => c.id)).toEqual(['LG58', 'LG59', 'LG60']);
    const dry = new Set(SHP_FRAMES.slice(0, SHP_WATER_OFFSET).flat().map((t) => t[0]));
    for (const id of ['HD1', 'HF1', 'HB1', 'FF1', 'FB1', 'ST1', 'ST2', 'SP1', 'SP4', 'SR2', 'SR16', 'SR21', 'SR30']) expect(dry.has(id), id).toBe(false);
  });

  it('pairs put every sequence on a front or a back, and the water frames follow the same order', () => {
    expect(SEQ_PAIRS).toHaveLength(6 + (SEQS.length - 6) / 2);
    for (const pair of SEQ_PAIRS.slice(6)) expect(pair.back.seq).toBe(pair.front.seq + 1);
    expect(SHP_WATER_OFFSET).toBe(182);
    expect(shpTiles(19 + SHP_WATER_OFFSET).map((t) => t.id)).toEqual(['HR1', 'SP3']);
    expect(shpTiles(23 + SHP_WATER_OFFSET).map((t) => t.id)).toEqual(['ST1']);
  });
});

describe('lookup tables', () => {
  it('BODY_ANCHOR_MAP holds in every first-half SHP frame outside the walk cycle (mirrored tiles about the origin)', () => {
    for (let fi = 0; fi < 182; fi++) {
      if (fi >= 9 && fi <= 18) continue;
      for (const t of shpTiles(fi)) {
        const a = A.BODY_ANCHOR_MAP[t.id];
        if (!a) continue;
        const sign = t.flip ? -1 : 1;
        expect({ dx: (t.cx - SHP_ORIGIN_X) * sign, dy: t.cy - STANCE_Y }, `F${fi} ${t.id}`).toEqual(a);
      }
    }
  });

  it('WALK_BOB_DY is the extra sink of the walk frames F9-F18', () => {
    for (const first of [9, 14]) {
      A.WALK_BOB_DY.forEach((bob, i) => {
        const [, body] = shpTiles(first + i);
        expect(body.cy - STANCE_Y - A.BODY_ANCHOR_MAP[body.id].dy).toBe(bob);
      });
    }
  });

  it('TORSO_HEAD_MAP holds in every full-body SHP frame', () => {
    for (let fi = 84; fi < 182; fi++) {
      const tiles = shpTiles(fi);
      for (const t of tiles) {
        const m = A.TORSO_HEAD_MAP[t.id];
        if (!m) continue;
        const head = tiles.find((h) => h.id === m.id);
        expect({ dx: head.cx - t.cx, dy: head.cy - t.cy }, `F${fi} ${t.id}`).toEqual({ dx: m.dx, dy: m.dy });
      }
    }
  });

  it('no assembly tile carries a manual flip (TYPE1.SHP has no reverseX on ported overlays)', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../three-isometric-engine/constants/sprites/assembly.js'), 'utf8');
    expect(source).not.toContain('tileManuallyReversed');
  });
});

describe('SEQ unit motion (0xFFxx move opcodes)', () => {
  const allMoves = (asm) => asm.map((p) => p.frames.map((f) => f.move));

  it('punch and stab frames carry the SEQ wind-up / lunge offsets in every pattern', () => {
    for (const [asm, front, back] of [[A.PUNCH_ASSEMBLY, 140, 141], [A.PUNCH_LV2_ASSEMBLY, 142, 143], [A.PUNCH_LV3_ASSEMBLY, 144, 145], [A.STAB_ASSEMBLY, 96, 97], [A.STAB_LV2_ASSEMBLY, 98, 99], [A.STAB_LV3_ASSEMBLY, 100, 101]]) {
      expect(seqMotion(back)).toEqual(seqMotion(front));
      for (const moves of allMoves(asm)) expect(moves, asm[1].seq).toEqual(seqMotion(front));
    }
  });

  it('Quick Throw rises 2px on the overhead frame (SEQ 48/49)', () => {
    for (const moves of allMoves(A.QUICK_THROW_ASSEMBLY)) expect(moves).toEqual(seqMotion(48));
    expect(seqMotion(49)).toEqual(seqMotion(48));
  });

  it('Float bobs 2px on the walk timing (SEQ 12/13)', () => {
    for (const s of [12, 13]) {
      expect(A.FLOAT_MOVES).toEqual(seqMotion(s));
      expect(msToTicks(A.FLOAT_DELAYS)).toEqual(seqTicks(s));
    }
  });

  it('Flinch shivers 1px every 2 ticks (SEQ 38/39)', () => {
    for (const s of [38, 39]) {
      expect(A.HURT_SHIVER_MOVES).toEqual(seqMotion(s));
      expect(msToTicks(A.HURT_SHIVER_DELAYS)).toEqual(seqTicks(s));
    }
  });

  it('Fatal Item Impact timeline replays SEQ 82/83: compositions, ticks and the 12px hop', () => {
    for (const [pi, s] of [[1, 82], [2, 83]]) {
      const unique = [...new Set(seqFrames(s))];
      expect(A.FATAL_ITEM_IMPACT_TIMELINE.map((e) => unique[e.frame])).toEqual(seqFrames(s));
      expect(msToTicks(A.FATAL_ITEM_IMPACT_TIMELINE.map((e) => e.delay))).toEqual(seqTicks(s));
      expect(A.FATAL_ITEM_IMPACT_TIMELINE.map((e) => e.move)).toEqual(seqMotion(s));
      expect(A.FATAL_ITEM_IMPACT_ASSEMBLY[pi].frames).toHaveLength(unique.length);
    }
  });

  it('the assembly sequences without motion are motion-free over their ported frames', () => {
    const still = (s, n = Infinity) => seqMotion(s).slice(0, n).every((m) => m.fb === 0 && m.du === 0);
    for (const s of [6, 7, 64, 65, 68, 69, 70, 71, 76, 77, 84, 85, 208, 209]) expect(still(s), `SEQ ${s}`).toBe(true);
  });
});

//NOTE(@jimmylee)
//Action timing read from the SEQ control opcodes (documentation/seq_animation_to_frame/AGENTS.md
//"Opcodes"): IncrementLoop 0xFFD5, PlaySound 0xFFF6, MoveUp1 0xFFCC / MoveDown1 0xFFD0, and
//LoadFrameAndWait with a delay of 0 (hold until the game moves on).
describe('SEQ-driven action timing', () => {
  const ticksToS = (ticks) => ticks.reduce((a, b) => a + b, 0) / 60;

  it('Float is animation 0x12/0x13: a looping 2px hover with Haste / Slow copies, like Walk', () => {
    expect(SEQ_RAW_IDS.slice(6, 8)).toEqual([0x06, 0x07]);
    expect(SEQ_RAW_IDS.slice(12, 18)).toEqual([0x12, 0x13, 0x14, 0x15, 0x16, 0x17]);
    for (let s = 12; s < 18; s++) {
      const ops = SEQS[s].filter((x) => x.op !== undefined).map((x) => x.op);
      expect(new Set(ops), `SEQ ${s}`).toEqual(new Set([0xcc, 0xd0, 0xd5]));
      expect(ops.at(-1), `SEQ ${s}`).toBe(0xd5);
      expect(seqMotion(s), `SEQ ${s}`).toEqual(seqMotion(12));
      expect(new Set(seqFrames(s)), `SEQ ${s}`).toEqual(new Set([s % 2 ? 71 : 70]));
    }
    for (const [float, walk] of [[12, 6], [14, 8], [16, 10]]) expect(seqTicks(float)).toEqual(seqTicks(walk));
  });

  it('Jump takes off on Jump 2, flies on the Mid Jump pose and lands on High Jump Land', () => {
    for (const [takeoff, mid, land] of [[204, 42, 52], [205, 43, 53]]) {
      expect(seqTicks(takeoff).at(-1), `SEQ ${takeoff} holds the frame it leaves the ground on`).toBe(0);
      expect(seqFrames(takeoff).at(-1), `SEQ ${takeoff} ends on the Mid Jump pose`).toBe(seqFrames(mid)[0]);
      expect(A.JUMP_TICKS.slice(0, A.JUMP_TAKEOFF_FRAMES)).toEqual(seqTicks(takeoff).slice(0, A.JUMP_TAKEOFF_FRAMES));
      expect(A.JUMP_TICKS.slice(A.JUMP_TAKEOFF_FRAMES + 1)).toEqual(seqTicks(land));
      expect(JUMP_TAKEOFF_S).toBeCloseTo(ticksToS(seqTicks(takeoff).slice(0, A.JUMP_TAKEOFF_FRAMES)), 10);
    }
    expect(A.JUMP_ASSEMBLY[1].frames.map((f) => f.move)).toEqual([...seqMotion(204), ...seqFrames(52).map(() => ({ fb: 0, du: 0 }))]);
    expect(JUMP_TOUCHDOWN_S - JUMP_TAKEOFF_S).toBeCloseTo(ticksToS([A.JUMP_AIR_TICKS]), 10);
    expect(jumpLift(0)).toBe(0);
    expect(jumpLift(JUMP_TAKEOFF_S)).toBe(0);
    expect(jumpLift(JUMP_TOUCHDOWN_S)).toBe(0);
    expect(jumpLift(JUMP_TOUCHDOWN_S + 0.1)).toBe(0);
    expect(jumpLift((JUMP_TAKEOFF_S + JUMP_TOUCHDOWN_S) / 2)).toBeCloseTo(JUMP_LIFT_HEIGHT, 10);
    for (let t = JUMP_TAKEOFF_S + 0.01; t < JUMP_TOUCHDOWN_S; t += 0.01) expect(jumpLift(t)).toBeGreaterThan(0);
  });

  it('Throw Stone picks up on the kneel and releases on the first frame after PlaySound', () => {
    for (const [s, kneel, key] of [[208, 21, 'fwd'], [209, 22, 'bck']]) {
      const drawnBefore = (k) => SEQS[s].slice(0, k).filter((x) => x.op === undefined).length;
      expect(drawnBefore(SEQS[s].findIndex((x) => x.op === 0xf6)), `SEQ ${s}`).toBe(THROW_STONE_RELEASE_FRAME);
      expect(seqFrames(s).indexOf(kneel), `SEQ ${s}`).toBe(THROW_STONE_SPAWN_FRAME);
      for (const sheet of Object.keys(A.THROW_STONE_HANDS)) {
        const hands = A.THROW_STONE_HANDS[sheet][key];
        expect(hands).toHaveLength(seqFrames(s).length);
        hands.forEach((hand, k) => expect(hand !== null, `${sheet} SEQ ${s} frame ${k}`).toBe(k >= THROW_STONE_SPAWN_FRAME && k <= THROW_STONE_LAST_HELD_FRAME));
      }
    }
  });

  //NOTE(@jimmylee)
  //Each sheet draws the throwing hand in its own colors (a1.png: pink skin). The grip must be a visible
  //pixel of that color in the composited frame of that sheet; frames share their tiles, not their art.
  const HAND_COLORS = {
    'a1.png': [0xda7bc4, 0xf5adde, 0xc972ad, 0xa34d95, 0x89326d],
  };

  for (const sheet of Object.keys(A.THROW_STONE_GRIPS)) {
    it(`${sheet}: every throwing-hand grip is a visible hand pixel of its tile, and the hand point is its center`, () => {
      const { fwd, bck } = A.THROW_STONE_GRIPS[sheet];
      for (const [s, pi, grips, hands] of [[208, 1, fwd, A.THROW_STONE_HANDS[sheet].fwd], [209, 2, bck, A.THROW_STONE_HANDS[sheet].bck]]) {
        seqFrames(s).forEach((fi, k) => {
          const grip = grips[k];
          if (!grip) return expect(hands[k], `SEQ ${s} frame ${k}`).toBe(null);
          const frame = A.THROW_STONE_ASSEMBLY[pi].frames[k];
          expect(grip.layer === 'body' ? frame.body : frame[grip.layer]?.id, `SEQ ${s} frame ${k} grip layer`).toBe(grip.id);
          const tile = FRAMES[fi].find((t, i) => shpTiles(fi)[i].id === grip.id);
          const x = tile.x + grip.x;
          const y = tile.y + grip.y;
          const seen = visiblePixel(fi, x, y, sheet);
          expect(seen?.id, `${sheet} SEQ ${s} frame ${k} (F${fi}) grip ${grip.id} (${grip.x}, ${grip.y})`).toBe(grip.id);
          expect(HAND_COLORS[sheet], `${sheet} SEQ ${s} frame ${k} (F${fi}) hand color`).toContain(seen.rgb);
          expect(hands[k], `SEQ ${s} frame ${k}`).toEqual([x + 0.5 - SHP_ORIGIN_X, y + 0.5 - STANCE_Y]);
        });
      }
    });
  }

  //NOTE(@jimmylee)
  //The bow props ride a1.png's hands, the sheet the demos draw. A grip is a hand-colored pixel of the
  //composited frame, on the tile that draws it, and frame.bowHand / frame.drawHand are its center. LG17
  //(the ready pose) draws no hand and LG48 hides it behind the sleeve, so they name the sleeve's tip.
  //F169 is the arm rising across the chest, two ticks before the arrow is nocked.
  it('every Bow frame has its bow hand and draw hand on visible a1.png hand pixels', () => {
    const SLEEVE_ONLY = ['LG17', 'LG48'];
    const ARM_CROSSES_THE_HAND = 169;
    for (const [s, assembly] of [[140, A.PUNCH_ASSEMBLY], [142, A.PUNCH_LV2_ASSEMBLY], [144, A.PUNCH_LV3_ASSEMBLY]]) {
      for (const [seq, pi] of [[s, 1], [s + 1, 2]]) {
        seqFrames(seq).forEach((fi, k) => {
          const frame = assembly[pi].frames[k];
          const raw = FRAMES[fi][shpTiles(fi).findIndex((t) => t.id === frame.front.id)];
          const [gx, gy] = A.HAND_GRIPS[frame.front.id];
          expect(frame.bowHand, `SEQ ${seq} frame ${k} (F${fi})`).toEqual([raw.x + gx + 0.5 - SHP_ORIGIN_X, raw.y + gy + 0.5 - STANCE_Y]);
          if (!SLEEVE_ONLY.includes(frame.front.id)) expect(HAND_COLORS['a1.png'], `SEQ ${seq} frame ${k} (F${fi}) bow hand`).toContain(visiblePixel(fi, raw.x + gx, raw.y + gy, 'a1.png').rgb);
          const grip = A.BOW_DRAW_GRIPS[frame.body];
          if (!grip) return expect(frame.drawHand, `SEQ ${seq} frame ${k} (F${fi})`).toBe(null);
          const torso = FRAMES[fi][shpTiles(fi).findIndex((t) => t.id === frame.body)];
          expect(frame.drawHand, `SEQ ${seq} frame ${k} (F${fi})`).toEqual([torso.x + grip[0] + 0.5 - SHP_ORIGIN_X, torso.y + grip[1] + 0.5 - STANCE_Y]);
          if (fi === ARM_CROSSES_THE_HAND) return;
          expect(HAND_COLORS['a1.png'], `SEQ ${seq} frame ${k} (F${fi}) draw hand`).toContain(visiblePixel(fi, torso.x + grip[0], torso.y + grip[1], 'a1.png').rgb);
        });
      }
    }
  });

  //NOTE(@jimmylee)
  //The stone leaves as the throw frame starts, from the hand of the last held frame: it must be on
  //the facing side of the body (canvas x below the origin column for the unmirrored patterns), and
  //the arm of the throw frame must already have gone past it, lower down.
  it('the stone leaves the facing side of the unit, above the follow-through', () => {
    for (const sheet of Object.keys(A.THROW_STONE_HANDS)) {
      for (const key of ['fwd', 'bck']) expect(A.THROW_STONE_HANDS[sheet][key][THROW_STONE_LAST_HELD_FRAME][0], `${sheet} ${key}`).toBeLessThan(0);
    }
    expect(THROW_LAUNCH_FORWARD).toBeGreaterThan(0);
    expect(-THROW_LAUNCH_UP / 0.9).toBeCloseTo(A.THROW_STONE_HANDS['a1.png'].fwd[THROW_STONE_LAST_HELD_FRAME][1], 9);
    for (const [fi, lowest, key] of [[102, 'LG30', 'fwd'], [151, 'LG27', 'bck']]) {
      const hand = shpTiles(fi).find((t) => t.id === lowest);
      expect(hand.cy - STANCE_Y, `F${fi}`).toBeGreaterThan(A.THROW_STONE_HANDS['a1.png'][key][THROW_STONE_LAST_HELD_FRAME][1]);
    }
  });

  //NOTE(@jimmylee)
  //A caught marble rides the throw-stone grips from the kneel to overhead, which is only true while
  //the two sequences draw the same SHP frames there. SEQ 206/207 draw these six frames and play the
  //throw's sound right before the overhead frame, where the marble leaves.
  it('Quick Throw frames 2-5 are Throw Stone frames 2-5 in every pattern, and it releases on the throw sound', () => {
    for (const [quick, stone] of [[48, 208], [49, 209]]) {
      for (let k = QT_PICKUP_FRAME; k <= QT_RELEASE_FRAME; k++) expect(seqFrames(quick)[k], `SEQ ${quick} frame ${k}`).toBe(seqFrames(stone)[k]);
      expect(SEQS[quick].filter((x) => x.op !== undefined && x.op !== 0xcb), `SEQ ${quick}`).toEqual([]);
    }
    for (const s of [206, 207]) {
      const sound = SEQS[s].findIndex((x) => x.op === 0xf6);
      expect(SEQS[s].slice(0, sound).filter((x) => x.op === undefined).reduce((a, x) => a + x.delay, 0), `SEQ ${s}`).toBe(QT_RELEASE_TICKS);
    }
    A.QUICK_THROW_ASSEMBLY.forEach((pattern, p) => {
      expect(pattern.reversed).toBe(A.THROW_STONE_ASSEMBLY[p].reversed);
      for (let k = QT_PICKUP_FRAME; k <= QT_RELEASE_FRAME; k++) {
        const { move: _move, ...tiles } = pattern.frames[k];
        expect(tiles, `pattern ${p} frame ${k}`).toEqual(A.THROW_STONE_ASSEMBLY[p].frames[k]);
      }
    });
  });

  //NOTE(@jimmylee)
  //0xC4 is the carried object of SEQ 80/81: it sits on the ground under the kneel and between the two
  //raised hands overhead. The track is read from the opcode, and its forward pixels land on the arms.
  it('CARRY_TRACK is the 0xC4 track of SEQ 80/81, on the frames it is drawn with', () => {
    for (const [s, key, overhead, lift] of [[80, 'fwd', 28, 31], [81, 'bck', 30, 33]]) {
      const track = new Map();
      let held = null;
      for (const x of SEQS[s]) {
        if (x.op === 0xc4) held = x.args;
        else if (x.op === 0xc3) held = null;
        else if (x.op === undefined && held) track.set(x.frame, held);
      }
      for (const [frame, point] of track) expect(A.CARRY_TRACK[key][frame], `SEQ ${s} F${frame}`).toEqual(point);
      expect(A.CARRY_TRACK[key][lift]).toEqual(A.CARRY_TRACK[key][overhead]);
      const arms = shpTiles(overhead).filter((t) => t.id.startsWith('EF'));
      const hands = shpTiles(lift).filter((t) => t.id.startsWith('EF'));
      expect(hands).toEqual(arms);
      const middle = (arms[0].cx + arms[1].cx) / 2 - SHP_ORIGIN_X;
      expect(Math.abs(-A.CARRY_TRACK[key][overhead][0] - middle), `SEQ ${s}`).toBeLessThanOrEqual(0.5);
    }
  });

  it('a caught marble body rises from the kneel to overhead on the carry track', () => {
    const height = (frame) => Math.max(-(A.CARRY_TRACK.fwd[frame][1] + A.CARRY_ORIGIN_V) * 0.9, -8);
    const ticksToMs = (t) => (t * 1000) / 60;
    expect(quickThrowHoldHeight(0)).toBeCloseTo(height(21), 9);
    expect(quickThrowHoldHeight(ticksToMs(12))).toBeCloseTo(height(21), 9);
    expect(quickThrowHoldHeight(ticksToMs(17))).toBeCloseTo(height(19), 9);
    expect(quickThrowHoldHeight(ticksToMs(20))).toBeCloseTo(height(27), 9);
    expect(quickThrowHoldHeight(QT_RELEASE_MS)).toBeCloseTo(height(31), 9);
  });

  it('a1.png keeps the SHP tile layout', () => {
    const a1 = sheetPixels('a1.png');
    expect([a1.width, a1.height]).toEqual([SHEET_W, SHEET_H]);
  });

  //NOTE(@jimmylee)
  //The ported delays are the exact SEQ ticks, so a frame boundary and an action timed in ticks agree.
  it('delays are exact tick times and action moments fall on frame boundaries', () => {
    const exact = (arr, ticks) => arr.forEach((ms, k) => expect(ms).toBeCloseTo((ticks[k] * 1000) / 60, 9));
    exact(A.WALK_DELAYS, seqTicks(6));
    exact(A.PUNCH_LV2_DELAYS, seqTicks(142));
    exact(A.STAB_LV3_DELAYS, seqTicks(100));
    const startOf = (delays, k) => delays.slice(0, k).reduce((a, b) => a + b, 0);
    expect(startOf(A.PUNCH_LV2_DELAYS, 3)).toBeCloseTo(PUNCH_HIT_MS, 9);
    expect(startOf(A.PUNCH_LV2_DELAYS, 8)).toBeCloseTo(PUNCH_CYCLE_MS, 9);
    expect(startOf(A.QUICK_THROW_DELAYS, QT_PICKUP_FRAME)).toBeCloseTo(QT_PICKUP_MS, 9);
    expect(startOf(A.QUICK_THROW_DELAYS, QT_RELEASE_FRAME)).toBeCloseTo(QT_RELEASE_MS, 9);
    expect(startOf(A.QUICK_THROW_DELAYS, 6)).toBeCloseTo(QT_CYCLE_MS, 9);
  });

  //NOTE(@jimmylee)
  //PostGenericAttack (0xFFDE, damage numbers) sits right before the stab's extend frame in every stab
  //sequence — the hit check of A1 and Mode S1 — and the SEQ loops 70/71 are all a jump draws in the air.
  it('the stab hit frame is the frame after PostGenericAttack', () => {
    for (const s of [96, 97, 98, 99, 100, 101]) {
      const drawnBefore = SEQS[s].slice(0, SEQS[s].findIndex((x) => x.op === 0xde)).filter((x) => x.op === undefined).length;
      expect(drawnBefore, `SEQ ${s}`).toBe(STAB_HIT_FRAME);
    }
  });

  it('A1 jump draws the last take-off frames, then holds the Mid Jump pose for as long as it lasts', () => {
    const ticks = (t) => t / 60;
    expect(playerJumpFrame(ticks(1))).toBe(JUMP_AIR_FRAME - 2);
    expect(playerJumpFrame(ticks(5))).toBe(JUMP_AIR_FRAME - 1);
    for (const t of [9, 40, 400]) expect(playerJumpFrame(ticks(t)), `tick ${t}`).toBe(JUMP_AIR_FRAME);
  });

  it('A1 landing plays High Jump Land once from touchdown', () => {
    const ticks = (t) => t / 60;
    expect([1, 3, 13, 15, 17].map((t) => playerLandFrame(ticks(t)))).toEqual([JUMP_AIR_FRAME + 1, JUMP_AIR_FRAME + 2, JUMP_AIR_FRAME + 3, JUMP_AIR_FRAME + 3, JUMP_AIR_FRAME + 3]);
    expect(playerLandFrame(ticks(18.5))).toBe(-1);
  });
});

//NOTE(@jimmylee)
//SEQ names are kept by raw animation id (documentation/seq_animation_to_frame/AGENTS.md "Names"). The
//binary backs them up: what each family shares with its neighbours and what it does at the moment of
//the hit.
describe('SEQ names agree with what the sequences draw', () => {
  const nameOf = (seq) => SEQ_LIBRARY[seq].name;
  const ops = (seq) => SEQS[seq].filter((x) => x.op !== undefined).map((x) => x.op);
  const frames = (from, to) => new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i));

  it('names by raw animation id', () => {
    const named = { 0x38: 'Jump Up Fwd', 0x3c: 'High Jump Start Fwd', 0x40: 'High Jump Land Fwd', 0x50: 'Singing Fwd', 0x52: 'Dancing Fwd', 0x54: 'Casting Fwd', 0x58: 'Cast Execute Fwd', 0x78: 'Teleport Fwd', 0x7a: 'Unarmed High Fwd', 0x80: 'Swing High Fwd', 0x98: 'Weapon Throw Fwd', 0x9a: 'Poke High Fwd', 0xa0: 'Gun High Fwd', 0xa6: 'Bow High Fwd', 0xac: 'Read Book Fwd', 0xae: 'Play Instrument Fwd', 0xb0: 'Shield Block High Fwd', 0xd4: 'Rush Fwd', 0xd8: 'Talk Skill Fwd', 0xda: 'Fall Critical Fwd', 0xe2: 'Steal Fwd', 0xe8: 'Jump 2 Fwd', 0xea: 'Dragoon Jump 2 Fwd', 0xec: 'Dragoon Jump 3 Fwd', 0xfa: 'Spin Punch Fwd' };
    for (const [raw, name] of Object.entries(named)) expect(SEQ_LIBRARY.find((e) => e.raw === Number(raw)).name, `0x${Number(raw).toString(16)}`).toBe(name);
    expect(SEQ_LIBRARY.filter((e) => /Whip|Staff|Stab|Punch Lv|Bow Lv/.test(e.name))).toEqual([]);
  });

  it('a bow shot has no PostGenericAttack: the arrow lands the hit, every melee family has one', () => {
    for (let s = 140; s <= 145; s++) expect(ops(s), `SEQ ${s}`).not.toContain(0xde);
    for (const s of [96, 98, 100, 102, 104, 106, 128, 130, 132, 134, 136, 138]) expect(ops(s), `SEQ ${s}`).toContain(0xde);
  });

  it('shield recoils reuse the frames of the attack they name', () => {
    for (const s of [162, 164]) for (const f of seqFrames(s)) expect(frames(92, 94).has(f), `SEQ ${s} F${f}`).toBe(true);
    for (const s of [168, 170]) for (const f of seqFrames(s)) expect(frames(103, 105).has(f), `SEQ ${s} F${f}`).toBe(true);
    for (const s of [156, 158]) for (const f of seqFrames(s)) expect(frames(84, 87).has(f), `SEQ ${s} F${f}`).toBe(true);
  });

  it('Read Book 2 repeats Read Book, Talk Skill is its short loop, and Spin Punch ends on Unarmed Mid', () => {
    expect(new Set(seqFrames(188))).toEqual(new Set(seqFrames(146)));
    expect(seqFrames(190)).toEqual([128, 129]);
    expect(seqFrames(216).slice(8, 14)).toEqual(seqFrames(98).slice(0, 6));
  });
});

//NOTE(@jimmylee)
//The tests read a frozen copy of the decoder's output, so nothing else runs the decoder the skill carries
//for a reader's own files. These bytes are built by hand against the layouts in documentation/.
describe('the decoder', () => {
  it('reads both SHP frame tables, reversing tiles and offsetting the second half', () => {
    const b = Buffer.alloc(0x830);
    b.writeUInt32LE(0x420, 0);
    b.writeUInt16LE(1, 4);
    b.writeUInt32LE(10, 0x0c);
    //Frame 0: two tiles. Tile 0 is 16x8 at sheet (8, 16), x and y signed. Tile 1 is 8x8, both flips.
    b.writeUInt16LE(1, 0x40a);
    b.writeInt8(-3, 0x40c);
    b.writeInt8(4, 0x40d);
    b.writeUInt16LE(1 | (2 << 5) | (1 << 10), 0x40e);
    b.writeUInt16LE(0xc000, 0x412);
    //Frame 1 sits at the second half index, so its sheet row is 256 lower.
    b.writeUInt16LE(2 << 5, 0x418);
    //Frame 2 is the first of the second table, at jump + 0x402.
    b.writeUInt16LE(3, 0x826);
    expect(decodeShp(b)).toEqual([
      [
        { x: 53, y: 118, sx: 0, sy: 0, w: 8, h: 8, reverseX: true, reverseY: true },
        { x: 50, y: 122, sx: 8, sy: 16, w: 16, h: 8, reverseX: false, reverseY: false },
      ],
      [{ x: 53, y: 118, sx: 0, sy: 272, w: 8, h: 8, reverseX: false, reverseY: false }],
      [{ x: 53, y: 118, sx: 24, sy: 0, w: 8, h: 8, reverseX: false, reverseY: false }],
    ]);
  });

  it('reads SEQ pairs and opcodes, skipping duplicate pointers and sequences that draw nothing', () => {
    const b = Buffer.alloc(0x406 + 16);
    [0, 0, 8, 12].forEach((offset, i) => b.writeUInt32LE(offset, 4 + i * 4));
    b.writeUInt32LE(0xffffffff, 20);
    b.set([5, 2, 0xff, 0xc4, 3, 0xfe, 0xff, 0xd5, 0xff, 0xd5, 0xff, 0xff, 7, 0, 0xff, 0xff], 0x406);
    expect(decodeSeq(b)).toEqual({
      seqs: [
        [{ frame: 5, delay: 2 }, { op: 0xc4, args: [3, -2] }, { op: 0xd5, args: [] }],
        [{ frame: 7, delay: 0 }, { op: 0xff, args: [] }],
      ],
      rawIds: [1, 3],
    });
  });
});
