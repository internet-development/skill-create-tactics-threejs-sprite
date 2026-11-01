//NOTE(@jimmylee)
//The kit is a second implementation of what the engine draws, written to leave this repository, so these
//tests hold it to the first one. They need no binaries: the tables are held to TYPE1 by the parity suites, and
//here the portable runtime and the engine's sequence group read those tables and must agree on every
//sequence, view and frame. The rest is what a stranger's file can break: the sheet check and its limits.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import zlib from 'node:zlib';
import fs from 'node:fs';
import createCharacter from '@engine/meshes/createCharacter';
import { setSequencePair } from '@engine/meshes/character-groups/group-sequence';
import { DEFAULT_AZIMUTH, STEP_SIZE, computeAzimuthToStep, BODY_W, STANDARD_CONTAINER_H } from '@engine/meshes/character-utils';
import { State } from '@engine/actions/character-state';
import { SHEET_H, SHEET_W, SPRITE_CELLS } from '@engine/constants/sprites';
import { SEQ_PAIRS } from '@engine/constants/sprites/seq-library';
import { SPRITE_HEIGHT, SPRITE_WIDTH, GAME_ELEVATION } from '@engine/constants/character';
import { heldHand } from '@engine/weapons/held-items';
import { readSetItems } from '@engine/weapons/set-items';
import { AROUND_BODY as ENGINE_AROUND_BODY, ITEM_END_ON as ENGINE_END_ON, ITEM_FLATTEN as ENGINE_FLATTEN, ITEM_LAYER_GAP as ENGINE_GAP } from '@engine/constants/character';
import { ELEVATIONS, SPRITE_DEMOS } from '@engine/debug/sprite-animation-demo-catalog';
import { aimCamera, azimuthForStep, createSpriteDemoStations } from '@engine/debug/sprite-animation-demos';
import { syncCharacterVisuals } from '@engine/meshes/character-utils';
import { buildSpriteData } from '@engine/web/sprite-data';
import { checkSheet, decodePng } from '@root/assets/check-sheet.mjs';
import { cameraStep, createAtlas, createPlayer, createPose, drawPose, eventsBetween, findAnimation, handPoint, poseAt } from '@root/assets/tactics-sprite.mjs';
import { AROUND_BODY, ITEM_END_ON, ITEM_FLATTEN, ITEM_LAYER_GAP, SCALE_X, SCALE_Y, createTacticsSprite } from '@root/assets/tactics-sprite-three.mjs';

const NOW = 1_000_000;
const SE = 1;
const SCALE = { x: SPRITE_WIDTH / BODY_W, y: SPRITE_HEIGHT / STANDARD_CONTAINER_H };
const atlas = createAtlas(buildSpriteData({ notice: 'test', version: 'test' }));
const GUN_FIRE_LEAD_TICKS = 2;
const CELL_BY_RECT = new Map(SPRITE_CELLS.map((c) => [`${c.x},${c.y},${c.w},${c.h}`, c.id]));

function makeCamera(idx, elevation) {
  const step = (idx - SE + 8) % 8;
  const azimuth = DEFAULT_AZIMUTH + step * STEP_SIZE;
  const camera = new THREE.OrthographicCamera();
  camera.position.set(Math.sin(azimuth) * Math.cos(elevation) * 400, Math.sin(elevation) * 400, Math.cos(azimuth) * Math.cos(elevation) * 400);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.userData.isMainCamera = true;
  camera.userData.now = NOW;
  camera.userData.azimuthStep = step;
  return camera;
}

//NOTE(@jimmylee)
//Rounds to 0.001 of a pixel, and adding 0 turns -0 into 0.
const fixed = (value) => Number(value.toFixed(3)) + 0;

//NOTE(@jimmylee)
//Both rigs read back the same way: tile, center in sprite pixels in the camera frame, flip, depth toward the
//camera. Only how a plane stores its uv differs: the engine moves a texture, the kit writes the attribute.
function readTiles(root, camera, rectOf) {
  root.updateMatrixWorld(true);
  const origin = new THREE.Vector3().setFromMatrixPosition(root.matrixWorld);
  const toCamera = camera.quaternion.clone().invert();
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh && o.visible && o.material.colorWrite !== false && (o.material.map || o.geometry.attributes.uv)) meshes.push(o);
  });
  meshes.sort((a, b) => a.renderOrder - b.renderOrder);
  return meshes.map((mesh) => {
    const center = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const { parameters } = mesh.geometry;
    center.sub(origin).applyQuaternion(toCamera);
    const [sx, sy, w, h, flip] = rectOf(mesh);
    const size = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
    return `${CELL_BY_RECT.get(`${sx},${sy},${w},${h}`)} ${fixed(center.x / SCALE.x)},${fixed(center.y / SCALE.y)},${fixed(center.z)} ${fixed((parameters.width * size.x) / SCALE.x)}x${fixed((parameters.height * size.y) / SCALE.y)}${flip ? ' flipped' : ''}`;
  });
}

const engineRect = (mesh) => {
  const { offset, repeat } = mesh.material.map;
  const flip = repeat.x < 0;
  return [Math.round((flip ? offset.x + repeat.x : offset.x) * SHEET_W), Math.round((1 - offset.y - repeat.y) * SHEET_H), Math.round(Math.abs(repeat.x) * SHEET_W), Math.round(repeat.y * SHEET_H), flip];
};

const kitRect = (mesh) => {
  const uv = mesh.geometry.attributes.uv;
  const [left, right, top, bottom] = [uv.getX(0), uv.getX(1), uv.getY(0), uv.getY(2)];
  return [Math.round(Math.min(left, right) * SHEET_W), Math.round((1 - top) * SHEET_H), Math.round(Math.abs(right - left) * SHEET_W), Math.round((top - bottom) * SHEET_H), left > right];
};

describe('the kit draws what the engine draws', () => {
  const engine = createCharacter({ node: { x: 0, y: 0, z: 0 }, textures: { skins: { characterSpriteSheet: new THREE.Texture() } }, direction: 'SE', mode: 'SQ', now: NOW });
  engine.userData.character.state = State.IDLE;
  const kit = createTacticsSprite(atlas, new THREE.Texture(), { facing: 'SE' });

  it('uses the engine pixel scale', () => {
    expect([SCALE_X, SCALE_Y]).toEqual([SCALE.x, SCALE.y]);
  });

  it('agrees on every sequence, view and frame, dry and in water, at the game camera', () => {
    let compared = 0;
    for (const water of [false, true]) {
      for (const pair of SEQ_PAIRS) {
        for (let idx = 0; idx < 8; idx++) {
          const camera = makeCamera(idx, GAME_ELEVATION);
          const entry = idx >= 3 && idx <= 6 ? pair.back : pair.front;
          let startTicks = 0;
          for (let k = 0; k < entry.frames.length; k++) {
            const ticksIn = startTicks + (entry.ticks[k] / 2 || 0.06);
            setSequencePair(engine, pair, false, water, NOW - (ticksIn * 1000) / 60);
            engine.children[0].onBeforeRender(null, null, camera);
            const { name } = atlas.data.animations.find((row) => row.front === pair.front.seq);
            const animation = findAnimation(atlas, name);
            kit.player.play(animation.name, NOW / 1000 - ticksIn / 60, { loop: false, water });
            kit.update(NOW / 1000, camera);
            //NOTE(@jimmylee)
            //Null, the one repeated name, plays SEQ 0 from either row.
            if (animation.front === pair.front.seq) {
              expect(readTiles(kit.group, camera, kitRect), `${pair.label} water ${water} idx ${idx} frame ${k}`).toEqual(readTiles(engine, camera, engineRect));
              compared++;
            }
            startTicks += entry.ticks[k];
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(10000);
  });

  it('lifts a frame below the soles the same way at every elevation', () => {
    const pair = SEQ_PAIRS.find(({ front }) => front.seq === 40);
    engine.position.set(0, SPRITE_HEIGHT / 2, 0);
    kit.group.position.set(0, SPRITE_HEIGHT / 2, 0);
    for (const elevation of Object.values(ELEVATIONS)) {
      for (let idx = 0; idx < 8; idx++) {
        const camera = makeCamera(idx, elevation);
        setSequencePair(engine, pair, false, false, NOW - 16);
        engine.children[0].onBeforeRender(null, null, camera);
        kit.player.play('Dead', NOW / 1000);
        kit.update(NOW / 1000, camera);
        expect(readTiles(kit.group, camera, kitRect)).toEqual(readTiles(engine, camera, engineRect));
      }
    }
    engine.position.set(0, 0, 0);
    kit.group.position.set(0, 0, 0);
  });

  it('turns the same camera into the same step', () => {
    for (let degrees = -360; degrees < 720; degrees += 7) {
      const azimuth = (degrees * Math.PI) / 180;
      const position = { x: Math.sin(azimuth) * 300, z: Math.cos(azimuth) * 300 };
      expect(cameraStep(position.x, position.z)).toBe(computeAzimuthToStep({ position }));
    }
  });

  it('draws idle as the eight SHP idle frames', () => {
    const pose = createPose();
    const animation = findAnimation(atlas, 'Idle');
    expect(atlas.data.idleFrames).toEqual([3, 2, 1, 8, 7, 6, 5, 4]);
    poseAt(atlas, animation, 7, 100, pose);
    expect([pose.shp, pose.tiles[0].id, pose.tiles[0].flipX, pose.tiles[0].x, pose.done]).toEqual([4, 'P2', true, -15, true]);
  });

  it('places a held prop where the engine reads the hand', () => {
    const pose = createPose();
    const engineHand = [0, 0];
    for (const shp of [85, 87, 88, 90]) {
      const animation = { front: 0, back: 0, loop: false, water: false };
      const entry = { ...atlas.sequences[0], frames: [shp] };
      const local = { ...atlas, sequences: [entry] };
      poseAt(local, animation, 1, 0, pose);
      const hand = handPoint(atlas, pose, 'first');
      heldHand(shp, 'first', engineHand);
      expect(hand).toEqual(engineHand);
      poseAt(local, animation, 0, 0, pose);
      expect(handPoint(atlas, pose, 'first')).toEqual([-engineHand[0], engineHand[1]]);
    }
  });
});

describe('the kit holds what the engine holds', () => {
  const file = fs.readFileSync('public/static/models/set-items.glb');
  const items = readSetItems(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const close = (value) => [value.x, value.y, value.z].map((n) => fixed(n));
  const cards = SPRITE_DEMOS.filter((def) => def.held || def.marble);
  const itemIn = (station, def) => station.scene.children.find((o) => (def.held ? o.userData.generatedWeapon && o.geometry?.attributes.position?.count === items[def.held.item].position.length / 3 : o.userData.spritePlane));

  it('uses the engine layer gap', () => {
    expect([ITEM_LAYER_GAP, ITEM_FLATTEN, ITEM_END_ON, AROUND_BODY]).toEqual([ENGINE_GAP, ENGINE_FLATTEN, ENGINE_END_ON, ENGINE_AROUND_BODY]);
  });

  it('bakes a hold for every card that holds something', () => {
    for (const def of cards) expect(atlas.data.holds[def.pair.front.name.replace(/ Fwd$/, '')] ?? atlas.data.holds[atlas.data.animations.find((row) => row.front === def.pair.front.seq).name], def.id).toBeDefined();
  });

  for (const def of cards) {
    it(`matches ${def.id} on every view, frame and tile`, () => {
      const { stations } = createSpriteDemoStations({ textures: { skins: { characterSpriteSheet: new THREE.Texture(), blackMarble: new THREE.Texture() } }, now: NOW, demos: [def], items });
      const [station] = stations;
      const [engineUnit] = station.roots;
      const mesh = itemIn(station, def);
      const { name } = atlas.data.animations.find((row) => row.front === def.pair.front.seq);
      const kitUnit = createTacticsSprite(atlas, new THREE.Texture(), { facing: 'SE' });
      const kitMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
      kitUnit.carry(kitMesh, name);
      const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
      const released = def.plan?.releaseTick ?? Infinity;
      const ch = engineUnit.userData.character;
      for (let view = 0; view < 8; view++) {
        const step = (view - SE + 8) % 8;
        station.reset(NOW);
        kitUnit.group.position.copy(engineUnit.position);
        kitUnit.play(name, NOW / 1000, { loop: ch.seqLoop });
        const entry = view >= 3 && view <= 6 ? ch.seqBack : ch.seqFront;
        let startTicks = 0;
        for (let frame = 0; frame < entry.frames.length; frame++) {
          const ticks = startTicks + (entry.ticks[frame] / 2 || 0.06);
          startTicks += entry.ticks[frame];
          if (ticks >= released) break;
          const now = NOW + (ticks * 1000) / 60;
          aimCamera(camera, station.focus, azimuthForStep(step), ELEVATIONS.game, now);
          station.update(now, 1 / 60, step, camera.quaternion);
          syncCharacterVisuals(null, station.scene, camera);
          //NOTE(@jimmylee)
          //A gun's stage aims its barrel and kicks it back when it fires, so only the hand is the kit's to match,
          //and the kit reads where a stage left the barrel to know when it points along the view.
          const gun = def.kind === 'gun';
          if (gun) kitMesh.quaternion.copy(mesh.quaternion);
          kitUnit.update(now / 1000, camera);
          const label = `${def.id} view ${view} frame ${frame}`;
          if (!gun || ticks < def.plan.hitTick - GUN_FIRE_LEAD_TICKS) expect(kitMesh.position.distanceTo(mesh.position), label).toBeLessThan(0.002);
          if (def.held && !gun) expect(Math.abs(kitMesh.quaternion.dot(mesh.quaternion)), label).toBeGreaterThan(0.999999);
          expect(readTiles(kitUnit.group, camera, kitRect), label).toEqual(readTiles(engineUnit, camera, engineRect));
        }
      }
      expect(kitMesh.scale.x).toBe(mesh.scale.x);
    });
  }

  it('reads the hand of the drawn frame, in the world, with the SEQ motion', () => {
    const unit = createTacticsSprite(atlas, new THREE.Texture(), { facing: 'SE' });
    const camera = makeCamera(1, GAME_ELEVATION);
    unit.play('Swing High', 0, { loop: false });
    unit.update(18 / 60, camera);
    const [u, v] = heldHand(unit.player.pose.shp, 'first', [0, 0]);
    const expected = new THREE.Vector3(u * SCALE.x, -(v + unit.player.pose.du) * SCALE.y, 0).applyQuaternion(camera.quaternion).add(new THREE.Vector3(unit.player.pose.fb * SCALE.x, 0, 0));
    expect(close(unit.hand('first'))).toEqual(close(expected));
  });

  it('asks for a hold that exists', () => {
    expect(() => createTacticsSprite(atlas, new THREE.Texture()).carry(new THREE.Mesh(), 'Walk')).toThrow('Nothing is held');
  });
});

describe('the kit in any scene', () => {
  const inWorld = (unit, camera) => {
    unit.update(1, camera);
    unit.group.updateWorldMatrix(true, true);
    const rotation = new THREE.Quaternion();
    const position = new THREE.Vector3();
    return unit.group.children.filter((mesh) => mesh.visible).map((mesh) => {
      mesh.getWorldPosition(position);
      mesh.getWorldQuaternion(rotation);
      return [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, rotation.w].map(fixed);
    });
  };

  it('faces a camera on a rig and sits under a turned parent as it does at the root', () => {
    const world = makeCamera(1, GAME_ELEVATION);
    const plain = createTacticsSprite(atlas, new THREE.Texture(), { facing: 'SE', animation: 'Walk' });
    const expected = inWorld(plain, world);

    const rig = new THREE.Group();
    rig.rotation.set(0.3, 1.1, -0.2);
    rig.position.set(40, 10, -30);
    rig.updateMatrixWorld(true);
    const camera = new THREE.OrthographicCamera();
    rig.matrixWorld.clone().invert().multiply(world.matrixWorld).decompose(camera.position, camera.quaternion, camera.scale);
    rig.add(camera);
    expect(inWorld(createTacticsSprite(atlas, new THREE.Texture(), { facing: 'SE', animation: 'Walk' }), camera)).toEqual(expected);

    const parent = new THREE.Group();
    parent.rotation.y = 1;
    const child = createTacticsSprite(atlas, new THREE.Texture(), { facing: 'SE', animation: 'Walk' });
    parent.add(child.group);
    expect(inWorld(child, world)).toEqual(expected);
  });

  it('sorts whole units by view depth, after the rest of the scene', () => {
    const camera = makeCamera(1, GAME_ELEVATION);
    const toward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion).multiplyScalar(50);
    const far = createTacticsSprite(atlas, new THREE.Texture());
    const near = createTacticsSprite(atlas, new THREE.Texture());
    near.group.position.copy(toward);
    far.update(1, camera);
    near.update(1, camera);
    expect(near.group.renderOrder - far.group.renderOrder).toBeCloseTo(50, 3);
    expect(far.group.renderOrder).toBeGreaterThan(0);
  });

  it('keeps the palette out of a tone mapped renderer', () => {
    const unit = createTacticsSprite(atlas, new THREE.Texture());
    for (const mesh of unit.group.children) expect(mesh.material.toneMapped).toBe(false);
  });
});

describe('the player', () => {
  it('fires a hit on its tick, once, and comes back to idle', () => {
    const player = createPlayer(atlas, { facing: 'SE' }).play('Swing High', 0, { then: 'Idle' });
    const hits = [];
    for (let tick = 0; tick <= 60; tick++) {
      player.update(tick / 60, 0);
      if (player.events.includes('PostGenericAttack')) hits.push(tick);
    }
    expect(hits).toEqual([18]);
    expect(player.animation.name).toBe('Idle');
  });

  it('reports a hit once when a slow frame jumps past it into the next animation', () => {
    const player = createPlayer(atlas).play('Swing High', 0, { then: 'Idle' });
    player.update(0, 0);
    player.update(10, 0);
    expect(player.events).toEqual(['PostGenericAttack']);
    expect(player.animation.name).toBe('Idle');
    player.update(10.1, 0);
    expect(player.events).toEqual([]);
  });

  it('ends a looping shiver after its duration', () => {
    const player = createPlayer(atlas).play('Taking Damage', 0, { then: 'Idle', duration: 0.5 });
    player.update(0.4, 0);
    expect(player.animation.name).toBe('Taking Damage');
    player.update(0.6, 0);
    expect(player.animation.name).toBe('Idle');
    expect(player.startedAt).toBe(0.5);
  });

  it('fires an event each time a loop passes it', () => {
    const entry = { events: [[6, 'Hit']], totalTicks: 10 };
    expect(eventsBetween(entry, 5, 7, true)).toEqual(['Hit']);
    expect(eventsBetween(entry, 15, 17, true)).toEqual(['Hit']);
    expect(eventsBetween(entry, 7, 15, true)).toEqual([]);
  });

  it('holds a last frame with a delay of 0', () => {
    const player = createPlayer(atlas).play('Dead', 0);
    expect(player.update(99, 0).shp).toBe(23);
    expect(player.pose.done).toBe(true);
  });

  it('every data animation resolves and every frame it names has a cell', () => {
    for (const row of atlas.data.animations) {
      expect(findAnimation(atlas, row.name)).toBeDefined();
      for (const seq of [row.front, row.back]) for (const shp of atlas.data.sequences[seq].frames) for (const [id] of atlas.data.frames[shp + (row.water ? atlas.data.waterOffset : 0)]) expect(atlas.cells[id]).toBeDefined();
    }
  });

  it('draws a mirrored tile through a flip and a plain one directly', () => {
    const calls = [];
    const context = { save: () => calls.push('save'), restore: () => calls.push('restore'), translate: (x, y) => calls.push(['translate', x, y]), scale: (x) => calls.push(['scale', x]), drawImage: (_, ...args) => calls.push(args) };
    drawPose(context, null, poseAt(atlas, findAnimation(atlas, 'Idle'), 2, 0), 100, 100, 2);
    expect(calls).toEqual([[0, 0, 32, 40, 66, 60, 64, 80]]);
    calls.length = 0;
    drawPose(context, null, poseAt(atlas, findAnimation(atlas, 'Idle'), 7, 0), 100, 100, 2);
    expect(calls[0]).toBe('save');
    expect(calls).toContainEqual(['scale', -1]);
  });
});

//NOTE(@jimmylee)
//A real PNG from RGBA, so the checker is held to files, not to a stub.
function encodePng(width, height, pixel, { interlaced = false } = {}) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buffer) => {
    let c = 0xffffffff;
    for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'latin1');
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[12] = interlaced ? 1 : 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

describe('check-sheet', () => {
  const EMPTY = [0, 0, 0, 0];
  const INK = [40, 40, 32, 255];
  const insideCell = (x, y) => x >= 0 && x < 32 && y >= 0 && y < 40;
  const codes = (report) => report.errors.map(({ code }) => code);

  it('passes a1.png', () => {
    const report = checkSheet(fs.readFileSync('public/static/textures/a1.png'), SPRITE_CELLS);
    expect(report.ok).toBe(true);
    expect(report.colors).toBe(15);
  });

  it('decodes a1.png the way the sheet tests read it', () => {
    const image = decodePng(fs.readFileSync('public/static/textures/a1.png'));
    expect([image.width, image.height]).toEqual([SHEET_W, SHEET_H]);
    expect(image.at(255, 487)).toEqual(EMPTY);
  });

  it('fails art left outside the cells, and says where', () => {
    const report = checkSheet(encodePng(SHEET_W, SHEET_H, (x, y) => (x === 255 && y === 487 ? INK : insideCell(x, y) ? INK : EMPTY)), SPRITE_CELLS);
    expect(codes(report)).toContain('pixels-outside-cells');
    expect(report.errors[0].points).toEqual([[255, 487]]);
  });

  it('fails partial alpha and colored transparent pixels', () => {
    const report = checkSheet(encodePng(SHEET_W, SHEET_H, (x, y) => (x === 0 && y === 0 ? [9, 9, 9, 128] : x === 1 && y === 0 ? [9, 9, 9, 0] : insideCell(x, y) ? INK : EMPTY)), SPRITE_CELLS);
    expect(codes(report)).toEqual(expect.arrayContaining(['partial-alpha', 'colored-transparent-pixels']));
  });

  it('fails an empty sheet and warns on one empty cell', () => {
    expect(codes(checkSheet(encodePng(SHEET_W, SHEET_H, () => EMPTY), SPRITE_CELLS))).toContain('empty-sheet');
    expect(checkSheet(encodePng(SHEET_W, SHEET_H, (x, y) => (insideCell(x, y) ? INK : EMPTY)), [SPRITE_CELLS[0], SPRITE_CELLS[1]]).warnings[0].code).toBe('empty-cells');
  });

  it('refuses the wrong size and an interlaced file before inflating them', () => {
    expect(checkSheet(encodePng(256, 256, () => EMPTY), SPRITE_CELLS).errors[0].message).toContain('256x488');
    expect(checkSheet(encodePng(SHEET_W, SHEET_H, () => EMPTY, { interlaced: true }), SPRITE_CELLS).errors[0].message).toContain('interlaced');
  });

  it('refuses a file that inflates past its own image, and never throws on garbage', () => {
    const bomb = Buffer.from(encodePng(SHEET_W, SHEET_H, () => EMPTY));
    const inflated = zlib.deflateSync(Buffer.alloc(64 * 1024 * 1024));
    const start = bomb.indexOf('IDAT') - 4;
    const end = bomb.indexOf('IEND') - 4;
    const length = Buffer.alloc(4);
    length.writeUInt32BE(inflated.length, 0);
    const forged = Buffer.concat([bomb.subarray(0, start), length, Buffer.from('IDAT'), inflated, Buffer.alloc(4), bomb.subarray(end)]);
    expect(checkSheet(forged, SPRITE_CELLS).ok).toBe(false);
    for (const garbage of [Buffer.alloc(0), Buffer.from('not a png'), forged.subarray(0, 60)]) expect(checkSheet(garbage, SPRITE_CELLS).ok).toBe(false);
  });
});
