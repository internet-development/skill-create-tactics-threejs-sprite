//NOTE(@jimmylee)
//Can a weapon be generated instead of drawn? The bow is built from a spec alone, so its accuracy is
//checked against what a spec promises and against physics, not against art: the limb's length, the
//brace height and draw force it was asked for, the closed-form force-draw curve, energy accounting
//over a whole shot, and the same checks on bows of other shapes, because a generator that is only
//right for one bow is a sprite with extra steps. The drawn mesh is then read back and held to the
//simulation it draws.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { BOW_SPEC, BOW_STEP_S, bendAt, bowEnergy, bowPull, createBow, limbPoint, resetBow, simulateShot, stepBow } from '@engine/weapons/bow';
import { createBowMesh, syncBowMesh } from '@engine/weapons/bow-mesh';
import { collide, fallTime, solveArc } from '@engine/weapons/ballistics';
import { defaultGravity } from '@engine/constants/physics';

const SCHEDULE = { nockTick: 12, anchorTick: 20, shotTick: 26 };
const TICKS_PER_STEP = 60 * BOW_STEP_S;
const LONGBOW = { ...BOW_SPEC, gripHalf: 3, limbLength: 20, restBend: 0.05, braceHeight: 5, drawLength: 15, drawForce: 9000, limbMass: 1.4, stringMass: 0.3 };
const RECURVE = { ...BOW_SPEC, restBend: -0.35, limbLength: 10, braceHeight: 4, drawLength: 10, drawForce: 12000 };
const BOWS = { 'the demo bow': BOW_SPEC, 'a longbow': LONGBOW, 'a reflexed recurve': RECURVE };

function drawTo(bow) {
  const { spec } = bow;
  for (let tick = SCHEDULE.nockTick; tick < SCHEDULE.shotTick; tick += TICKS_PER_STEP) stepBow(bow, bowPull(spec, tick, SCHEDULE.nockTick, SCHEDULE.anchorTick, SCHEDULE.shotTick));
}

for (const [name, spec] of Object.entries(BOWS)) {
  describe(`generated bow: ${name}`, () => {
    it('keeps its limb length at every bend, straight limb included', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 0, y: 0 };
      for (const phi of [-0.5, 0, 1e-6, 0.4, 1.2]) {
        let length = 0;
        limbPoint(spec, phi, 0, a);
        expect(a.x).toBeCloseTo(0, 12);
        expect(a.y).toBeCloseTo(spec.gripHalf, 12);
        const samples = 400;
        for (let i = 1; i <= samples; i++) {
          limbPoint(spec, phi, (i / samples) * spec.limbLength, b);
          length += Math.hypot(b.x - a.x, b.y - a.y);
          a.x = b.x;
          a.y = b.y;
        }
        expect(length).toBeCloseTo(spec.limbLength, 3);
      }
    });

    it('is strung at its brace height and comes to its draw force at full draw', () => {
      const bow = createBow(spec);
      expect(-bow.x[0]).toBeCloseTo(spec.braceHeight, 9);
      expect(bow.x[bow.nodes]).toBeCloseTo(-spec.braceHeight, 9);
      expect(bendAt(bow, spec.braceHeight).force).toBeCloseTo(0, 3);
      expect(bendAt(bow, spec.drawLength).force).toBeCloseTo(spec.drawForce, 3);
    });

    //NOTE(@jimmylee)
    //Virtual work: the work done on the nock from brace to full draw is the bending energy gained plus
    //what the string stretched. A force curve that is wrong anywhere fails this integral.
    it('its force-draw curve integrates to the energy it stores', () => {
      const bow = createBow(spec);
      const samples = 800;
      let work = 0;
      const step = (spec.drawLength - spec.braceHeight) / samples;
      for (let i = 0; i < samples; i++) work += bendAt(bow, spec.braceHeight + (i + 0.5) * step).force * step;
      const stretched = (tension) => (tension * tension * bow.stringRest) / spec.stringStiffness;
      const start = bendAt(bow, spec.braceHeight);
      const end = bendAt(bow, spec.drawLength);
      expect(work / (end.energy - start.energy + stretched(end.tension) - stretched(start.tension))).toBeCloseTo(1, 2);
    });

    it('the simulation holds the full draw the geometry says it should', () => {
      const bow = createBow(spec);
      drawTo(bow);
      const expected = bendAt(bow, spec.drawLength);
      expect(bow.phi).toBeCloseTo(expected.phi, 2);
      expect(bow.tension / expected.tension).toBeCloseTo(1, 1);
      expect(bow.nockForce / expected.force).toBeCloseTo(1, 1);
    });

    //NOTE(@jimmylee)
    //With damping off nothing may be created, and only a few percent may go to the solver. The arrow
    //cannot take more than the draw stored.
    it('a shot conserves energy', () => {
      const undamped = { ...spec, stringDamping: 0, limbDamping: 0 };
      const bow = createBow(undamped);
      const total = () => {
        const { strain, motion, arrow } = bowEnergy(bow);
        return strain + motion + arrow;
      };
      drawTo(bow);
      const start = total();
      for (let i = 0; i < 2400; i++) {
        stepBow(bow, -1);
        expect(total()).toBeLessThan(start * 1.01);
      }
      expect(total()).toBeGreaterThan(start * 0.88);
    });

    it('the arrow leaves near the brace line, faster for more draw, and the string rings back to rest', () => {
      const shot = simulateShot(spec, SCHEDULE);
      expect(shot.efficiency).toBeGreaterThan(0.5);
      expect(shot.efficiency).toBeLessThan(1);
      expect(Math.abs(-shot.leavesAt - spec.braceHeight)).toBeLessThan(1.5);
      expect(shot.speed).toBeLessThan(simulateShot({ ...spec, drawForce: spec.drawForce * 2 }, SCHEDULE).speed);
      expect(shot.speed).toBeGreaterThan(simulateShot({ ...spec, arrowMass: spec.arrowMass * 2 }, SCHEDULE).speed);

      const bow = createBow(spec);
      drawTo(bow);
      let reversals = 0;
      let last = 0;
      for (let i = 0; i < 12000; i++) {
        const before = bow.x[bow.nodes];
        stepBow(bow, -1);
        if (bow.arrowOn) continue;
        const direction = Math.sign(bow.x[bow.nodes] - before);
        if (direction !== 0 && direction !== last) reversals++;
        last = direction;
      }
      expect(reversals).toBeGreaterThan(8);
      expect(bow.x[bow.nodes]).toBeCloseTo(-spec.braceHeight, 1);
      expect(bow.arrowOn).toBe(false);
    });

    it('the string stays on the limb tips, on the arrow line, and never pushes', () => {
      const bow = createBow(spec);
      const tip = { x: 0, y: 0 };
      drawTo(bow);
      for (let i = 0; i < 2400; i++) {
        stepBow(bow, -1);
        limbPoint(spec, bow.phi, spec.limbLength, tip);
        expect(bow.x[0]).toBeCloseTo(tip.x, 9);
        expect(bow.y[0]).toBeCloseTo(tip.y, 9);
        expect(bow.y[bow.nodes]).toBe(0);
        expect(bow.tension).toBeGreaterThanOrEqual(0);
      }
      expect(Number.isFinite(bow.phi)).toBe(true);
    });

    it('the drawn mesh is exactly the simulated bow, mirrored about the arrow', () => {
      const bow = createBow(spec);
      const materials = { stave: new THREE.MeshLambertMaterial({ vertexColors: true }), string: new THREE.MeshBasicMaterial() };
      const group = createBowMesh(bow, materials);
      drawTo(bow);
      syncBowMesh(group, bow);
      const [stave, string] = group.children;
      const ringCenter = (mesh, sides, ring) => {
        const p = mesh.geometry.attributes.position;
        const center = new THREE.Vector3();
        for (let j = 0; j < sides; j++) center.add(new THREE.Vector3().fromBufferAttribute(p, ring * sides + j));
        return center.divideScalar(sides);
      };
      const rings = string.geometry.attributes.position.count / 3;
      expect(rings).toBe(2 * bow.nodes + 1);
      for (let i = 0; i <= bow.nodes; i++) {
        const top = ringCenter(string, 3, i);
        const bottom = ringCenter(string, 3, 2 * bow.nodes - i);
        expect(top.x).toBeCloseTo(bow.x[i], 3);
        expect(top.y).toBeCloseTo(bow.y[i], 3);
        expect(bottom.x).toBeCloseTo(bow.x[i], 3);
        expect(bottom.y).toBeCloseTo(-bow.y[i], 3);
      }
      const staveRings = stave.geometry.attributes.position.count / 6;
      const tipTop = ringCenter(stave, 6, 0);
      const tipBottom = ringCenter(stave, 6, staveRings - 1);
      expect(tipTop.x).toBeCloseTo(bow.x[0], 3);
      expect(tipTop.y).toBeCloseTo(bow.y[0], 3);
      expect(tipBottom.y).toBeCloseTo(-bow.y[0], 3);
      let length = 0;
      for (let i = 1; i < 10; i++) length += ringCenter(stave, 6, i).distanceTo(ringCenter(stave, 6, i - 1));
      expect(length / spec.limbLength).toBeCloseTo(1, 2);
      //NOTE(@jimmylee)
      //Faces wind outward and normals are unit, which three would otherwise have to work out.
      const n = new THREE.Vector3().fromBufferAttribute(stave.geometry.attributes.normal, 12);
      expect(n.length()).toBeCloseTo(1, 5);
      const index = stave.geometry.index;
      const p = stave.geometry.attributes.position;
      const a = new THREE.Vector3().fromBufferAttribute(p, index.getX(30));
      const b = new THREE.Vector3().fromBufferAttribute(p, index.getX(31));
      const c = new THREE.Vector3().fromBufferAttribute(p, index.getX(32));
      const face = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      expect(face.dot(new THREE.Vector3().fromBufferAttribute(stave.geometry.attributes.normal, index.getX(30)))).toBeGreaterThan(0);
    });
  });
}

describe('bow stepping', () => {
  it('reset returns the bow to rest exactly', () => {
    const bow = createBow(BOW_SPEC);
    const fresh = createBow(BOW_SPEC);
    drawTo(bow);
    for (let i = 0; i < 100; i++) stepBow(bow, -1);
    resetBow(bow);
    expect(bow.phi).toBe(fresh.phi);
    expect([...bow.x]).toEqual([...fresh.x]);
    expect([...bow.vx]).toEqual([...fresh.vx]);
    expect(bow.arrowOn).toBe(false);
  });

  it('a pull is a smooth draw between the ticks and an open hand outside them', () => {
    const pull = (tick) => bowPull(BOW_SPEC, tick, 12, 20, 26);
    expect(pull(11)).toBe(-1);
    expect(pull(12)).toBe(BOW_SPEC.braceHeight);
    expect(pull(16)).toBeCloseTo((BOW_SPEC.braceHeight + BOW_SPEC.drawLength) / 2, 9);
    expect(pull(20)).toBe(BOW_SPEC.drawLength);
    expect(pull(25.9)).toBe(BOW_SPEC.drawLength);
    expect(pull(26)).toBe(-1);
  });
});

describe('ballistics', () => {
  it('a solved arc lands on its point, up or down', () => {
    for (const [dx, dy, speed] of [[80, 0, 300], [80, 48, 300], [80, -48, 300], [60, 10, 90]]) {
      const { vh, vv, flightS } = solveArc(dx, dy, speed);
      expect(Math.hypot(vh, vv)).toBeCloseTo(speed, 9);
      expect(vh * flightS).toBeCloseTo(dx, 9);
      expect(vv * flightS + 0.5 * defaultGravity * flightS * flightS).toBeCloseTo(dy, 9);
    }
  });

  it('says so when the speed cannot reach', () => {
    expect(solveArc(1000, 0, 10)).toBe(null);
  });

  it('a collision conserves momentum and separates at the restitution', () => {
    for (const [m, other, e] of [[4, 3, 0.3], [0.05, 3, 0.3], [1, 1, 1]]) {
      const { after, struck } = collide(m, 50, other, e);
      expect(m * after + other * struck).toBeCloseTo(m * 50, 9);
      expect(struck - after).toBeCloseTo(e * 50, 9);
    }
  });

  it('fallTime is when a rising body comes back down', () => {
    const t = fallTime(30, 40);
    expect(30 + 40 * t + 0.5 * defaultGravity * t * t).toBeCloseTo(0, 9);
  });
});
