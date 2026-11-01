//NOTE(@jimmylee)
//The physics body read from the sprite, and what the water does with it. The sheet is the real a1.png,
//decoded with no TYPE1 binaries. Bodies must draw from the frame the rig draws, never read the camera,
//and be the only thing that moves the ripples.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createSpriteDemoStations, aimCamera, applyWater, azimuthForStep, fitStationView, updateStationBody, updateStationWater, REST_Y, SPRITE_DEMOS, ELEVATIONS } from '@engine/debug/sprite-animation-demos';
import { createBodyResources } from '@engine/debug/physics-body-mesh';
import { createWaterResources } from '@engine/debug/water-surface';
import { createWaterRipples } from '@engine/debug/water-simulation';
import { BODY_PX_ACROSS, BODY_PX_UP, createSheetBodies, placeBody, readSheetAlpha, resolveBodyPose } from '@engine/physics/sprite-body';
import { SPRITE_MAP } from '@engine/constants/sprites';
import { SHP_FRAMES, SHP_WATER_OFFSET } from '@engine/constants/sprites/seq-library';
import { applySpriteFrame } from '@engine/meshes/character-utils';
import { sheetPixels } from './helpers/fft-type1';

const NOW = 1_000_000;
const FRAME_MS = 1000 / 60;
const ASPECT = 6 / 5;
const FRONT_STEP = 0;
const SIDE_ON_STEP = 1;
const SIMULATION_TIMEOUT_MS = 60_000;
const idOfMode = (mode) => SPRITE_DEMOS.find((d) => d.mode === mode).id;

function a1Sheet() {
  const { width, height, at } = sheetPixels('a1.png');
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[(y * width + x) * 4 + 3] = at(x, y)[3];
  return readSheetAlpha({ width, height, data });
}
const SHEET = a1Sheet();

function setup(id, { water = false } = {}) {
  const demos = SPRITE_DEMOS.filter((d) => d.id === id);
  const { stations, resources } = createSpriteDemoStations({ textures: { skins: { characterSpriteSheet: new THREE.Texture() } }, now: NOW, demos });
  const station = stations[0];
  resources.bodies = createBodyResources(SHEET);
  resources.water = createWaterResources();
  if (water) applyWater(station, true);
  const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
  const run = { station, resources, camera, now: NOW };
  run.advance = (frames, step = 0, elevation = ELEVATIONS.game, each = () => {}) => {
    const azimuth = azimuthForStep(step);
    for (let i = 0; i < frames; i++) {
      run.now += FRAME_MS;
      fitStationView(station, azimuth, elevation, ASPECT);
      const drawnStep = aimCamera(camera, station.focus, azimuth, elevation, run.now);
      station.update(run.now, FRAME_MS / 1000, drawnStep, camera.quaternion);
      station.scene.updateMatrixWorld();
      station.scene.onBeforeRender(null, station.scene, camera);
      if (water) {
        resources.water.update((run.now - NOW) / 1000);
        updateStationWater(station, resources, run.now, azimuth, elevation);
      }
      each();
    }
  };
  return run;
}

const peakHeight = (field, keep = () => true) => {
  let peak = 0;
  for (let i = 0; i < field.length / 4; i++) if (keep(i)) peak = Math.max(peak, Math.abs(field[i * 4]));
  return peak;
};

describe('physics body shape', () => {
  //NOTE(@jimmylee)
  //Two 5px legs under a 16px torso on an otherwise empty sheet, on the tile of F1.
  const figure = () => {
    const { id, x, y, w } = { ...SPRITE_MAP[SHP_FRAMES[1][0][0]] };
    expect(id).toBe('P1');
    const opaque = new Uint8Array(SHEET.width * SHEET.height);
    const fill = (left, top, width, height) => {
      for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) opaque[(y + top + j) * SHEET.width + x + left + i] = 1;
    };
    fill(8, 4, 16, 20);
    fill(8, 24, 5, 12);
    fill(19, 24, 5, 12);
    return { shape: createSheetBodies({ width: SHEET.width, height: SHEET.height, opaque }).shape(1), w };
  };

  it('holds exactly the opaque pixels, bottom row first', () => {
    const { shape } = figure();
    expect(shape.count).toBe(16 * 20 + 2 * 5 * 12);
    for (let i = 1; i < shape.count; i++) expect(shape.pixels[i * 3 + 1]).toBeLessThanOrEqual(shape.pixels[(i - 1) * 3 + 1]);
  });

  it('is round where the sprite is thick, thin where it is thin, and keeps the gap between the legs', () => {
    const { shape } = figure();
    const across = (rowFromBottom) => {
      const bottom = shape.pixels[1];
      const row = [];
      for (let i = 0; i < shape.count; i++) if (shape.pixels[i * 3 + 1] === bottom - rowFromBottom) row.push([shape.pixels[i * 3], shape.pixels[i * 3 + 2]]);
      return row;
    };
    const legs = across(6);
    expect(legs).toHaveLength(10);
    expect(Math.max(...legs.map(([, half]) => half))).toBeCloseTo(2.5, 1);
    const us = legs.map(([u]) => u).sort((a, b) => a - b);
    expect(us[5] - us[4]).toBeGreaterThan(5);
    const torso = across(20);
    expect(Math.max(...torso.map(([, half]) => half))).toBeCloseTo(7.5, 0);
    expect(Math.min(...torso.map(([, half]) => half))).toBeLessThan(3);
  });

  it('every frame of the sheet has a body, and Nulled Walk reads its water frames', () => {
    const { shape } = createSheetBodies(SHEET);
    for (let shp = 1; shp < SHP_WATER_OFFSET; shp++) if (SHP_FRAMES[shp].some(([id]) => id !== 'SR1')) expect(shape(shp).count, `F${shp}`).toBeGreaterThan(50);
    expect(shape(76).count).toBeGreaterThan(50);
    expect(shape(76)).not.toBe(shape(11));
  });
});

describe('physics body pose', () => {
  const drawnRects = (root) => {
    const rects = [];
    root.traverse((o) => {
      let shown = o.isMesh && Boolean(o.material.map);
      for (let p = o; shown && p; p = p.parent) shown = p.visible;
      if (!shown) return;
      const { offset, repeat } = o.material.map;
      rects.push(`${Math.min(offset.x, offset.x + repeat.x).toFixed(5)},${offset.y.toFixed(5)}`);
    });
    return rects.sort();
  };
  const frameRects = (shp) => {
    const texture = { offset: { x: 0, y: 0 }, repeat: { x: 0, y: 0 } };
    return SHP_FRAMES[shp]
      .filter(([id]) => id !== 'SR1')
      .map(([id]) => {
        applySpriteFrame(texture, id, false);
        return `${texture.offset.x.toFixed(5)},${texture.offset.y.toFixed(5)}`;
      })
      .sort();
  };

  //NOTE(@jimmylee)
  //Step 0 draws an SE unit on pattern B, the front frame a body is read from.
  it('is the frame every card draws on its front patterns, through its whole action', () => {
    const pose = { shp: 0, fb: 0, du: 0, rise: 0 };
    for (const { id } of SPRITE_DEMOS) {
      const { station, advance, ...run } = setup(id);
      const unit = station.roots[0];
      const ch = unit.userData.character;
      const seen = new Set();
      advance(360, FRONT_STEP, ELEVATIONS.game, () => {
        if (!unit.visible) return;
        resolveBodyPose(ch, run.camera.userData.now, pose);
        seen.add(pose.shp);
        const shp = pose.shp + (ch.seqWater ? SHP_WATER_OFFSET : 0);
        expect(drawnRects(unit), `${id} F${shp}`).toEqual(frameRects(shp));
      });
      expect(seen.size, id).toBeGreaterThan(0);
    }
  }, SIMULATION_TIMEOUT_MS);

  it('stands at the stance point, not at the root of a shorter body', () => {
    const bodies = createSheetBodies(SHEET);
    for (const mode of ['K', 'D']) {
      const { station } = setup(idOfMode(mode));
      const place = placeBody(station.roots[0], NOW, bodies, {});
      expect(place.y, mode).toBeCloseTo(REST_Y, 9);
    }
  });

  it('follows the SEQ unit motion along the facing, and a lifted unit lifts its body', () => {
    const bodies = createSheetBodies(SHEET);
    const { station, advance, ...run } = setup('stab-1');
    const unit = station.roots[0];
    const lunges = new Set();
    advance(40, 0, ELEVATIONS.game, () => {
      const place = placeBody(unit, run.camera.userData.now, bodies, {});
      lunges.add(Math.round((place.x - unit.position.x) / BODY_PX_ACROSS));
      expect(place.z).toBe(unit.position.z);
    });
    expect([...lunges].sort((a, b) => a - b)).toEqual([-2, 0, 1, 2]);
  });
});

describe('water and the physics body', () => {
  it('a surface with no body in it never moves', () => {
    const { station, advance } = setup(idOfMode('FF'), { water: true });
    advance(200);
    expect(station.water.tracked[0].under).toBeLessThan(0.02);
    const ripples = createWaterRipples({ size: 32, domain: 80, propagation: 0.3, damping: 0.985, sponge: 4 });
    ripples.settle(0.8, 0.35);
    for (let i = 0; i < 20; i++) ripples.step();
    expect(ripples.field.every((v) => v === 0)).toBe(true);
    expect(ripples.isAwake()).toBe(false);
  });

  it('a standing unit is cut at the waterline, and what is above it stays dry', () => {
    const { station, advance } = setup('idle', { water: true });
    advance(30);
    const { cut, under } = station.water.tracked[0];
    expect(Math.abs(cut - 10)).toBeLessThan(2.5);
    expect(under).toBeGreaterThan(0.1);
    expect(under).toBeLessThan(0.5);
  });

  it('ripples stay around the body instead of filling the scene', () => {
    const { station, advance } = setup('walk', { water: true });
    advance(300);
    const { field, size, cellSize } = station.water.ripples;
    const near = (i, reach) => Math.hypot((i % size) + 0.5 - size / 2, Math.floor(i / size) + 0.5 - size / 2) * cellSize < reach;
    const close = peakHeight(field, (i) => near(i, 24));
    expect(close).toBeGreaterThan(0.02);
    expect(peakHeight(field, (i) => !near(i, 80))).toBeLessThan(close / 3);
  });

  it('a wave dies in the sponge and never comes round the other side', () => {
    const size = 64;
    const ripples = createWaterRipples({ size, domain: 128, propagation: 0.3, damping: 1, sponge: 12 });
    ripples.displace(50, 0, 400);
    ripples.settle(0.8, 0.35);
    ripples.displace(50, 0, 0);
    let opposite = 0;
    for (let i = 0; i < 40; i++) {
      ripples.step();
      const row = size / 2;
      for (let col = 1; col < 6; col++) opposite = Math.max(opposite, Math.abs(ripples.field[(row * size + col) * 4]));
    }
    expect(opposite).toBe(0);
  });

  it('the shader gets a platform as the box it is, and the ripples treat it as a wall', () => {
    const { station, advance } = setup(idOfMode('JD'), { water: true });
    advance(2);
    const [post] = station.scene.userData.posts;
    const { postCount, posts } = station.water.mesh.material.uniforms;
    expect(postCount.value).toBe(1);
    expect(posts.value[0].toArray()).toEqual([post.x, post.z, post.halfX, post.halfZ]);
    expect(station.water.mesh.material.uniforms.postTops.value[0]).toBe(post.top);
    expect(post.halfX).toBe(post.halfZ);
  });

  it('a wall stops a wave, and its cells stay flat', () => {
    const size = 64;
    const ripples = createWaterRipples({ size, domain: 128, propagation: 0.3, damping: 1, sponge: 4 });
    const { cellSize, field } = ripples;
    const stampWall = () => {
      for (let z = -20; z < 20; z += cellSize) for (let x = 10; x < 18; x += cellSize) ripples.wall(x, z, cellSize * cellSize);
    };
    let bodyDown = true;
    for (let frame = 0; frame < 40; frame++) {
      stampWall();
      if (bodyDown) ripples.displace(-10, 0, 40);
      bodyDown = false;
      ripples.settle(0.8, 0.35);
      ripples.step();
    }
    const cell = (x, z) => (Math.floor((z / 128 + 0.5) * size) * size + Math.floor((x / 128 + 0.5) * size)) * 4;
    expect(Math.abs(field[cell(-4, 0)])).toBeGreaterThan(0);
    expect(field[cell(14, 0)]).toBe(0);
  });

  it('the waterline holds no waves and hugs the body', () => {
    const { station, advance } = setup('walk', { water: true });
    advance(120);
    const { field, size } = station.water.ripples;
    const center = (size / 2) * size + size / 2;
    expect(field[center * 4 + 3]).toBeGreaterThan(0.3);
    expect(Math.abs(field[center * 4])).toBeLessThan(peakHeight(field) / 2);
    expect(field[(size * 8 + 8) * 4 + 3]).toBe(0);
  });

  it('the camera moves neither the bodies nor their ripples', () => {
    const runAt = (step, elevation) => {
      const { station, advance } = setup('walk', { water: true });
      advance(120, step, elevation);
      return { field: station.water.ripples.field.slice(), cut: station.water.tracked[0].cut };
    };
    const a = runAt(0, ELEVATIONS.game);
    const b = runAt(3, ELEVATIONS.high);
    expect(b.cut).toBe(a.cut);
    expect(b.field).toEqual(a.field);
  });

  it('a jump leaves the water and lands in it with a splash', () => {
    const { station, advance } = setup('jump', { water: true });
    advance(1);
    const body = station.water.tracked[0];
    expect(body.under).toBeGreaterThan(0.1);
    let dry = false;
    let peak = 0;
    advance(150, 0, ELEVATIONS.game, () => {
      dry ||= body.under === 0;
      if (dry) peak = Math.max(peak, peakHeight(station.water.ripples.field));
    });
    expect(dry).toBe(true);
    expect(peak).toBeGreaterThan(0.5);
  });

  it('a hidden flinch or target takes up no water, so a struck unit keeps one body', () => {
    const { station, advance } = setup('stab-1', { water: true });
    advance(60);
    const [, target, flinch] = station.water.tracked;
    expect(target.root.visible).not.toBe(flinch.root.visible);
    const hidden = target.root.visible ? flinch : target;
    expect(hidden.under).toBe(0);
    expect((target.root.visible ? target : flinch).under).toBeGreaterThan(0.1);
  });

  it('Repeat leaves a still surface and no wave for the jump back', () => {
    const { station, advance } = setup('stab-1', { water: true });
    advance(120);
    expect(peakHeight(station.water.ripples.field)).toBeGreaterThan(0);
    station.water.clear();
    expect(peakHeight(station.water.ripples.field)).toBe(0);
  });
});

describe('physics body control', () => {
  //NOTE(@jimmylee)
  //The height axis leans with the camera, as the sprite plane does, so a pixel on the unit's center line
  //draws where the sheet draws it at every elevation when the unit is side on.
  it('lays the body on the sprite at every elevation', () => {
    for (const elevation of Object.values(ELEVATIONS)) {
      const { station, resources, advance, camera, now } = setup('idle');
      advance(1, SIDE_ON_STEP, elevation);
      updateStationBody(station, resources, now + FRAME_MS, azimuthForStep(SIDE_ON_STEP), elevation);
      station.body.scene.updateMatrixWorld();
      const mesh = station.body.scene.children[1];
      expect(mesh.visible).toBe(true);
      const u = 6;
      const v = 12;
      const drawn = new THREE.Vector3(-u * BODY_PX_ACROSS, -v * BODY_PX_UP, 0).applyMatrix4(mesh.matrixWorld);
      const sprite = new THREE.Vector3(u * BODY_PX_ACROSS, -v * BODY_PX_UP, 0).applyQuaternion(camera.quaternion).add(station.roots[0].position);
      const screen = (p) => p.clone().project(camera);
      expect(screen(drawn).x).toBeCloseTo(screen(sprite).x, 6);
      expect(screen(drawn).y).toBeCloseTo(screen(sprite).y, 6);
    }
  });

  it('colors the body where the water crosses it, and a dry body not at all', () => {
    const wet = setup('idle', { water: true });
    wet.advance(10);
    updateStationBody(wet.station, wet.resources, wet.now, azimuthForStep(0), ELEVATIONS.game);
    const color = wet.station.body.scene.children[1];
    expect(color.material.uniforms.waterline.value).toBeCloseTo(-wet.station.water.tracked[0].cut * BODY_PX_UP, 9);
    expect(wet.station.body.describe(wet.station.water)).toMatch(/^body F2 · volume \d+ · \d+% under$/);
    const dry = setup('idle');
    dry.advance(10);
    updateStationBody(dry.station, dry.resources, dry.now, azimuthForStep(0), ELEVATIONS.game);
    expect(dry.station.body.scene.children[1].material.uniforms.waterline.value).toBe(-Infinity);
  });
});
