//NOTE(jimmylee)
//Engine rig parity. Builds every character group with the real `three` package, drives its
//onBeforeRender through all 8 rotation steps and every animation frame, then reads the visible
//planes back as SHP tiles — source rect from the texture offset/repeat, canvas position from the
//mesh transform, flip from the UV sign, depth from renderOrder (ties: creation order, as three's
//transparent painter sort does for coplanar planes). Each result must equal the TYPE1.SHP frame
//the game draws for that direction: unmirrored patterns B/C are the SHP frame itself, mirrored
//patterns A/D are that frame reflected about the unit origin column (how the game mirrors a unit).

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import createCharacter from '@engine/meshes/createCharacter';
import { createDeadMesh } from '@engine/meshes/character-groups/group-dead';
import { createKneelMesh } from '@engine/meshes/character-groups/group-kneel';
import { createFlinchGroup } from '@engine/meshes/character-groups/group-flinch';
import { SHEET_W, SHEET_H, SPRITE_MAP } from '@engine/constants/sprites';
import { SPRITE_WIDTH, SPRITE_HEIGHT, PX_TO_WORLD } from '@engine/constants/character';
import { BODY_W, STANDARD_CONTAINER_H, ASSEMBLY_STEP_MAP, DEFAULT_AZIMUTH, STEP_SIZE, computeAzimuthToStep, KNEEL_PIVOT_RISE, DEAD_PIVOT_RISE } from '@engine/meshes/character-utils';
import { CHAR_HALF_Z, KNEEL_BILLBOARD_H } from '@engine/constants/character';
import { cubeSize } from '@engine/constants';
import { State, ActionType } from '@engine/actions/character-state';
import * as A from '@engine/constants/sprites/assembly';
import { THROW_STONE_DELAY_MAP, THROW_STONE_SPAWN_FRAME, THROW_STONE_LAST_HELD_FRAME, QT_PICKUP_FRAME, QT_RELEASE_FRAME, QT_RELEASE_MS, createHeldMarble, throwStoneHandPoint } from '@engine/actions/action-timelines';
import { SEQ_PAIRS, SEQUENCE_MODES, SHP_WATER_OFFSET } from '@engine/constants/sprites/seq-library';
import { setSequencePair } from '@engine/meshes/character-groups/group-sequence';
import { ELEVATIONS } from '@engine/debug/sprite-animation-demo-catalog';
import { shpTiles, mirrorTiles, seqFrames, seqTicks, seqMotion, cellIdForRect, SHP_ORIGIN_X, STANCE_Y } from './helpers/fft-type1';

const SCALE_X = SPRITE_WIDTH / BODY_W;
const SCALE_Y = SPRITE_HEIGHT / STANDARD_CONTAINER_H;
const NOW = 1_000_000;
const DIRECTION_OFFSET_SE = 1;

function makeTextures() {
  const sheet = () => new THREE.Texture();
  return { skins: { characterSpriteSheet: sheet() } };
}

//NOTE(jimmylee)
//A real camera on the orbit azimuth whose rotation step makes (DIRECTION_OFFSET_SE + step) % 8 = idx.
//Optional `elevation` (radians above the horizon) places an orthographic camera like the game's.
function makeCamera(idx, elevation = null) {
  const step = (idx - DIRECTION_OFFSET_SE + 8) % 8;
  const azimuth = DEFAULT_AZIMUTH + step * STEP_SIZE;
  const camera = elevation === null ? new THREE.PerspectiveCamera() : new THREE.OrthographicCamera();
  const horizontal = elevation === null ? 300 : Math.cos(elevation) * 400;
  const height = elevation === null ? 250 : Math.sin(elevation) * 400;
  camera.position.set(Math.sin(azimuth) * horizontal, height, Math.cos(azimuth) * horizontal);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  expect(computeAzimuthToStep(camera)).toBe(step);
  camera.userData.isMainCamera = true;
  camera.userData.now = NOW;
  camera.userData.azimuthStep = step;
  return camera;
}

//NOTE(jimmylee)
//Reads the rendered composite back as SHP canvas tiles, back → front.
//Pixel scale per axis is the shared body-plane scale (SCALE_X, SCALE_Y); the root is the unit origin.
function readTiles(root, camera) {
  root.updateMatrixWorld(true);
  const rootPos = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
  const toCamera = camera.quaternion.clone().invert();
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.material.map || o.material.colorWrite === false) return;
    let v = o;
    while (v) {
      if (!v.visible) return;
      v = v.parent;
    }
    meshes.push(o);
  });
  meshes.sort((a, b) => a.renderOrder - b.renderOrder || a.id - b.id);
  return meshes.map((m) => {
    //NOTE(jimmylee)
    //Offset from the unit origin in the camera frame (billboards copy camera.quaternion): x = screen right.
    m.geometry.computeBoundingBox();
    const p = m.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld).sub(rootPos).applyQuaternion(toCamera);
    const s = new THREE.Vector3().setFromMatrixScale(m.matrixWorld);
    const { offset, repeat } = m.material.map;
    const flip = repeat.x < 0;
    const sw = Math.round(Math.abs(repeat.x) * SHEET_W);
    const sh = Math.round(repeat.y * SHEET_H);
    const sx = Math.round((flip ? offset.x + repeat.x : offset.x) * SHEET_W);
    const sy = Math.round((1 - offset.y - repeat.y) * SHEET_H);
    const w = (m.geometry.parameters.width * s.x) / SCALE_X;
    const h = (m.geometry.parameters.height * s.y) / SCALE_Y;
    const id = cellIdForRect(sx, sy, sw, sh) ?? `?${sx},${sy},${sw}x${sh}`;
    //NOTE(jimmylee)
    //A plane that stretches its cell would not be a pixel-exact tile.
    const size = Math.abs(w - sw) < 1e-6 && Math.abs(h - sh) < 1e-6 ? '' : ` stretched ${w.toFixed(2)}x${h.toFixed(2)}`;
    return `${id}@${+(SHP_ORIGIN_X + p.x / SCALE_X).toFixed(3)},${+(STANCE_Y - p.y / SCALE_Y).toFixed(3)}${flip ? '~' : ''}${size}`;
  });
}

const fmt = (tiles, sx = 0, sy = 0) => tiles.map((t) => `${t.id}@${+(t.cx + sx).toFixed(3)},${+(t.cy + sy).toFixed(3)}${t.flip ? '~' : ''}`);

//NOTE(jimmylee)
//Screen-pixel shift of a SEQ unit move { fb, du } for a unit facing SE (world +X), derived from
//the camera basis: forward travel projects onto camera right/up, du is screen-down pixels.
function moveShift(move, camera) {
  if (!move) return [0, 0];
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const world = move.fb * PX_TO_WORLD;
  return [(world * right.x) / SCALE_X, -(world * up.x) / SCALE_Y + move.du];
}

//NOTE(jimmylee)
//Expected tiles for rotation index `idx` from the unmirrored front/back SHP frames, shifted by
//the frame's SEQ unit motion.
function expected(idx, frontFrame, backFrame, move = null, camera = null) {
  const pattern = ASSEMBLY_STEP_MAP[idx];
  const tiles = shpTiles(pattern <= 1 ? frontFrame : backFrame);
  const [sx, sy] = moveShift(move, camera);
  return fmt(pattern === 0 || pattern === 3 ? mirrorTiles(tiles) : tiles, sx, sy);
}

//NOTE(jimmylee)
//Midpoint of frame k for a delay table in ms; 1ms into a held frame (delay 0).
const midMs = (delaysMs, k) => delaysMs.slice(0, k).reduce((a, b) => a + b, 0) + (delaysMs[k] / 2 || 1);

function build(mode) {
  return createCharacter({ node: { x: 0, y: 0, z: 0 }, textures: makeTextures(), direction: 'SE', mode, now: NOW });
}

function render(root, idx) {
  const camera = makeCamera(idx);
  const body = root.isGroup ? root.children[0] : root;
  body.onBeforeRender(null, null, camera);
  return { tiles: readTiles(root, camera), camera };
}

//NOTE(jimmylee)
//Animated modes: frames[k] = [frontShp, backShp], delays in ms, prepare(ch, elapsedMs) sets the
//character state that selects the frame.
const WALK_ORDER = [2, 1, 0, 1, 2, 3, 4, 3];
const walkFrames = WALK_ORDER.map((i) => [9 + i, 14 + i]);
const pair = (front, back) => front.map((f, i) => [f, back[i]]);
//NOTE(@jimmylee)
//Mode J: the take-off of Jump 2 (SEQ 204/205), which ends on the Mid Jump pose, then High Jump Land.
const jumpFrames = pair([...seqFrames(204), ...seqFrames(52)], [...seqFrames(205), ...seqFrames(53)]);
const jumpMoves = [...seqMotion(204), ...seqFrames(52).map(() => ({ fb: 0, du: 0 }))];
//NOTE(@jimmylee)
//A1 / companion jump: the last take-off frames, then the Mid Jump pose until landing clears
//_jumpAction; landing draws High Jump Land from _landedAt while the unit stands still.
const playerJumpFrames = [3, 4, 5, 5, 5].map((i) => jumpFrames[i]);
const playerJumpMoves = [3, 4, 5, 5, 5].map((i) => jumpMoves[i]);
const playerJumpDelays = [4, 4, 8, 8, 8].map((t) => (t * 1000) / 60);
const playerLandFrames = [6, 7, 8].map((i) => jumpFrames[i]);
const playerLandDelays = [2, 10, 6].map((t) => (t * 1000) / 60);
const tickMs = (t) => (t * 1000) / 60;
const settled = (ch, ms) => { ch.state = State.IDLE; ch.walkStopped = false; ch.walkStart = NOW - ms; };

const ANIMATED = [
  { label: 'Walk (I)', mode: 'I', frames: walkFrames, delays: A.WALK_DELAYS, prepare: settled },
  { label: 'Walk (W)', mode: 'W', frames: walkFrames, delays: A.WALK_DELAYS, prepare: settled },
  { label: 'Walk (A1)', mode: 'A1', frames: walkFrames, delays: A.WALK_DELAYS, prepare: settled },
  { label: 'Punch Lv1 (P1)', mode: 'P1', frames: pair(seqFrames(140), seqFrames(141)), delays: A.PUNCH_DELAYS, moves: seqMotion(140), prepare: settled },
  { label: 'Punch Lv2 (P2)', mode: 'P2', frames: pair(seqFrames(142), seqFrames(143)), delays: A.PUNCH_LV2_DELAYS, moves: seqMotion(142), prepare: settled },
  { label: 'Punch Lv3 (P3)', mode: 'P3', frames: pair(seqFrames(144), seqFrames(145)), delays: A.PUNCH_LV3_DELAYS, moves: seqMotion(144), prepare: settled },
  { label: 'Stab Lv1 (S1)', mode: 'S1', frames: pair(seqFrames(96), seqFrames(97)), delays: A.STAB_DELAYS, moves: seqMotion(96), prepare: settled },
  { label: 'Stab Lv2 (S2)', mode: 'S2', frames: pair(seqFrames(98), seqFrames(99)), delays: A.STAB_LV2_DELAYS, moves: seqMotion(98), prepare: settled },
  { label: 'Stab Lv3 (S3)', mode: 'S3', frames: pair(seqFrames(100), seqFrames(101)), delays: A.STAB_LV3_DELAYS, moves: seqMotion(100), prepare: settled },
  { label: 'Fatal Item Impact (FI)', mode: 'FI', frames: pair(seqFrames(82), seqFrames(83)), delays: seqTicks(82).map(tickMs), moves: seqMotion(82), prepare: settled },
  { label: 'Item Drop (ID)', mode: 'ID', frames: pair(seqFrames(84), seqFrames(85)), delays: seqTicks(84).map(tickMs), moves: seqMotion(84), prepare: settled },
  { label: 'Float (FL)', mode: 'FL', frames: pair(seqFrames(12), seqFrames(13)), delays: A.FLOAT_DELAYS, moves: seqMotion(12), prepare: settled },
  { label: 'Magic Charge (C)', mode: 'C', frames: [[35, 37], [36, 38]], delays: [333, 333], prepare: settled },
  { label: 'Jump (J)', mode: 'J', frames: jumpFrames, delays: A.JUMP_DELAYS, moves: jumpMoves, prepare: (ch, ms) => { ch._lastCycle = 0; ch.walkStart = NOW - ms; } },
  { label: 'Quick Throw (T)', mode: 'T', frames: pair(seqFrames(48), seqFrames(49)), delays: A.QUICK_THROW_DELAYS, moves: seqMotion(48), prepare: (ch, ms) => { ch.action = { type: ActionType.QUICK_THROW }; ch.walkStart = NOW - ms; } },
  { label: 'Throw Stone (TS) front', mode: 'TS', frames: pair(seqFrames(208), seqFrames(208)), delays: A.THROW_STONE_DELAYS_FWD, front: true, prepare: (ch, ms) => { ch.action = { type: ActionType.THROW_STONE }; ch.walkStart = NOW - ms; } },
  { label: 'Throw Stone (TS) back', mode: 'TS', frames: pair(seqFrames(209), seqFrames(209)), delays: A.THROW_STONE_DELAYS_BCK, back: true, prepare: (ch, ms) => { ch.action = { type: ActionType.THROW_STONE }; ch.walkStart = NOW - ms; } },
  { label: 'A1 Jump', mode: 'A1', frames: playerJumpFrames, delays: playerJumpDelays, moves: playerJumpMoves, prepare: (ch, ms) => { settled(ch, 0); ch._jumpAction = { startTime: NOW - ms }; } },
  { label: 'A1 Landing', mode: 'A1', frames: playerLandFrames, delays: playerLandDelays, prepare: (ch, ms) => { settled(ch, 0); ch.walkStopped = true; ch._landedAt = NOW - ms; } },
  { label: 'A1 Stab Lv3', mode: 'A1', frames: pair(seqFrames(100), seqFrames(101)), delays: A.STAB_LV3_DELAYS, moves: seqMotion(100), prepare: (ch, ms) => { settled(ch, 0); ch._attackAction = { startTime: NOW - ms }; } },
  { label: 'A1 Cast', mode: 'A1', frames: [[35, 37], [36, 38]], delays: [333, 333], prepare: (ch, ms) => { settled(ch, 0); ch._castAction = { startTime: NOW - ms }; } },
  //NOTE(@jimmylee)
  //Read from the decoded binary, not from the table the mode plays. MoveUnitRL (Raise Weapon) is not played.
  ...SEQUENCE_MODES.map(({ title, mode, pair: { front, back }, water }) => ({ label: title, mode, frames: pair(seqFrames(front.seq).map((f) => f + (water ? SHP_WATER_OFFSET : 0)), seqFrames(back.seq).map((f) => f + (water ? SHP_WATER_OFFSET : 0))), delays: seqTicks(front.seq).map(tickMs), moves: seqMotion(front.seq, { lateral: 'skip' }), movesBack: seqMotion(back.seq, { lateral: 'skip' }), prepare: settled })),
];

describe('engine rig reproduces TYPE1.SHP for every direction', () => {
  for (const m of ANIMATED) {
    it(m.label, () => {
      for (let idx = 0; idx < 8; idx++) {
        const isFront = ASSEMBLY_STEP_MAP[idx] <= 1;
        if ((m.front && !isFront) || (m.back && isFront)) continue;
        const root = build(m.mode);
        m.frames.forEach(([front, back], k) => {
          m.prepare(root.userData.character, midMs(m.delays, k));
          const { tiles, camera } = render(root, idx);
          expect(tiles, `${m.label} idx ${idx} frame ${k}`).toEqual(expected(idx, front, back, (isFront ? m.moves : m.movesBack ?? m.moves)?.[k], camera));
        });
      }
    });
  }

  //NOTE(@jimmylee)
  //World position of a grip's pixel on the plane the driver drew.
  function gripPixel(root, camera, grip, label) {
    const plane = root.children.find((m) => m.visible && m.material.map && readTiles(m, camera)[0]?.startsWith(`${grip.id}@`));
    expect(plane, `${label}: ${grip.id} plane`).toBeDefined();
    const cell = SPRITE_MAP[grip.id];
    const { width, height } = plane.geometry.parameters;
    const u = (grip.x + 0.5) / cell.w - 0.5;
    return new THREE.Vector3((plane.material.map.repeat.x < 0 ? -u : u) * width, (0.5 - (grip.y + 0.5) / cell.h) * height, 0).applyMatrix4(plane.matrixWorld);
  }

  //NOTE(@jimmylee)
  //`point` lands on `pixel` on screen, in front of the sprite plane along the view axis.
  function expectOnPixel(point, pixel, camera, label) {
    const toCamera = camera.quaternion.clone().invert();
    const a = pixel.clone().applyQuaternion(toCamera);
    const b = new THREE.Vector3(point.x, point.y, point.z).applyQuaternion(toCamera);
    expect(b.x, label).toBeCloseTo(a.x, 5);
    expect(b.y, label).toBeCloseTo(a.y, 5);
    expect(b.z, label).toBeGreaterThan(a.z);
  }

  //NOTE(@jimmylee)
  //The held stone (throwStoneHandPoint) lands on the screen point of the grip pixel of the plane the
  //TS driver actually draws — every pattern, step and demo elevation, pick-up to release.
  it('Throw Stone (TS) hand point sits on the drawn grip pixel at every step and elevation', () => {
    for (const [sheet, elevation] of Object.keys(A.THROW_STONE_GRIPS).flatMap((file) => Object.values(ELEVATIONS).map((e) => [file, e]))) {
      for (let idx = 0; idx < 8; idx++) {
        const root = build('TS');
        const ch = root.userData.character;
        const pattern = ASSEMBLY_STEP_MAP[idx];
        const delaysMs = THROW_STONE_DELAY_MAP[pattern].map((t) => t * 1000);
        const grips = pattern <= 1 ? A.THROW_STONE_GRIPS[sheet].fwd : A.THROW_STONE_GRIPS[sheet].bck;
        for (let k = THROW_STONE_SPAWN_FRAME; k <= THROW_STONE_LAST_HELD_FRAME; k++) {
          ch.action = { type: ActionType.THROW_STONE };
          ch.walkStart = NOW - midMs(delaysMs, k);
          const camera = makeCamera(idx, elevation);
          root.children[0].onBeforeRender(null, null, camera);
          root.updateMatrixWorld(true);
          const label = `TS ${sheet} elevation ${elevation.toFixed(3)} idx ${idx} frame ${k}`;
          const hand = throwStoneHandPoint(root.position, camera.quaternion, k, pattern, { x: 0, y: 0, z: 0 }, sheet);
          expectOnPixel(hand, gripPixel(root, camera, grips[k], label), camera, label);
        }
      }
    }
  });

  //NOTE(@jimmylee)
  //A caught marble is drawn on the grip pixel of the plane the T driver draws, from the kneel to the
  //first instant of the overhead frame — every pattern, step, elevation and sheet — and the driver
  //leaves mesh.position alone: it is the camera-independent physics hold point.
  it('Quick Throw (T) draws a caught marble on the hand and keeps it off its position', () => {
    const hold = new THREE.Vector3(16, 9.6, 0);
    for (const [sheet, elevation] of Object.keys(A.THROW_STONE_GRIPS).flatMap((file) => Object.values(ELEVATIONS).map((e) => [file, e]))) {
      for (let idx = 0; idx < 8; idx++) {
        const root = build('T');
        const ch = root.userData.character;
        const grips = ASSEMBLY_STEP_MAP[idx] <= 1 ? A.THROW_STONE_GRIPS[sheet].fwd : A.THROW_STONE_GRIPS[sheet].bck;
        const marble = new THREE.Object3D();
        ch._heldMarble = createHeldMarble(marble, sheet);
        marble.position.copy(hold);
        for (const [k, ms] of [[QT_PICKUP_FRAME, midMs(A.QUICK_THROW_DELAYS, QT_PICKUP_FRAME)], [3, midMs(A.QUICK_THROW_DELAYS, 3)], [4, midMs(A.QUICK_THROW_DELAYS, 4)], [QT_RELEASE_FRAME, QT_RELEASE_MS + 1e-7]]) {
          marble.updateMatrixWorld(true);
          ch.action = { type: ActionType.QUICK_THROW };
          ch.walkStart = NOW - ms;
          const camera = makeCamera(idx, elevation);
          root.children[0].onBeforeRender(null, null, camera);
          root.updateMatrixWorld(true);
          const label = `T ${sheet} elevation ${elevation.toFixed(3)} idx ${idx} frame ${k}`;
          expectOnPixel(new THREE.Vector3().setFromMatrixPosition(marble.matrixWorld), gripPixel(root, camera, grips[k], label), camera, label);
          expect(marble.position, label).toEqual(hold);
        }
      }
    }
  });

  //NOTE(@jimmylee)
  //The library group draws any sequence, dry or in water, exactly as TYPE1.SHP: every sequence, every
  //drawn frame, every rotation index (one group, re-pointed, as the demo cards do).
  it('Sequence Library (SQ) reproduces every sequence, in and out of water', () => {
    const root = build('SQ');
    const ch = root.userData.character;
    ch.state = State.IDLE;
    for (const water of [false, true]) {
      for (const seqPair of SEQ_PAIRS) {
        for (let idx = 0; idx < 8; idx++) {
          const entry = ASSEMBLY_STEP_MAP[idx] <= 1 ? seqPair.front : seqPair.back;
          const delays = entry.ticks.map(tickMs);
          entry.frames.forEach((frame, k) => {
            setSequencePair(root, seqPair, false, water, NOW - midMs(delays, k));
            const { tiles, camera } = render(root, idx);
            const shp = frame + (water ? SHP_WATER_OFFSET : 0);
            const move = { fb: entry.fb?.[k] ?? 0, du: entry.du?.[k] ?? 0 };
            expect(tiles, `${seqPair.label} water ${water} idx ${idx} frame ${k}`).toEqual(expected(idx, shp, shp, move, camera));
          });
        }
      }
    }
  });

  //NOTE(@jimmylee)
  //The KO plane of Fatal Item Impact stays above the floor at every game elevation, as Dead does.
  it('a sequence frame reaching below the stance bottom is lifted along the view axis, within half a cube', () => {
    const root = build('FI');
    root.position.set(0, SPRITE_HEIGHT / 2, 0);
    const ch = root.userData.character;
    ch.state = State.IDLE;
    ch.walkStart = NOW - 500;
    const corner = new THREE.Vector3();
    let lifted = 0;
    for (const elevation of Object.values(ELEVATIONS)) {
      for (let idx = 0; idx < 8; idx++) {
        const camera = makeCamera(idx, elevation);
        const body = root.children[0];
        body.onBeforeRender(null, null, camera);
        root.updateMatrixWorld(true);
        const position = body.geometry.attributes.position;
        let lowest = Infinity;
        for (let i = 0; i < position.count; i++) lowest = Math.min(lowest, corner.fromBufferAttribute(position, i).applyMatrix4(body.matrixWorld).y);
        const back = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
        const travel = body.position.z * Math.hypot(back.x, back.z);
        expect(travel).toBeLessThanOrEqual(cubeSize / 2 + 1e-6);
        if (body.position.z > 0) lifted++;
        if (travel < cubeSize / 2 - 1e-6) expect(lowest, `idx ${idx} elevation ${elevation}`).toBeGreaterThanOrEqual(-1e-3);
      }
    }
    expect(lifted).toBeGreaterThan(0);
  });

  it('Idle (no mode, and every mode before it settles) matches F1-F8', () => {
    const IDLE_SHP = [3, 2, 1, 8, 7, 6, 5, 4];
    for (const mode of [undefined, 'I', 'W', 'A1', 'G', 'FL', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3', 'FI', 'ID', 'SQ', 'C', 'J', 'T', 'TS', ...SEQUENCE_MODES.map((m) => m.mode)]) {
      for (let idx = 0; idx < 8; idx++) {
        const root = build(mode);
        expect(render(root, idx).tiles, `idle ${mode} idx ${idx}`).toEqual(fmt(shpTiles(IDLE_SHP[idx])));
      }
    }
  });

  it('Guard (G) matches F13/F18', () => {
    for (let idx = 0; idx < 8; idx++) {
      const root = build('G');
      root.userData.character.state = State.IDLE;
      expect(render(root, idx).tiles, `G idx ${idx}`).toEqual(expected(idx, 13, 18));
    }
  });

  it('Stab Lv1 and Float back sequences move like their front sequences', () => {
    expect(seqMotion(97)).toEqual(seqMotion(96));
    expect(seqMotion(13)).toEqual(seqMotion(12));
  });

  it('Flinch (H) matches F68/F69 with the SEQ 38/39 1px shiver', () => {
    const shiver = seqMotion(38);
    expect(seqMotion(39)).toEqual(shiver);
    for (let idx = 0; idx < 8; idx++) {
      const root = build('H');
      shiver.forEach((move, k) => {
        root.userData.character.walkStart = NOW - midMs(A.HURT_SHIVER_DELAYS, k);
        const { tiles, camera } = render(root, idx);
        expect(tiles, `H idx ${idx} shiver ${k}`).toEqual(expected(idx, 68, 69, move, camera));
      });
    }
  });

  //NOTE(jimmylee)
  //Orbit elevations the game allows (OrbitControls polar angle 0.5 .. PI / 2.25) plus the initial view.
  const ELEVATIONS = [Math.PI / 2 - Math.PI / 2.25, Math.atan2(0.3, Math.SQRT1_2), Math.PI / 4, Math.PI / 2 - 0.5];
  const SINGLE_POSES = [
    { factory: createKneelMesh, front: 21, back: 22, rise: KNEEL_PIVOT_RISE, restHalfY: KNEEL_BILLBOARD_H / 2 },
    { factory: createDeadMesh, front: 23, back: 24, rise: DEAD_PIVOT_RISE, restHalfY: CHAR_HALF_Z },
  ];

  function renderSinglePose({ factory, rise }, idx, elevation) {
    const mesh = factory({ node: { x: 0, y: 0, z: 0 }, textures: makeTextures(), directionOffset: DIRECTION_OFFSET_SE, walkStart: NOW });
    //NOTE(jimmylee)
    //The root is the stance point S; the mesh sits at its physics body center, `rise` below S.
    const root = new THREE.Group();
    root.add(mesh);
    mesh.position.set(0, -rise, 0);
    const camera = makeCamera(idx, elevation);
    mesh.onBeforeRender(null, null, camera);
    return { mesh, root, camera };
  }

  it('Kneel (K) F21/F22 and Dead (D) F23/F24 sit at their SHP anchor from the stance point at every elevation', () => {
    for (const pose of SINGLE_POSES) {
      for (const elevation of ELEVATIONS) {
        for (let idx = 0; idx < 8; idx++) {
          const { root, camera } = renderSinglePose(pose, idx, elevation);
          const pattern = ASSEMBLY_STEP_MAP[idx];
          const tiles = shpTiles(pattern <= 1 ? pose.front : pose.back);
          expect(readTiles(root, camera), `${pose.factory.name} idx ${idx} elevation ${elevation}`).toEqual(fmt(pattern === 0 || pattern === 3 ? mirrorTiles(tiles) : tiles));
        }
      }
    }
  });

  it('the stance point is STANCE_HALF_Y above the bottom of the resting physics shape', () => {
    for (const pose of SINGLE_POSES) expect(pose.restHalfY + pose.rise).toBe(SPRITE_HEIGHT / 2);
  });

  it('Kneel/Dead planes are lifted toward the camera, never below the physics ground, within half a cube', () => {
    for (const pose of SINGLE_POSES) {
      for (const elevation of ELEVATIONS) {
        for (let idx = 0; idx < 8; idx++) {
          const { mesh, root, camera } = renderSinglePose(pose, idx, elevation);
          root.updateMatrixWorld(true);
          const ground = -SPRITE_HEIGHT / 2;
          const position = mesh.geometry.attributes.position;
          const corner = new THREE.Vector3();
          let lowest = Infinity;
          for (let i = 0; i < position.count; i++) lowest = Math.min(lowest, corner.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).y);
          //NOTE(jimmylee)
          //Depth-only lift: the plane center's offset from the screen-space line through S, along
          //the camera's back axis, projected onto the ground plane.
          mesh.geometry.computeBoundingBox();
          const center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
          const back = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
          const lift = center.dot(back);
          const label = `${pose.factory.name} idx ${idx} elevation ${elevation}`;
          //NOTE(jimmylee)
          //Vertex positions are Float32, hence the tolerance.
          const eps = 1e-5;
          expect(lift, label).toBeGreaterThanOrEqual(-eps);
          expect(lift * Math.hypot(back.x, back.z), label).toBeLessThanOrEqual(cubeSize / 2 + eps);
          if (lift * Math.hypot(back.x, back.z) < cubeSize / 2 - eps) expect(lowest, label).toBeGreaterThanOrEqual(ground - eps);
        }
      }
    }
    //NOTE(jimmylee)
    //Kneel's bottom row is the stance bottom (canvas row 123), so it never needs a lift.
    for (const elevation of ELEVATIONS) {
      const { mesh, camera } = renderSinglePose(SINGLE_POSES[0], 1, elevation);
      const back = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
      mesh.geometry.computeBoundingBox();
      const center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      expect(center.dot(back)).toBeCloseTo(0, 5);
    }
  });

  it('Kneel/Dead geometry only moves when the direction or camera elevation changes', () => {
    const { mesh, camera } = renderSinglePose(SINGLE_POSES[1], 1, ELEVATIONS[1]);
    const version = mesh.geometry.attributes.position.version;
    mesh.onBeforeRender(null, null, camera);
    expect(mesh.geometry.attributes.position.version).toBe(version);
    mesh.onBeforeRender(null, null, makeCamera(1, ELEVATIONS[2]));
    expect(mesh.geometry.attributes.position.version).toBeGreaterThan(version);
  });
  //NOTE(@jimmylee)
  //The sheets hold sRGB palette colors. Left untagged, three treats them as linear and sRGB-encodes
  //the output, which lifts the dark outline that separates arm and hand tiles from the body.
  it('every character sprite texture is tagged sRGB (composites, A1, flinch, kneel, dead)', () => {
    const textured = [];
    for (const mode of [undefined, 'I', 'W', 'A1', 'G', 'FL', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3', 'FI', 'ID', 'SQ', 'C', 'J', 'T', 'TS', ...SEQUENCE_MODES.map((m) => m.mode)]) {
      textured.push([String(mode), build(mode)]);
    }
    const opts = { node: { x: 0, y: 0, z: 0 }, textures: makeTextures(), directionOffset: DIRECTION_OFFSET_SE, walkStart: NOW };
    textured.push(['H', createFlinchGroup({ ...opts, spriteWidth: SPRITE_WIDTH, spriteHeight: SPRITE_HEIGHT })]);
    textured.push(['K', createKneelMesh(opts)]);
    textured.push(['D', createDeadMesh(opts)]);
    for (const [label, root] of textured) {
      let maps = 0;
      root.traverse((o) => {
        const map = o.material?.map;
        if (!map) return;
        maps++;
        expect(map.colorSpace, `${label} ${o.name || o.type}`).toBe(THREE.SRGBColorSpace);
      });
      expect(maps, label).toBeGreaterThan(0);
    }
  });
});
