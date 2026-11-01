//NOTE(jimmylee)
//TYPE1.SHP / TYPE1.SEQ decoder shared by the sprite parity tests. decodeShp and decodeSeq read the
//files the way the Shishi sprite editor does (its Shape.cs, Frame.cs, Tile.cs, Sequence.cs) and also
//keep the SEQ 0xFFxx opcodes, which the editor skips but the game executes (unit movement — see
//SEQ_MOVE_OPCODES). The tests read tests/fixtures/type1.json, this decoder's output, frozen. Set
//TYPE1_DIR to a folder holding your own TYPE1.SHP and TYPE1.SEQ to decode those instead.

import fs from 'node:fs';
import path from 'node:path';
import { SPRITE_CELLS } from '@engine/constants/sprites';
import { SHP_ORIGIN_X, STANCE_Y } from '@engine/constants/sprites/assembly';
import { decodePng } from '@root/assets/check-sheet.mjs';

const TILE_SIZES = [[8, 8], [16, 8], [16, 16], [16, 24], [24, 8], [24, 16], [24, 24], [32, 8], [32, 16], [32, 24], [32, 32], [32, 40], [48, 16], [40, 32], [48, 48], [56, 56]];

//NOTE(jimmylee)
//Sequence.cs jump table: opcode → number of parameter bytes. The table in Sequence.cs has no entry
//for 0xC4, so the editor reads its two parameters as a [frame, delay] pair: SEQ 80/81/90/91 then
//show frames that are not drawn, with delays like 250. 0xC4 is the carried-object track, so it is
//listed here as two bytes (forward px, height px: see CARRY_TRACK in constants/sprites/assembly.js).
export const SEQ_JUMPS = { 192: 1, 198: 1, 211: 1, 212: 1, 214: 1, 215: 1, 216: 1, 226: 1, 238: 1, 239: 1, 240: 1, 246: 1, 193: 2, 196: 2, 217: 2, 242: 2, 252: 2, 250: 3 };

const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const s8 = (v) => (v << 24) >> 24;

//NOTE(jimmylee)
//Frame.cs: tile count = first u16 + 1, tiles reversed after parsing so index 0 is drawn first (back).
//Tile.cs: canvas position = signed (x + 53, y + 118) — the SHP origin is canvas (53, 118);
//flags pick source rect, size, reverseX/Y.
function decodeFrame(b, off, yOffset) {
  const n = b[off] + b[off + 1] * 256;
  const tiles = [];
  for (let i = 0; i <= n; i++) {
    const p = off + 2 + i * 4;
    const flags = b[p + 2] + b[p + 3] * 256;
    const [w, h] = TILE_SIZES[(flags >> 10) & 0xf];
    tiles.push({ x: s8(b[p]) + 53, y: s8(b[p + 1]) + 118, sx: (flags & 0x1f) * 8, sy: ((flags >> 5) & 0x1f) * 8 + yOffset, w, h, reverseX: !!(flags & 0x4000), reverseY: !!(flags & 0x8000) });
  }
  return tiles.reverse();
}

export function decodeShp(b) {
  const jump = u32(b, 0);
  const secondHalf = b[4] + b[5] * 256;
  const read = (base) => {
    const offsets = [0];
    for (let i = 0, a; (a = u32(b, base + 4 * i)) !== 0; i++) offsets.push(a);
    return offsets;
  };
  const frames = read(0x0c).map((o, k) => decodeFrame(b, o + 0x40a, k >= secondHalf ? 256 : 0));
  read(jump + 4).forEach((o, k) => frames.push(decodeFrame(b, o + jump + 0x402, k >= secondHalf ? 256 : 0)));
  return frames;
}

//NOTE(jimmylee)
//Sequence.cs: offset table from byte 4 until 0xFFFFFFFF, duplicate offsets skipped, animation
//data at 0x406, [frame, delay] pairs. 0xFF opcodes are kept as { op, args } entries.
export function decodeSeq(b) {
  const offs = [];
  for (let i = 0; i < 0x100; i++) {
    const o = u32(b, i * 4 + 4);
    if (o === 0xffffffff) break;
    offs.push(o);
  }
  const parse = (start, end) => {
    const out = [];
    for (let i = start; i < end - 1; i += 2) {
      if (b[i] !== 0xff) {
        out.push({ frame: b[i], delay: b[i + 1] });
      } else {
        const n = SEQ_JUMPS[b[i + 1]] || 0;
        out.push({ op: b[i + 1], args: [...b.subarray(i + 2, i + 2 + n)].map(s8) });
        i += n;
      }
    }
    return out;
  };
  const seqs = [];
  const rawIds = [];
  for (let i = 0; i < offs.length - 1; i++) {
    if (offs[i] === offs[i + 1]) continue;
    const s = parse(0x406 + offs[i], 0x406 + offs[i + 1]);
    if (s.some((x) => x.op === undefined)) {
      seqs.push(s);
      rawIds.push(i);
    }
  }
  const last = parse(0x406 + offs[offs.length - 1], b.length);
  if (last.some((x) => x.op === undefined)) {
    seqs.push(last);
    rawIds.push(offs.length - 1);
  }
  return { seqs, rawIds };
}

const TYPE1_DIR = process.env.TYPE1_DIR;
const readType1 = (file) => fs.readFileSync(path.join(TYPE1_DIR, file));
const TYPE1 = TYPE1_DIR
  ? { frames: decodeShp(readType1('TYPE1.SHP')), ...decodeSeq(readType1('TYPE1.SEQ')) }
  : JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/type1.json'), 'utf8'));

export const FRAMES = TYPE1.frames;
export const SEQS = TYPE1.seqs;
//NOTE(@jimmylee)
//The game's animation id (raw pointer-table index) of each SEQS entry. SEQS skips duplicate and empty
//pointers, so its index is not the animation id the game uses (e.g. SEQS[12] is animation 0x12).
export const SEQ_RAW_IDS = TYPE1.rawIds;
const CELL_BY_RECT = new Map(SPRITE_CELLS.map((c) => [`${c.x},${c.y},${c.w},${c.h}`, c.id]));
export const cellIdForRect = (x, y, w, h) => CELL_BY_RECT.get(`${x},${y},${w},${h}`);

//NOTE(jimmylee)
//SHP frame → [{ id, cx, cy, flip, flipY }] back-to-front, centers in canvas pixels.
export function shpTiles(fi) {
  return FRAMES[fi].map((t) => ({ id: cellIdForRect(t.sx, t.sy, t.w, t.h), cx: t.x + t.w / 2, cy: t.y + t.h / 2, flip: t.reverseX, flipY: t.reverseY }));
}

//NOTE(jimmylee)
//The game mirrors a unit about its origin column (canvas x = SHP_ORIGIN_X). The mirrored idle frames
//F4-F6 are exactly this transform of F2/F1/F8, which the rig tests rely on.
export function mirrorTiles(tiles) {
  return tiles.map((t) => ({ ...t, cx: 2 * SHP_ORIGIN_X - t.cx, flip: !t.flip }));
}

export const seqFrames = (s) => SEQS[s].filter((x) => x.op === undefined).map((x) => x.frame);
export const seqTicks = (s) => SEQS[s].filter((x) => x.op === undefined).map((x) => x.delay);

//NOTE(jimmylee)
//Unit-movement opcodes (documentation/seq_animation_to_frame/AGENTS.md "Opcodes"). Units are pixels.
//fb: forward (+) / backward (-) relative to facing. du: down (+) / up (-).
const MOVE = {
  0xcb: [0, -2], // MoveUp2
  0xcc: [0, -1], // MoveUp1
  0xcd: [-2, 0], // MoveBackward2
  0xce: [-1, 0], // MoveBackward1
  0xcf: [0, 2], // MoveDown2
  0xd0: [0, 1], // MoveDown1
  0xd1: [2, 0], // MoveForward2
  0xd2: [1, 0], // MoveForward1
};
export const SEQ_MOVE_OPCODES = [...Object.keys(MOVE).map(Number), 0xee, 0xef, 0xf0, 0xfa];

//NOTE(jimmylee)
//Per displayed frame, the unit offset (fb, du) accumulated from the SEQ start, in pixels.
//A move opcode applies to every frame drawn after it (LoadFrameAndWait draws at the current offset).
//`lateral: 'skip'` reads past MoveUnitRL (0xF0, SEQ 36/37 only), whose side the port does not model.
export function seqMotion(s, { lateral = 'throw' } = {}) {
  let fb = 0;
  let du = 0;
  const out = [];
  for (const x of SEQS[s]) {
    if (x.op === undefined) out.push({ fb, du });
    else if (MOVE[x.op]) { fb += MOVE[x.op][0]; du += MOVE[x.op][1]; }
    else if (x.op === 0xee) fb += x.args[0];
    else if (x.op === 0xef) du += x.args[0];
    else if ((x.op === 0xf0 || x.op === 0xfa) && lateral === 'throw') throw new Error(`SEQ ${s}: lateral move opcode 0x${x.op.toString(16)} is not modeled`);
  }
  return out;
}

//NOTE(@jimmylee)
//A character sheet as RGBA, from public/static/textures, through the decoder the sheet checker uses.
//`at(x, y)` reads one pixel as [r, g, b, a]; a = 0 is the transparent key.
const decodeSheet = (file) => decodePng(fs.readFileSync(path.resolve(__dirname, '../../public/static/textures', file)));
const SHEETS = new Map();
export function sheetPixels(file) {
  if (!SHEETS.has(file)) SHEETS.set(file, decodeSheet(file));
  return SHEETS.get(file);
}

//NOTE(@jimmylee)
//The tile drawn on top at canvas pixel (x, y) of SHP frame `fi` on `sheet` — the frontmost tile with
//an opaque sheet pixel there — as { id, rgb }, or null when the pixel is empty.
export function visiblePixel(fi, x, y, sheet = 'a1.png') {
  const pixels = sheetPixels(sheet);
  const tiles = FRAMES[fi];
  for (let i = tiles.length - 1; i >= 0; i--) {
    const t = tiles[i];
    const lx = x - t.x;
    const ly = y - t.y;
    if (lx < 0 || ly < 0 || lx >= t.w || ly >= t.h) continue;
    const [r, g, b, a] = pixels.at(t.sx + (t.reverseX ? t.w - 1 - lx : lx), t.sy + (t.reverseY ? t.h - 1 - ly : ly));
    if (a !== 0) return { id: cellIdForRect(t.sx, t.sy, t.w, t.h), rgb: (r << 16) | (g << 8) | b };
  }
  return null;
}

export { SHP_ORIGIN_X, STANCE_Y };
