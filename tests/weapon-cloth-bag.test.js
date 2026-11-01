//NOTE(@jimmylee)
//The cloth bag: a cord that carries tension only and holds its length, a swing that settles, a snap that
//stops at what it hits, and a card whose bag reaches its target on the SEQ's own tick.

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import { join } from 'path';
import * as THREE from 'three';
import { CLOTH_BAG_SPEC, CLOTH_BAG_STEP_S, clothBagLength, createClothBag, resetClothBag, stepClothBag, whipClothBag } from '@engine/weapons/cloth-bag';
import { SET_ITEMS_FILE, readSetItems } from '@engine/weapons/set-items';
import { SPRITE_DEMOS } from '@engine/debug/sprite-animation-demo-catalog';
import { aimCamera, azimuthForStep, createSpriteDemoStations, fitStationView, ELEVATIONS } from '@engine/debug/sprite-animation-demos';

const SHAPES = [CLOTH_BAG_SPEC, { ...CLOTH_BAG_SPEC, links: 4, cordLength: 12, bagMass: 0.5 }, { ...CLOTH_BAG_SPEC, links: 8, cordLength: 6, bagMass: 0.1 }];
const steps = (seconds) => Math.round(seconds / CLOTH_BAG_STEP_S);

function cordSpan(bag) {
  let span = 0;
  for (let i = 0; i + 1 < bag.nodes; i++) span += Math.hypot(bag.x[i + 1] - bag.x[i], bag.y[i + 1] - bag.y[i]);
  return span;
}

describe('the simulation', () => {
  it('hangs straight down at rest, a cord length below the hand, on every shape', () => {
    for (const spec of SHAPES) {
      const bag = createClothBag(spec);
      resetClothBag(bag, 3, 2);
      for (let i = 0; i < steps(2); i++) stepClothBag(bag, 3, 2);
      expect(bag.x[bag.nodes - 1]).toBeCloseTo(3, 6);
      expect(2 - bag.y[bag.nodes - 1]).toBeCloseTo(spec.cordLength, 1);
    }
  });

  it('a cord does not stretch: a hard pull on the hand stays within 2% of its length', () => {
    for (const spec of SHAPES) {
      const bag = createClothBag(spec);
      resetClothBag(bag, 0, 0);
      let longest = 0;
      for (let i = 0; i < steps(1.5); i++) {
        const tick = Math.floor(i / 4);
        stepClothBag(bag, tick % 20 < 10 ? 12 : -12, tick % 14 < 7 ? 8 : -8);
        longest = Math.max(longest, cordSpan(bag));
      }
      expect(longest).toBeLessThan(spec.cordLength * 1.02);
    }
  });

  it('a bag let go on a still hand stays under it and settles there', () => {
    for (const spec of SHAPES) {
      const bag = createClothBag({ ...spec, handLagS: 1e-3 });
      resetClothBag(bag, 0, 0);
      const last = bag.nodes - 1;
      for (let i = 1; i <= last; i++) {
        bag.x[i] = bag.lastX[i] = i * bag.rest * Math.sin(0.3);
        bag.y[i] = bag.lastY[i] = -i * bag.rest * Math.cos(0.3);
      }
      const energy = () => {
        let total = 0;
        for (let i = 1; i <= last; i++) {
          const speed = Math.hypot(bag.x[i] - bag.lastX[i], bag.y[i] - bag.lastY[i]) / CLOTH_BAG_STEP_S;
          total += (0.5 * speed * speed + spec.gravity * bag.y[i]) / bag.inverseMass[i];
        }
        return total;
      };
      const rest = -spec.gravity * bag.rest * ((1 / bag.inverseMass[last]) * last + (spec.cordMass * last * (last - 1)) / 2);
      const start = energy();
      for (let i = 0; i < steps(8); i++) {
        stepClothBag(bag, 0, 0);
        expect(bag.y[last]).toBeLessThan(0);
      }
      expect(energy() - rest).toBeLessThan((start - rest) * 0.05);
      expect(Math.abs(bag.x[last])).toBeLessThan(spec.cordLength * 0.05);
    }
  });

  it('the same inputs give the same bag', () => {
    const run = () => {
      const bag = createClothBag();
      resetClothBag(bag, 0, 0);
      for (let i = 0; i < steps(1); i++) {
        if (i === 60) whipClothBag(bag, 15, 4, 4 / 60);
        stepClothBag(bag, Math.sin(i / 40) * 8, 2);
      }
      return Array.from(bag.x);
    };
    expect(run()).toEqual(run());
  });

  it('a wall stops the bottom of the sack and marks the impact once', () => {
    const bag = createClothBag();
    resetClothBag(bag, 0, 0);
    bag.wall = 10;
    whipClothBag(bag, 16, 0, 4 / 60);
    let peak = 0;
    let most = 0;
    for (let i = 0; i < steps(0.3); i++) {
      stepClothBag(bag, 0, 0);
      peak = Math.max(peak, bag.x[bag.nodes - 1]);
      most = Math.max(most, bag.impact);
    }
    expect(peak).toBeLessThanOrEqual(10 - clothBagLength(CLOTH_BAG_SPEC) + 1e-9);
    expect(bag.struck).toBe(true);
    expect(most).toBeGreaterThan(0.9);
    expect(bag.impact).toBe(0);
  });
});

describe('the Cloth Bag cards', () => {
  const NOW = 1_000_000;
  const FRAME_MS = 1000 / 60;
  const file = fs.readFileSync(join(import.meta.dirname, '../public/static/models', SET_ITEMS_FILE));
  const items = readSetItems(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
  const cards = SPRITE_DEMOS.filter((d) => d.bag);

  it('there are three, and each bag lands on its target within two ticks of PostGenericAttack, whatever the camera', () => {
    expect(cards.map((d) => d.mode)).toEqual(['CB1', 'CB2', 'CB3']);
    for (const def of cards) {
      const landed = [0, 3].map((step) => {
        const { stations } = createSpriteDemoStations({ textures: { skins: { characterSpriteSheet: new THREE.Texture() } }, now: NOW, demos: [def], items });
        const [station] = stations;
        const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
        const hitTick = def.hitMs * 0.06;
        let now = NOW;
        let tick = -1;
        for (let frame = 1; frame <= 38 && tick < 0; frame++) {
          now += FRAME_MS;
          fitStationView(station, azimuthForStep(step), ELEVATIONS.game, 6 / 5);
          const drawn = aimCamera(camera, station.focus, azimuthForStep(step), ELEVATIONS.game, now);
          station.update(now, FRAME_MS / 1000, drawn, camera.quaternion);
          if (station.bag.struck) tick = frame;
        }
        expect(Math.abs(tick - hitTick), `${def.id} step ${step}`).toBeLessThanOrEqual(2);
        return Array.from(station.bag.x);
      });
      expect(landed[1]).toEqual(landed[0]);
    }
  });
});
