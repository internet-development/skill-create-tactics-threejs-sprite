//NOTE(jimmylee)
//ThreeJS demos. Builds every demo station with the real `three` package and the real engine
//character factories, advances the demo clock, and checks the replayed engine timelines (grounded
//start, Mode J arc on the Mid Jump pose, Mode TS stones and Mode T marble pick-up / hand tracking /
//release, the simulated bow's shot, stab contact) and the viewport framing. The draw-order tests replay WebGLRenderer.render's
//sequence (scene.onBeforeRender, then the draw list from `visible`, sorted by renderOrder, then each
//object's onBeforeRender right before its draw) to prove no character layer is drawn stale, missing
//or hidden — on frame changes and idle ↔ action switches — with the engine's syncCharacterVisuals
//hook.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { createSpriteDemoStations, aimCamera, applyWater, azimuthForStep, fitStationView, disposeStation, updateStationWater, waterHeight, REST_Y, SPRITE_EXTENT, STRIKE_GAP, SPRITE_DEMOS, LAYER_TINTS, BODY_TINTS, ELEVATIONS, MIN_VIEW_HALF_HEIGHT } from '@engine/debug/sprite-animation-demos';
import { createWaterResources } from '@engine/debug/water-surface';
import { createBodyResources } from '@engine/debug/physics-body-mesh';
import { createWaterRipples, createWaterSwell } from '@engine/debug/water-simulation';
import createCharacter from '@engine/meshes/createCharacter';
import { ASSEMBLY_STEP_MAP, syncCharacterVisuals } from '@engine/meshes/character-utils';
import { getCharacterModeFactory } from '@engine/common/registry';
import { State } from '@engine/actions/character-state';
import { cubeSize, sphereRadius } from '@engine/constants';
import { JUMP_LIFT_HEIGHT, JUMP_CYCLE_DURATION, JUMP_TAKEOFF_S, JUMP_TOUCHDOWN_S, JUMP_DELAYS_S, JUMP_AIR_FRAME, JUMP_LAND_FRAME, THROW_STONE_SPAWN_FRAME, THROW_STONE_RELEASE_FRAME, THROW_STONE_LAST_HELD_FRAME, THROW_STONE_DELAYS_S_FWD, THROW_STONE_FOLLOW_THROUGH_S, THROW_LAUNCH_VH, THROW_LAUNCH_VV, QT_PICKUP_FRAME, QT_PICKUP_MS, QT_RELEASE_FRAME, QT_RELEASE_MS, billboardPoint, jumpLift, quickThrowHoldHeight, throwStoneHandPoint, throwStoneFlightPoint, throwStoneLaunchPoint } from '@engine/actions/action-timelines';
import { deflectLaunchVH, CAUGHT_MARBLE_FORWARD_OFFSET, MARBLE_MASS, despawnFadeMs, spawnFadeMs } from '@engine/constants/physics';
import { CHAR_HALF_Z } from '@engine/constants/character';
import { getMeshData } from '@engine/common/registry';
import { STAB_DELAYS } from '@engine/constants/sprites/assembly';
import { SPRITE_MAP, SPRITE_SHEET_FILE } from '@engine/constants/sprites';
import { SEQ_PAIRS, SEQUENCE_MODES, SHP_FRAMES, SHP_WATER_OFFSET } from '@engine/constants/sprites/seq-library';
import { placeCanvasWindow, leapHeight, jumpDownHeight, throwSpeed, counterHop, COUNTER_ANCHOR_PX, COUNTER_HOPS, COUNTER_TICKS, DAMAGE_COUNTER, BOW_RANGE, BOW_LEDGE, BOW_NOCK_TICKS, BOW_ANCHOR_TICKS, BOW_SHOT_TICKS, BOW_SHOT, STONE_RADIUS_SMALL, STONE_TARGET_MASS, STONE_VARIANTS, JUMP_DOWN_LEDGE, JUMP_DOWN_TRAVEL, TELEPORT_GAP_TICKS, TELEPORT_OFFSET } from '@engine/debug/sprite-animation-demo-catalog';
import { BOW_SPEC } from '@engine/weapons/bow';
import { SEQS, sheetPixels } from './helpers/fft-type1';

const testSheetAlpha = () => {
  const { width, height, at } = sheetPixels('a1.png');
  const opaque = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) opaque[y * width + x] = at(x, y)[3] > 0 ? 1 : 0;
  return { width, height, opaque };
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NOW = 1_000_000;
const FRAME_MS = 1000 / 60;
const sum = (values) => values.reduce((a, b) => a + b, 0);
//NOTE(@jimmylee)
//The demo slot aspect (.stageSlot is aspect-ratio 6 / 5).
const ASPECT = 6 / 5;
//NOTE(@jimmylee)
//The replay/framing loops simulate thousands of frames (~0.2s each normally); allow for a loaded
//machine instead of the 5s default.
const SIMULATION_TIMEOUT_MS = 60_000;

function makeTextures() {
  return { skins: { characterSpriteSheet: new THREE.Texture() } };
}

function setup(ids) {
  const demos = ids ? SPRITE_DEMOS.filter((d) => ids.includes(d.id)) : SPRITE_DEMOS;
  const { stations, resources } = createSpriteDemoStations({ textures: makeTextures(), now: NOW, demos });
  const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
  const sim = { now: NOW, step: 0 };
  //NOTE(jimmylee)
  //One demo frame: frame and aim the camera at the station, update it, then run the scene's
  //pre-draw hook (the engine's syncCharacterVisuals) as WebGLRenderer.render does.
  sim.advance = (ms, station, step = 0, elevation = ELEVATIONS.game) => {
    const steps = Math.round(ms / FRAME_MS);
    for (let i = 0; i < steps; i++) {
      sim.now += FRAME_MS;
      fitStationView(station, azimuthForStep(step), elevation, ASPECT);
      sim.step = aimCamera(camera, station.focus, azimuthForStep(step), elevation, sim.now);
      station.update(sim.now, FRAME_MS / 1000, sim.step, camera.quaternion);
      station.scene.updateMatrixWorld();
      station.scene.onBeforeRender(null, station.scene, camera);
    }
  };
  return { stations, resources, camera, sim };
}

function stationById(stations, id) {
  return stations.find((s) => s.def.id === id);
}

describe('sprite animation demo catalog', () => {
  it('covers every requested animation with an engine-registered mode', () => {
    const modes = SPRITE_DEMOS.map((d) => d.mode);
    expect(modes).toEqual([undefined, 'G', 'FL', 'A1', 'A1', 'A1', 'A1', 'C', 'T', 'H', 'K', 'D', 'J', 'TS', 'TS', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3', 'FI', 'ID', ...SEQUENCE_MODES.map((m) => m.mode)]);
    for (const mode of modes.slice(1)) expect(getCharacterModeFactory(mode), mode).toBeTypeOf('function');
  });

  //NOTE(@jimmylee)
  //The SEQ pairs the other cards play, and Null, which draws only the origin marker.
  const COVERED_BY_OTHER_CARDS = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 32, 33, 38, 39, 40, 41, 48, 49, 58, 59, 64, 65, 76, 77, 82, 83, 84, 85, 92, 93, 96, 97, 98, 99, 100, 101, 140, 141, 142, 143, 144, 145, 206, 207, 208, 209];
  const seqNumbers = (text) => [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
  const frameData = (seq) => JSON.stringify([SEQS[seq].filter((x) => x.op === undefined), SEQS[seq + 1].filter((x) => x.op === undefined)]);

  it('every TYPE1 sequence has a card, and a pair named on a card is that card\'s animation', () => {
    const shown = SEQUENCE_MODES.flatMap((m) => seqNumbers(m.seq));
    expect([...COVERED_BY_OTHER_CARDS, ...shown].sort((a, b) => a - b)).toEqual(SEQS.map((_, i) => i));
    for (const { seq, pair } of SEQUENCE_MODES) {
      const [, , ...also] = seqNumbers(seq);
      for (const alias of also.filter((n) => n % 2 === 0)) {
        //NOTE(@jimmylee)
        //Charging Hold loops the one frame Charging holds, which draws the same thing.
        if (alias === 56) expect(SEQS[56].filter((x) => x.op === undefined).map((x) => x.frame)).toEqual(SEQS[54].filter((x) => x.op === undefined).map((x) => x.frame));
        else expect(frameData(alias), `${seq}`).toBe(frameData(pair.front.seq));
      }
    }
  });

  it('every sequence mode draws the unit on every frame, not a placeholder', () => {
    for (const { title, pair, water } of SEQUENCE_MODES) {
      for (const frame of [...pair.front.frames, ...pair.back.frames]) expect(SHP_FRAMES[frame + (water ? SHP_WATER_OFFSET : 0)].some(([id]) => id !== 'SR1'), `${title} F${frame}`).toBe(true);
    }
  });

  it('every title is unique and names no level', () => {
    const titles = SPRITE_DEMOS.map((d) => d.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const name of [...titles, ...SEQ_PAIRS.map((p) => p.name), ...SEQUENCE_MODES.map((m) => m.section)]) expect(name).not.toMatch(/Lv\d/);
    expect(SEQUENCE_MODES.find((m) => m.mode === 'SW1').title).toBe('Swing High (SW1)');
    expect(SEQUENCE_MODES.find((m) => m.mode === 'SW1').section).toBe('Swing High (102, 103)');
    expect(new Set(SPRITE_DEMOS.map((d) => d.id)).size).toBe(SPRITE_DEMOS.length);
  });

  it('the canvas window stays put while it covers the visible grid and recenters when it does not', () => {
    const place = (top, gridTop) => placeCanvasWindow({ top, windowHeight: 2000, gridHeight: 10000, gridTop, viewHeight: 1000 });
    expect(place(0, 400)).toBe(0);
    expect(place(0, -500)).toBe(0);
    expect(place(0, -1500)).toBe(1000);
    expect(place(1000, -1500)).toBe(1000);
    expect(place(1000, -100)).toBe(0);
    expect(place(0, -9500)).toBe(8000);
    expect(place(8000, -9900)).toBe(8000);
    expect(placeCanvasWindow({ top: 0, windowHeight: 800, gridHeight: 800, gridTop: -100, viewHeight: 1000 })).toBe(0);
    expect(placeCanvasWindow({ top: 8000, windowHeight: 2000, gridHeight: 9000, gridTop: -8200, viewHeight: 1000 })).toBe(7000);
  });

  //NOTE(jimmylee)
  //The engine has no physics engine, and Ammo, the WASM one a game might vendor, must not reach the demo
  //chunk. The catalog the page imports eagerly must not pull in three.js either.
  function importGraph(start) {
    const seen = new Set();
    const bare = new Set();
    const resolve = (spec, from) => {
      let p;
      if (spec.startsWith('@engine/')) p = join(ROOT, 'three-isometric-engine', spec.slice(8));
      else if (spec.startsWith('.')) p = join(dirname(from), spec);
      else {
        bare.add(spec);
        return null;
      }
      for (const ext of ['', '.js', '.jsx', '.ts', '.tsx', '/index.js']) {
        if (existsSync(p + ext) && statSync(p + ext).isFile()) return p + ext;
      }
      return null;
    };
    const walk = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g)) {
        const next = resolve(m[1] || m[2], file);
        if (next) walk(next);
      }
    };
    walk(join(ROOT, start));
    return { files: [...seen].map((f) => f.slice(ROOT.length + 1)), bare: [...bare] };
  }

  it('the demo stage import graph never reaches Ammo', () => {
    const { files } = importGraph('three-isometric-engine/debug/sprite-animation-demos.js');
    expect(files.filter((f) => f.includes('ammo') || f.includes('vendor'))).toEqual([]);
    expect(files).toContain('three-isometric-engine/meshes/createCharacter.js');
  });

  it('the catalog imports neither three nor Ammo', () => {
    const { files, bare } = importGraph('three-isometric-engine/debug/sprite-animation-demo-catalog.js');
    expect(bare).toEqual([]);
    expect(files.filter((f) => f.includes('ammo') || f.includes('vendor'))).toEqual([]);
  });
});

describe('sprite animation demo timelines', () => {
  //NOTE(@jimmylee)
  //The opcode each SEQ event marks, by label, and the SEQ whose ticks the card draws.
  const SEQ_OPS = { PlaySound: 0xf6, PostGenericAttack: 0xde };
  const SEQ_BY_DEMO = { 'quick-throw': 206, 'throw-stone': 208, 'throw-heavy': 208, 'punch-1': 140, 'punch-2': 142, 'punch-3': 144, 'stab-1': 96, 'stab-2': 98, 'stab-3': 100, 'a1-stab': 100 };

  it('every SEQ event sits on the tick its opcode runs at in TYPE1.SEQ', () => {
    let checked = 0;
    for (const def of SPRITE_DEMOS) {
      for (const event of def.timeline.events.filter((e) => e.source === 'seq')) {
        let tick = 0;
        let at = -1;
        for (const x of SEQS[def.pair?.front.seq ?? SEQ_BY_DEMO[def.id]]) {
          if (x.op === SEQ_OPS[event.label]) at = tick;
          else if (x.op === undefined) tick += x.delay;
        }
        expect(event.tick, `${def.id} ${event.label}`).toBe(at);
        checked++;
      }
      //NOTE(@jimmylee)
      //A thrown item's hit is the engine's own event: the game's effect code flies it, so the sequence has no
      //PostGenericAttack to meet. Every other card with a hit lands on the SEQ's.
      if (def.hitMs !== undefined && def.pair) {
        const label = def.kind === 'weapon-throw' ? `${def.held.item} hits the target` : def.kind === 'item-throw' ? 'marble hits the target' : 'PostGenericAttack';
        expect(def.hitMs / FRAME_MS, def.id).toBeCloseTo(def.timeline.events.find((e) => e.label === label).tick, 9);
      }
    }
    expect(checked).toBeGreaterThan(11);
  });

  it('every timeline ends after its last event and the stations report a playhead on it', () => {
    const { stations, sim } = setup();
    for (const station of stations) {
      const { ticks, events } = station.def.timeline;
      const total = ticks.reduce((a, b) => a + b, 0);
      for (const event of events) expect(event.tick, `${station.def.id} ${event.label}`).toBeLessThanOrEqual(total + 1e-9);
      sim.advance(FRAME_MS * 3, station);
      expect(station.playhead(sim.now), station.def.id).toBeLessThanOrEqual(total + 2);
    }
  });
});

describe('sprite animation demo camera', () => {
  it('aims at each rotation step at every game elevation', () => {
    const camera = new THREE.OrthographicCamera();
    for (const elevation of Object.values(ELEVATIONS)) {
      for (let step = 0; step < 8; step++) {
        expect(aimCamera(camera, new THREE.Vector3(10, 20, -5), azimuthForStep(step), elevation, NOW)).toBe(step);
        expect(camera.userData.azimuthStep).toBe(step);
        expect(camera.userData.isMainCamera).toBe(true);
      }
    }
  });
});

describe('sprite animation demo stations', () => {
  it('every station starts settled on the floor in its mode', () => {
    const { stations, sim } = setup();
    for (const station of stations) {
      if (station.def.kind === 'pose') continue;
      const unit = station.roots[0];
      const ch = unit.userData.character;
      sim.now = NOW;
      const standsOn = station.def.kind === 'jump-down' ? JUMP_DOWN_LEDGE : (station.def.archerFloor ?? 0);
      expect(ch.state, station.def.id).toBe(State.IDLE);
      expect(ch.walkStart, station.def.id).toBe(NOW);
      expect(unit.position.y, station.def.id).toBe(REST_Y + standsOn);
      sim.advance(FRAME_MS, station);
      expect(unit.position.y, station.def.id).toBe(REST_Y + standsOn);
    }
  });

  it('a leap with no hold is the jumpLift arc', () => {
    const leap = SPRITE_DEMOS.find((d) => d.mode === 'MJ').leap;
    for (let tick = 0; tick <= leap.airTicks; tick += 1.5) expect(leapHeight(leap, tick)).toBeCloseTo(jumpLift(JUMP_TAKEOFF_S + tick / 60), 9);
  });

  //NOTE(@jimmylee)
  //The unit stays on the ground through its take-off sequence, holds the air sequence at height and
  //touches down on High Jump Land, then rests on the idle sprite and goes again.
  for (const [mode, takeoff, air, holdTicks] of [['MJ', 204, 42, 0], ['HH', 48, 50, 60], ['HL', 48, 50, 6]]) {
    it(`${mode} plays its chain in the air, not on the spot`, () => {
      const def = SPRITE_DEMOS.find((d) => d.mode === mode);
      const { stations, sim } = setup([def.id]);
      const station = stations[0];
      const unit = station.roots[0];
      const ch = unit.userData.character;
      const started = ch.walkStart;
      const at = (ticks) => sim.advance(started + (ticks * 1000) / 60 + FRAME_MS / 2 - sim.now, station);
      const { takeoffTicks, riseTicks, airTicks, landTicks } = def.leap;
      expect(ch.seqFront.seq).toBe(takeoff);
      at(takeoffTicks - 2);
      expect(unit.position.y).toBe(REST_Y);
      at(takeoffTicks + riseTicks);
      expect(ch.seqFront.seq).toBe(air);
      expect(ch.seqBack.seq).toBe(air + 1);
      expect(unit.position.y).toBeGreaterThan(REST_Y + JUMP_LIFT_HEIGHT - 1);
      if (holdTicks > 1) {
        at(takeoffTicks + riseTicks + holdTicks - 1);
        expect(unit.position.y).toBe(REST_Y + JUMP_LIFT_HEIGHT);
      }
      at(takeoffTicks + airTicks);
      expect(ch.seqFront.seq).toBe(52);
      expect(ch.state).toBe(State.IDLE);
      expect(unit.position.y).toBe(REST_Y);
      at(takeoffTicks + airTicks + landTicks);
      expect(ch.state).toBe(State.FALLING);
      expect(station.status(sim.now, 0)).toContain('IDLE');
      sim.advance(450, station);
      expect(ch.state).toBe(State.IDLE);
      expect(ch.seqFront.seq).toBe(takeoff);
    });
  }

  it('Jump Down leaves the ledge after the crouch, crosses to the floor on the air frames and comes back through the Bayer fades', () => {
    const def = SPRITE_DEMOS.find((d) => d.mode === 'JD');
    const { stations, sim } = setup([def.id]);
    const station = stations[0];
    const unit = station.roots[0];
    const ch = unit.userData.character;
    const started = ch.walkStart;
    const at = (ticks) => sim.advance(started + (ticks * 1000) / 60 + FRAME_MS / 2 - sim.now, station);
    const ledgeY = REST_Y + JUMP_DOWN_LEDGE;
    at(def.leaveTicks - 1);
    expect(unit.position.x).toBe(-JUMP_DOWN_TRAVEL);
    expect(unit.position.y).toBe(ledgeY);
    at((def.leaveTicks + def.landTicks) / 2);
    expect(unit.position.x).toBeGreaterThan(-JUMP_DOWN_TRAVEL);
    expect(unit.position.x).toBeLessThan(0);
    //NOTE(@jimmylee)
    //Halfway across is the ledge's edge: the feet must still be above it.
    const edge = 0.5;
    expect(REST_Y + jumpDownHeight(edge)).toBeGreaterThan(ledgeY);
    at(def.landTicks + 1);
    expect(unit.position.x).toBe(0);
    expect(unit.position.y).toBe(REST_Y);
    expect(ch.state).toBe(State.IDLE);
    at(sum(def.timeline.ticks));
    expect(ch.state).toBe(State.FALLING);
    const uniforms = [];
    unit.traverse((o) => {
      if (o.isMesh && o.material.userData._spawnProgress) uniforms.push(o.material.userData._spawnProgress);
    });
    expect(uniforms.length).toBeGreaterThan(1);
    sim.advance(400 + despawnFadeMs / 2, station);
    expect(uniforms[0].value).toBeGreaterThan(0.3);
    expect(uniforms[0].value).toBeLessThan(0.7);
    sim.advance(despawnFadeMs / 2 + spawnFadeMs / 2 + FRAME_MS, station);
    expect(unit.position.x).toBe(-JUMP_DOWN_TRAVEL);
    expect(unit.position.y).toBe(ledgeY);
    expect(uniforms[0].value).toBeGreaterThan(0.3);
    expect(uniforms[0].value).toBeLessThan(0.7);
    sim.advance(spawnFadeMs / 2 + 400 + FRAME_MS * 8, station);
    expect(uniforms[0].value).toBe(1);
    expect(ch.state).toBe(State.IDLE);
  });

  it('Teleport dithers the unit away, draws nothing for the gap and dithers it back on the next tile', () => {
    const def = SPRITE_DEMOS.find((d) => d.mode === 'TP');
    const { stations, sim } = setup([def.id]);
    const station = stations[0];
    const unit = station.roots[0];
    const ch = unit.userData.character;
    const uniform = unit.children[0].material.userData._spawnProgress;
    const started = ch.walkStart;
    expect(unit.position.x).toBe(-TELEPORT_OFFSET);
    const at = (ticks) => sim.advance(started + (ticks * 1000) / 60 + FRAME_MS / 2 - sim.now, station);
    at(def.outTicks / 2);
    expect(uniform.value).toBeCloseTo(0.5, 1);
    expect(unit.visible).toBe(true);
    at(def.outTicks + 1);
    expect(unit.visible).toBe(false);
    expect(unit.position.x).toBe(TELEPORT_OFFSET);
    at(def.outTicks + TELEPORT_GAP_TICKS + def.inTicks / 2);
    expect(unit.visible).toBe(true);
    expect(uniform.value).toBeCloseTo(0.5, 1);
    expect(ch.walkStart).toBeGreaterThan(started);
    at(def.outTicks + TELEPORT_GAP_TICKS + def.inTicks + 1);
    expect(uniform.value).toBe(1);
    expect(ch.state).toBe(State.FALLING);
    sim.advance(1000, station);
    expect(ch.state).toBe(State.IDLE);
    sim.advance((def.outTicks * 1000) / 60 + FRAME_MS * 2, station);
    expect(unit.position.x).toBe(-TELEPORT_OFFSET);
  });

  it('Jump stays grounded through the take-off frames, flies on the Mid Jump pose and lands on the first landing frame', () => {
    const { stations, sim, camera } = setup(['jump']);
    const station = stations[0];
    const unit = station.roots[0];
    const ch = unit.userData.character;
    sim.advance(FRAME_MS, station);
    expect(ch.action?.phase).toBe('air');
    const start = ch.walkStart;
    const at = (s) => sim.advance(start + s * 1000 - sim.now, station);
    const drawnFrame = () => {
      unit.children[0].onBeforeRender(null, null, camera);
      return (() => { let t = 0; const e = (sim.now - start) / 1000; for (let i = 0; i < JUMP_DELAYS_S.length; i++) { t += JUMP_DELAYS_S[i]; if (e < t) return i; } return JUMP_DELAYS_S.length - 1; })();
    };
    at(JUMP_TAKEOFF_S - 0.02);
    expect(unit.position.y).toBe(REST_Y);
    expect(drawnFrame()).toBe(JUMP_AIR_FRAME - 1);
    const mid = (JUMP_TAKEOFF_S + JUMP_TOUCHDOWN_S) / 2;
    at(mid);
    expect(unit.position.y).toBeGreaterThan(REST_Y + JUMP_LIFT_HEIGHT - 1);
    expect(drawnFrame()).toBe(JUMP_AIR_FRAME);
    at(JUMP_TOUCHDOWN_S + 0.02);
    expect(unit.position.y).toBe(REST_Y);
    expect(drawnFrame()).toBe(JUMP_LAND_FRAME);
    at(JUMP_CYCLE_DURATION + 0.02);
    expect(ch.action).toBe(null);
    expect(ch._lastCycle).toBe(-1);
    expect(unit.position.y).toBe(REST_Y);
  });

  //NOTE(@jimmylee)
  //One throw, two stones: everything up to the hit is the shared hand and arc code, with each stone's
  //own launch.
  for (const [id, variant] of [['throw-stone', STONE_VARIANTS.small], ['throw-heavy', STONE_VARIANTS.heavy]]) {
    it(`${id} picks the stone up at the kneel, carries it on the hand and throws it from the last held hand`, () => {
      const { stations, sim, camera } = setup([id]);
      const station = stations[0];
      const unit = station.roots[0];
      const stone = station.scene.children.find((o) => o.isMesh && o.geometry.type === 'SphereGeometry');
      expect(stone.geometry.parameters.radius).toBe(variant.radius);
      sim.advance(FRAME_MS, station);
      const startedAt = unit.userData.character.walkStart;
      const frameStart = (k) => startedAt + THROW_STONE_DELAYS_S_FWD.slice(0, k).reduce((a, b) => a + b, 0) * 1000;
      const pattern = 1;
      const hand = (k) => throwStoneHandPoint(unit.position, camera.quaternion, k, pattern, { x: 0, y: 0, z: 0 }, SPRITE_SHEET_FILE);
      sim.advance(frameStart(THROW_STONE_SPAWN_FRAME) - FRAME_MS - sim.now, station);
      expect(stone.visible).toBe(false);
      sim.advance(FRAME_MS * 2, station);
      expect(stone.visible).toBe(true);
      for (const axis of ['x', 'y', 'z']) expect(stone.position[axis]).toBeCloseTo(hand(THROW_STONE_SPAWN_FRAME)[axis], 5);
      //NOTE(@jimmylee)
      //The overhead lift (frame 5) carries the stone above the head.
      sim.advance(frameStart(5) + FRAME_MS - sim.now, station);
      for (const axis of ['x', 'y', 'z']) expect(stone.position[axis]).toBeCloseTo(hand(5)[axis], 5);
      expect(stone.position.y).toBeGreaterThan(REST_Y + 12);
      //NOTE(@jimmylee)
      //The throw frame draws an empty hand: the stone leaves from the last held hand, not from the low
      //follow-through, on one arc from the release point, and never moves back toward the thrower.
      const releaseHand = hand(THROW_STONE_LAST_HELD_FRAME);
      const launch = throwStoneLaunchPoint(unit.position, 1, 0, { x: 0, y: 0, z: 0 });
      const flightAt = (t) => throwStoneFlightPoint(launch, releaseHand, 1, 0, t, { x: 0, y: 0, z: 0 }, variant.vh, variant.vv);
      for (const axis of ['x', 'y', 'z']) expect(flightAt(0)[axis]).toBeCloseTo(releaseHand[axis], 10);
      sim.advance(frameStart(THROW_STONE_RELEASE_FRAME) + FRAME_MS / 2 - sim.now, station);
      const early = flightAt((sim.now - frameStart(THROW_STONE_RELEASE_FRAME)) / 1000);
      for (const axis of ['x', 'y', 'z']) expect(stone.position[axis]).toBeCloseTo(early[axis], 5);
      sim.advance(frameStart(THROW_STONE_RELEASE_FRAME) + THROW_STONE_FOLLOW_THROUGH_S * 1000 + FRAME_MS - sim.now, station);
      const t = (sim.now - frameStart(THROW_STONE_RELEASE_FRAME)) / 1000;
      expect(stone.position.y).toBeCloseTo(launch.y + variant.vv * t - 25 * t * t, 5);
      expect(stone.position.x).toBeGreaterThan(launch.x);
      expect(stone.position.z).toBe(0);
    });
  }

  it('the stones are one rock, thrown by one arm: the engine marble keeps its launch and the small stone leaves faster and flatter', () => {
    const { small, heavy } = STONE_VARIANTS;
    expect(heavy.radius).toBe(sphereRadius);
    expect(heavy.mass).toBeCloseTo(MARBLE_MASS, 12);
    expect(heavy.vh).toBe(THROW_LAUNCH_VH);
    expect(heavy.vv).toBe(THROW_LAUNCH_VV);
    expect(throwSpeed(heavy.mass)).toBeCloseTo(Math.hypot(THROW_LAUNCH_VH, THROW_LAUNCH_VV), 9);
    expect(small.radius).toBe(STONE_RADIUS_SMALL);
    expect(small.mass / heavy.mass).toBeCloseTo((small.radius / heavy.radius) ** 3, 12);
    expect(Math.hypot(small.vh, small.vv)).toBeCloseTo(throwSpeed(small.mass), 9);
    expect(Math.hypot(small.vh, small.vv)).toBeGreaterThan(2 * Math.hypot(heavy.vh, heavy.vv));
    expect(Math.atan2(small.vv, small.vh)).toBeLessThan(Math.PI / 8);
    expect(STONE_TARGET_MASS).toBe(getMeshData('A1').mass);
    //NOTE(@jimmylee)
    //A hand is 5px wide on the sheet, the 0.75 x 0.9 billboard scale making that about 4 units: the
    //small stone must read as held in it, not as a ball in front of the sprite.
    expect(small.radius * 2).toBeLessThan(5.5);
  });

  //NOTE(@jimmylee)
  //Accuracy: whatever the camera shows, the stone reaches the target's collision box on the planned
  //tick at the same world point, and the same collision moves the target by its own mass.
  for (const [id, variant, pushed] of [['throw-stone', STONE_VARIANTS.small, false], ['throw-heavy', STONE_VARIANTS.heavy, true]]) {
    it(`${id} hits the target on its planned tick at every camera, and the collision follows the mass`, () => {
      const contacts = [];
      for (const step of [0, 1, 3, 5]) {
        const { stations, sim } = setup([id]);
        const station = stations[0];
        const [unit, target, flinch] = station.roots;
        const stone = station.scene.children.find((o) => o.isMesh && o.geometry.type === 'SphereGeometry');
        sim.advance(FRAME_MS, station, step);
        const startedAt = unit.userData.character.walkStart;
        sim.advance(startedAt + ((variant.hitTick - 2) * 1000) / 60 - sim.now, station, step);
        expect(flinch.visible).toBe(false);
        expect(target.position.x).toBe(variant.targetForward);
        sim.advance(FRAME_MS * 3, station, step);
        expect(flinch.visible).toBe(true);
        expect(target.visible).toBe(false);
        contacts.push(stone.position.clone());
        expect(stone.position.x + variant.radius).toBeGreaterThan(variant.targetForward - CHAR_HALF_Z - 3);
        expect(Math.abs(stone.position.y - REST_Y)).toBeLessThan(18);
        let guard = 0;
        while (stone.position.y > variant.radius + 1e-9 && guard++ < 400) sim.advance(FRAME_MS, station, step);
        expect(stone.position.y).toBe(variant.radius);
        sim.advance(1200, station, step);
        const moved = flinch.position.x - variant.targetForward;
        if (pushed) expect(moved).toBeGreaterThan(cubeSize / 4);
        else expect(moved).toBeLessThan(0.5);
        expect(station.status(sim.now, step)).toContain('stone');
        //NOTE(@jimmylee)
        //The stone rolls out and fades, the next throw starts and the target is back.
        guard = 0;
        while (unit.userData.character.action === null && guard++ < 900) sim.advance(FRAME_MS, station, step);
        expect(unit.userData.character.action).not.toBe(null);
        expect(target.position.x).toBe(variant.targetForward);
      }
      for (const contact of contacts) expect(contact.distanceTo(contacts[0])).toBeLessThan(1e-6 + variant.vh * (FRAME_MS / 1000) * 2);
    }, SIMULATION_TIMEOUT_MS);
  }

  //NOTE(@jimmylee)
  //The body (mesh.position) follows the engine's camera-independent hold point and deflection arc;
  //what is drawn (matrixWorld, written by the T visual driver) rides the hand and joins that arc.
  it('Quick Throw catches the marble, carries it overhead on the hand and throws it from there', () => {
    for (const step of [0, 3]) {
      const { stations, sim, camera } = setup(['quick-throw']);
      const station = stations[0];
      const unit = station.roots[0];
      const ch = unit.userData.character;
      const marble = station.scene.children.find((o) => o.isMesh && o.geometry.type === 'SphereGeometry');
      const drawn = new THREE.Vector3();
      const draw = () => drawn.setFromMatrixPosition(marble.matrixWorld);
      const rest = marble.position.clone();
      expect(rest.y).toBe(sphereRadius);
      sim.advance(FRAME_MS, station, step);
      const startedAt = ch.walkStart;
      const hold = (ms) => new THREE.Vector3(rest.x, REST_Y + quickThrowHoldHeight(ms), rest.z);
      expect(Math.hypot(rest.x, rest.z)).toBeCloseTo(CAUGHT_MARBLE_FORWARD_OFFSET, 9);
      expect(marble.position.distanceTo(hold(0))).toBeLessThan(1e-9);
      const pattern = ASSEMBLY_STEP_MAP[(ch.directionOffset + step) % 8];
      const hand = (k, du = 0) => new THREE.Vector3().copy(throwStoneHandPoint(unit.position, camera.quaternion, k, pattern, { x: 0, y: 0, z: 0 }, SPRITE_SHEET_FILE, du));
      sim.advance(startedAt + QT_PICKUP_MS + FRAME_MS - sim.now, station, step);
      expect(draw().distanceTo(hand(QT_PICKUP_FRAME))).toBeLessThan(1e-6);
      expect(marble.position.distanceTo(hold(QT_PICKUP_MS))).toBeLessThan(1e-9);
      //NOTE(@jimmylee)
      //Frame 4, the reach: the marble is still held, on the hand, higher than the kneel.
      sim.advance(startedAt + QT_RELEASE_MS - FRAME_MS - sim.now, station, step);
      expect(draw().distanceTo(hand(4))).toBeLessThan(1e-6);
      expect(marble.position.y).toBeGreaterThan(hold(QT_PICKUP_MS).y);
      //NOTE(@jimmylee)
      //Frame 5, overhead: the body has left from the top of the carry track; the drawn marble is
      //between the overhead hand and the body.
      sim.advance(startedAt + QT_RELEASE_MS + FRAME_MS / 2 - sim.now, station, step);
      expect(marble.position.y).toBeGreaterThan(hold(QT_RELEASE_MS).y);
      const toBody = draw().distanceTo(marble.position);
      expect(toBody).toBeGreaterThan(0);
      expect(toBody).toBeLessThan(hand(QT_RELEASE_FRAME, -2).distanceTo(marble.position));
      //NOTE(@jimmylee)
      //After the frame, what is drawn is the body, and it lands on the floor past the deflection range.
      sim.advance(startedAt + QT_RELEASE_MS + FRAME_MS * 3 - sim.now, station, step);
      expect(ch._heldMarble).toBe(null);
      expect(draw().distanceTo(marble.position)).toBeLessThan(1e-9);
      const t = (sim.now - startedAt - QT_RELEASE_MS) / 1000;
      expect(Math.hypot(marble.position.x, marble.position.z)).toBeCloseTo(CAUGHT_MARBLE_FORWARD_OFFSET + deflectLaunchVH * t, 6);
      let guard = 0;
      while (marble.position.y > sphereRadius && guard++ < 300) sim.advance(FRAME_MS, station, step);
      expect(marble.position.y).toBe(sphereRadius);
      expect(Math.hypot(marble.position.x, marble.position.z)).toBeGreaterThan(cubeSize * 3);
      //NOTE(@jimmylee)
      //Fades out, then a new marble rests where the first one did and the next pass catches it.
      sim.advance(1400, station, step);
      expect(marble.position.distanceTo(rest)).toBeLessThan(1e-9);
      expect(marble.visible).toBe(true);
      sim.advance(500, station, step);
      expect(ch._heldMarble).not.toBe(null);
    }
  }, SIMULATION_TIMEOUT_MS);

  it('Fatal Item Impact and Item Drop play once, hold the last frame and start over', () => {
    for (const id of ['fatal-item-impact', 'item-drop']) {
      const { stations, sim } = setup([id]);
      const station = stations[0];
      const ch = station.roots[0].userData.character;
      const started = ch.walkStart;
      sim.advance(600, station);
      expect(ch.walkStart, id).toBe(started);
      sim.advance(1000, station);
      expect(ch.walkStart, id).toBeGreaterThan(started);
    }
  });

  it('A1 jump leaves the ground at once, loops the airborne frames and clears the action on landing', () => {
    const { stations, sim } = setup(['a1-jump']);
    const station = stations[0];
    const unit = station.roots[0];
    const ch = unit.userData.character;
    sim.advance(FRAME_MS, station);
    expect(ch._jumpAction).toBeTruthy();
    sim.advance(100, station);
    expect(unit.position.y).toBeGreaterThan(REST_Y);
    let guard = 0;
    while (ch._jumpAction && guard++ < 120) sim.advance(FRAME_MS, station);
    expect(ch._jumpAction).toBe(null);
    expect(unit.position.y).toBe(REST_Y);
    expect(guard * FRAME_MS).toBeGreaterThan(500);
  });

  it('A1 stab and cast run one action, then idle before repeating', () => {
    for (const [id, field] of [['a1-stab', '_attackAction'], ['a1-cast', '_castAction']]) {
      const { stations, sim } = setup([id]);
      const station = stations[0];
      const ch = station.roots[0].userData.character;
      sim.advance(FRAME_MS, station);
      expect(ch[field], id).toBeTruthy();
      sim.advance(720, station);
      expect(ch[field], id).toBe(null);
      sim.advance(500, station);
      expect(ch[field], id).toBeTruthy();
    }
  });

  it('Strike targets flinch once per cycle at the contact tick', () => {
    const def = SPRITE_DEMOS.find((d) => d.id === 'stab-1');
    const { stations, sim } = setup(['stab-1']);
    const station = stations[0];
    const [unit, target, flinch] = station.roots;
    expect(target.position.x).toBe(STRIKE_GAP);
    const settledAt = unit.userData.character.walkStart;
    sim.advance(settledAt + def.hitMs - FRAME_MS * 2 - sim.now, station);
    expect(flinch.visible).toBe(false);
    sim.advance(FRAME_MS * 3, station);
    expect(flinch.visible).toBe(true);
    expect(target.visible).toBe(false);
    const cycleMs = STAB_DELAYS.reduce((a, b) => a + b, 0);
    sim.advance(settledAt + cycleMs + def.hitMs - FRAME_MS * 2 - sim.now, station);
    expect(flinch.visible).toBe(false);
    sim.advance(FRAME_MS * 3, station);
    expect(flinch.visible).toBe(true);
  });

  //NOTE(@jimmylee)
  //High, Mid and Low are the target's height against the archer's.
  for (const [id, archer, target] of [['punch-1', 0, BOW_LEDGE], ['punch-2', 0, 0], ['punch-3', BOW_LEDGE, 0]]) {
    it(`${id} draws the string, looses the arrow on PlaySound and the target flinches when it lands, at every step`, () => {
      for (const step of [0, 1, 3, 5]) {
        const { stations, sim, camera } = setup([id]);
        const station = stations[0];
        const [unit, standing, flinch] = station.roots;
        const ch = unit.userData.character;
        const { plan } = station.def;
        expect(unit.position.y).toBe(REST_Y + archer);
        expect(standing.position.x).toBe(BOW_RANGE);
        expect(standing.position.y).toBe(REST_Y + target);
        const groups = station.scene.children.filter((o) => o.type === 'Group' && !o.userData.character);
        const [bow, arrow] = groups;
        const at = (ticks) => sim.advance(ch.walkStart + (ticks * 1000) / 60 + FRAME_MS / 2 - sim.now, station, step);
        const pattern = station.def.assembly[ASSEMBLY_STEP_MAP[(ch.directionOffset + step) % 8]];
        const nock = () => -station.simulated.x[station.simulated.nodes];
        const handOn = (k) => {
          const lunge = (pattern.frames[k].move.fb * 24) / 32;
          const shooter = { x: unit.position.x + lunge, y: unit.position.y, z: unit.position.z };
          return billboardPoint(shooter, camera.quaternion, pattern.frames[k].bowHand[0], pattern.frames[k].bowHand[1], pattern.reversed ? -1 : 1, { x: 0, y: 0, z: 0 }, 0);
        };
        at(BOW_NOCK_TICKS - 2);
        expect(arrow.visible).toBe(false);
        expect(nock()).toBeCloseTo(BOW_SPEC.braceHeight, 1);
        at(BOW_NOCK_TICKS + 1);
        expect(arrow.visible).toBe(true);
        //NOTE(@jimmylee)
        //The string is pulled by the hand: at the anchor tick it is at full draw and stays there.
        at(BOW_ANCHOR_TICKS + 1);
        expect(nock()).toBeCloseTo(BOW_SPEC.drawLength, 6);
        //NOTE(@jimmylee)
        //Tick 25 is the frame before the shot: full draw, the grip on the frame's bow hand, the nocked
        //arrow on the string, at the bow's own axis.
        at(BOW_SHOT_TICKS - 2);
        const held = handOn(4);
        for (const axis of ['x', 'y', 'z']) expect(bow.position[axis]).toBeCloseTo(held[axis], 9);
        expect(nock()).toBeCloseTo(BOW_SPEC.drawLength, 6);
        const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(bow.quaternion);
        expect(arrow.position.clone().sub(bow.position).normalize().dot(axis)).toBeCloseTo(-1, 9);
        expect(flinch.visible).toBe(false);
        //NOTE(@jimmylee)
        //The string drives the arrow past the grip, then it is on its way and the string is free.
        at(plan.leavesTick + 2);
        expect(station.simulated.arrowOn).toBe(false);
        expect(nock()).toBeLessThan(BOW_SPEC.drawLength / 2);
        at((plan.leavesTick + plan.hitTick) / 2);
        expect(arrow.position.x).toBeGreaterThan(plan.launchForward - BOW_SPEC.arrowLength - 2);
        expect(flinch.visible).toBe(false);
        at(plan.hitTick - 2);
        expect(flinch.visible).toBe(false);
        at(plan.hitTick + 1);
        expect(arrow.visible).toBe(true);
        expect(flinch.visible).toBe(true);
        expect(standing.visible).toBe(false);
        expect(flinch.position.y).toBe(REST_Y + target);
        const tip = new THREE.Vector3(BOW_SPEC.arrowLength, 0, 0).applyQuaternion(arrow.quaternion).add(arrow.position);
        expect(tip.x).toBeCloseTo(plan.hitForward, 6);
        expect(tip.y).toBeCloseTo(REST_Y + archer + plan.hitUp, 6);
        expect(tip.z).toBeCloseTo(0, 6);
      }
    }, SIMULATION_TIMEOUT_MS);
  }

  //NOTE(@jimmylee)
  //The physics runs in its own fixed steps, so what a frame rate does to the render loop never reaches
  //the shot.
  it('a bow plays the same shot at any frame rate', () => {
    const run = (frameMs) => {
      const { stations, camera } = setup(['punch-2']);
      const station = stations[0];
      const start = station.roots[0].userData.character.walkStart;
      const end = start + (40 * 1000) / 60;
      for (let now = start + frameMs; now < end; now += frameMs) {
        fitStationView(station, azimuthForStep(0), ELEVATIONS.game, ASPECT);
        const step = aimCamera(camera, station.focus, azimuthForStep(0), ELEVATIONS.game, now);
        station.update(now, frameMs / 1000, step, camera.quaternion);
      }
      station.update(end, 0, 0, camera.quaternion);
      return station.simulated;
    };
    const steady = run(1000 / 60);
    for (const frameMs of [1000 / 30, 1000 / 144]) {
      const other = run(frameMs);
      expect(other.phi).toBe(steady.phi);
      expect(other.arrowV).toBe(steady.arrowV);
    }
    expect(steady.arrowV).toBeCloseTo(BOW_SHOT.speed, 2);
  });

  //NOTE(@jimmylee)
  //The bow aims at the target and the sprite's hands are drawn, so they can only meet where the camera
  //sees the shot from the side. Steps 3 and 7 look along the arrow, which foreshortens it while the
  //sprite still draws its hands apart: that is an 8-step sprite's limit, bounded here so it cannot
  //quietly grow.
  it('at full draw the nock is on the drawn hand from the side, and within a bound head on', () => {
    const SIDE_PX = 7;
    const HEAD_ON_PX = 12;
    const ANY_ELEVATION_PX = 15;
    for (const [name, elevation] of Object.entries(ELEVATIONS)) {
      for (const def of SPRITE_DEMOS.filter((d) => d.kind === 'bow')) {
        for (let step = 0; step < 8; step++) {
          const { stations, sim } = setup([def.id]);
          const station = stations[0];
          const ch = station.roots[0].userData.character;
          sim.advance(ch.walkStart + ((BOW_SHOT_TICKS - 2) * 1000) / 60 - sim.now, station, step, elevation);
          const gap = Number(station.status(sim.now, sim.step).match(/hand ([\d.]+)px/)[1]);
          const label = `${def.id} step ${step} ${name}`;
          expect(gap, label).toBeLessThan(ANY_ELEVATION_PX);
          if (name === 'game') expect(gap, label).toBeLessThan(step % 4 === 3 ? HEAD_ON_PX : SIDE_PX);
        }
      }
    }
  }, SIMULATION_TIMEOUT_MS);

  describe('in water', () => {
    const inWater = (ids) => {
      const run = setup(ids);
      run.water = { water: createWaterResources(), bodies: createBodyResources(testSheetAlpha()) };
      for (const station of run.stations) applyWater(station, true);
      return run;
    };

    it('every scene gets its own water; sequence groups draw their water frames and the floor goes', () => {
      const ids = ['idle', SPRITE_DEMOS.find((d) => d.mode === 'SW1').id];
      const { stations, water, sim } = inWater(ids);
      const [idle, swing] = stations;
      for (const station of stations) updateStationWater(station, water, sim.now, azimuthForStep(0), ELEVATIONS.game);
      expect(idle.water.mesh.material).not.toBe(swing.water.mesh.material);
      expect(idle.water.mesh.geometry).toBe(swing.water.mesh.geometry);
      expect(idle.scene.userData.ground.every((o) => !o.visible)).toBe(true);
      expect(swing.roots[0].userData.character.seqWater).toBe(true);
      applyWater(swing, false);
      expect(swing.water.mesh.visible).toBe(false);
      expect(swing.roots[0].userData.character.seqWater).toBe(false);
      expect(swing.scene.userData.ground.every((o) => o.visible)).toBe(true);
      applyWater(swing, true);
      expect(swing.water.mesh.visible).toBe(true);
    });

    it('a sequence card draws other tiles in water, not the dry frames under the surface', () => {
      const tiles = (water) => {
        const { stations, sim, camera } = setup([SPRITE_DEMOS.find((d) => d.mode === 'SW1').id]);
        applyWater(stations[0], water);
        const unit = stations[0].roots[0];
        const drawn = [];
        for (let f = 0; f < 60; f++) {
          sim.advance(FRAME_MS, stations[0], 1);
          unit.children[0].onBeforeRender(null, null, camera);
          drawn.push(unit.children.filter((o) => o.isMesh && o.visible && o.material.map).map((o) => `${o.material.map.offset.x},${o.material.map.offset.y}`).join('|'));
        }
        return drawn;
      };
      expect(tiles(true)).not.toEqual(tiles(false));
    });

    it('Nulled Walk keeps its water frames with the water off, because its dry frames are placeholders', () => {
      const { stations } = inWater([SPRITE_DEMOS.find((d) => d.mode === 'NW').id]);
      applyWater(stations[0], false);
      expect(stations[0].roots[0].userData.character.seqWater).toBe(true);
    });

    //NOTE(@jimmylee)
    //A water frame cut well above the surface would leave a unit hanging over its own foam.
    it('every water frame a card draws reaches the surface, and floating units keep their dry frames', () => {
      const row = Math.max(...SHP_FRAMES[1 + SHP_WATER_OFFSET].map(([id, , v]) => v + SPRITE_MAP[id].h / 2));
      const SURFACE_SLACK_PX = 3;
      for (const def of SPRITE_DEMOS.filter((d) => d.pair)) {
        const { stations } = inWater([def.id]);
        const unit = stations[0].roots[0];
        if (def.waterRows !== undefined) {
          expect(unit.userData.character.seqWater, def.id).toBe(false);
          continue;
        }
        for (const entry of [def.pair.front, def.pair.back]) {
          for (let k = 0; k < entry.frames.length; k++) {
            const bottom = Math.max(...SHP_FRAMES[entry.frames[k] + SHP_WATER_OFFSET].map(([id, , v]) => v + SPRITE_MAP[id].h / 2));
            expect(bottom + (entry.du?.[k] ?? 0), `${def.id} F${entry.frames[k]}`).toBeGreaterThanOrEqual(row - SURFACE_SLACK_PX);
          }
        }
      }
    });

    //NOTE(@jimmylee)
    //F(n + 182) stop at the waterline of a unit standing in the water. Draw one on a ledge or in the air and
    //the body is gone before it reaches the surface.
    it('a unit above the water keeps its dry frames, and the water frames start at touchdown', () => {
      const def = SPRITE_DEMOS.find((d) => d.mode === 'JD');
      const { stations, sim } = inWater([def.id]);
      const [station] = stations;
      const unit = station.roots[0];
      const ch = unit.userData.character;
      const seen = [];
      for (let tick = 0; tick < sum(def.timeline.ticks); tick++) {
        sim.advance(FRAME_MS, station);
        applyWater(station, true);
        seen.push({ tick, y: unit.position.y, wet: ch.seqWater });
      }
      expect(seen[0].wet).toBe(false);
      for (const { tick, y, wet } of seen) expect(wet, `tick ${tick}`).toBe(y <= REST_Y);
      expect(seen.findIndex(({ wet }) => wet)).toBe(Math.round(def.landTicks));
      expect(seen.at(-1).wet).toBe(true);
    });

    it('a leap draws its water frames on the ground, its dry frames in the air and water frames again', () => {
      const { stations, sim } = inWater([SPRITE_DEMOS.find((d) => d.mode === 'HH').id]);
      const [station] = stations;
      const ch = station.roots[0].userData.character;
      const { takeoffTicks, airTicks } = station.def.leap;
      expect(ch.seqWater).toBe(true);
      sim.advance((takeoffTicks * 1000) / 60 + FRAME_MS * 2, station);
      applyWater(station, true);
      expect(ch.seqFront.seq).toBe(50);
      expect(ch.seqWater).toBe(false);
      expect(station.status(sim.now, 0)).toContain(`F${SEQ_PAIRS.find((p) => p.front.seq === 50).front.frames[0]}`);
      sim.advance((airTicks * 1000) / 60, station);
      applyWater(station, true);
      expect(ch.seqWater).toBe(true);
    });

    it('a body tint is never a layer tint, so the two legends cannot be mistaken', () => {
      const layers = LAYER_TINTS.map((t) => t.color);
      for (const { color } of BODY_TINTS) expect(layers).not.toContain(color);
      expect(BODY_TINTS[0].color).not.toBe(BODY_TINTS[1].color);
    });

    //NOTE(@jimmylee)
    //The sprite plane leans with the camera, so the surface moves with the elevation to cut it on one row.
    it('the surface cuts a standing sprite on the idle water line at every elevation', () => {
      const { stations } = inWater(['idle']);
      const row = Math.max(...SHP_FRAMES[1 + SHP_WATER_OFFSET].map(([id, , v]) => v + SPRITE_MAP[id].h / 2));
      expect(row).toBe(10);
      for (const elevation of Object.values(ELEVATIONS)) expect(((REST_Y - waterHeight(stations[0], elevation)) / Math.cos(elevation)) / (36 / 40)).toBeCloseTo(row, 9);
    });

    //NOTE(@jimmylee)
    //Opaque, so it draws before every sprite layer, all of them transparent, and depth does the cutting.
    it('the sheet writes depth under every sprite layer and reaches past every view', () => {
      const { stations, water, sim } = inWater(['idle']);
      updateStationWater(stations[0], water, sim.now, azimuthForStep(0), ELEVATIONS.game);
      const { material } = stations[0].water.mesh;
      expect(material.transparent).toBe(false);
      expect(material.depthWrite).toBe(true);
      expect(material.map).toBeUndefined();
      water.water.geometry.computeBoundingBox();
      const edge = water.water.geometry.boundingBox.max.x;
      const { stations: every } = setup();
      for (const station of every) {
        for (const elevation of Object.values(ELEVATIONS)) {
          fitStationView(station, azimuthForStep(0), elevation, ASPECT);
          const reach = station.halfHeight + Math.abs(station.focus.y);
          expect(edge * Math.sin(elevation), `${station.def.id}`).toBeGreaterThan(reach);
        }
      }
    });

    it('a thrown stone splashes where it enters the water', () => {
      const { stations, water, sim } = inWater(['throw-heavy']);
      const station = stations[0];
      const stone = station.props[0].object;
      let entered = -1;
      for (let f = 0; f < 400 && entered < 0; f++) {
        sim.advance(FRAME_MS, station);
        updateStationWater(station, water, sim.now, azimuthForStep(0), ELEVATIONS.game);
        if (stone.visible && stone.position.y - station.props[0].radius < station.water.mesh.position.y) entered = f;
      }
      expect(entered).toBeGreaterThan(0);
      for (let f = 0; f < 3; f++) {
        sim.advance(FRAME_MS, station);
        updateStationWater(station, water, sim.now, azimuthForStep(0), ELEVATIONS.game);
      }
      const { field, size } = station.water.ripples;
      const { x, z, domain } = station.water.window;
      const cell = Math.round(((stone.position.z - z) / domain + 0.5) * size) * size + Math.round(((stone.position.x - x) / domain + 0.5) * size);
      let deepest = 0;
      for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) deepest = Math.max(deepest, Math.abs(field[(cell + dz * size + dx) * 4]));
      expect(deepest).toBeGreaterThan(0.1);
    });

    it('the swell is pure in time and normalized, and its ripples stay bounded', () => {
      const spec = { size: 32, domain: 64, windX: 1, windZ: 0.5, windSpeed: 24, gravity: 9.81, smallWave: 1, choppiness: 0.8, targetHeight: 0.7, repeatPeriod: 200, foamThreshold: 0.5, foamStrength: 5, seed: 7 };
      const swell = createWaterSwell(spec);
      swell.update(0);
      const heights = swell.heightDisplacement.filter((_, i) => i % 4 === 0);
      expect(Math.sqrt(heights.reduce((a, h) => a + h * h, 0) / heights.length)).toBeCloseTo(spec.targetHeight, 4);
      swell.update(3.5);
      const later = swell.heightDisplacement.slice();
      expect(later.some((value) => value !== 0)).toBe(true);
      swell.update(1);
      swell.update(3.5);
      expect(swell.heightDisplacement).toEqual(later);
      const ripples = createWaterRipples({ size: 32, domain: 80, propagation: 0.3, damping: 0.985, sponge: 4 });
      for (let i = 0; i < 4000; i++) {
        ripples.displace(((i * 7) % 24) - 12, ((i * 11) % 24) - 12, 40);
        ripples.settle(0.8, 0.35);
        ripples.step();
      }
      expect(ripples.field.every((v) => Number.isFinite(v) && Math.abs(v) < 20)).toBe(true);
    });
  });

  describe('damage counters', () => {
    const counterOf = (station) => station.scene.children.find((o) => o.isMesh && o.geometry.getAttribute('order'));

    it('a hit shows the default number over the target, on the same frame, and Repeat clears it', () => {
      const def = SPRITE_DEMOS.find((d) => d.id === 'stab-1');
      const { stations, sim } = setup(['stab-1']);
      const station = stations[0];
      const [unit, target, flinch] = station.roots;
      const counter = counterOf(station);
      const settledAt = unit.userData.character.walkStart;
      sim.advance(settledAt + def.hitMs - FRAME_MS * 2 - sim.now, station);
      expect(counter.visible).toBe(false);
      sim.advance(FRAME_MS * 3, station);
      expect(flinch.visible).toBe(true);
      expect(counter.visible).toBe(true);
      expect(counter.position.distanceTo(target.position)).toBe(0);
      expect(counter.geometry.index.count / 6).toBe(String(DAMAGE_COUNTER).length);
      expect(station.status(sim.now, 0)).toContain(`target hit ${DAMAGE_COUNTER}`);
      station.reset(sim.now);
      expect(counter.visible).toBe(false);
    });

    it('every hit of a card with a target shows one: a stone, an arrow and the Taking Damage loop', () => {
      for (const [id, ms] of [['throw-stone', 2000], ['punch-2', 1200], ['flinch', 50]]) {
        const { stations, sim } = setup([id]);
        const counter = counterOf(stations[0]);
        expect(counter.visible, id).toBe(false);
        let shown = false;
        for (let t = 0; t < ms && !shown; t += FRAME_MS) {
          sim.advance(FRAME_MS, stations[0]);
          shown = counter.visible;
        }
        expect(shown, id).toBe(true);
        sim.advance((COUNTER_TICKS * 1000) / 60 + FRAME_MS, stations[0]);
        expect(counter.visible, id).toBe(false);
      }
    });

    it('digits appear in turn, hop in whole pixels and settle inside the sprite extent', () => {
      expect(DAMAGE_COUNTER).toBe(10);
      expect(counterHop(0, 0)).toBe(0);
      expect(counterHop(0, 1)).toBe(-1);
      expect(counterHop(6, 0)).toBe(COUNTER_HOPS[0].px);
      expect(counterHop(COUNTER_TICKS, 0)).toBe(0);
      const peak = Math.max(...COUNTER_HOPS.map((h) => h.px));
      expect((COUNTER_ANCHOR_PX + 4.5 + peak) * (36 / 40)).toBeLessThan(SPRITE_EXTENT.top);
      for (let tick = 0; tick < COUNTER_TICKS; tick += 0.5) expect(Number.isInteger(counterHop(tick, 1))).toBe(true);
    });
  });

  it('disposeStation releases station-owned GPU resources and skips shared ones', () => {
    const { stations, resources } = setup(['punch-2']);
    let disposed = 0;
    stations[0].scene.traverse((o) => {
      if (o.geometry) o.geometry.addEventListener('dispose', () => disposed++);
    });
    let sharedDisposed = 0;
    resources.floorGeometry.addEventListener('dispose', () => sharedDisposed++);
    disposeStation(stations[0], resources);
    expect(disposed).toBeGreaterThan(0);
    expect(sharedDisposed).toBe(0);
  });
});

//NOTE(@jimmylee)
//Every station scene runs the engine's pre-draw hook.
describe('sprite animation demo framing', () => {
  const corner = new THREE.Vector3();

  //NOTE(@jimmylee)
  //Largest |x| / |y| (camera space, world units) reached by any visible sprite plane corner, the stone
  //or the jump reference box, over every camera step.
  function measureReach(def, elevation) {
    let reachX = 0;
    let reachY = 0;
    let halfHeight = 0;
    for (let step = 0; step < 8; step++) {
      const { stations, camera, sim } = setup([def.id]);
      const station = stations[0];
      for (let f = 0; f < 420; f++) {
        sim.advance(FRAME_MS, station, step, elevation);
        camera.top = station.halfHeight;
        halfHeight = station.halfHeight;
        station.scene.traverseVisible((o) => {
          const geometry = o.geometry;
          if (!geometry || o.type === 'GridHelper') return;
          if (o.isMesh && o.material.visible === false) return;
          if (geometry.type === 'SphereGeometry') {
            const { radius } = geometry.parameters;
            corner.setFromMatrixPosition(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
            reachX = Math.max(reachX, Math.abs(corner.x) + radius);
            reachY = Math.max(reachY, Math.abs(corner.y) + radius);
            return;
          }
          if (o.isMesh && !o.material.map && !o.userData.generatedWeapon) return;
          geometry.computeBoundingBox();
          const { min, max } = geometry.boundingBox;
          for (let k = 0; k < 8; k++) {
            corner.set(k & 1 ? max.x : min.x, k & 2 ? max.y : min.y, k & 4 ? max.z : min.z).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
            reachX = Math.max(reachX, Math.abs(corner.x));
            reachY = Math.max(reachY, Math.abs(corner.y));
          }
        });
      }
    }
    return { reachX, reachY, halfHeight };
  }

  //NOTE(@jimmylee)
  //Hold views are always 1.5x the earlier framing (half-height 30 → 20); the others never go below
  //their 1.5x target and only widen where the envelope needs it.
  it('views are at least 1.5x the earlier magnification wherever the action allows', () => {
    const { stations } = setup();
    for (const station of stations) {
      for (const elevation of Object.values(ELEVATIONS)) {
        fitStationView(station, azimuthForStep(0), elevation, ASPECT);
        expect(station.halfHeight, station.def.id).toBeGreaterThanOrEqual(MIN_VIEW_HALF_HEIGHT[station.def.kind]);
        if (station.def.kind === 'hold') expect(station.halfHeight).toBe(20);
      }
      fitStationView(station, azimuthForStep(0), ELEVATIONS.game, ASPECT);
      expect(station.halfHeight, station.def.id).toBeLessThan({ hold: 30, strike: 34, bow: 62, gun: 62, jump: 58, leap: 58, 'jump-down': 62, teleport: 40, throw: 62, loop: 34, 'quick-throw': 76, pose: 34, player: 58, reaction: 34, recoil: 40, 'weapon-throw': 48, 'item-throw': 50 }[station.def.kind]);
    }
  });

  it('the scale is constant across camera steps; only the focus follows the azimuth', () => {
    const { stations } = setup(['throw-stone']);
    const station = stations[0];
    fitStationView(station, azimuthForStep(0), ELEVATIONS.game, ASPECT);
    const half = station.halfHeight;
    const focus0 = station.focus.clone();
    fitStationView(station, azimuthForStep(3), ELEVATIONS.game, ASPECT);
    expect(station.halfHeight).toBe(half);
    expect(station.focus.distanceTo(focus0)).toBeGreaterThan(1);
  });

  //NOTE(@jimmylee)
  //The whole action — every layer of every frame, the 2-cube jump peak, the stone and marble arcs to their landing
  //and the jump reference box — stays inside the 6:5 viewport at every elevation and camera step.
  for (const def of SPRITE_DEMOS) {
    it(`${def.id} keeps the whole action in frame at every elevation and camera step`, () => {
      for (const [name, elevation] of Object.entries(ELEVATIONS)) {
        const { reachX, reachY, halfHeight } = measureReach(def, elevation);
        expect(reachY, `${def.id} ${name}`).toBeLessThanOrEqual(halfHeight + 1e-6);
        expect(reachX, `${def.id} ${name}`).toBeLessThanOrEqual(halfHeight * ASPECT + 1e-6);
      }
    }, SIMULATION_TIMEOUT_MS);
  }
});

//NOTE(@jimmylee)
//WebGLRenderer.render (three r187): scene.onBeforeRender, then projectObject builds the draw list from
//`visible` (and material.visible), the transparent list is sorted by renderOrder, then renderObject
//calls each object's onBeforeRender immediately before computing its modelViewMatrix and drawing it —
//without re-checking `visible`. Returns what each drawn sprite plane showed when it was drawn.
function snapshot(o) {
  const m = o.material.map;
  return `${m.offset.x},${m.offset.y},${m.repeat.x},${m.repeat.y}|${o.matrixWorld.elements.join(',')}`;
}

function chainVisible(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function renderLikeWebGLRenderer(scene, camera) {
  scene.updateMatrixWorld();
  scene.onBeforeRender(null, scene, camera);
  const list = [];
  scene.traverseVisible((o) => {
    if (o.isMesh && o.material.visible !== false && o.material.map) list.push(o);
  });
  list.sort((a, b) => a.renderOrder - b.renderOrder || a.id - b.id);
  const drawn = new Map();
  for (const o of list) {
    o.onBeforeRender(null, scene, camera);
    drawn.set(o, snapshot(o));
  }
  return drawn;
}

//NOTE(@jimmylee)
//Draws one demo frame and compares every sprite plane with the frame's final state: `stale` = drawn
//with another tile or transform, `missing` = visible but not drawn, `ghost` = drawn but hidden.
function auditFrame(station, camera, counts) {
  const drawn = renderLikeWebGLRenderer(station.scene, camera);
  station.scene.traverse((o) => {
    if (!o.isMesh || !o.material.map || o.material.visible === false) return;
    const shown = chainVisible(o);
    if (drawn.has(o) && !shown) counts.ghost++;
    else if (!drawn.has(o) && shown) counts.missing++;
    else if (drawn.has(o) && drawn.get(o) !== snapshot(o)) counts.stale++;
  });
}

function auditStation(def, step, frames, disableHook = false) {
  const { stations, camera } = setup([def.id]);
  const station = stations[0];
  if (disableHook) station.scene.onBeforeRender = () => {};
  const counts = { stale: 0, missing: 0, ghost: 0, switches: 0 };
  const ch = station.roots[0].userData.character;
  let now = NOW;
  let prev = ch.action === null;
  for (let f = 0; f < frames; f++) {
    now += FRAME_MS;
    fitStationView(station, azimuthForStep(step), ELEVATIONS.game, ASPECT);
    const cameraStep = aimCamera(camera, station.focus, azimuthForStep(step), ELEVATIONS.game, now);
    station.update(now, FRAME_MS / 1000, cameraStep, camera.quaternion);
    if (prev !== (ch.action === null)) counts.switches++;
    prev = ch.action === null;
    auditFrame(station, camera, counts);
  }
  return counts;
}

describe('character layer draw order', () => {
  it('three r187 runs Scene.onBeforeRender before it builds the draw list, and never re-checks visibility per draw', () => {
    const src = readFileSync(join(ROOT, 'node_modules/three/src/renderers/WebGLRenderer.js'), 'utf8');
    const render = src.slice(src.indexOf('this.render = function'));
    expect(render.indexOf('scene.onBeforeRender(')).toBeGreaterThan(0);
    expect(render.indexOf('scene.onBeforeRender(')).toBeLessThan(render.indexOf('projectObject( scene, camera'));
    const renderObject = src.slice(src.indexOf('function renderObject('), src.indexOf('function getProgram('));
    expect(renderObject).toMatch(/object\.onBeforeRender\( _this, scene, camera, geometry, material, group \);\s*object\.modelViewMatrix\.multiplyMatrices\( camera\.matrixWorldInverse, object\.matrixWorld \)/);
    expect(renderObject).not.toMatch(/\.visible/);
  });

  it('every demo scene installs syncCharacterVisuals as Scene.onBeforeRender', () => {
    const { stations } = setup();
    for (const station of stations) expect(station.scene.onBeforeRender).toBe(syncCharacterVisuals);
  });

  it('every character driver goes through setVisualDriver', () => {
    const dir = join(ROOT, 'three-isometric-engine/meshes/character-groups');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => join(dir, f));
    files.push(join(ROOT, 'three-isometric-engine/meshes/createCharacter.js'));
    let drivers = 0;
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/\.onBeforeRender\s*=/);
      drivers += (src.match(/setVisualDriver\(/g) || []).length;
    }
    expect(drivers).toBe(16);
  });

  it('without the hook the replay reproduces stale, missing and ghost layers (the audit is not vacuous)', () => {
    const counts = { stale: 0, missing: 0, ghost: 0 };
    for (const id of ['guard', 'jump', 'throw-stone', 'punch-1']) {
      const c = auditStation(SPRITE_DEMOS.find((d) => d.id === id), 1, 300, true);
      counts.stale += c.stale;
      counts.missing += c.missing;
      counts.ghost += c.ghost;
    }
    expect(counts.stale).toBeGreaterThan(0);
    expect(counts.missing).toBeGreaterThan(0);
    expect(counts.ghost).toBeGreaterThan(0);
  }, SIMULATION_TIMEOUT_MS);

  //NOTE(@jimmylee)
  //8s per station covers every frame of the hold and strike loops, two jumps and the throw cycle
  //with its idle cooldown, at every camera step.
  for (const def of SPRITE_DEMOS) {
    it(`${def.id}: no layer is drawn stale, missing or hidden through frame changes and idle ↔ action switches`, () => {
      for (let step = 0; step < 8; step++) {
        const c = auditStation(def, step, 480);
        expect({ stale: c.stale, missing: c.missing, ghost: c.ghost }, `${def.id} step ${step}`).toEqual({ stale: 0, missing: 0, ghost: 0 });
      }
    }, SIMULATION_TIMEOUT_MS);
  }

  it('the jump and throw stations switch between the idle pose and the action', () => {
    for (const id of ['jump', 'throw-stone']) {
      expect(auditStation(SPRITE_DEMOS.find((d) => d.id === id), 1, 480).switches, id).toBeGreaterThan(1);
    }
  }, SIMULATION_TIMEOUT_MS);

  //NOTE(@jimmylee)
  //First frame: what the renderer draws for the unit equals a group built settled at that same
  //moment and camera step (tests/sprite-rig-parity.test.js proves that state is the TYPE1.SHP frame)
  //— every unit is in its mode pose from the start, never the idle sprite of a falling spawn.
  function localState(root) {
    root.updateMatrixWorld(true);
    return root.children
      .filter((o) => o.isMesh && o.material.map)
      .map((o) => (chainVisible(o) ? `${o.renderOrder}:${snapshot(o).split('|')[0]}|${o.position.toArray().map((v) => v.toFixed(6))}|${o.scale.toArray().map((v) => v.toFixed(6))}` : `${o.renderOrder}:hidden`));
  }

  for (const id of ['guard', 'float', 'punch-1', 'punch-2', 'punch-3', 'stab-1']) {
    it(`${id}: the first frame draws every layer of the settled mode pose`, () => {
      const def = SPRITE_DEMOS.find((d) => d.id === id);
      for (let step = 0; step < 8; step++) {
        const { stations, camera } = setup([id]);
        const station = stations[0];
        const unit = station.roots[0];
        const ch = unit.userData.character;
        const now = NOW + FRAME_MS;
        fitStationView(station, azimuthForStep(step), ELEVATIONS.game, ASPECT);
        const cameraStep = aimCamera(camera, station.focus, azimuthForStep(step), ELEVATIONS.game, now);
        station.update(now, FRAME_MS / 1000, cameraStep, camera.quaternion);
        const drawn = renderLikeWebGLRenderer(station.scene, camera);
        const reference = createCharacter({ node: { x: 0, y: 0, z: 0 }, textures: makeTextures(), direction: 'SE', mode: def.mode, now });
        reference.position.copy(unit.position);
        reference.userData.character.state = State.IDLE;
        reference.userData.character.walkStart = ch.walkStart;
        reference.userData.character.itemLayer = ch.itemLayer;
        reference.children[0].onBeforeRender(null, null, camera);
        expect(localState(unit), `${id} step ${step}`).toEqual(localState(reference));
        const shown = unit.children.filter((o) => o.isMesh && o.material.map && chainVisible(o));
        expect(shown.length, `${id} step ${step}`).toBeGreaterThan(1);
        expect(unit.children.filter((o) => drawn.has(o)).length, `${id} step ${step}`).toBe(shown.length);
      }
    }, SIMULATION_TIMEOUT_MS);
  }
});
