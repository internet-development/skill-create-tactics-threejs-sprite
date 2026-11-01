import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { WALK_FRAMES, WALK_HAND_FRAMES } from '@engine/meshes/character-groups/group-walk';
import { FLINCH_FRAMES } from '@engine/meshes/character-groups/group-flinch';

describe('character-groups UV mapping', () => {
  describe('WALK_FRAMES — direction mapping', () => {
    it('has 8 rotation steps', () => {
      expect(WALK_FRAMES).toHaveLength(8);
    });

    it('each step has 8 animation frames', () => {
      WALK_FRAMES.forEach((step, i) => {
        expect(step).toHaveLength(8);
      });
    });

    it('steps 0, 7 use pattern A (BF reversed)', () => {
      for (const step of [0, 7]) {
        WALK_FRAMES[step].forEach(frame => {
          expect(frame.id).toMatch(/^BF/);
          expect(frame.reversed).toBe(true);
        });
      }
    });

    it('steps 1, 2 use pattern B (BF not reversed)', () => {
      for (const step of [1, 2]) {
        WALK_FRAMES[step].forEach(frame => {
          expect(frame.id).toMatch(/^BF/);
          expect(frame.reversed).toBe(false);
        });
      }
    });

    it('steps 3, 4 use pattern C (BB not reversed)', () => {
      for (const step of [3, 4]) {
        WALK_FRAMES[step].forEach(frame => {
          expect(frame.id).toMatch(/^BB/);
          expect(frame.reversed).toBe(false);
        });
      }
    });

    it('steps 5, 6 use pattern D (BB reversed)', () => {
      for (const step of [5, 6]) {
        WALK_FRAMES[step].forEach(frame => {
          expect(frame.id).toMatch(/^BB/);
          expect(frame.reversed).toBe(true);
        });
      }
    });

    it('pattern A is reversal of pattern B (symmetric body IDs)', () => {
      const aIds = WALK_FRAMES[0].map(f => f.id);
      const bIds = WALK_FRAMES[1].map(f => f.id);
      expect(aIds).toEqual(bIds);
    });

    it('pattern D is reversal of pattern C (symmetric body IDs)', () => {
      const cIds = WALK_FRAMES[3].map(f => f.id);
      const dIds = WALK_FRAMES[5].map(f => f.id);
      expect(cIds).toEqual(dIds);
    });

    it('SEQ walk order: base frames follow [2,1,0,1,2,3,4,3] pattern', () => {
      const step = WALK_FRAMES[1];
      const digitIds = step.map(f => parseInt(f.id.replace('BF', ''), 10));
      expect(digitIds).toEqual([3, 2, 1, 2, 3, 4, 5, 4]);
    });
  });

  describe('WALK_HAND_FRAMES — direction mapping', () => {
    it('has 8 rotation steps with 8 frames each', () => {
      expect(WALK_HAND_FRAMES).toHaveLength(8);
      WALK_HAND_FRAMES.forEach(step => {
        expect(step).toHaveLength(8);
      });
    });

    it('each frame has exactly 2 hands', () => {
      WALK_HAND_FRAMES.forEach(step => {
        step.forEach(pair => {
          expect(pair).toHaveLength(2);
        });
      });
    });

    it('pattern A hands: RF behind, LF in front (reversed)', () => {
      WALK_HAND_FRAMES[0].forEach(pair => {
        expect(pair[0].id).toMatch(/^RF/);
        expect(pair[1].id).toMatch(/^LF/);
        expect(pair[0].reversed).toBe(true);
        expect(pair[1].reversed).toBe(true);
      });
    });

    it('pattern B hands: RF behind, LF in front (not reversed)', () => {
      WALK_HAND_FRAMES[1].forEach(pair => {
        expect(pair[0].id).toMatch(/^RF/);
        expect(pair[1].id).toMatch(/^LF/);
        expect(pair[0].reversed).toBe(false);
        expect(pair[1].reversed).toBe(false);
      });
    });

    it('pattern C hands: LB behind-position, RB front-position (not reversed)', () => {
      WALK_HAND_FRAMES[3].forEach(pair => {
        expect(pair[0].id).toMatch(/^LB/);
        expect(pair[1].id).toMatch(/^RB/);
        expect(pair[0].reversed).toBe(false);
      });
    });

    it('pattern D hands: LB behind-position, RB front-position (reversed)', () => {
      WALK_HAND_FRAMES[5].forEach(pair => {
        expect(pair[0].id).toMatch(/^LB/);
        expect(pair[1].id).toMatch(/^RB/);
        expect(pair[0].reversed).toBe(true);
      });
    });
  });

  describe('idle guards use State enum, not string literals', () => {
    const groupDir = path.resolve(
      new URL('.', import.meta.url).pathname,
      '../three-isometric-engine/meshes/character-groups'
    );
    const groupFiles = fs.readdirSync(groupDir)
      .filter(f => f.startsWith('group-') && f.endsWith('.js'));

    it('no group file contains raw FALLING or SPAWNING string comparison', () => {
      const violations = [];
      for (const file of groupFiles) {
        const src = fs.readFileSync(path.join(groupDir, file), 'utf8');
        if (/=== *'FALLING'/.test(src) || /=== *'SPAWNING'/.test(src)) {
          violations.push(file);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('FLINCH_FRAMES — direction mapping', () => {
    it('has 8 rotation steps', () => {
      expect(FLINCH_FRAMES).toHaveLength(8);
    });

    it('each frame has top and bottom sprite IDs', () => {
      FLINCH_FRAMES.forEach(frame => {
        expect(frame).toHaveProperty('top');
        expect(frame).toHaveProperty('bottom');
        expect(frame).toHaveProperty('reversed');
      });
    });

    it('steps 0, 7 use pattern A (DF front, reversed)', () => {
      for (const step of [0, 7]) {
        expect(FLINCH_FRAMES[step].top).toBe('DF1');
        expect(FLINCH_FRAMES[step].bottom).toBe('DF2');
        expect(FLINCH_FRAMES[step].reversed).toBe(true);
      }
    });

    it('steps 1, 2 use pattern B (DF front, not reversed)', () => {
      for (const step of [1, 2]) {
        expect(FLINCH_FRAMES[step].top).toBe('DF1');
        expect(FLINCH_FRAMES[step].bottom).toBe('DF2');
        expect(FLINCH_FRAMES[step].reversed).toBe(false);
      }
    });

    it('steps 3, 4 use pattern C (DB back, not reversed)', () => {
      for (const step of [3, 4]) {
        expect(FLINCH_FRAMES[step].top).toBe('DB1');
        expect(FLINCH_FRAMES[step].bottom).toBe('DB2');
        expect(FLINCH_FRAMES[step].reversed).toBe(false);
      }
    });

    it('steps 5, 6 use pattern D (DB back, reversed)', () => {
      for (const step of [5, 6]) {
        expect(FLINCH_FRAMES[step].top).toBe('DB1');
        expect(FLINCH_FRAMES[step].bottom).toBe('DB2');
        expect(FLINCH_FRAMES[step].reversed).toBe(true);
      }
    });

    it('A/D share front sprites (DF), B/C share back sprites (DB) — correct reversal symmetry', () => {
      expect(FLINCH_FRAMES[0].reversed).toBe(!FLINCH_FRAMES[1].reversed);
      expect(FLINCH_FRAMES[5].reversed).toBe(!FLINCH_FRAMES[3].reversed);
    });
  });
});
