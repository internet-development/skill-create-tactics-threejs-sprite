//NOTE(@jimmylee)
//The models Set lends: the baked file, the hands they ride on the real a1.png, and the gun's shot.

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import { join } from 'path';
import * as THREE from 'three';
import { SET_ITEMS_FILE, readSetItems } from '@engine/weapons/set-items';
import { BOW_LAYER, HELD_ITEMS, HELD_ITEM_SCALE, HELD_MARBLES, MARBLE_RADIUS, SPRITE, THROWN_SWORD, heldEnd, heldHand, heldLayers, heldMarblePoint, heldRest, heldSlide, heldTilt } from '@engine/weapons/held-items';
import { SPRITE_MAP } from '@engine/constants/sprites';
import { SEQUENCE_MODES, SHP_FRAMES, SHP_WATER_OFFSET, shpBodyIndex } from '@engine/constants/sprites/seq-library';
import { HAND_GRIPS, HAND_RESTS } from '@engine/constants/sprites/assembly';
import { SPRITE_DEMOS } from '@engine/debug/sprite-animation-demo-catalog';
import { createSpriteDemoStations, aimCamera, azimuthForStep, disposeStation, fitStationView, waterHeight, ELEVATIONS, REST_Y } from '@engine/debug/sprite-animation-demos';
import { billboardPoint } from '@engine/actions/action-timelines';
import { ASSEMBLY_STEP_MAP, firstTileOverItem, resolveLoopingFrame, resolveVariableFrame, syncCharacterVisuals, tileOverItem } from '@engine/meshes/character-utils';
import { AROUND_BODY, CHAR_HALF_Z, GAME_ELEVATION, ITEM_END_ON, ITEM_FLATTEN, ITEM_LAYER_GAP } from '@engine/constants/character';
import { createMythrilMaterial, flattenOntoSprite } from '@engine/weapons/held-item-mesh';
import { ITEM_FACES } from '@engine/weapons/item-finish';
import { sheetPixels } from './helpers/fft-type1';

const NOW = 1_000_000;
const FRAME_MS = 1000 / 60;
const ASPECT = 6 / 5;
const file = fs.readFileSync(join(import.meta.dirname, '../public/static/models', SET_ITEMS_FILE));
const ITEMS = readSetItems(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const HAND_COLORS = [0xda7bc4, 0xf5adde, 0xc972ad, 0xa34d95, 0x89326d];
//NOTE(@jimmylee)
//LG17 and LG48 draw the sleeve the hand is inside, as the bow's grips note.
const SLEEVE_ONLY = ['LG17', 'LG48'];
//NOTE(@jimmylee)
//The tome's middle from its origin, along its spread.
const READ_MIDDLE = 0.385;

function setup(id, step = 0) {
  const demos = SPRITE_DEMOS.filter((d) => d.id === id);
  const { stations, resources } = createSpriteDemoStations({ textures: { skins: { characterSpriteSheet: new THREE.Texture() } }, now: NOW, demos, items: ITEMS });
  const [station] = stations;
  const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
  const run = { station, resources, camera, now: NOW };
  run.advance = (frames, each = () => {}) => {
    for (let i = 0; i < frames; i++) {
      run.now += FRAME_MS;
      fitStationView(station, azimuthForStep(step), ELEVATIONS.game, ASPECT);
      const drawn = aimCamera(camera, station.focus, azimuthForStep(step), ELEVATIONS.game, run.now);
      station.update(run.now, FRAME_MS / 1000, drawn, camera.quaternion);
      each();
    }
  };
  return run;
}

const heldCards = SPRITE_DEMOS.filter((d) => d.held);
const marbleCards = SPRITE_DEMOS.filter((d) => d.marble);
const held = (station, name) => station.scene.children.find((o) => o.userData.generatedWeapon && o.geometry?.attributes.color && o.geometry.attributes.position.count === ITEMS[name].position.length / 3);

describe('the baked file', () => {
  it('every weapon without a face wears the one veined mythril material, the bow included', () => {
    for (const id of [SPRITE_DEMOS.find((d) => d.mode === 'SW1').id, SPRITE_DEMOS.find((d) => d.mode === 'CB1').id, 'punch-1']) {
      const { station, resources } = setup(id);
      const worn = [];
      station.scene.traverse((o) => {
        if (o.userData.generatedWeapon && o.material === resources.heldItems.material) worn.push(o);
      });
      expect(worn.length, id).toBeGreaterThan(0);
    }
    expect(createMythrilMaterial().isMeshPhysicalMaterial).toBe(true);
  });

  it('credits Set in the file, as CC BY 4.0 asks', () => {
    const gltf = JSON.parse(new TextDecoder().decode(file.subarray(20, 20 + file.readUInt32LE(12))));
    expect(gltf.asset.copyright).toContain('Jimmy Lee');
    expect(gltf.asset.extras.license).toBe('CC-BY-4.0');
    expect(gltf.asset.extras.changes).toBeTruthy();
  });

  it('holds every item a card asks for, as closed index ranges with one color per vertex', () => {
    for (const { item } of Object.values(HELD_ITEMS)) {
      const { position, normal, color, index, length } = ITEMS[item];
      const vertices = position.length / 3;
      expect(normal.length).toBe(position.length);
      expect(color.length).toBe(vertices * 4);
      expect(index.length % 3).toBe(0);
      expect(Math.max(...index)).toBeLessThan(vertices);
      expect(length).toBeGreaterThan(0);
    }
    expect(ITEMS.rifle.muzzle[0]).toBeGreaterThan(ITEMS.rifle.length * 0.9);
  });
});

describe('a held item on the sprite', () => {
  it('every frame of a held card has a grip, on a hand pixel of a1.png', () => {
    const { at } = sheetPixels('a1.png');
    for (const { mode, pair } of SEQUENCE_MODES) {
      const hold = HELD_ITEMS[mode] ?? HELD_MARBLES[mode];
      if (!hold) continue;
      for (const [entry, arm] of [[pair.front, hold.front], [pair.back, hold.back]]) {
        for (const shp of entry.frames) {
          const tiles = SHP_FRAMES[shp];
          const [id] = tiles[arm === 'first' ? 0 : tiles.length - 1];
          if (mode === 'KT' || hold.bothHands?.includes(shp)) expect(HAND_GRIPS[tiles[arm === 'first' ? tiles.length - 1 : 0][0]], `${mode} F${shp} second hand`).toBeDefined();
          expect(HAND_GRIPS[id], `${mode} F${shp} ${id}`).toBeDefined();
          if (SLEEVE_ONLY.includes(id)) continue;
          const cell = SPRITE_MAP[id];
          const [r, g, b, a] = at(cell.x + HAND_GRIPS[id][0], cell.y + HAND_GRIPS[id][1]);
          expect(a, `${mode} F${shp} ${id}`).toBeGreaterThan(0);
          expect(HAND_COLORS, `${mode} F${shp} ${id}`).toContain((r << 16) | (g << 8) | b);
        }
      }
    }
  });

  it('where a blade rests on a fist is a hand pixel of a1.png, above the grip the centroid gave that tile', () => {
    const { at } = sheetPixels('a1.png');
    for (const [id, [x, y]] of Object.entries(HAND_RESTS)) {
      const cell = SPRITE_MAP[id];
      const [r, g, b, a] = at(cell.x + x, cell.y + y);
      expect(a, id).toBeGreaterThan(0);
      expect(HAND_COLORS, id).toContain((r << 16) | (g << 8) | b);
    }
  });

  it('a card shows its item, and no card draws one when the stage has no models', () => {
    expect(heldCards.map((d) => d.mode).sort()).toEqual(Object.keys(HELD_ITEMS).sort());
    for (const def of heldCards) {
      const { station, resources } = setup(def.id);
      expect(held(station, def.held.item), def.id).toBeDefined();
      for (const object of station.scene.children) if (object.userData.generatedWeapon) expect(object.frustumCulled).toBe(false);
      disposeStation(station, resources);
    }
    const bare = createSpriteDemoStations({ textures: { skins: { characterSpriteSheet: new THREE.Texture() } }, now: NOW, demos: heldCards.slice(0, 1) });
    expect(bare.stations[0].scene.children.some((o) => o.geometry?.attributes.color && o.userData.generatedWeapon)).toBe(false);
  });

  it('the item turns with the frame and not with the camera', () => {
    const { station, camera, advance, now } = setup('swing-high');
    const item = held(station, 'sword');
    const seen = new Set();
    advance(40, () => seen.add(item.quaternion.toArray().map((v) => v.toFixed(3)).join()));
    expect(seen.size).toBeGreaterThan(3);
    const at = now + 20 * FRAME_MS;
    station.update(at, 0, 0, camera.quaternion);
    const facing = item.quaternion.clone();
    for (let step = 1; step < 8; step++) {
      station.update(at, 0, step, camera.quaternion);
      expect(item.quaternion.angleTo(facing), `step ${step}`).toBeLessThan(1e-6);
    }
  });

  it('an item keeps its up: a rifle held level has its sights to the sky on every facing of the camera', () => {
    const { station, advance } = setup(SPRITE_DEMOS.find((d) => d.mode === 'GN2').id);
    const rifle = held(station, 'rifle');
    advance(30);
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(rifle.quaternion).y).toBeGreaterThan(0.9);
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(rifle.quaternion).x).toBeGreaterThan(0.9);
  });

  it('the view widens to the tip of the item, and only as far as a stage with models needs', () => {
    const fitted = (items) => {
      const def = SPRITE_DEMOS.find((d) => d.mode === 'SW1');
      const { stations } = createSpriteDemoStations({ textures: { skins: { characterSpriteSheet: new THREE.Texture() } }, now: NOW, demos: [def], items });
      fitStationView(stations[0], azimuthForStep(0), ELEVATIONS.game, ASPECT);
      return stations[0].halfHeight;
    };
    expect(fitted(ITEMS)).toBeGreaterThan(fitted(null));
  });
});

describe('which tiles draw over a held item', () => {
  const cards = heldCards.filter((d) => d.pair);

  //NOTE(@jimmylee)
  //The fist has to close on the handle, so the tile that draws the hand is over the item on every frame of
  //every card, whichever arm holds it, and in water too, where F(n + 182) adds a tile under the head. Two cards
  //differ, facing the camera: a hand grips a shield's far side, and a book sits on top of its hand.
  it('the hand that grips an item draws over it on every frame, dry and in water', () => {
    for (const { mode, pair } of cards) {
      const hold = HELD_ITEMS[mode];
      const layers = heldLayers(hold, pair.front, pair.back);
      for (const [entry, arm] of [[pair.front, hold.front], [pair.back, hold.back]]) {
        for (const shp of entry.frames) {
          for (const tiles of [SHP_FRAMES[shp], SHP_FRAMES[shp + SHP_WATER_OFFSET]]) {
            const over = firstTileOverItem(tiles.length, layers[shp]);
            if (['shield', 'tome'].includes(hold.item) && entry === pair.front) expect(over, `${mode} F${shp}`).toBeGreaterThan(0);
            else expect(arm === 'first' ? 0 : tiles.length - 1, `${mode} F${shp}`).toBeGreaterThanOrEqual(over);
          }
        }
      }
    }
  });

  it('counts the same tiles in water: a card that leaves the head over its item keeps it there', () => {
    for (const { mode, pair } of cards) {
      const hold = HELD_ITEMS[mode];
      const layers = heldLayers(hold, pair.front, pair.back);
      for (const shp of [...pair.front.frames, ...pair.back.frames]) {
        if (layers[shp] === SPRITE || layers[shp] === 0) continue;
        const top = (tiles) => tiles.slice(-layers[shp]).map(([id]) => id);
        expect(top(SHP_FRAMES[shp + SHP_WATER_OFFSET]), `${mode} F${shp}`).toEqual(top(SHP_FRAMES[shp]));
      }
    }
  });

  it('a marble lies in the palm: over the arm that holds it and under the rest of the sprite', () => {
    for (const [mode, hold] of Object.entries(HELD_MARBLES)) {
      const { pair } = SPRITE_DEMOS.find((d) => d.mode === mode);
      const layers = heldLayers(hold, pair.front, pair.back);
      for (const shp of [...pair.front.frames, ...pair.back.frames]) {
        if (hold.bothHands?.includes(shp)) continue;
        expect(firstTileOverItem(SHP_FRAMES[shp].length, layers[shp]), `${mode} F${shp}`).toBe(1);
        expect(firstTileOverItem(SHP_FRAMES[shp + SHP_WATER_OFFSET].length, layers[shp]), `${mode} F${shp}`).toBe(1);
      }
    }
  });

  //NOTE(@jimmylee)
  //Between two hands the ball sits on the torso with a fist on each side and the head above it. Only the body
  //writes depth, so a tile drawn after it has to stand as near as it does, or the depth test takes it away. In
  //water the biggest tile is the first arm, so that one stays down and the ball goes over that hand.
  it('a ball in both hands has the head and the hands over it, and keeps the SHP order, dry and in water', () => {
    const { pair } = SPRITE_DEMOS.find((d) => d.mode === 'IH2');
    expect(heldLayers(HELD_MARBLES.IH2, pair.front, pair.back)[90]).toBe(AROUND_BODY);
    for (const shp of [90, 91]) {
      for (const tiles of [SHP_FRAMES[shp], SHP_FRAMES[shp + SHP_WATER_OFFSET]]) {
        const body = shpBodyIndex(tiles);
        const over = tiles.map((_, i) => tileOverItem(i, i === body, tiles.length, AROUND_BODY));
        expect(over[tiles.length - 1], `F${shp} top hand`).toBe(true);
        expect(over[tiles.length - 2], `F${shp} head`).toBe(true);
        expect(over[1], `F${shp} torso`).toBe(false);
        for (let i = body + 1; i < tiles.length; i++) expect(!over[body] || over[i], `F${shp} tile ${i} after the body`).toBe(true);
      }
      const dry = SHP_FRAMES[shp];
      expect(tileOverItem(0, false, dry.length, AROUND_BODY), `F${shp} bottom hand`).toBe(true);
    }
  });

  it('a bow has a fist on its grip facing the camera, and stands beyond a unit facing away', () => {
    expect(firstTileOverItem(4, BOW_LAYER.front)).toBe(3);
    expect(firstTileOverItem(4, BOW_LAYER.back)).toBe(0);
  });

  //NOTE(@jimmylee)
  //What the card draws: the group stands the tiles over the item nearer the camera, the flattened item fits
  //between them and the tiles under it, and none of that moves a pixel on the orthographic screen.
  function drawn(mode, step, tick) {
    const def = SPRITE_DEMOS.find((d) => d.mode === mode);
    const run = setup(def.id, step);
    run.advance(tick);
    const [unit] = run.station.roots;
    syncCharacterVisuals(null, run.station.scene, run.camera);
    const item = held(run.station, def.held.item);
    item.updateMatrixWorld();
    run.camera.updateMatrixWorld();
    const tiles = unit.children.filter((o) => o.visible && o.material.visible !== false).sort((a, b) => a.renderOrder - b.renderOrder);
    return { run, unit, item, tiles };
  }

  function flattened(item, camera) {
    item.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, item.matrixWorld);
    const before = item.modelViewMatrix.clone();
    flattenOntoSprite(null, null, camera, null, item);
    return { before, after: item.modelViewMatrix };
  }

  it('draws the item between the tiles under it and the tiles over it, and moves nothing on screen', () => {
    for (const [mode, step, tick, overTiles] of [['PK2', 0, 3, 1], ['PK2', 2, 3, 4], ['PI', 0, 30, 2], ['SB2', 0, 4, 0], ['SW1', 0, 3, 4]]) {
      const { run, unit, item, tiles } = drawn(mode, step, tick);
      const { camera } = run;
      const { before, after } = flattened(item, camera);
      const planeZ = new THREE.Vector3().copy(unit.position).applyMatrix4(camera.matrixWorldInverse).z;
      const under = tiles.slice(0, tiles.length - overTiles);
      const over = tiles.slice(tiles.length - overTiles);
      for (const tile of under) expect(tile.position.z, `${mode} step ${step}`).toBe(0);
      for (const tile of over) expect(tile.position.z, `${mode} step ${step}`).toBe(ITEM_LAYER_GAP);
      for (const local of [[0, 0, 0], [ITEMS[mode === 'PK2' ? 'spear' : 'sword'].length, 0, 0]]) {
        const point = new THREE.Vector3(...local);
        const true3d = point.clone().applyMatrix4(before);
        const seen = point.clone().applyMatrix4(after);
        expect(seen.x, mode).toBeCloseTo(true3d.x, 9);
        expect(seen.y, mode).toBeCloseTo(true3d.y, 9);
        expect(seen.z - planeZ, mode).toBeGreaterThan(0);
        expect(seen.z - planeZ, mode).toBeLessThan(ITEM_LAYER_GAP);
      }
    }
  });

  it('keeps the normals and the true transform, and a thrown item its real depth', () => {
    const { run, item } = drawn('PK2', 0, 3);
    const normals = item.normalMatrix.clone();
    const world = item.matrixWorld.clone();
    flattened(item, run.camera);
    expect(item.normalMatrix.equals(normals)).toBe(true);
    expect(item.matrixWorld.equals(world)).toBe(true);
    const thrown = drawn('WP', 0, SPRITE_DEMOS.find((d) => d.mode === 'WP').plan.releaseTick + 4);
    expect(thrown.item.userData.spritePlane).toBeNull();
    const { before, after } = flattened(thrown.item, thrown.run.camera);
    expect(after.equals(before)).toBe(true);
  });

  it('flattens far less than the gap the longest item has to fit in', () => {
    const longest = Math.max(...Object.values(HELD_ITEMS).map(({ item }) => ITEMS[item].length)) * HELD_ITEM_SCALE;
    expect(longest * 1.5 * ITEM_FLATTEN).toBeLessThan(ITEM_LAYER_GAP / 2);
  });
});

describe('an item pointing along the view', () => {
  const toCamera = (camera) => new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
  const STEPS = [0, 1, 2, 3, 4, 5, 6, 7];
  const lifted = (unit) => unit.children.filter((o) => o.visible && o.material.visible !== false && o.position.z === ITEM_LAYER_GAP).length;
  const drawnTiles = (unit) => unit.children.filter((o) => o.visible && o.material.visible !== false).length;

  function walk(def, step, each) {
    const run = setup(def.id, step);
    const item = held(run.station, def.held.item);
    const [unit] = run.station.roots;
    run.advance(sumTicks(def), () => {
      syncCharacterVisuals(null, run.station.scene, run.camera);
      each(item, unit, run.camera);
    });
    disposeStation(run.station, run.resources);
  }
  const sumTicks = (def) => Math.ceil(def.pair.front.ticks.reduce((a, b) => a + b, 0)) || 8;

  it('reads the direction: pointing at the camera, pointing away, or across the view', () => {
    expect(heldEnd(ITEM_END_ON + 0.01)).toBe(1);
    expect(heldEnd(-ITEM_END_ON - 0.01)).toBe(-1);
    expect(heldEnd(ITEM_END_ON - 0.01)).toBe(0);
    expect(heldEnd(0)).toBe(0);
  });

  //NOTE(@jimmylee)
  //The game's views are 45 degrees off the unit, so the steepest an item in the plane of the facing comes toward
  //the camera is short of ITEM_END_ON at any tilt, which is what lets every card keep the answers settled by
  //looking at it. A gun aimed by its stage can pass it there, away from the camera, where its card already says
  //every tile is over it, so the promise is on the tiles.
  it('changes no tile at the game views, so every card keeps what was settled by looking at it', () => {
    let steepest = 0;
    for (let degrees = -180; degrees <= 180; degrees += 0.5) {
      const tilt = (degrees * Math.PI) / 180;
      steepest = Math.max(steepest, Math.cos(GAME_ELEVATION) * Math.SQRT1_2 * Math.cos(tilt) + Math.sin(GAME_ELEVATION) * Math.sin(tilt));
    }
    expect(steepest).toBeLessThan(ITEM_END_ON);
    for (const def of heldCards.filter((d) => d.pair)) {
      for (const step of [0, 2, 4, 6]) {
        walk(def, step, (item, unit, camera) => {
          const ch = unit.userData.character;
          const pattern = ASSEMBLY_STEP_MAP[(ch.directionOffset + camera.userData.azimuthStep) % 8];
          const entry = pattern <= 1 ? ch.seqFront : ch.seqBack;
          const { frameIdx } = ch.seqLoop ? resolveLoopingFrame(entry.delaysS, entry.totalS, (camera.userData.now - ch.walkStart) / 1000) : resolveVariableFrame(entry.delaysS, (camera.userData.now - ch.walkStart) / 1000);
          const shp = entry.frames[frameIdx];
          const count = SHP_FRAMES[shp].length;
          expect(firstTileOverItem(count, ch.itemLayer[shp], ch.itemEnd), `${def.mode} step ${step} F${shp}`).toBe(firstTileOverItem(count, ch.itemLayer[shp]));
        });
      }
    }
  });

  it('stands in front of every tile when it points at the camera and behind them all when it points away, on every step', () => {
    let toward = 0;
    let away = 0;
    for (const mode of ['PK2', 'SW2', 'KT', 'GN2', 'RB']) {
      const def = SPRITE_DEMOS.find((d) => d.mode === mode);
      for (const step of STEPS) {
        walk(def, step, (item, unit, camera) => {
          const facing = new THREE.Vector3(1, 0, 0).applyQuaternion(item.quaternion).dot(toCamera(camera));
          const end = heldEnd(facing);
          expect(unit.userData.character.itemEnd, `${mode} step ${step}`).toBe(end);
          if (end > 0) {
            toward++;
            expect(lifted(unit), `${mode} step ${step}`).toBe(0);
          }
          if (end < 0) {
            away++;
            expect(lifted(unit), `${mode} step ${step}`).toBe(drawnTiles(unit));
          }
        });
      }
    }
    expect(toward).toBeGreaterThan(0);
    expect(away).toBeGreaterThan(0);
  });
});

describe('Gun', () => {
  const cards = ['GN1', 'GN2', 'GN3'].map((mode) => SPRITE_DEMOS.find((d) => d.mode === mode));
  const shotsOf = (station) => station.scene.children.filter((o) => o.userData.generatedWeapon && o.material?.transparent);
  const barrelOf = (rifle) => {
    const muzzle = new THREE.Vector3().fromArray(ITEMS.rifle.muzzle).multiplyScalar(HELD_ITEM_SCALE).applyQuaternion(rifle.quaternion).add(rifle.position);
    return { muzzle, along: new THREE.Vector3(1, 0, 0).applyQuaternion(rifle.quaternion) };
  };

  it('aims up at a target above, level at one level with it, and down at one below', () => {
    const [high, mid, low] = cards;
    expect(high.plan.angle).toBeGreaterThan(0.3);
    expect(low.plan.angle).toBeLessThan(-0.3);
    expect(Math.abs(mid.plan.angle)).toBeLessThan(high.plan.angle);
    for (const card of cards) expect(card.kind).toBe('gun');
  });

  it('the barrel lies on the line to the target on every camera step, not just the grip', () => {
    for (const def of cards) {
      for (const step of [0, 1, 3, 6]) {
        const { station, advance } = setup(def.id, step);
        const [, target] = station.roots;
        advance(Math.ceil(def.plan.hitTick) - 2);
        const { muzzle, along } = barrelOf(held(station, 'rifle'));
        const toTarget = new THREE.Vector3().copy(target.position).setY(target.position.y + 4).sub(muzzle);
        expect(along.clone().cross(toTarget.clone().normalize()).length(), `${def.id} step ${step}`).toBeLessThan(1e-9);
      }
    }
  });

  it('the streak leaves the opening of the barrel along the barrel, a bore wide, and lands on the tick of the hit', () => {
    for (const def of cards) {
      const { station, advance } = setup(def.id);
      const [, target, flinch] = station.roots;
      const [flash, streak] = shotsOf(station);
      expect(shotsOf(station).length).toBe(2);
      advance(Math.ceil(def.plan.hitTick) - 3);
      expect(streak.visible, def.id).toBe(false);
      advance(2);
      const { muzzle, along } = barrelOf(held(station, 'rifle'));
      expect(streak.visible, def.id).toBe(true);
      expect(flash.visible, def.id).toBe(true);
      expect(flinch.visible, def.id).toBe(false);
      expect(station.shot.from.distanceTo(muzzle), def.id).toBeLessThan(2.5);
      expect(new THREE.Vector3(1, 0, 0).applyQuaternion(streak.quaternion).angleTo(station.shot.along), def.id).toBeLessThan(1e-6);
      expect(station.shot.along.angleTo(along), def.id).toBeLessThan(1e-6);
      expect(streak.scale.y).toBeCloseTo(ITEMS.rifle.bore * HELD_ITEM_SCALE, 9);
      advance(2);
      expect(flinch.visible, def.id).toBe(true);
      expect(target.visible, def.id).toBe(false);
      const end = station.shot.from.clone().addScaledVector(station.shot.along, station.shot.reach);
      expect(end.distanceTo(target.position.clone().setY(target.position.y + 4)), def.id).toBeLessThan(1e-6);
      advance(6);
      expect(shotsOf(station).some((o) => o.visible), def.id).toBe(false);
    }
  });
});

describe('two hands on one item', () => {
  const line = (shp, front, other) => {
    const [ax, ay] = heldHand(shp, front, [0, 0]);
    const [bx, by] = heldHand(shp, other, [0, 0]);
    return Math.atan2(ay - by, ax - bx);
  };

  //NOTE(@jimmylee)
  //Screen pixels from the frame's other hand to the blade's line. A sequence entry's frames say which hand
  //that is, and a mirrored pattern draws it on the other side, so this is read from what the camera sees.
  function bladeMiss(step, frameIdx, tick) {
    const def = SPRITE_DEMOS.find((d) => d.mode === 'KT');
    const { station, advance, camera } = setup(def.id, step);
    const katana = held(station, 'katana');
    advance(tick);
    const [unit] = station.roots;
    const pattern = ASSEMBLY_STEP_MAP[(unit.userData.character.directionOffset + camera.userData.azimuthStep) % 8];
    const front = pattern <= 1;
    const entry = front ? def.pair.front : def.pair.back;
    const arm = front ? HELD_ITEMS.KT.front : HELD_ITEMS.KT.back;
    const [u, v] = heldRest(entry.frames[frameIdx], arm === 'last' ? 'first' : 'last', [0, 0]);
    const lunge = (entry.fb?.[frameIdx] ?? 0) * 0.75;
    const dir = { x: 1, z: 0 };
    const origin = { x: unit.position.x + dir.x * lunge, y: unit.position.y, z: unit.position.z };
    const other = billboardPoint(origin, camera.quaternion, u, v, pattern === 0 || pattern === 3 ? -1 : 1, { x: 0, y: 0, z: 0 }, 0);
    const toView = (p) => new THREE.Vector3(p.x, p.y, p.z).applyQuaternion(camera.quaternion.clone().invert());
    const a = toView(katana.position);
    const along = toView(new THREE.Vector3(1, 0, 0).applyQuaternion(katana.quaternion)).setZ(0).normalize();
    const gap = toView(other).sub(a).setZ(0);
    return { miss: Math.abs(gap.x * along.y - gap.y * along.x), ahead: gap.dot(along), reach: ITEMS.katana.length * HELD_ITEM_SCALE };
  }

  //NOTE(@jimmylee)
  //The even camera steps are the game's views, 45 degrees off the facing, the only ones the frames are drawn
  //for (weapons/AGENTS.md "Limits"). The tilt reads the front frames, so the blade meets the fist there, and
  //the back frames, which draw the two hands close together, come within reach of it.
  it('a katana lies across the body and on top of the other hand, the blade past it', () => {
    const ticks = [2, 7, 13, 18, 22];
    for (const [step, most] of [[0, 0.1], [6, 0.1], [2, 8], [4, 8]]) {
      for (const [frameIdx, tick] of ticks.entries()) {
        const { miss, ahead, reach } = bladeMiss(step, frameIdx, tick);
        expect(miss, `step ${step} tick ${tick}`).toBeLessThan(most);
        expect(ahead, `step ${step} tick ${tick}`).toBeGreaterThan(-1);
        expect(ahead, `step ${step} tick ${tick}`).toBeLessThan(reach);
      }
    }
  });

  it('a katana ends raised to the head of the sprite, tilted up onto the top of the far fist', () => {
    const { KT } = HELD_ITEMS;
    expect(heldTilt(KT, 28)).toBeGreaterThan(0.2);
    expect(bladeMiss(0, 5, 60).miss).toBeLessThan(0.1);
    expect(-heldHand(28, 'last', [0, 0])[1] * 0.9).toBeGreaterThan(-heldHand(47, 'last', [0, 0])[1] * 0.9 + 4);
  });

  it('a spear lies up the arms on the High thrust and runs out through the hand', () => {
    expect(heldTilt(HELD_ITEMS.PK1, 105)).toBeGreaterThan(1);
    expect(heldTilt(HELD_ITEMS.PK2, 108)).toBeLessThan(0.1);
    expect(heldTilt(HELD_ITEMS.PK3, 111)).toBeLessThan(-0.3);
    expect(heldSlide(HELD_ITEMS.PK1, 106)).toBeGreaterThan(heldSlide(HELD_ITEMS.PK1, 103));
  });

  const spearTip = (spear) => {
    spear.updateMatrixWorld();
    return new THREE.Vector3(ITEMS.spear.length, 0, 0).applyMatrix4(spear.matrixWorld);
  };

  it('the High thrust ends on the head of a target on its ledge, at full reach on the hit', () => {
    const high = SPRITE_DEMOS.find((d) => d.mode === 'PK1');
    const low = SPRITE_DEMOS.find((d) => d.mode === 'PK3');
    expect(high.targetFloor).toBeGreaterThan(0);
    expect(low.archerFloor).toBe(high.targetFloor);
    const { station, advance } = setup(high.id);
    const spear = held(station, 'spear');
    const [, target] = station.roots;
    advance(Math.ceil((high.hitMs * 60) / 1000) + 1);
    const tip = spearTip(spear);
    expect(Math.abs(tip.x - target.position.x)).toBeLessThan(CHAR_HALF_Z + 2);
    expect(tip.y - target.position.y).toBeGreaterThan(0);
    expect(tip.y - target.position.y).toBeLessThan(18);
  });

  it('a ledge stays above the water at every elevation', () => {
    for (const mode of ['PK1', 'PK3', 'TV1', 'TV3']) {
      const def = SPRITE_DEMOS.find((d) => d.mode === mode);
      const ledge = def.targetFloor ?? def.archerFloor;
      for (const elevation of Object.values(ELEVATIONS)) expect(ledge, mode).toBeGreaterThan(waterHeight({ def }, elevation) + 1);
    }
  });
});

describe('Thrust Recoil', () => {
  const cards = ['TV1', 'TV3'].map((mode) => SPRITE_DEMOS.find((d) => d.mode === mode));
  const shieldOf = (station) => held(station, 'shield');
  const spearOf = (station) => held(station, 'spear');

  it('stands the thrust against a shield, on the stage of its Poke, and the tip starts on it', () => {
    for (const def of cards) {
      const { station, advance, camera } = setup(def.id);
      const [unit, guard] = station.roots;
      expect(def.kind).toBe('recoil');
      expect(guard.position.y).toBeCloseTo(REST_Y + (def.targetFloor ?? 0), 9);
      advance(1);
      const shield = shieldOf(station);
      const spear = spearOf(station);
      spear.updateMatrixWorld();
      const view = camera.quaternion.clone().invert();
      const tip = new THREE.Vector3(ITEMS.spear.length, 0, 0).applyMatrix4(spear.matrixWorld).applyQuaternion(view);
      const middle = shield.position.clone().applyQuaternion(view);
      expect(Math.hypot(tip.x - middle.x, tip.y - middle.y), def.id).toBeLessThan(2.07 * HELD_ITEM_SCALE);
      expect(unit.position.y, def.id).toBeCloseTo(REST_Y + (def.archerFloor ?? 0), 9);
    }
  });

  it('the spear recoils along its thrust and does not stand up', () => {
    for (const { mode, pair } of cards) {
      const hold = HELD_ITEMS[mode];
      const tilts = pair.front.frames.map((shp) => (heldTilt(hold, shp) * 180) / Math.PI);
      for (let k = 1; k < tilts.length; k++) expect(Math.abs(tilts[k] - tilts[k - 1]), `${mode} ${k}`).toBeLessThan(30);
    }
  });

  it('plays once and waits, and starts over with the shield up', () => {
    const def = cards[0];
    const { station, advance, resources } = setup(def.id);
    const [flash] = station.scene.children.filter((o) => o.userData.generatedWeapon && o.material === resources.heldItems.flashMaterial);
    advance(1);
    expect(flash.visible).toBe(true);
    advance(40);
    expect(flash.visible).toBe(false);
    advance(44);
    expect(flash.visible).toBe(true);
  });
});

describe('Shield Block', () => {
  it('keeps the shield on the body at every height, and its foot off the floor', () => {
    for (const [mode, tick] of [['SB1', 4], ['SB2', 4], ['SB3', 4]]) {
      const def = SPRITE_DEMOS.find((d) => d.mode === mode);
      for (const step of [0, 1, 3, 6]) {
        const { station, advance } = setup(def.id, step);
        advance(tick);
        const shield = held(station, 'shield');
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(shield.quaternion);
        const halfHeight = 2.07 * HELD_ITEM_SCALE * up.y;
        const foot = shield.position.y - halfHeight;
        const head = shield.position.y + halfHeight;
        expect(foot, `${mode} step ${step}`).toBeGreaterThan(-1);
        expect(head, `${mode} step ${step}`).toBeLessThan(REST_Y * 2 + 8);
      }
    }
  });

  it('wears its two faces wherever a shield is held, as a book wears its own, and every other item keeps its veins', () => {
    for (const mode of ['SB1', 'SB2', 'SB3', 'TV1']) {
      const { station, resources } = setup(SPRITE_DEMOS.find((d) => d.mode === mode).id);
      expect(held(station, 'shield').material, mode).toBe(resources.heldItems.faceMaterials.shield);
    }
    const { station, resources } = setup(SPRITE_DEMOS.find((d) => d.mode === 'RB').id);
    expect(held(station, 'tome').material).toBe(resources.heldItems.faceMaterials.tome);
    expect(resources.heldItems.faceMaterials.tome.customProgramCacheKey()).not.toBe(resources.heldItems.material.customProgramCacheKey());
    expect(resources.heldItems.materialOf('sword')).toBe(resources.heldItems.material);
  });

  //NOTE(@jimmylee)
  //A tile lies on a face by numbers measured from the model, so a bake that changes the model has to change them.
  //No material may set `map`: on this stage a mesh with a map is a sprite plane.
  it('lays each tile out across the face the file holds, and sets no map', () => {
    for (const [name, { outside, across, up, center, half }] of Object.entries(ITEM_FACES)) {
      const { position } = ITEMS[name];
      const span = (axis) => {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < position.length; i += 3) {
          const along = position[i] * axis[0] + position[i + 1] * axis[1] + position[i + 2] * axis[2];
          min = Math.min(min, along);
          max = Math.max(max, along);
        }
        return [min, max];
      };
      expect(new THREE.Vector3(...across).dot(new THREE.Vector3(...up)), name).toBe(0);
      expect(new THREE.Vector3(...outside).dot(new THREE.Vector3(...up)), name).toBe(0);
      const [fromX, toX] = span(across);
      const [fromY, toY] = span(up);
      expect((fromX + toX) / 2, name).toBeCloseTo(center[0], 2);
      expect((fromY + toY) / 2, name).toBeCloseTo(center[1], 2);
      expect((toX - fromX) / 2, name).toBeCloseTo(half[0], 2);
      expect((toY - fromY) / 2, name).toBeCloseTo(half[1], 2);
    }
    const { resources } = setup(SPRITE_DEMOS.find((d) => d.mode === 'SB1').id);
    for (const material of Object.values(resources.heldItems.faceMaterials)) expect(material.map).toBeNull();
  });

  it('turns its face toward where the blow comes from', () => {
    expect(heldTilt(HELD_ITEMS.SB1, 130)).toBeGreaterThan(0);
    expect(heldTilt(HELD_ITEMS.SB2, 131)).toBe(0);
    expect(heldTilt(HELD_ITEMS.SB3, 132)).toBeLessThan(0);
  });
});

describe('Read Book', () => {
  it('holds the book open across the body with its pages to the reader, on the hand', () => {
    const def = SPRITE_DEMOS.find((d) => d.mode === 'RB');
    const { station, advance } = setup(def.id);
    const tome = held(station, 'tome');
    advance(24);
    const pages = new THREE.Vector3(0, 1, 0).applyQuaternion(tome.quaternion);
    const spread = new THREE.Vector3(1, 0, 0).applyQuaternion(tome.quaternion);
    expect(pages.x).toBeLessThan(-0.9);
    expect(pages.y).toBeGreaterThan(0.1);
    expect(Math.abs(spread.z)).toBeGreaterThan(0.99);
  });

  //NOTE(@jimmylee)
  //A mirrored pattern turns the book half over, so a rise written along its +z once sent it down under the
  //hand on patterns B and D, on the backs of the fingers.
  it('sits on top of the hand on all four patterns, its bottom edge at the fingers', () => {
    const def = SPRITE_DEMOS.find((d) => d.mode === 'RB');
    for (const [step, frames, arm] of [[0, def.pair.front.frames, 'first'], [6, def.pair.front.frames, 'first'], [2, def.pair.back.frames, 'last'], [4, def.pair.back.frames, 'last']]) {
      const { station, advance, camera } = setup(def.id, step);
      const tome = held(station, 'tome');
      advance(24);
      tome.updateMatrixWorld();
      const view = camera.quaternion.clone().invert();
      const middle = new THREE.Vector3(-READ_MIDDLE, 0, 0).applyMatrix4(tome.matrixWorld);
      const [u, v] = heldHand(frames[4], arm, [0, 0]);
      const [unit] = station.roots;
      const hand = billboardPoint(unit.position, camera.quaternion, u, v, 1, { x: 0, y: 0, z: 0 }, 0);
      const above = middle.clone().sub(new THREE.Vector3(hand.x, hand.y, hand.z)).applyQuaternion(view).y;
      const halfHeight = new THREE.Vector3(0, 0, 0.9 * HELD_ITEM_SCALE).applyQuaternion(tome.quaternion).applyQuaternion(view);
      expect(above - Math.abs(halfHeight.y), `step ${step}`).toBeGreaterThan(0);
      expect(above - Math.abs(halfHeight.y), `step ${step}`).toBeLessThan(5);
    }
  });
});

describe('Item Throw', () => {
  const unitSpace = (camera) => camera.quaternion.clone().invert();
  const release = (mode) => SPRITE_DEMOS.find((d) => d.mode === mode);

  it('every card of it holds a marble and no model, and nothing else about Katana Use changes', () => {
    for (const mode of ['IT1', 'IH1', 'IR1', 'IT2', 'IH2', 'IR2', 'IT3', 'IH3', 'IR3']) {
      const def = SPRITE_DEMOS.find((d) => d.mode === mode);
      expect(def.marble, mode).toBeDefined();
      expect(def.held, mode).toBeUndefined();
    }
    expect(HELD_ITEMS.KT.item).toBe('katana');
    expect(HELD_ITEMS.WP.item).toBe('sword');
  });

  //NOTE(@jimmylee)
  //High is one arm over the head and out in front. Mid and Low come down to both hands low, either side of the
  //body, and there they hold it between them, so those are the big one, the same size on every frame.
  it('holds the small marble in one hand on High and the big one in both on Mid and Low', () => {
    for (const mode of ['IT1', 'IH1', 'IR1']) {
      expect(HELD_MARBLES[mode].radius, mode).toBe(MARBLE_RADIUS.small);
      expect(HELD_MARBLES[mode].bothHands, mode).toBeUndefined();
    }
    for (const mode of ['IT2', 'IH2', 'IR2', 'IT3', 'IH3', 'IR3']) expect(HELD_MARBLES[mode].radius, mode).toBe(MARBLE_RADIUS.big);
    expect(MARBLE_RADIUS.big).toBeGreaterThan(MARBLE_RADIUS.small * 3);
  });

  it('sits between the hands on a two-handed frame, each hand on the ball, and on the hand on the others', () => {
    for (const shp of HELD_MARBLES.IH2.bothHands) {
      const [u, v] = heldMarblePoint(HELD_MARBLES.IH2, shp, 'first', [0, 0]);
      const first = heldHand(shp, 'first', [0, 0]);
      const last = heldHand(shp, 'last', [0, 0]);
      expect(u, `F${shp}`).toBeCloseTo((first[0] + last[0]) / 2, 9);
      expect(v, `F${shp}`).toBeCloseTo((first[1] + last[1]) / 2, 9);
    }
    for (const shp of [90, 91]) {
      const first = heldHand(shp, 'first', [0, 0]);
      const last = heldHand(shp, 'last', [0, 0]);
      const reach = Math.hypot((first[0] - last[0]) * 0.75, (first[1] - last[1]) * 0.9) / 2;
      expect(reach, `F${shp}`).toBeGreaterThan(MARBLE_RADIUS.big * 0.75);
      expect(reach, `F${shp}`).toBeLessThan(MARBLE_RADIUS.big * 1.25);
    }
    expect(heldMarblePoint(HELD_MARBLES.IH2, 86, 'first', [0, 0])).toEqual(heldHand(86, 'first', [0, 0]));
  });

  it('a second hand on a two-handed frame is a hand pixel of a1.png', () => {
    const { at } = sheetPixels('a1.png');
    for (const shp of HELD_MARBLES.IH2.bothHands) {
      const tiles = SHP_FRAMES[shp];
      const [id] = tiles[tiles.length - 1];
      const cell = SPRITE_MAP[id];
      const [r, g, b, a] = at(cell.x + HAND_GRIPS[id][0], cell.y + HAND_GRIPS[id][1]);
      expect(a, id).toBeGreaterThan(0);
      expect(HAND_COLORS, id).toContain((r << 16) | (g << 8) | b);
    }
  });

  it('High Start and Hold keep it in the hand, and it is still there on the Hold', () => {
    for (const mode of ['IT1', 'IH1']) {
      const def = SPRITE_DEMOS.find((d) => d.mode === mode);
      expect(def.kind, mode).toBe('reaction');
      const { station, advance, camera } = setup(def.id);
      const [{ object: marble, radius }] = station.props;
      expect(radius, mode).toBe(MARBLE_RADIUS.small);
      advance(40);
      const [u, v] = heldHand(88, 'first', [0, 0]);
      const hand = billboardPoint(station.roots[0].position, camera.quaternion, u, v, 1, { x: 0, y: 0, z: 0 }, 0);
      const gap = marble.position.clone().sub(new THREE.Vector3(hand.x, hand.y, hand.z)).applyQuaternion(unitSpace(camera));
      expect(Math.hypot(gap.x, gap.y), mode).toBeLessThan(3);
    }
  });

  it('stays on the frame on every card, on all four patterns', () => {
    for (const def of marbleCards.filter((d) => d.kind === 'reaction')) {
      for (const step of [0, 2, 4, 6]) {
        const { station, advance, camera } = setup(def.id, step);
        const [unit] = station.roots;
        const [{ object: marble, radius }] = station.props;
        expect(marble.geometry.parameters.radius).toBe(radius);
        advance(1);
        const pattern = ASSEMBLY_STEP_MAP[(unit.userData.character.directionOffset + camera.userData.azimuthStep) % 8];
        const entry = pattern <= 1 ? def.pair.front : def.pair.back;
        let tick = 1;
        for (const [k, ticks] of entry.ticks.entries()) {
          const [u, v] = heldMarblePoint(def.marble, entry.frames[k], 'first', [0, 0]);
          const origin = { x: unit.position.x + (entry.fb?.[k] ?? 0) * 0.75, y: unit.position.y, z: unit.position.z };
          const hand = billboardPoint(origin, camera.quaternion, u, v, pattern === 0 || pattern === 3 ? -1 : 1, { x: 0, y: 0, z: 0 }, 0);
          const gap = marble.position.clone().sub(new THREE.Vector3(hand.x, hand.y, hand.z)).applyQuaternion(unitSpace(camera));
          expect(Math.hypot(gap.x, gap.y), `${def.mode} step ${step} tick ${tick}`).toBeLessThan(1e-6);
          advance(ticks);
          tick += ticks;
        }
      }
    }
  });

  it('High, Mid and Low are where the target stands, above the thrower, level with it and below it', () => {
    const [high, mid, low] = ['IR1', 'IR2', 'IR3'].map(release);
    expect(high.targetFloor).toBeGreaterThan(0);
    expect(high.archerFloor).toBe(0);
    expect(mid.targetFloor).toBe(0);
    expect(mid.archerFloor).toBe(0);
    expect(low.targetFloor).toBe(0);
    expect(low.archerFloor).toBeGreaterThan(0);
    for (const def of [high, mid, low]) expect(def.kind).toBe('item-throw');
  });

  it('Release lets go on PlaySound and hits the target on the planned tick', () => {
    for (const mode of ['IR1', 'IR2', 'IR3']) {
      const def = release(mode);
      expect(def.plan.releaseTick, mode).toBe(0);
      expect(def.pair.front.events[0], mode).toEqual([0, 'PlaySound']);
      const { station, advance } = setup(def.id);
      const [, target, flinch] = station.roots;
      const [{ object: marble, radius }] = station.props;
      expect(target.position.y, mode).toBeCloseTo(REST_Y + def.targetFloor, 9);
      advance(1);
      expect(marble.userData.spritePlane, mode).toBeNull();
      advance(Math.floor(def.plan.hitTick) - 2);
      expect(flinch.visible, mode).toBe(false);
      advance(3);
      expect(flinch.visible, mode).toBe(true);
      expect(Math.abs(marble.position.x + radius - (def.gap - CHAR_HALF_Z)), mode).toBeLessThan(3);
    }
  });

  it('flies the same line at every camera step, whatever hand it left', () => {
    const def = release('IR2');
    const at = (step) => {
      const { station, advance } = setup(def.id, step);
      advance(Math.floor(def.plan.hitTick) - 2);
      return station.props[0].object.position.clone();
    };
    const first = at(0);
    for (const step of [1, 2, 3, 4, 5, 6, 7]) expect(at(step).distanceTo(first), `step ${step}`).toBeLessThan(1e-9);
  });

  it('comes to rest on what it lands on, fades and starts over back in the hand', () => {
    for (const mode of ['IR1', 'IR2', 'IR3']) {
      const def = release(mode);
      const { station, advance } = setup(def.id);
      const [{ object: marble, radius }] = station.props;
      let lowest = Infinity;
      let faded = false;
      let again = false;
      advance(900, () => {
        if (marble.userData.spritePlane === null && marble.visible) lowest = Math.min(lowest, marble.position.y);
        if (marble.visible && marble.material.uniforms.opacity.value < 0.5) faded = true;
        if (faded && marble.userData.spritePlane) again = true;
      });
      expect(lowest, mode).toBeGreaterThanOrEqual(radius - 1e-6);
      expect(faded, mode).toBe(true);
      expect(again, mode).toBe(true);
    }
  });
});

describe('Play Instrument', () => {
  it('the harp is held still while the arm plays it, and is a third of a unit or more tall', () => {
    const def = SPRITE_DEMOS.find((d) => d.mode === 'PI');
    const { station, advance } = setup(def.id);
    const harp = held(station, 'harp');
    const seen = new Set();
    advance(60, () => seen.add(harp.position.toArray().map((v) => v.toFixed(3)).join()));
    expect(seen.size).toBe(1);
    expect(ITEMS.harp.length * HELD_ITEM_SCALE).toBeGreaterThan(12);
  });
});

describe('Weapon Throw', () => {
  const def = SPRITE_DEMOS.find((d) => d.mode === 'WP');
  const pointOf = (sword) => {
    sword.updateMatrixWorld();
    return new THREE.Vector3(ITEMS.sword.length, 0, 0).applyMatrix4(sword.matrixWorld);
  };

  it('plans the throw with the sword the file holds', () => {
    expect(THROWN_SWORD.length).toBeCloseTo(ITEMS.sword.length, 1);
    expect(THROWN_SWORD.middle).toBeGreaterThan(0);
    expect(THROWN_SWORD.middle).toBeLessThan(THROWN_SWORD.length);
  });

  it('stands a target in the card, and the point of the sword reaches it on the tick it flinches', () => {
    const { station, advance } = setup(def.id);
    const [, target, flinch] = station.roots;
    const sword = held(station, 'sword');
    const hit = def.plan.hitTick;
    advance(Math.floor(hit) - 1);
    expect(flinch.visible).toBe(false);
    expect(target.visible).toBe(true);
    advance(3);
    expect(flinch.visible).toBe(true);
    expect(target.visible).toBe(false);
    const point = pointOf(sword);
    expect(Math.abs(point.x - (def.gap - CHAR_HALF_Z))).toBeLessThan(1);
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(sword.quaternion).x).toBeGreaterThan(0.95);
  });

  it('flies the same line at every camera step, whatever hand it left', () => {
    const at = (step) => {
      const { station, advance } = setup(def.id, step);
      const sword = held(station, 'sword');
      advance(def.plan.releaseTick + 9);
      return sword.position.clone();
    };
    const first = at(0);
    for (const step of [1, 2, 3, 4, 5, 6, 7]) expect(at(step).distanceTo(first), `step ${step}`).toBeLessThan(1e-9);
  });

  it('turns over on the way, and the next pass starts with it back in the hand', () => {
    const { station, advance } = setup(def.id);
    const sword = held(station, 'sword');
    advance(2);
    const fromUnit = () => sword.position.distanceTo(new THREE.Vector3(0, REST_Y, 0));
    advance(def.plan.releaseTick - 3);
    const seen = [];
    advance(Math.ceil(def.plan.hitTick - def.plan.releaseTick), () => seen.push(new THREE.Vector3(1, 0, 0).applyQuaternion(sword.quaternion).y));
    expect(Math.min(...seen)).toBeLessThan(-0.8);
    expect(Math.max(...seen)).toBeGreaterThan(0.8);
    expect(fromUnit()).toBeGreaterThan(30);
    advance(90 - Math.ceil(def.plan.hitTick));
    expect(fromUnit()).toBeLessThan(25);
  });
});
