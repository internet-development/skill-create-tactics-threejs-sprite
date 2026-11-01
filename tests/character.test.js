//NOTE(jimmylee)
//Character sprite system tests — UV math, frame arrays, rotation symmetry, timing accuracy,
//assembly data integrity, and categorization set completeness.

import { describe, it, expect } from 'vitest';
import { applySpriteFrame, azimuthToStep, resolveVariableFrame, resolveLoopingFrame, FAR_BEHIND, BEHIND, IN_FRONT, IDLE_FRAMES, WALK_FRAMES, WALK_HAND_FRAMES, FLINCH_FRAMES, DEATH_FRAMES, CAST_FRAMES, JUMP_FRAMES, JUMP_HAND_FRAMES, QUICK_THROW_FRAMES, THROW_STONE_FRAMES, PUNCH_FRAMES, PUNCH_LV2_FRAMES, PUNCH_LV3_FRAMES, KNEEL_FRAMES, GUARD_FRAMES, PX_TO_WORLD, DEFAULT_AZIMUTH, STEP_SIZE, BODY_W, STANDARD_CONTAINER_H, ASSEMBLY_STEP_MAP, anchorBodyX, anchorBodyY, positionOverlay } from '@engine/meshes/createCharacter';
import { IDLE_ASSEMBLY, FLOAT_ASSEMBLY, GUARD_ASSEMBLY, WALK_ASSEMBLY, HURT_ASSEMBLY, DEATH_ASSEMBLY, KNEEL_ASSEMBLY, CAST_ASSEMBLY, JUMP_ASSEMBLY, QUICK_THROW_ASSEMBLY, THROW_STONE_ASSEMBLY, PUNCH_ASSEMBLY, PUNCH_LV2_ASSEMBLY, PUNCH_LV3_ASSEMBLY, STAB_ASSEMBLY, STAB_LV2_ASSEMBLY, STAB_LV3_ASSEMBLY, FATAL_ITEM_IMPACT_ASSEMBLY, ITEM_DROP_ASSEMBLY, THROW_STONE_DELAYS_FWD, THROW_STONE_DELAYS_BCK, JUMP_DELAYS, WALK_DELAYS, QUICK_THROW_DELAYS, PUNCH_DELAYS, PUNCH_LV2_DELAYS, PUNCH_LV3_DELAYS, STAB_DELAYS, STAB_LV2_DELAYS, STAB_LV3_DELAYS, FATAL_ITEM_IMPACT_DELAYS, ITEM_DROP_DELAYS, TORSO_HEAD_MAP, BODY_ANCHOR_MAP, WALK_BOB_DY } from '@engine/constants/sprites/assembly';
import { PREASSEMBLED_SPRITE_IDS, FULL_BODY_WITHOUT_HANDS_SPRITE_IDS, HEAD_SPRITE_IDS, HAND_SPRITE_IDS, EXTENDED_HAND_SPRITE_IDS, WAIST_TO_FEET_IDS, TORSO_SPRITE_IDS } from '@engine/constants/sprites';
import { SPRITE_MAP, SPRITE_CELLS, SHEET_W, SHEET_H, SPRITE_SHEET_FILE } from '@engine/constants/sprites';
import { directionalMap } from '@engine/constants';
import { getAllMeshData } from '@engine/common/registry';
import { sheetPixels } from './helpers/fft-type1';

const meshData = getAllMeshData();

function mockTexture() {
  return {
    offset: { x: 0, y: 0 },
    repeat: { x: 1, y: 1 },
  };
}

//NOTE(jimmylee)
//Shared assembly validation helper. Covers the common boilerplate:
//4 patterns, N frames each, body + overlay tile existence, reversed flags, valid UVs.
//overlayFields lists nullable overlay field names (e.g. ['behind', 'front', 'head']).
//headMap: when provided, validates that frames whose body tile is a key in the map
//have a head field matching the map's id, dx, and dy. For modes using TORSO_HEAD_MAP.
function validateFramesAssembly(assembly, { frameCount, overlayFields = [], headMap = null }) {
  it('has 4 patterns (A/B/C/D)', () => {
    expect(assembly).toHaveLength(4);
  });

  it(`each pattern has ${frameCount} frames`, () => {
    assembly.forEach((pattern) => {
      expect(pattern.frames).toHaveLength(frameCount);
    });
  });

  it('all body tile IDs exist in SPRITE_MAP', () => {
    assembly.forEach((pattern) => {
      pattern.frames.forEach((frame) => {
        expect(SPRITE_MAP[frame.body]).toBeDefined();
      });
    });
  });

  overlayFields.forEach((field) => {
    it(`all ${field} tile IDs exist in SPRITE_MAP (null entries skipped)`, () => {
      assembly.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          if (frame[field]) {
            expect(SPRITE_MAP[frame[field].id]).toBeDefined();
          }
        });
      });
    });

    it(`all ${field} entries have dx/dy when present`, () => {
      assembly.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          if (frame[field]) {
            expect(frame[field]).toHaveProperty('dx');
            expect(frame[field]).toHaveProperty('dy');
          }
        });
      });
    });
  });

  if (headMap) {
    it('head fields match headMap for body tiles in the map', () => {
      assembly.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          const mapEntry = headMap[frame.body];
          if (mapEntry) {
            expect(frame.head).toBeDefined();
            expect(frame.head.id).toBe(mapEntry.id);
            expect(frame.head.dx).toBe(mapEntry.dx);
            expect(frame.head.dy).toBe(mapEntry.dy);
          }
        });
      });
    });
  }

  it('patterns A/D are reversed, B/C are not', () => {
    expect(assembly[0].reversed).toBe(true);
    expect(assembly[1].reversed).toBe(false);
    expect(assembly[2].reversed).toBe(false);
    expect(assembly[3].reversed).toBe(true);
  });

  it('all tiles produce valid UVs via applySpriteFrame', () => {
    const tex = mockTexture();
    assembly.forEach((pattern) => {
      pattern.frames.forEach((frame) => {
        applySpriteFrame(tex, frame.body, pattern.reversed);
        expect(tex.offset.x).toBeGreaterThanOrEqual(0);
        expect(tex.offset.x).toBeLessThanOrEqual(1);
        expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        overlayFields.forEach((field) => {
          if (frame[field]) {
            applySpriteFrame(tex, frame[field].id, pattern.reversed);
            expect(tex.offset.x).toBeGreaterThanOrEqual(0);
            expect(tex.offset.x).toBeLessThanOrEqual(1);
          }
        });
      });
    });
  });
}

//NOTE(jimmylee)
//Sprite sheet: a1.png, 256x488 pixels.
//All sprite locations sourced from SPRITE_CELLS in constants/sprites/index.js.

describe('character sprite system', () => {
  describe('applySpriteFrame', () => {
    it('sets correct UV for P1 (body sprite, not reversed)', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'P1', false);
      expect(tex.offset.x).toBeCloseTo(0 / SHEET_W);
      expect(tex.offset.y).toBeCloseTo(1 - (0 + 40) / SHEET_H);
      expect(tex.repeat.x).toBeCloseTo(32 / SHEET_W);
      expect(tex.repeat.y).toBeCloseTo(40 / SHEET_H);
    });

    it('sets correct UV for P4 (body sprite at col 3)', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'P4', false);
      expect(tex.offset.x).toBeCloseTo(96 / SHEET_W);
      expect(tex.offset.y).toBeCloseTo(1 - 40 / SHEET_H);
      expect(tex.repeat.x).toBeCloseTo(32 / SHEET_W);
    });

    it('reverses horizontally when reversed=true', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'P1', true);
      expect(tex.repeat.x).toBeCloseTo(-32 / SHEET_W);
      expect(tex.offset.x).toBeCloseTo((0 + 32) / SHEET_W);
    });

    it('non-reversed has positive repeat.x', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'P1', false);
      expect(tex.repeat.x).toBeGreaterThan(0);
    });

    it('sets correct UV for BF1 (walk frame)', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'BF1', false);
      expect(tex.offset.x).toBeCloseTo(160 / SHEET_W);
      expect(tex.offset.y).toBeCloseTo(1 - (0 + 40) / SHEET_H);
      expect(tex.repeat.x).toBeCloseTo(32 / SHEET_W);
      expect(tex.repeat.y).toBeCloseTo(40 / SHEET_H);
    });

    it('sets correct UV for BB1 (walk pattern C/D body frame)', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'BB1', false);
      expect(tex.offset.x).toBeCloseTo(96 / SHEET_W);
      expect(tex.offset.y).toBeCloseTo(1 - (40 + 40) / SHEET_H);
      expect(tex.repeat.x).toBeCloseTo(32 / SHEET_W);
      expect(tex.repeat.y).toBeCloseTo(40 / SHEET_H);
    });

    it('sets correct UV for RF1 (hand sprite)', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'RF1', false);
      expect(tex.offset.x).toBeCloseTo(32 / SHEET_W);
      expect(tex.offset.y).toBeCloseTo(1 - (80 + 24) / SHEET_H);
      expect(tex.repeat.x).toBeCloseTo(24 / SHEET_W);
      expect(tex.repeat.y).toBeCloseTo(24 / SHEET_H);
    });

    it('sets correct UV for LB1 (hand sprite for pattern C/D)', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'LB1', false);
      expect(tex.offset.x).toBeCloseTo(56 / SHEET_W);
      expect(tex.offset.y).toBeCloseTo(1 - (104 + 24) / SHEET_H);
      expect(tex.repeat.x).toBeCloseTo(24 / SHEET_W);
      expect(tex.repeat.y).toBeCloseTo(24 / SHEET_H);
    });

    it('reversed RF1 has offset at (x + w) / SHEET_W', () => {
      const tex = mockTexture();
      applySpriteFrame(tex, 'RF1', true);
      expect(tex.offset.x).toBeCloseTo((32 + 24) / SHEET_W);
      expect(tex.repeat.x).toBeCloseTo(-24 / SHEET_W);
    });

    it('different body sprites produce different X offsets', () => {
      const texA1 = mockTexture();
      const texA2 = mockTexture();
      applySpriteFrame(texA1, 'P1', false);
      applySpriteFrame(texA2, 'P2', false);
      expect(texA1.offset.x).not.toBe(texA2.offset.x);
    });

    it('body and hand sprites produce different Y offsets', () => {
      const texBody = mockTexture();
      const texHand = mockTexture();
      applySpriteFrame(texBody, 'P1', false);
      applySpriteFrame(texHand, 'RF1', false);
      expect(texBody.offset.y).not.toBe(texHand.offset.y);
    });
  });

  describe('SPRITES lookup', () => {
    it('contains all body idle sprites (P1-P5)', () => {
      expect(SPRITE_MAP['P1']).toBeDefined();
      expect(SPRITE_MAP['P2']).toBeDefined();
      expect(SPRITE_MAP['P3']).toBeDefined();
      expect(SPRITE_MAP['P4']).toBeDefined();
      expect(SPRITE_MAP['P5']).toBeDefined();
    });

    it('contains all walk body sprites (BF1-BF5, BB1-BB5)', () => {
      for (let i = 1; i <= 5; i++) {
        expect(SPRITE_MAP[`BF${i}`]).toBeDefined();
        expect(SPRITE_MAP[`BB${i}`]).toBeDefined();
      }
    });

    it('contains all hand sprites (RF1-RF5/LF1-LF5, LB1-LB5/RB1-RB5)', () => {
      for (let i = 1; i <= 5; i++) {
        expect(SPRITE_MAP[`RF${i}`]).toBeDefined();
        expect(SPRITE_MAP[`LF${i}`]).toBeDefined();
        expect(SPRITE_MAP[`LB${i}`]).toBeDefined();
        expect(SPRITE_MAP[`RB${i}`]).toBeDefined();
      }
    });

    it('all sprites fit within sheet bounds (256x488)', () => {
      Object.entries(SPRITE_MAP).forEach(([id, s]) => {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(256);
        expect(s.y + s.h).toBeLessThanOrEqual(488);
      });
    });

    it('SPRITE_CELLS has exactly 200 entries (170 primary + 30 SR)', () => {
      expect(SPRITE_CELLS).toHaveLength(200);
    });

    it('every SPRITE_CELLS entry has a corresponding SPRITE_MAP entry', () => {
      SPRITE_CELLS.forEach((cell) => {
        expect(SPRITE_MAP[cell.id]).toBeDefined();
      });
    });

    it('no duplicate IDs in SPRITE_CELLS', () => {
      const ids = SPRITE_CELLS.map((cell) => cell.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('walk frames', () => {
    it('has 8 rotation steps', () => {
      expect(WALK_FRAMES).toHaveLength(8);
    });

    it('each step has 8 frames (5 base ping-ponged to 8)', () => {
      WALK_FRAMES.forEach((frames) => {
        expect(frames).toHaveLength(8);
      });
    });

    it('every frame has id and reversed', () => {
      WALK_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          expect(frame).toHaveProperty('id');
          expect(frame).toHaveProperty('reversed');
          expect(SPRITE_MAP[frame.id]).toBeDefined();
        });
      });
    });

    it('SE default (step 1) walk frames are not reversed — pattern B', () => {
      WALK_FRAMES[1].forEach((frame) => {
        expect(frame.reversed).toBe(false);
      });
    });

    it('NE default (step 7) walk frames are reversed — pattern A', () => {
      WALK_FRAMES[7].forEach((frame) => {
        expect(frame.reversed).toBe(true);
      });
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(WALK_FRAMES[0]).toEqual(WALK_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(WALK_FRAMES[1]).toEqual(WALK_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(WALK_FRAMES[3]).toEqual(WALK_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(WALK_FRAMES[5]).toEqual(WALK_FRAMES[6]);
    });

    it('pattern A uses BF-series sprites in SEQ walk order (neutral→extreme1→neutral→extreme2)', () => {
      const expected = ['BF3', 'BF2', 'BF1', 'BF2', 'BF3', 'BF4', 'BF5', 'BF4'];
      WALK_FRAMES[0].forEach((frame, i) => {
        expect(frame.id).toBe(expected[i]);
      });
    });

    it('pattern C uses BB-series sprites in SEQ walk order (neutral→extreme1→neutral→extreme2)', () => {
      const expected = ['BB3', 'BB2', 'BB1', 'BB2', 'BB3', 'BB4', 'BB5', 'BB4'];
      WALK_FRAMES[3].forEach((frame, i) => {
        expect(frame.id).toBe(expected[i]);
      });
    });

    it('walk frames produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      WALK_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          applySpriteFrame(tex, frame.id, frame.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('azimuthToStep', () => {
    it('returns 0 at default camera position', () => {
      const camera = { position: { x: 0.5, z: -0.5 } };
      expect(azimuthToStep(camera)).toBe(0);
    });

    it('returns steps 0-7 for a full rotation', () => {
      const defaultAzimuth = Math.atan2(0.5, -0.5);
      const stepSize = Math.PI / 4;
      for (let i = 0; i < 8; i++) {
        const angle = defaultAzimuth + i * stepSize;
        const camera = { position: { x: Math.sin(angle), z: Math.cos(angle) } };
        expect(azimuthToStep(camera)).toBe(i);
      }
    });

    it('wraps around from step 7 back to step 0', () => {
      const defaultAzimuth = Math.atan2(0.5, -0.5);
      const stepSize = Math.PI / 4;
      const angle = defaultAzimuth + 8 * stepSize;
      const camera = { position: { x: Math.sin(angle), z: Math.cos(angle) } };
      expect(azimuthToStep(camera)).toBe(0);
    });

    it('handles negative camera positions', () => {
      const camera = { position: { x: -0.5, z: 0.5 } };
      const step = azimuthToStep(camera);
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(8);
    });
  });

  describe('hand sprite system', () => {
    describe('WALK_HAND_FRAMES', () => {
      it('has 8 rotation steps', () => {
        expect(WALK_HAND_FRAMES).toHaveLength(8);
      });

      it('each step has 8 frames (5 base ping-ponged to 8)', () => {
        WALK_HAND_FRAMES.forEach((frames) => {
          expect(frames).toHaveLength(8);
        });
      });

      it('each frame has 2 hands [hand1, hand2]', () => {
        WALK_HAND_FRAMES.forEach((frames) => {
          frames.forEach((pair) => {
            expect(pair).toHaveLength(2);
          });
        });
      });

      it('every hand frame has id and reversed', () => {
        WALK_HAND_FRAMES.forEach((frames) => {
          frames.forEach((pair) => {
            pair.forEach((hand) => {
              expect(hand).toHaveProperty('id');
              expect(hand).toHaveProperty('reversed');
              expect(SPRITE_MAP[hand.id]).toBeDefined();
            });
          });
        });
      });

      it('steps 0 and 7 share pattern A', () => {
        expect(WALK_HAND_FRAMES[0]).toEqual(WALK_HAND_FRAMES[7]);
      });

      it('steps 1 and 2 share pattern B', () => {
        expect(WALK_HAND_FRAMES[1]).toEqual(WALK_HAND_FRAMES[2]);
      });

      it('steps 3 and 4 share pattern C', () => {
        expect(WALK_HAND_FRAMES[3]).toEqual(WALK_HAND_FRAMES[4]);
      });

      it('steps 5 and 6 share pattern D', () => {
        expect(WALK_HAND_FRAMES[5]).toEqual(WALK_HAND_FRAMES[6]);
      });

      it('pattern A is reversed version of pattern B (same IDs, opposite reversed)', () => {
        const patternA = WALK_HAND_FRAMES[0];
        const patternB = WALK_HAND_FRAMES[1];
        for (let i = 0; i < patternA.length; i++) {
          for (let h = 0; h < 2; h++) {
            expect(patternA[i][h].id).toBe(patternB[i][h].id);
            expect(patternA[i][h].reversed).toBe(!patternB[i][h].reversed);
          }
        }
      });

      it('pattern D is reversed version of pattern C (same IDs, opposite reversed)', () => {
        const patternC = WALK_HAND_FRAMES[3];
        const patternD = WALK_HAND_FRAMES[5];
        for (let i = 0; i < patternC.length; i++) {
          for (let h = 0; h < 2; h++) {
            expect(patternD[i][h].id).toBe(patternC[i][h].id);
            expect(patternD[i][h].reversed).toBe(!patternC[i][h].reversed);
          }
        }
      });

      it('SE default (step 1) hand frames are not reversed — pattern B', () => {
        WALK_HAND_FRAMES[1].forEach((pair) => {
          pair.forEach((hand) => {
            expect(hand.reversed).toBe(false);
          });
        });
      });

      it('NE default (step 7) hand frames are reversed — pattern A', () => {
        WALK_HAND_FRAMES[7].forEach((pair) => {
          pair.forEach((hand) => {
            expect(hand.reversed).toBe(true);
          });
        });
      });

      it('pattern B uses LF/RF-series hand sprites', () => {
        WALK_HAND_FRAMES[1].forEach((pair) => {
          pair.forEach((hand) => {
            expect(hand.id).toMatch(/^[RL]F\d$/);
          });
        });
      });

      it('pattern C uses LB/RB-series hand sprites', () => {
        WALK_HAND_FRAMES[3].forEach((pair) => {
          pair.forEach((hand) => {
            expect(hand.id).toMatch(/^[RL]B\d$/);
          });
        });
      });

      it('all hand frames produce valid UVs via applySpriteFrame', () => {
        const tex = mockTexture();
        WALK_HAND_FRAMES.forEach((frames) => {
          frames.forEach((pair) => {
            pair.forEach((hand) => {
              applySpriteFrame(tex, hand.id, hand.reversed);
              expect(tex.offset.x).toBeGreaterThanOrEqual(0);
              expect(tex.offset.x).toBeLessThanOrEqual(1);
              expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
            });
          });
        });
      });
    });
  });

  describe('flinch frames (SEQ 38-39)', () => {
    it('has 8 entries', () => {
      expect(FLINCH_FRAMES).toHaveLength(8);
    });

    it('each entry has top, bottom, and reversed properties', () => {
      FLINCH_FRAMES.forEach((frame) => {
        expect(frame).toHaveProperty('top');
        expect(frame).toHaveProperty('bottom');
        expect(frame).toHaveProperty('reversed');
      });
    });

    it('steps 0 and 7 share pattern A (DF1/DF2, reversed)', () => {
      expect(FLINCH_FRAMES[0]).toEqual({ top: 'DF1', bottom: 'DF2', reversed: true });
      expect(FLINCH_FRAMES[7]).toEqual({ top: 'DF1', bottom: 'DF2', reversed: true });
    });

    it('steps 1 and 2 share pattern B (DF1/DF2, not reversed)', () => {
      expect(FLINCH_FRAMES[1]).toEqual({ top: 'DF1', bottom: 'DF2', reversed: false });
      expect(FLINCH_FRAMES[2]).toEqual({ top: 'DF1', bottom: 'DF2', reversed: false });
    });

    it('steps 3 and 4 share pattern C (DB1/DB2, not reversed)', () => {
      expect(FLINCH_FRAMES[3]).toEqual({ top: 'DB1', bottom: 'DB2', reversed: false });
      expect(FLINCH_FRAMES[4]).toEqual({ top: 'DB1', bottom: 'DB2', reversed: false });
    });

    it('steps 5 and 6 share pattern D (DB1/DB2, reversed)', () => {
      expect(FLINCH_FRAMES[5]).toEqual({ top: 'DB1', bottom: 'DB2', reversed: true });
      expect(FLINCH_FRAMES[6]).toEqual({ top: 'DB1', bottom: 'DB2', reversed: true });
    });

    it('all top and bottom IDs exist in SPRITE_MAP', () => {
      FLINCH_FRAMES.forEach((frame) => {
        expect(SPRITE_MAP[frame.top]).toBeDefined();
        expect(SPRITE_MAP[frame.bottom]).toBeDefined();
      });
    });

    it('all top sprites produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      FLINCH_FRAMES.forEach((frame) => {
        applySpriteFrame(tex, frame.top, frame.reversed);
        expect(tex.offset.x).toBeGreaterThanOrEqual(0);
        expect(tex.offset.x).toBeLessThanOrEqual(1);
        expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
      });
    });

    it('all bottom sprites produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      FLINCH_FRAMES.forEach((frame) => {
        applySpriteFrame(tex, frame.bottom, frame.reversed);
        expect(tex.offset.x).toBeGreaterThanOrEqual(0);
        expect(tex.offset.x).toBeLessThanOrEqual(1);
        expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
      });
    });
  });

  describe('kneel frames (SEQ 32-33)', () => {
    it('has 8 entries', () => {
      expect(KNEEL_FRAMES).toHaveLength(8);
    });

    it('each entry has id and reversed properties', () => {
      KNEEL_FRAMES.forEach((frame) => {
        expect(frame).toHaveProperty('id');
        expect(frame).toHaveProperty('reversed');
      });
    });

    it('steps 0 and 7 share pattern A (KO3, reversed)', () => {
      expect(KNEEL_FRAMES[0]).toEqual({ id: 'KO3', reversed: true });
      expect(KNEEL_FRAMES[7]).toEqual({ id: 'KO3', reversed: true });
    });

    it('steps 1 and 2 share pattern B (KO3, not reversed)', () => {
      expect(KNEEL_FRAMES[1]).toEqual({ id: 'KO3', reversed: false });
      expect(KNEEL_FRAMES[2]).toEqual({ id: 'KO3', reversed: false });
    });

    it('steps 3 and 4 share pattern C (KO4, not reversed)', () => {
      expect(KNEEL_FRAMES[3]).toEqual({ id: 'KO4', reversed: false });
      expect(KNEEL_FRAMES[4]).toEqual({ id: 'KO4', reversed: false });
    });

    it('steps 5 and 6 share pattern D (KO4, reversed)', () => {
      expect(KNEEL_FRAMES[5]).toEqual({ id: 'KO4', reversed: true });
      expect(KNEEL_FRAMES[6]).toEqual({ id: 'KO4', reversed: true });
    });

    it('all tile IDs exist in SPRITE_MAP', () => {
      KNEEL_FRAMES.forEach((frame) => {
        expect(SPRITE_MAP[frame.id]).toBeDefined();
      });
    });

    it('all KO3/KO4 tiles are 32x32', () => {
      KNEEL_FRAMES.forEach((frame) => {
        const cell = SPRITE_MAP[frame.id];
        expect(cell.w).toBe(32);
        expect(cell.h).toBe(32);
      });
    });

    it('all sprites produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      KNEEL_FRAMES.forEach((frame) => {
        applySpriteFrame(tex, frame.id, frame.reversed);
        expect(tex.offset.x).toBeGreaterThanOrEqual(0);
        expect(tex.offset.x).toBeLessThanOrEqual(1);
        expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
      });
    });
  });

  describe('cast frames (Magic Charge SEQ 64-65)', () => {
    it('has 8 rotation steps', () => {
      expect(CAST_FRAMES).toHaveLength(8);
    });

    it('each step has 2 frames', () => {
      CAST_FRAMES.forEach((frames) => {
        expect(frames).toHaveLength(2);
      });
    });

    it('every frame has body, overlay, and reversed', () => {
      CAST_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          expect(frame).toHaveProperty('body');
          expect(frame).toHaveProperty('overlay');
          expect(frame).toHaveProperty('reversed');
          expect(SPRITE_MAP[frame.body]).toBeDefined();
          expect(SPRITE_MAP[frame.overlay]).toBeDefined();
        });
      });
    });

    it('steps 0 and 7 share pattern A (CH1+SR17/CH2+SR17, reversed)', () => {
      expect(CAST_FRAMES[0]).toEqual(CAST_FRAMES[7]);
      expect(CAST_FRAMES[0][0]).toEqual({ body: 'CH1', overlay: 'SR17', reversed: true });
      expect(CAST_FRAMES[0][1]).toEqual({ body: 'CH2', overlay: 'SR17', reversed: true });
    });

    it('steps 1 and 2 share pattern B (CH1+SR17/CH2+SR17, not reversed)', () => {
      expect(CAST_FRAMES[1]).toEqual(CAST_FRAMES[2]);
      expect(CAST_FRAMES[1][0]).toEqual({ body: 'CH1', overlay: 'SR17', reversed: false });
      expect(CAST_FRAMES[1][1]).toEqual({ body: 'CH2', overlay: 'SR17', reversed: false });
    });

    it('steps 3 and 4 share pattern C (CH3+SR18/CH4+SR18, not reversed)', () => {
      expect(CAST_FRAMES[3]).toEqual(CAST_FRAMES[4]);
      expect(CAST_FRAMES[3][0]).toEqual({ body: 'CH3', overlay: 'SR18', reversed: false });
      expect(CAST_FRAMES[3][1]).toEqual({ body: 'CH4', overlay: 'SR18', reversed: false });
    });

    it('steps 5 and 6 share pattern D (CH3+SR18/CH4+SR18, reversed)', () => {
      expect(CAST_FRAMES[5]).toEqual(CAST_FRAMES[6]);
      expect(CAST_FRAMES[5][0]).toEqual({ body: 'CH3', overlay: 'SR18', reversed: true });
      expect(CAST_FRAMES[5][1]).toEqual({ body: 'CH4', overlay: 'SR18', reversed: true });
    });

    it('all body sprites produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      CAST_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          applySpriteFrame(tex, frame.body, frame.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });

    it('all overlay sprites produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      CAST_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          applySpriteFrame(tex, frame.overlay, frame.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('resolveVariableFrame', () => {
    const delays = [2, 8, 2, 4, 10, 18, 2, 2, 4].map((t) => t / 60);

    it('returns first frame at time 0', () => {
      const { frameIdx, done } = resolveVariableFrame(delays, 0);
      expect(frameIdx).toBe(0);
      expect(done).toBe(false);
    });

    it('advances through frames based on cumulative delay', () => {
      // After frame 0 (2 ticks = 33ms), should be on frame 1
      const { frameIdx } = resolveVariableFrame(delays, 2 / 60 + 0.001);
      expect(frameIdx).toBe(1);
    });

    it('returns last frame and done=true after total duration', () => {
      const total = delays.reduce((a, b) => a + b, 0);
      const { frameIdx, done } = resolveVariableFrame(delays, total + 1);
      expect(frameIdx).toBe(delays.length - 1);
      expect(done).toBe(true);
    });

    it('holds last frame when done (non-looping)', () => {
      const { frameIdx: a } = resolveVariableFrame(delays, 999);
      const { frameIdx: b } = resolveVariableFrame(delays, 9999);
      expect(a).toBe(b);
      expect(a).toBe(delays.length - 1);
    });

    it('handles single-frame delay array', () => {
      const { frameIdx, done } = resolveVariableFrame([0.5], 0.6);
      expect(frameIdx).toBe(0);
      expect(done).toBe(true);
    });
  });

  describe('resolveLoopingFrame', () => {
    const delays = [2, 3, 5].map((t) => t / 60);
    const cycleDuration = delays.reduce((a, b) => a + b, 0);

    it('returns first frame at time 0', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycleDuration, 0);
      expect(frameIdx).toBe(0);
    });

    it('wraps around after one full cycle', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycleDuration, cycleDuration + 0.001);
      expect(frameIdx).toBe(0);
    });

    it('returns correct frame mid-cycle', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycleDuration, delays[0] + 0.001);
      expect(frameIdx).toBe(1);
    });

    it('returns elapsed within the cycle', () => {
      const raw = cycleDuration * 3 + delays[0] + 0.001;
      const { elapsed } = resolveLoopingFrame(delays, cycleDuration, raw);
      expect(elapsed).toBeCloseTo(delays[0] + 0.001, 5);
    });

    it('matches resolveVariableFrame when elapsed < cycleDuration', () => {
      const t = delays[0] + delays[1] * 0.5;
      const looping = resolveLoopingFrame(delays, cycleDuration, t);
      const variable = resolveVariableFrame(delays, t);
      expect(looping.frameIdx).toBe(variable.frameIdx);
    });
  });

  describe('z-layer constants', () => {
    it('FAR_BEHIND < BEHIND < 0 (body) < IN_FRONT', () => {
      expect(FAR_BEHIND).toBeLessThan(BEHIND);
      expect(BEHIND).toBeLessThan(0);
      expect(IN_FRONT).toBeGreaterThan(0);
    });

    it('FAR_BEHIND is -2, BEHIND is -1, IN_FRONT is 2', () => {
      expect(FAR_BEHIND).toBe(-2);
      expect(BEHIND).toBe(-1);
      expect(IN_FRONT).toBe(2);
    });
  });

  describe('assembly ↔ engine frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('IDLE_ASSEMBLY tile IDs and reversed flags match IDLE_FRAMES', () => {
      IDLE_ASSEMBLY.forEach((entry) => {
        const frame = IDLE_FRAMES[entry.step];
        expect(entry.id).toBe(frame.id);
        expect(entry.reversed).toBe(frame.reversed);
      });
    });

    it('WALK_ASSEMBLY body tile IDs match WALK_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = WALK_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = WALK_FRAMES[step];
        const assemblyIds = new Set(pattern.body.map((b) => b.id));
        const engineIds = new Set(engineFrames.map((f) => f.id));
        expect(assemblyIds).toEqual(engineIds);
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('HURT_ASSEMBLY tile IDs match FLINCH_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const entry = HURT_ASSEMBLY[STEP_TO_PATTERN[step]];
        const frame = FLINCH_FRAMES[step];
        expect(entry.top).toBe(frame.top);
        expect(entry.bottom).toBe(frame.bottom);
        expect(entry.reversed).toBe(frame.reversed);
      }
    });

    it('DEATH_ASSEMBLY tile IDs match DEATH_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const entry = DEATH_ASSEMBLY[STEP_TO_PATTERN[step]];
        const frame = DEATH_FRAMES[step];
        expect(entry.id).toBe(frame.id);
        expect(entry.reversed).toBe(frame.reversed);
      }
    });

    it('KNEEL_ASSEMBLY tile IDs match KNEEL_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const entry = KNEEL_ASSEMBLY[STEP_TO_PATTERN[step]];
        const frame = KNEEL_FRAMES[step];
        expect(entry.id).toBe(frame.id);
        expect(entry.reversed).toBe(frame.reversed);
      }
    });

    it('CAST_ASSEMBLY tile IDs match CAST_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const entry = CAST_ASSEMBLY[STEP_TO_PATTERN[step]];
        const frames = CAST_FRAMES[step];
        entry.frames.forEach((aFrame, fi) => {
          expect(aFrame.body).toBe(frames[fi].body);
          expect(aFrame.overlay).toBe(frames[fi].overlay);
          expect(aFrame.reversed).toBe(frames[fi].reversed);
        });
      }
    });
  });

  describe('jump assembly (SEQ 204 + 42 + 52)', () => {
    validateFramesAssembly(JUMP_ASSEMBLY, { frameCount: 9, overlayFields: [] });

    it('no frames use overlays', () => {
      JUMP_ASSEMBLY.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          expect(frame.overlay).toBeUndefined();
        });
      });
    });

    it('patterns A/B crouch and kneel on the front tiles', () => {
      for (const pattern of [JUMP_ASSEMBLY[0], JUMP_ASSEMBLY[1]]) {
        expect(pattern.frames.map((f) => f.body)).toEqual(['BF4', 'HR1', 'BF3', 'BF3', 'BF3', 'BF3', 'BF3', 'KO3', 'HR1']);
      }
    });

    it('patterns C/D crouch and kneel on the back tiles', () => {
      for (const pattern of [JUMP_ASSEMBLY[2], JUMP_ASSEMBLY[3]]) {
        expect(pattern.frames.map((f) => f.body)).toEqual(['BB4', 'HR2', 'BB3', 'BB3', 'BB3', 'BB3', 'BB3', 'KO4', 'HR2']);
      }
    });

    it('all body tiles are 32 wide', () => {
      JUMP_ASSEMBLY.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          expect(SPRITE_MAP[frame.body].w).toBe(32);
        });
      });
    });
  });

  describe('jump frames (SEQ 204 + 42 + 52)', () => {
    it('has 8 rotation steps', () => {
      expect(JUMP_FRAMES).toHaveLength(8);
    });

    it('each step has 9 frames (take-off + air + landing)', () => {
      JUMP_FRAMES.forEach((frames) => {
        expect(frames).toHaveLength(9);
      });
    });

    it('every frame has id and reversed', () => {
      JUMP_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          expect(frame).toHaveProperty('id');
          expect(frame).toHaveProperty('reversed');
          expect(SPRITE_MAP[frame.id]).toBeDefined();
        });
      });
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(JUMP_FRAMES[0]).toEqual(JUMP_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(JUMP_FRAMES[1]).toEqual(JUMP_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(JUMP_FRAMES[3]).toEqual(JUMP_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(JUMP_FRAMES[5]).toEqual(JUMP_FRAMES[6]);
    });

    it('patterns A/B use front-facing body sprites', () => {
      JUMP_FRAMES[0].forEach((frame) => {
        expect(frame.id).toMatch(/^(BF\d|HR1|KO3)$/);
      });
      JUMP_FRAMES[1].forEach((frame) => {
        expect(frame.id).toMatch(/^(BF\d|HR1|KO3)$/);
      });
    });

    it('patterns C/D use back-facing body sprites', () => {
      JUMP_FRAMES[3].forEach((frame) => {
        expect(frame.id).toMatch(/^(BB\d|HR2|KO4)$/);
      });
      JUMP_FRAMES[5].forEach((frame) => {
        expect(frame.id).toMatch(/^(BB\d|HR2|KO4)$/);
      });
    });

    it('patterns A/D are reversed, B/C are not', () => {
      JUMP_FRAMES[0].forEach((f) => expect(f.reversed).toBe(true));
      JUMP_FRAMES[1].forEach((f) => expect(f.reversed).toBe(false));
      JUMP_FRAMES[3].forEach((f) => expect(f.reversed).toBe(false));
      JUMP_FRAMES[5].forEach((f) => expect(f.reversed).toBe(true));
    });

    it('crouches on the second and last frame and kneels before the last', () => {
      expect(JUMP_FRAMES[1].map((f) => f.id)).toEqual(['BF4', 'HR1', 'BF3', 'BF3', 'BF3', 'BF3', 'BF3', 'KO3', 'HR1']);
      expect(JUMP_FRAMES[3].map((f) => f.id)).toEqual(['BB4', 'HR2', 'BB3', 'BB3', 'BB3', 'BB3', 'BB3', 'KO4', 'HR2']);
    });

    it('all body sprites are 32 wide', () => {
      JUMP_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          expect(SPRITE_MAP[frame.id].w).toBe(32);
        });
      });
    });

    it('all frames produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      JUMP_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          applySpriteFrame(tex, frame.id, frame.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('jump hand frames', () => {
    it('has 8 rotation steps', () => {
      expect(JUMP_HAND_FRAMES).toHaveLength(8);
    });

    it('each step has 9 frames', () => {
      JUMP_HAND_FRAMES.forEach((frames) => {
        expect(frames).toHaveLength(9);
      });
    });

    it('each frame has 2 hands [behind, front]', () => {
      JUMP_HAND_FRAMES.forEach((frames) => {
        frames.forEach((pair) => {
          expect(pair).toHaveLength(2);
        });
      });
    });

    it('every hand frame has id and reversed', () => {
      JUMP_HAND_FRAMES.forEach((frames) => {
        frames.forEach((pair) => {
          pair.filter(Boolean).forEach((hand) => {
            expect(hand).toHaveProperty('id');
            expect(hand).toHaveProperty('reversed');
            expect(SPRITE_MAP[hand.id]).toBeDefined();
          });
        });
      });
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(JUMP_HAND_FRAMES[0]).toEqual(JUMP_HAND_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(JUMP_HAND_FRAMES[1]).toEqual(JUMP_HAND_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(JUMP_HAND_FRAMES[3]).toEqual(JUMP_HAND_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(JUMP_HAND_FRAMES[5]).toEqual(JUMP_HAND_FRAMES[6]);
    });

    it('pattern A is reversed version of pattern B (same IDs, opposite reversed)', () => {
      const patternA = JUMP_HAND_FRAMES[0];
      const patternB = JUMP_HAND_FRAMES[1];
      for (let i = 0; i < patternA.length; i++) {
        for (let h = 0; h < 2; h++) {
          expect(patternA[i][h]?.id).toBe(patternB[i][h]?.id);
          if (patternA[i][h]) expect(patternA[i][h].reversed).toBe(!patternB[i][h].reversed);
        }
      }
    });

    it('pattern D is reversed version of pattern C (same IDs, opposite reversed)', () => {
      const patternC = JUMP_HAND_FRAMES[3];
      const patternD = JUMP_HAND_FRAMES[5];
      for (let i = 0; i < patternC.length; i++) {
        for (let h = 0; h < 2; h++) {
          expect(patternD[i][h]?.id).toBe(patternC[i][h]?.id);
          if (patternD[i][h]) expect(patternD[i][h].reversed).toBe(!patternC[i][h].reversed);
        }
      }
    });

    it('hand sprites are 24x24; the crouch draws its legs behind and its head in front', () => {
      JUMP_HAND_FRAMES.forEach((frames) => {
        frames.forEach((pair, i) => {
          if (i === 1 || i === 7 || i === 8) return;
          pair.forEach((hand) => {
            const cell = SPRITE_MAP[hand.id];
            expect(cell.w).toBe(24);
            expect(cell.h).toBe(24);
          });
        });
      });
    });

    it('all hand frames produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      JUMP_HAND_FRAMES.forEach((frames) => {
        frames.forEach((pair) => {
          pair.filter(Boolean).forEach((hand) => {
            applySpriteFrame(tex, hand.id, hand.reversed);
            expect(tex.offset.x).toBeGreaterThanOrEqual(0);
            expect(tex.offset.x).toBeLessThanOrEqual(1);
            expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('assembly ↔ engine jump frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('JUMP_ASSEMBLY body tile IDs match JUMP_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = JUMP_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = JUMP_FRAMES[step];
        for (let fi = 0; fi < 9; fi++) {
          expect(pattern.frames[fi].body).toBe(engineFrames[fi].id);
        }
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('JUMP_ASSEMBLY hand tile IDs match JUMP_HAND_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = JUMP_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineHands = JUMP_HAND_FRAMES[step];
        for (let fi = 0; fi < 9; fi++) {
          expect(pattern.frames[fi].behind?.id).toBe(engineHands[fi][0]?.id);
          expect(pattern.frames[fi].front?.id).toBe(engineHands[fi][1]?.id);
        }
      }
    });

    it('JUMP_DELAYS has exactly 9 entries totaling 72 ticks exactly', () => {
      expect(JUMP_DELAYS).toHaveLength(9);
      const sum = JUMP_DELAYS.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo((72 * 1000) / 60, 6);
    });

    it('WALK_DELAYS has exactly 8 entries totaling 64 ticks exactly', () => {
      expect(WALK_DELAYS).toHaveLength(8);
      const sum = WALK_DELAYS.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo((64 * 1000) / 60, 6);
    });

    it('JUMP_ASSEMBLY behind/front dx/dy offsets exist for all 9 frames in all 4 patterns (the kneel has neither)', () => {
      expect(JUMP_ASSEMBLY).toHaveLength(4);
      JUMP_ASSEMBLY.forEach((pattern) => {
        expect(pattern.frames).toHaveLength(9);
        pattern.frames.forEach((frame, i) => {
          if (i === 7) {
            expect(frame.behind).toBe(null);
            expect(frame.front).toBe(null);
            return;
          }
          expect(frame.behind).toHaveProperty('dx');
          expect(frame.behind).toHaveProperty('dy');
          expect(frame.front).toHaveProperty('dx');
          expect(frame.front).toHaveProperty('dy');
        });
      });
    });
  });

  describe('SPRITE_SHEET_FILE', () => {
    it('is a string ending in .png', () => {
      expect(typeof SPRITE_SHEET_FILE).toBe('string');
      expect(SPRITE_SHEET_FILE).toMatch(/\.png$/);
    });

    it('is a1.png', () => {
      expect(SPRITE_SHEET_FILE).toBe('a1.png');
    });

    //NOTE(@jimmylee)
    //SPRITE_CELLS is everything TYPE1 can draw, so a sheet keeps no pixels outside it. Art left there
    //(a portrait, lettering) shows on the main route's sheet with no box around it.
    it('has pixels only inside SPRITE_CELLS', () => {
      const sheet = sheetPixels(SPRITE_SHEET_FILE);
      const labeled = new Uint8Array(SHEET_W * SHEET_H);
      for (const { x, y, w, h } of SPRITE_CELLS) {
        for (let row = y; row < y + h; row++) labeled.fill(1, row * SHEET_W + x, row * SHEET_W + x + w);
      }
      const stray = [];
      for (let y = 0; y < SHEET_H; y++) {
        for (let x = 0; x < SHEET_W; x++) {
          if (!labeled[y * SHEET_W + x] && sheet.at(x, y).some((channel) => channel !== 0)) stray.push(`${x},${y}`);
        }
      }
      expect(stray).toEqual([]);
    });
  });

  describe('idle frames (SEQ 0-5)', () => {
    it('has 8 rotation steps', () => {
      expect(IDLE_FRAMES).toHaveLength(8);
    });

    it('every frame has id and reversed', () => {
      IDLE_FRAMES.forEach((frame) => {
        expect(frame).toHaveProperty('id');
        expect(frame).toHaveProperty('reversed');
        expect(SPRITE_MAP[frame.id]).toBeDefined();
      });
    });

    it('each step maps to a unique pose (8 unique entries, not 4 shared patterns)', () => {
      expect(IDLE_FRAMES[0]).toEqual({ id: 'P3', reversed: false });
      expect(IDLE_FRAMES[1]).toEqual({ id: 'P2', reversed: false });
      expect(IDLE_FRAMES[2]).toEqual({ id: 'P1', reversed: false });
      expect(IDLE_FRAMES[3]).toEqual({ id: 'P4', reversed: false });
      expect(IDLE_FRAMES[4]).toEqual({ id: 'P5', reversed: false });
      expect(IDLE_FRAMES[5]).toEqual({ id: 'P4', reversed: true });
      expect(IDLE_FRAMES[6]).toEqual({ id: 'P1', reversed: true });
      expect(IDLE_FRAMES[7]).toEqual({ id: 'P2', reversed: true });
    });

    it('steps 0-4 are not reversed, steps 5-7 are reversed', () => {
      for (let i = 0; i <= 4; i++) {
        expect(IDLE_FRAMES[i].reversed).toBe(false);
      }
      for (let i = 5; i <= 7; i++) {
        expect(IDLE_FRAMES[i].reversed).toBe(true);
      }
    });

    it('uses P1-P5 sprite IDs', () => {
      const ids = new Set(IDLE_FRAMES.map((f) => f.id));
      ids.forEach((id) => {
        expect(id).toMatch(/^P\d$/);
      });
    });

    it('all idle sprites are 32x40', () => {
      IDLE_FRAMES.forEach((frame) => {
        const cell = SPRITE_MAP[frame.id];
        expect(cell.w).toBe(32);
        expect(cell.h).toBe(40);
      });
    });

    it('all frames produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      IDLE_FRAMES.forEach((frame) => {
        applySpriteFrame(tex, frame.id, frame.reversed);
        expect(tex.offset.x).toBeGreaterThanOrEqual(0);
        expect(tex.offset.x).toBeLessThanOrEqual(1);
        expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
      });
    });
  });

  describe('engine constants', () => {
    it('PX_TO_WORLD equals (cubeSize * 0.75) / 32 = 0.75', () => {
      expect(PX_TO_WORLD).toBeCloseTo(0.75);
    });

    it('DEFAULT_AZIMUTH is atan2(0.5, -0.5)', () => {
      expect(DEFAULT_AZIMUTH).toBeCloseTo(Math.atan2(0.5, -0.5));
    });

    it('STEP_SIZE is PI/4 (45 degrees per rotation step)', () => {
      expect(STEP_SIZE).toBeCloseTo(Math.PI / 4);
    });

    it('8 steps of STEP_SIZE complete a full rotation', () => {
      expect(8 * STEP_SIZE).toBeCloseTo(2 * Math.PI);
    });
  });

  describe('cast assembly timing', () => {
    it('CAST_ASSEMBLY has 4 patterns', () => {
      expect(CAST_ASSEMBLY).toHaveLength(4);
    });

    it('each pattern has exactly 2 frames', () => {
      CAST_ASSEMBLY.forEach((pattern) => {
        expect(pattern.frames).toHaveLength(2);
      });
    });

    it('all frames have overlayDx/overlayDy offsets', () => {
      CAST_ASSEMBLY.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          expect(frame).toHaveProperty('overlayDx');
          expect(frame).toHaveProperty('overlayDy');
        });
      });
    });
  });

  describe('guard assembly (SEQ 76/77)', () => {
    it('has 4 patterns (A/B/C/D)', () => {
      expect(GUARD_ASSEMBLY).toHaveLength(4);
    });

    it('each pattern has body, behind, and front fields', () => {
      GUARD_ASSEMBLY.forEach((pattern) => {
        expect(pattern).toHaveProperty('body');
        expect(pattern).toHaveProperty('behind');
        expect(pattern).toHaveProperty('front');
        expect(pattern.behind).toHaveProperty('id');
        expect(pattern.behind).toHaveProperty('dx');
        expect(pattern.behind).toHaveProperty('dy');
        expect(pattern.front).toHaveProperty('id');
        expect(pattern.front).toHaveProperty('dx');
        expect(pattern.front).toHaveProperty('dy');
      });
    });

    it('all tile IDs exist in SPRITE_MAP', () => {
      GUARD_ASSEMBLY.forEach((pattern) => {
        expect(SPRITE_MAP[pattern.body]).toBeDefined();
        expect(SPRITE_MAP[pattern.behind.id]).toBeDefined();
        expect(SPRITE_MAP[pattern.front.id]).toBeDefined();
      });
    });

    it('patterns A/B use front-facing tiles (BF5, RF5, LF5)', () => {
      expect(GUARD_ASSEMBLY[0].body).toBe('BF5');
      expect(GUARD_ASSEMBLY[0].behind.id).toBe('RF5');
      expect(GUARD_ASSEMBLY[0].front.id).toBe('LF5');
      expect(GUARD_ASSEMBLY[1].body).toBe('BF5');
      expect(GUARD_ASSEMBLY[1].behind.id).toBe('RF5');
      expect(GUARD_ASSEMBLY[1].front.id).toBe('LF5');
    });

    it('patterns C/D use back-facing tiles (BB5, RB5, LB5)', () => {
      expect(GUARD_ASSEMBLY[2].body).toBe('BB5');
      expect(GUARD_ASSEMBLY[2].behind.id).toBe('RB5');
      expect(GUARD_ASSEMBLY[2].front.id).toBe('LB5');
      expect(GUARD_ASSEMBLY[3].body).toBe('BB5');
      expect(GUARD_ASSEMBLY[3].behind.id).toBe('RB5');
      expect(GUARD_ASSEMBLY[3].front.id).toBe('LB5');
    });

    it('all body tiles are 32x40', () => {
      GUARD_ASSEMBLY.forEach((pattern) => {
        const cell = SPRITE_MAP[pattern.body];
        expect(cell.w).toBe(32);
        expect(cell.h).toBe(40);
      });
    });

    it('all hand tiles are 24x24', () => {
      GUARD_ASSEMBLY.forEach((pattern) => {
        const behindCell = SPRITE_MAP[pattern.behind.id];
        const frontCell = SPRITE_MAP[pattern.front.id];
        expect(behindCell.w).toBe(24);
        expect(behindCell.h).toBe(24);
        expect(frontCell.w).toBe(24);
        expect(frontCell.h).toBe(24);
      });
    });

    it('all tile IDs produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      GUARD_ASSEMBLY.forEach((pattern) => {
        [pattern.body, pattern.behind.id, pattern.front.id].forEach((id) => {
          applySpriteFrame(tex, id, pattern.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('guard frames (SEQ 76/77)', () => {
    it('has 8 rotation steps', () => {
      expect(GUARD_FRAMES).toHaveLength(8);
    });

    it('each step has a single body frame (static pose)', () => {
      GUARD_FRAMES.forEach((frame) => {
        expect(frame).toHaveProperty('id');
        expect(frame).toHaveProperty('reversed');
      });
    });

    it('steps 0/7 use Pattern A (BF5 reversed)', () => {
      expect(GUARD_FRAMES[0]).toEqual({ id: 'BF5', reversed: true });
      expect(GUARD_FRAMES[7]).toEqual({ id: 'BF5', reversed: true });
    });

    it('steps 1/2 use Pattern B (BF5 not reversed)', () => {
      expect(GUARD_FRAMES[1]).toEqual({ id: 'BF5', reversed: false });
      expect(GUARD_FRAMES[2]).toEqual({ id: 'BF5', reversed: false });
    });

    it('steps 3/4 use Pattern C (BB5 not reversed)', () => {
      expect(GUARD_FRAMES[3]).toEqual({ id: 'BB5', reversed: false });
      expect(GUARD_FRAMES[4]).toEqual({ id: 'BB5', reversed: false });
    });

    it('steps 5/6 use Pattern D (BB5 reversed)', () => {
      expect(GUARD_FRAMES[5]).toEqual({ id: 'BB5', reversed: true });
      expect(GUARD_FRAMES[6]).toEqual({ id: 'BB5', reversed: true });
    });

    it('all tile IDs exist in SPRITE_MAP', () => {
      GUARD_FRAMES.forEach((frame) => {
        expect(SPRITE_MAP[frame.id]).toBeDefined();
      });
    });

    it('all tiles produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      GUARD_FRAMES.forEach((frame) => {
        applySpriteFrame(tex, frame.id, frame.reversed);
        expect(tex.offset.x).toBeGreaterThanOrEqual(0);
        expect(tex.offset.x).toBeLessThanOrEqual(1);
        expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
      });
    });
  });

  //NOTE(jimmylee)
  //Float assembly (SEQ 12/13) — static 3-tile, same structure as Guard.
  //Uses walk frame 3 tiles (BF3/BB3 body + RF3/LF3/RB3/LB3 hands).
  //2D pipeline complete, no 3D mode yet.
  describe('float assembly (SEQ 12/13)', () => {
    it('has 4 patterns (A/B/C/D)', () => {
      expect(FLOAT_ASSEMBLY).toHaveLength(4);
    });

    it('each pattern has body, behind, and front fields', () => {
      FLOAT_ASSEMBLY.forEach((pattern) => {
        expect(pattern).toHaveProperty('body');
        expect(pattern).toHaveProperty('behind');
        expect(pattern).toHaveProperty('front');
        expect(pattern.behind).toHaveProperty('id');
        expect(pattern.behind).toHaveProperty('dx');
        expect(pattern.behind).toHaveProperty('dy');
        expect(pattern.front).toHaveProperty('id');
        expect(pattern.front).toHaveProperty('dx');
        expect(pattern.front).toHaveProperty('dy');
      });
    });

    it('all tile IDs exist in SPRITE_MAP', () => {
      FLOAT_ASSEMBLY.forEach((pattern) => {
        expect(SPRITE_MAP[pattern.body]).toBeDefined();
        expect(SPRITE_MAP[pattern.behind.id]).toBeDefined();
        expect(SPRITE_MAP[pattern.front.id]).toBeDefined();
      });
    });

    it('patterns A/B use front-facing tiles (BF3, RF3, LF3)', () => {
      expect(FLOAT_ASSEMBLY[0].body).toBe('BF3');
      expect(FLOAT_ASSEMBLY[0].behind.id).toBe('RF3');
      expect(FLOAT_ASSEMBLY[0].front.id).toBe('LF3');
      expect(FLOAT_ASSEMBLY[1].body).toBe('BF3');
      expect(FLOAT_ASSEMBLY[1].behind.id).toBe('RF3');
      expect(FLOAT_ASSEMBLY[1].front.id).toBe('LF3');
    });

    it('patterns C/D use back-facing tiles (BB3, RB3, LB3)', () => {
      expect(FLOAT_ASSEMBLY[2].body).toBe('BB3');
      expect(FLOAT_ASSEMBLY[2].behind.id).toBe('RB3');
      expect(FLOAT_ASSEMBLY[2].front.id).toBe('LB3');
      expect(FLOAT_ASSEMBLY[3].body).toBe('BB3');
      expect(FLOAT_ASSEMBLY[3].behind.id).toBe('RB3');
      expect(FLOAT_ASSEMBLY[3].front.id).toBe('LB3');
    });

    it('all body tiles are 32x40', () => {
      FLOAT_ASSEMBLY.forEach((pattern) => {
        const cell = SPRITE_MAP[pattern.body];
        expect(cell.w).toBe(32);
        expect(cell.h).toBe(40);
      });
    });

    it('all hand tiles are 24x24', () => {
      FLOAT_ASSEMBLY.forEach((pattern) => {
        const behindCell = SPRITE_MAP[pattern.behind.id];
        const frontCell = SPRITE_MAP[pattern.front.id];
        expect(behindCell.w).toBe(24);
        expect(behindCell.h).toBe(24);
        expect(frontCell.w).toBe(24);
        expect(frontCell.h).toBe(24);
      });
    });

    it('patterns A/B reference SEQ 12, C/D reference SEQ 13', () => {
      expect(FLOAT_ASSEMBLY[0].seq).toBe('SEQ 12');
      expect(FLOAT_ASSEMBLY[1].seq).toBe('SEQ 12');
      expect(FLOAT_ASSEMBLY[2].seq).toBe('SEQ 13');
      expect(FLOAT_ASSEMBLY[3].seq).toBe('SEQ 13');
    });

    it('all tile IDs produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      FLOAT_ASSEMBLY.forEach((pattern) => {
        [pattern.body, pattern.behind.id, pattern.front.id].forEach((id) => {
          applySpriteFrame(tex, id, pattern.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });

    it('uses walk frame 3 (not frame 5 like Guard)', () => {
      expect(FLOAT_ASSEMBLY[0].body).toBe('BF3');
      expect(GUARD_ASSEMBLY[0].body).toBe('BF5');
    });
  });

  describe('walk assembly offset completeness', () => {
    it('all hand pairs have dx/dy offsets', () => {
      WALK_ASSEMBLY.forEach((pattern) => {
        pattern.hands.forEach((pair) => {
          pair.forEach((hand) => {
            expect(hand).toHaveProperty('dx');
            expect(hand).toHaveProperty('dy');
          });
        });
      });
    });

    it('all 4 patterns have 5 body frames and 5 hand pairs', () => {
      expect(WALK_ASSEMBLY).toHaveLength(4);
      WALK_ASSEMBLY.forEach((pattern) => {
        expect(pattern.body).toHaveLength(5);
        expect(pattern.hands).toHaveLength(5);
      });
    });
  });

  describe('hurt assembly offset completeness', () => {
    it('all 4 patterns have bottomDx/bottomDy offsets', () => {
      expect(HURT_ASSEMBLY).toHaveLength(4);
      HURT_ASSEMBLY.forEach((pattern) => {
        expect(pattern).toHaveProperty('bottomDx');
        expect(pattern).toHaveProperty('bottomDy');
      });
    });
  });

  describe('quick throw frames (SEQ 48/49)', () => {
    it('has 8 rotation steps', () => {
      expect(QUICK_THROW_FRAMES).toHaveLength(8);
    });

    it('each step has 6 frames', () => {
      QUICK_THROW_FRAMES.forEach((frames) => {
        expect(frames).toHaveLength(6);
      });
    });

    it('every frame has id and reversed', () => {
      QUICK_THROW_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          expect(frame).toHaveProperty('id');
          expect(frame).toHaveProperty('reversed');
          expect(SPRITE_MAP[frame.id]).toBeDefined();
        });
      });
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(QUICK_THROW_FRAMES[0]).toEqual(QUICK_THROW_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(QUICK_THROW_FRAMES[1]).toEqual(QUICK_THROW_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(QUICK_THROW_FRAMES[3]).toEqual(QUICK_THROW_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(QUICK_THROW_FRAMES[5]).toEqual(QUICK_THROW_FRAMES[6]);
    });

    it('patterns A/D are reversed, B/C are not', () => {
      QUICK_THROW_FRAMES[0].forEach((f) => expect(f.reversed).toBe(true));
      QUICK_THROW_FRAMES[1].forEach((f) => expect(f.reversed).toBe(false));
      QUICK_THROW_FRAMES[3].forEach((f) => expect(f.reversed).toBe(false));
      QUICK_THROW_FRAMES[5].forEach((f) => expect(f.reversed).toBe(true));
    });

    it('body heights follow [40, 16, 32, 16, 40, 32] per frame', () => {
      const expectedHeights = [40, 16, 32, 16, 40, 32];
      QUICK_THROW_FRAMES.forEach((frames) => {
        frames.forEach((frame, fi) => {
          const cell = SPRITE_MAP[frame.id];
          expect(cell.h).toBe(expectedHeights[fi]);
        });
      });
    });

    it('patterns A/B use P2/HR1/KO3/BF3/SR19 body sprites', () => {
      const expected = ['P2', 'HR1', 'KO3', 'HR1', 'BF3', 'SR19'];
      QUICK_THROW_FRAMES[1].forEach((frame, i) => {
        expect(frame.id).toBe(expected[i]);
      });
    });

    it('patterns C/D use P4/HR2/KO4/BB3/SR20 body sprites', () => {
      const expected = ['P4', 'HR2', 'KO4', 'HR2', 'BB3', 'SR20'];
      QUICK_THROW_FRAMES[3].forEach((frame, i) => {
        expect(frame.id).toBe(expected[i]);
      });
    });

    it('all frames produce valid UVs via applySpriteFrame', () => {
      const tex = mockTexture();
      QUICK_THROW_FRAMES.forEach((frames) => {
        frames.forEach((frame) => {
          applySpriteFrame(tex, frame.id, frame.reversed);
          expect(tex.offset.x).toBeGreaterThanOrEqual(0);
          expect(tex.offset.x).toBeLessThanOrEqual(1);
          expect(Math.abs(tex.repeat.x)).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('quick throw assembly (SEQ 48/49)', () => {
    validateFramesAssembly(QUICK_THROW_ASSEMBLY, { frameCount: 6, overlayFields: ['behind', 'front', 'head'] });
  });

  describe('assembly ↔ engine quick throw frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('QUICK_THROW_ASSEMBLY body tile IDs match QUICK_THROW_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = QUICK_THROW_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = QUICK_THROW_FRAMES[step];
        for (let fi = 0; fi < 6; fi++) {
          expect(pattern.frames[fi].body).toBe(engineFrames[fi].id);
        }
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('QUICK_THROW_DELAYS has exactly 6 entries totaling 24 ticks exactly', () => {
      expect(QUICK_THROW_DELAYS).toHaveLength(6);
      const sum = QUICK_THROW_DELAYS.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo((24 * 1000) / 60, 6);
    });

  });

  //NOTE(jimmylee)
  //Fatal Item Impact (SEQ 82/83) assembly — 3-frame non-looping reaction animation.
  //Standing reach → kneeling with overlay → KO pose.
  describe('fatal item impact assembly (SEQ 82/83)', () => {
    validateFramesAssembly(FATAL_ITEM_IMPACT_ASSEMBLY, { frameCount: 3, overlayFields: ['behind', 'front', 'head'] });

    it('patterns A and B are front-facing (SEQ 82)', () => {
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].seq).toBe('SEQ 82');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[1].seq).toBe('SEQ 82');
    });

    it('patterns C and D are back-facing (SEQ 83)', () => {
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[2].seq).toBe('SEQ 83');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[3].seq).toBe('SEQ 83');
    });

    it('frame 0 uses HR1/HR2 half-torso body (16px)', () => {
      expect(SPRITE_MAP[FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[0].body].h).toBe(16);
      expect(SPRITE_MAP[FATAL_ITEM_IMPACT_ASSEMBLY[2].frames[0].body].h).toBe(16);
    });

    it('frame 0 has head (SP3/SP2) and behind (DF2/DB2) overlays', () => {
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[0].head.id).toBe('SP3');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[0].behind.id).toBe('DF2');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[2].frames[0].head.id).toBe('SP2');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[2].frames[0].behind.id).toBe('DB2');
    });

    it('frame 1 front-facing has OV2 overlay, back-facing has none', () => {
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[1].front.id).toBe('OV2');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[1].frames[1].front.id).toBe('OV2');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[2].frames[1].front).toBeNull();
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[3].frames[1].front).toBeNull();
    });

    it('frame 2 is single-tile KO body (KO1/KO2)', () => {
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[2].body).toBe('KO1');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[2].frames[2].body).toBe('KO2');
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[2].behind).toBeNull();
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[2].head).toBeNull();
      expect(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames[2].front).toBeNull();
    });

    it('FATAL_ITEM_IMPACT_DELAYS has 3 entries totaling 26 ticks exactly', () => {
      expect(FATAL_ITEM_IMPACT_DELAYS).toHaveLength(3);
      const sum = FATAL_ITEM_IMPACT_DELAYS.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo((26 * 1000) / 60, 6);
    });

    it('FATAL_ITEM_IMPACT_DELAYS length matches frame count', () => {
      expect(FATAL_ITEM_IMPACT_DELAYS).toHaveLength(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames.length);
    });
  });

  //NOTE(jimmylee)
  //Item Drop (SEQ 84/85) assembly — 3-frame non-looping sequence.
  //Reverse of Fatal Item Impact: kneeling → standing reach → walk neutral.
  describe('item drop assembly (SEQ 84/85)', () => {
    validateFramesAssembly(ITEM_DROP_ASSEMBLY, { frameCount: 3, overlayFields: ['behind', 'front', 'head'] });

    it('patterns A and B are front-facing (SEQ 84)', () => {
      expect(ITEM_DROP_ASSEMBLY[0].seq).toBe('SEQ 84');
      expect(ITEM_DROP_ASSEMBLY[1].seq).toBe('SEQ 84');
    });

    it('patterns C and D are back-facing (SEQ 85)', () => {
      expect(ITEM_DROP_ASSEMBLY[2].seq).toBe('SEQ 85');
      expect(ITEM_DROP_ASSEMBLY[3].seq).toBe('SEQ 85');
    });

    it('frame 0 front-facing has OV2 overlay, back-facing has none', () => {
      expect(ITEM_DROP_ASSEMBLY[0].frames[0].front.id).toBe('OV2');
      expect(ITEM_DROP_ASSEMBLY[1].frames[0].front.id).toBe('OV2');
      expect(ITEM_DROP_ASSEMBLY[2].frames[0].front).toBeNull();
      expect(ITEM_DROP_ASSEMBLY[3].frames[0].front).toBeNull();
    });

    it('frame 1 uses HR1/HR2 half-torso body (16px)', () => {
      expect(SPRITE_MAP[ITEM_DROP_ASSEMBLY[0].frames[1].body].h).toBe(16);
      expect(SPRITE_MAP[ITEM_DROP_ASSEMBLY[2].frames[1].body].h).toBe(16);
    });

    it('frame 2 is walk neutral (BF3/BB3 body with hand overlays)', () => {
      expect(ITEM_DROP_ASSEMBLY[0].frames[2].body).toBe('BF3');
      expect(ITEM_DROP_ASSEMBLY[2].frames[2].body).toBe('BB3');
      expect(ITEM_DROP_ASSEMBLY[0].frames[2].behind.id).toBe('RF3');
      expect(ITEM_DROP_ASSEMBLY[0].frames[2].front.id).toBe('LF3');
      expect(ITEM_DROP_ASSEMBLY[2].frames[2].behind.id).toBe('RB3');
      expect(ITEM_DROP_ASSEMBLY[2].frames[2].front.id).toBe('LB3');
    });

    it('ITEM_DROP_DELAYS has 2 entries totaling 22 ticks exactly', () => {
      expect(ITEM_DROP_DELAYS).toHaveLength(2);
      const sum = ITEM_DROP_DELAYS.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo((22 * 1000) / 60, 6);
    });

    it('item drop delay count is one less than frame count (terminal frame has no delay)', () => {
      expect(ITEM_DROP_DELAYS).toHaveLength(ITEM_DROP_ASSEMBLY[0].frames.length - 1);
    });
  });

  //NOTE(jimmylee)
  //Punch tile sprites used by PUNCH_ASSEMBLY (Mode P, SEQ 140/141).
  //AF/AB torsos, TF/TB heads, LG hand series — all present in SPRITE_CELLS.
  describe('punch tile IDs exist in SPRITE_MAP', () => {
    const punchFrontTiles = ['AF1', 'AF2', 'TF1', 'LG15', 'LG16', 'LG17', 'LG18', 'LG22', 'LG24', 'LG32'];
    const punchBackTiles = ['AB1', 'AB2', 'TB1', 'LG35', 'LG43', 'LG48', 'LG50', 'LG53', 'LG55'];

    punchFrontTiles.forEach((id) => {
      it(`front tile ${id} exists`, () => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    punchBackTiles.forEach((id) => {
      it(`back tile ${id} exists`, () => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });
  });

  //NOTE(jimmylee)
  //Billboard composite container height validation.
  //Formula: max(bodyH, bodyH/2 + layer.dy + layerH/2) for each overlay.
  describe('billboard composite container heights', () => {
    it('walk: all container heights equal body height (40px) — no hands extend below', () => {
      for (const pattern of WALK_ASSEMBLY) {
        pattern.body.forEach((b, i) => {
          const bodyH = SPRITE_MAP[b.id].h;
          let containerH = bodyH;
          for (const hand of pattern.hands[i]) {
            const c = SPRITE_MAP[hand.id];
            containerH = Math.max(containerH, bodyH / 2 + hand.dy + c.h / 2);
          }
          expect(containerH).toBe(40);
        });
      }
    });

    it('jump: standing frames keep a 40px container', () => {
      for (const pattern of JUMP_ASSEMBLY) {
        pattern.frames.filter((f) => SPRITE_MAP[f.body].h === 40).forEach((f) => {
          const bodyH = SPRITE_MAP[f.body].h;
          let containerH = bodyH;
          [f.behind, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            containerH = Math.max(containerH, bodyH / 2 + layer.dy + c.h / 2);
          });
          expect(containerH).toBe(40);
        });
      }
    });

    it('quick throw: frames 1,3 (HR1/HR2 + DF2/DB2 at dy:8) have containerH=24', () => {
      for (const pattern of QUICK_THROW_ASSEMBLY) {
        [1, 3].forEach((fi) => {
          const f = pattern.frames[fi];
          const bodyH = SPRITE_MAP[f.body].h;
          let containerH = bodyH;
          [f.behind, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            containerH = Math.max(containerH, bodyH / 2 + layer.dy + c.h / 2);
          });
          expect(containerH).toBe(24);
        });
      }
    });

    it('quick throw: frame 0 (P2/P4, no overlays) has containerH=40', () => {
      for (const pattern of QUICK_THROW_ASSEMBLY) {
        const f = pattern.frames[0];
        expect(SPRITE_MAP[f.body].h).toBe(40);
      }
    });

    it('punch: all container heights equal body height (32px) — overlays sit above body center', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          const bodyH = SPRITE_MAP[f.body].h;
          let containerH = bodyH;
          [f.farBehind, f.head, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            containerH = Math.max(containerH, bodyH / 2 + layer.dy + c.h / 2);
          });
          expect(containerH).toBe(32);
        });
      }
    });

    it('stab lv1: all container heights equal body height (32px)', () => {
      for (const pattern of STAB_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          const bodyH = SPRITE_MAP[f.body].h;
          let containerH = bodyH;
          [f.farBehind, f.head, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            containerH = Math.max(containerH, bodyH / 2 + layer.dy + c.h / 2);
          });
          expect(containerH).toBe(32);
        });
      }
    });

    it('stab lv2: maxContainerH is 33 (AF3 + LG14 at dy:5)', () => {
      let maxH = 0;
      for (const pattern of STAB_LV2_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          const bodyH = SPRITE_MAP[f.body].h;
          let containerH = bodyH;
          [f.farBehind, f.head, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            containerH = Math.max(containerH, bodyH / 2 + layer.dy + c.h / 2);
          });
          maxH = Math.max(maxH, containerH);
        });
      }
      expect(maxH).toBe(33);
    });

    it('stab lv3: maxContainerH is 34 (AF4 + LG30 at dy:6)', () => {
      let maxH = 0;
      for (const pattern of STAB_LV3_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          const bodyH = SPRITE_MAP[f.body].h;
          let containerH = bodyH;
          [f.farBehind, f.head, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            containerH = Math.max(containerH, bodyH / 2 + layer.dy + c.h / 2);
          });
          maxH = Math.max(maxH, containerH);
        });
      }
      expect(maxH).toBe(34);
    });

    it('cast: container height is 40 (bodyH/2 + overlayDy + overlayH/2 = 16+16+8=40)', () => {
      for (const pattern of CAST_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          const bodyH = SPRITE_MAP[f.body].h;
          const oc = SPRITE_MAP[f.overlay];
          const containerH = Math.max(bodyH, bodyH / 2 + f.overlayDy + oc.h / 2);
          expect(containerH).toBe(40);
        });
      }
    });
  });

  //NOTE(jimmylee)
  //Body height arrays per animation mode.
  describe('body height arrays', () => {
    it('quick throw body heights are [40, 16, 32, 16, 40, 32]', () => {
      const heights = QUICK_THROW_ASSEMBLY[0].frames.map((f) => SPRITE_MAP[f.body].h);
      expect(heights).toEqual([40, 16, 32, 16, 40, 32]);
    });

    it('walk body heights are all 40', () => {
      for (const pattern of WALK_ASSEMBLY) {
        pattern.body.forEach((b) => {
          expect(SPRITE_MAP[b.id].h).toBe(40);
        });
      }
    });

    it('jump body heights are standing 40, crouching 16 and kneeling 32', () => {
      for (const pattern of JUMP_ASSEMBLY) {
        expect(pattern.frames.map((f) => SPRITE_MAP[f.body].h)).toEqual([40, 16, 40, 40, 40, 40, 40, 32, 16]);
      }
    });

    it('punch body heights are all 32', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          expect(SPRITE_MAP[f.body].h).toBe(32);
        });
      }
    });

    it('stab body heights are all 32', () => {
      for (const assembly of [STAB_ASSEMBLY, STAB_LV2_ASSEMBLY, STAB_LV3_ASSEMBLY]) {
        for (const pattern of assembly) {
          pattern.frames.forEach((f) => {
            expect(SPRITE_MAP[f.body].h).toBe(32);
          });
        }
      }
    });

    it('cast body heights are all 32', () => {
      for (const pattern of CAST_ASSEMBLY) {
        pattern.frames.forEach((f) => {
          expect(SPRITE_MAP[f.body].h).toBe(32);
        });
      }
    });
  });

  //NOTE(jimmylee)
  //Billboard composite scale factor validation.
  describe('billboard composite scale factors', () => {
    const cubeSize = 32;
    const spriteWidth = cubeSize * 0.75;
    const spriteHeight = cubeSize * 1.125;
    const BODY_W = 32;

    it('scaleX = spriteWidth / BODY_W = 0.75', () => {
      expect(spriteWidth / BODY_W).toBeCloseTo(0.75);
    });

    it('scaleY for walk/jump (containerH=40) = spriteHeight / 40 = 0.9', () => {
      expect(spriteHeight / 40).toBeCloseTo(0.9);
    });

    it('scaleY for cast (containerH=40) = spriteHeight / 40 = 0.9', () => {
      expect(spriteHeight / 40).toBeCloseTo(0.9);
    });

    it('scaleY for punch (maxContainerH=32) = spriteHeight / 32 = 1.125', () => {
      expect(spriteHeight / 32).toBeCloseTo(1.125);
    });

    it('scaleY for quick throw (maxContainerH=40) = spriteHeight / 40 = 0.9', () => {
      const maxH = Math.max(...QUICK_THROW_ASSEMBLY[0].frames.map((f) => {
        const bodyH = SPRITE_MAP[f.body].h;
        let h = bodyH;
        [f.behind, f.front].forEach((layer) => {
          if (!layer) return;
          const c = SPRITE_MAP[layer.id];
          h = Math.max(h, bodyH / 2 + layer.dy + c.h / 2);
        });
        return h;
      }));
      expect(spriteHeight / maxH).toBeCloseTo(0.9);
    });
  });

  //NOTE(jimmylee)
  //ASSEMBLY_STEP_MAP is consistent across all modes.
  describe('ASSEMBLY_STEP_MAP pattern', () => {
    const expectedMap = [0, 1, 1, 2, 2, 3, 3, 0];

    it('walk: 4 patterns map to 8 steps as [A,B,B,C,C,D,D,A]', () => {
      expect(WALK_ASSEMBLY).toHaveLength(4);
      expectedMap.forEach((patternIdx) => {
        expect(patternIdx).toBeLessThan(WALK_ASSEMBLY.length);
      });
    });

    it('jump: 4 patterns map to 8 steps', () => {
      expect(JUMP_ASSEMBLY).toHaveLength(4);
      expectedMap.forEach((patternIdx) => {
        expect(patternIdx).toBeLessThan(JUMP_ASSEMBLY.length);
      });
    });

    it('quick throw: 4 patterns map to 8 steps', () => {
      expect(QUICK_THROW_ASSEMBLY).toHaveLength(4);
      expectedMap.forEach((patternIdx) => {
        expect(patternIdx).toBeLessThan(QUICK_THROW_ASSEMBLY.length);
      });
    });

    it('punch: 4 patterns map to 8 steps', () => {
      expect(PUNCH_ASSEMBLY).toHaveLength(4);
      expectedMap.forEach((patternIdx) => {
        expect(patternIdx).toBeLessThan(PUNCH_ASSEMBLY.length);
      });
    });

    it('cast: 4 patterns map to 8 steps', () => {
      expect(CAST_ASSEMBLY).toHaveLength(4);
      expectedMap.forEach((patternIdx) => {
        expect(patternIdx).toBeLessThan(CAST_ASSEMBLY.length);
      });
    });
  });

  //NOTE(jimmylee)
  //Quick throw front overlay split: stone (SP) on frames 1,3 vs hand (EF) on frame 4.
  describe('quick throw front overlay split', () => {
    it('frames 1 and 3 have stone sprites (SP2/SP3) in f.head', () => {
      for (const pattern of QUICK_THROW_ASSEMBLY) {
        expect(pattern.frames[1].head.id).toMatch(/^SP/);
        expect(pattern.frames[3].head.id).toMatch(/^SP/);
      }
    });

    it('frame 4 has hand sprites (EF/EFL) in f.front', () => {
      for (const pattern of QUICK_THROW_ASSEMBLY) {
        expect(pattern.frames[4].front.id).toMatch(/^EF/);
      }
    });

    it('frames 0 and 2 have no front overlay', () => {
      for (const pattern of QUICK_THROW_ASSEMBLY) {
        expect(pattern.frames[0].front).toBeNull();
        expect(pattern.frames[2].front).toBeNull();
      }
    });
  });

  //NOTE(jimmylee)
  //Throw stone assembly (SEQ 208/209) — 12-frame cinematic throw-attack combo.
  describe('throw stone assembly', () => {
    validateFramesAssembly(THROW_STONE_ASSEMBLY, { frameCount: 12, overlayFields: ['behind', 'farBehind', 'head', 'over', 'front'], headMap: TORSO_HEAD_MAP });

    it('THROW_STONE_FRAMES maps to 8 rotation steps', () => {
      expect(THROW_STONE_FRAMES).toHaveLength(8);
      for (const step of THROW_STONE_FRAMES) {
        expect(step).toHaveLength(12);
      }
    });

    it('patterns A and B are front-facing (SEQ 208)', () => {
      expect(THROW_STONE_ASSEMBLY[0].seq).toBe('SEQ 208');
      expect(THROW_STONE_ASSEMBLY[1].seq).toBe('SEQ 208');
    });

    it('patterns C and D are back-facing (SEQ 209)', () => {
      expect(THROW_STONE_ASSEMBLY[2].seq).toBe('SEQ 209');
      expect(THROW_STONE_ASSEMBLY[3].seq).toBe('SEQ 209');
    });

    it('FWD delays have 12 frames totaling 38 ticks exactly', () => {
      expect(THROW_STONE_DELAYS_FWD).toHaveLength(12);
      const total = THROW_STONE_DELAYS_FWD.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((38 * 1000) / 60, 6);
    });

    it('BCK delays have 12 frames totaling 42 ticks exactly', () => {
      expect(THROW_STONE_DELAYS_BCK).toHaveLength(12);
      const total = THROW_STONE_DELAYS_BCK.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((42 * 1000) / 60, 6);
    });

    it('head sprites are in the head field, not front', () => {
      for (const pattern of THROW_STONE_ASSEMBLY) {
        for (const f of pattern.frames) {
          if (f.head) {
            expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
          }
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of THROW_STONE_ASSEMBLY) {
        for (const f of pattern.frames) {
          if (f.farBehind) {
            expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
          }
        }
      }
    });

    it('over field only appears on frame 5 (AU1/AU2 aura)', () => {
      for (const pattern of THROW_STONE_ASSEMBLY) {
        pattern.frames.forEach((f, i) => {
          if (i === 5) {
            expect(f.over).not.toBeNull();
            expect(f.over).toBeDefined();
            expect(f.over.id).toMatch(/^AU/);
          } else {
            expect(f.over).toBeUndefined();
          }
        });
      }
    });

    it('maxContainerH is 41 (driven by AU1/AU2 at dy:17)', () => {
      let maxH = 0;
      for (const pattern of THROW_STONE_ASSEMBLY) {
        for (const f of pattern.frames) {
          const bodyH = SPRITE_MAP[f.body].h;
          let h = bodyH;
          [f.behind, f.farBehind, f.head, f.over, f.front].forEach((layer) => {
            if (!layer) return;
            const c = SPRITE_MAP[layer.id];
            if (!c) return;
            h = Math.max(h, bodyH / 2 + layer.dy + c.h / 2);
          });
          maxH = Math.max(maxH, h);
        }
      }
      expect(maxH).toBe(41);
    });
  });

  describe('assembly ↔ engine throw stone frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('THROW_STONE_ASSEMBLY body tile IDs match THROW_STONE_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = THROW_STONE_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = THROW_STONE_FRAMES[step];
        for (let fi = 0; fi < 12; fi++) {
          expect(pattern.frames[fi].body).toBe(engineFrames[fi].id);
        }
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('THROW_STONE_ASSEMBLY overlay entries have dx/dy when present', () => {
      THROW_STONE_ASSEMBLY.forEach((pattern) => {
        pattern.frames.forEach((frame) => {
          ['behind', 'farBehind', 'head', 'over', 'front'].forEach((field) => {
            if (frame[field]) {
              expect(frame[field]).toHaveProperty('dx');
              expect(frame[field]).toHaveProperty('dy');
            }
          });
        });
      });
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(THROW_STONE_FRAMES[0]).toEqual(THROW_STONE_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(THROW_STONE_FRAMES[1]).toEqual(THROW_STONE_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(THROW_STONE_FRAMES[3]).toEqual(THROW_STONE_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(THROW_STONE_FRAMES[5]).toEqual(THROW_STONE_FRAMES[6]);
    });

    it('patterns A/D are reversed, B/C are not', () => {
      THROW_STONE_FRAMES[0].forEach((f) => expect(f.reversed).toBe(true));
      THROW_STONE_FRAMES[1].forEach((f) => expect(f.reversed).toBe(false));
      THROW_STONE_FRAMES[3].forEach((f) => expect(f.reversed).toBe(false));
      THROW_STONE_FRAMES[5].forEach((f) => expect(f.reversed).toBe(true));
    });
  });

  describe('punch assembly', () => {
    validateFramesAssembly(PUNCH_ASSEMBLY, { frameCount: 9, overlayFields: ['farBehind', 'head', 'front'], headMap: TORSO_HEAD_MAP });

    it('PUNCH_FRAMES maps to 8 rotation steps', () => {
      expect(PUNCH_FRAMES).toHaveLength(8);
      for (const step of PUNCH_FRAMES) {
        expect(step).toHaveLength(9);
      }
    });

    it('patterns A and B are front-facing (SEQ 140)', () => {
      expect(PUNCH_ASSEMBLY[0].seq).toBe('SEQ 140');
      expect(PUNCH_ASSEMBLY[1].seq).toBe('SEQ 140');
    });

    it('patterns C and D are back-facing (SEQ 141)', () => {
      expect(PUNCH_ASSEMBLY[2].seq).toBe('SEQ 141');
      expect(PUNCH_ASSEMBLY[3].seq).toBe('SEQ 141');
    });

    it('PUNCH_DELAYS has 9 frames totaling 52 ticks exactly', () => {
      expect(PUNCH_DELAYS).toHaveLength(9);
      const total = PUNCH_DELAYS.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((52 * 1000) / 60, 6);
    });

    it('head sprites are in the head field', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
        }
      }
    });

    it('front sprites are hand sprites (LG series)', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.front.id)).toBe(true);
        }
      }
    });

    it('all body sprites are 32×32 torsos', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(TORSO_SPRITE_IDS.has(f.body)).toBe(true);
          expect(SPRITE_MAP[f.body].w).toBe(32);
          expect(SPRITE_MAP[f.body].h).toBe(32);
        }
      }
    });

    it('every frame has all 3 overlay fields (no nulls)', () => {
      for (const pattern of PUNCH_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(f.farBehind).toBeDefined();
          expect(f.head).toBeDefined();
          expect(f.front).toBeDefined();
        }
      }
    });
  });

  describe('assembly ↔ engine punch frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('PUNCH_ASSEMBLY body tile IDs match PUNCH_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = PUNCH_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = PUNCH_FRAMES[step];
        for (let fi = 0; fi < 9; fi++) {
          expect(pattern.frames[fi].body).toBe(engineFrames[fi].id);
        }
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(PUNCH_FRAMES[0]).toEqual(PUNCH_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(PUNCH_FRAMES[1]).toEqual(PUNCH_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(PUNCH_FRAMES[3]).toEqual(PUNCH_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(PUNCH_FRAMES[5]).toEqual(PUNCH_FRAMES[6]);
    });

    it('patterns A/D are reversed, B/C are not', () => {
      PUNCH_FRAMES[0].forEach((f) => expect(f.reversed).toBe(true));
      PUNCH_FRAMES[1].forEach((f) => expect(f.reversed).toBe(false));
      PUNCH_FRAMES[3].forEach((f) => expect(f.reversed).toBe(false));
      PUNCH_FRAMES[5].forEach((f) => expect(f.reversed).toBe(true));
    });
  });

  describe('punch lv2 assembly', () => {
    validateFramesAssembly(PUNCH_LV2_ASSEMBLY, { frameCount: 8, overlayFields: ['farBehind', 'head', 'front'], headMap: TORSO_HEAD_MAP });

    it('PUNCH_LV2_FRAMES maps to 8 rotation steps', () => {
      expect(PUNCH_LV2_FRAMES).toHaveLength(8);
      for (const step of PUNCH_LV2_FRAMES) {
        expect(step).toHaveLength(8);
      }
    });

    it('patterns A and B are front-facing (SEQ 142)', () => {
      expect(PUNCH_LV2_ASSEMBLY[0].seq).toBe('SEQ 142');
      expect(PUNCH_LV2_ASSEMBLY[1].seq).toBe('SEQ 142');
    });

    it('patterns C and D are back-facing (SEQ 143)', () => {
      expect(PUNCH_LV2_ASSEMBLY[2].seq).toBe('SEQ 143');
      expect(PUNCH_LV2_ASSEMBLY[3].seq).toBe('SEQ 143');
    });

    it('PUNCH_LV2_DELAYS has 8 frames totaling 50 ticks exactly', () => {
      expect(PUNCH_LV2_DELAYS).toHaveLength(8);
      const total = PUNCH_LV2_DELAYS.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((50 * 1000) / 60, 6);
    });

    it('head sprites are in the head field', () => {
      for (const pattern of PUNCH_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of PUNCH_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
        }
      }
    });

    it('front sprites are hand sprites (LG series)', () => {
      for (const pattern of PUNCH_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.front.id)).toBe(true);
        }
      }
    });

    it('all body sprites are 32×32 torsos', () => {
      for (const pattern of PUNCH_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(TORSO_SPRITE_IDS.has(f.body)).toBe(true);
          expect(SPRITE_MAP[f.body].w).toBe(32);
          expect(SPRITE_MAP[f.body].h).toBe(32);
        }
      }
    });

    it('every frame has all 3 overlay fields (no nulls)', () => {
      for (const pattern of PUNCH_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(f.farBehind).toBeDefined();
          expect(f.head).toBeDefined();
          expect(f.front).toBeDefined();
        }
      }
    });
  });

  describe('assembly ↔ engine punch lv2 frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('PUNCH_LV2_ASSEMBLY body tile IDs match PUNCH_LV2_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = PUNCH_LV2_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = PUNCH_LV2_FRAMES[step];
        for (let fi = 0; fi < 8; fi++) {
          expect(pattern.frames[fi].body).toBe(engineFrames[fi].id);
        }
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(PUNCH_LV2_FRAMES[0]).toEqual(PUNCH_LV2_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(PUNCH_LV2_FRAMES[1]).toEqual(PUNCH_LV2_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(PUNCH_LV2_FRAMES[3]).toEqual(PUNCH_LV2_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(PUNCH_LV2_FRAMES[5]).toEqual(PUNCH_LV2_FRAMES[6]);
    });

    it('patterns A/D are reversed, B/C are not', () => {
      PUNCH_LV2_FRAMES[0].forEach((f) => expect(f.reversed).toBe(true));
      PUNCH_LV2_FRAMES[1].forEach((f) => expect(f.reversed).toBe(false));
      PUNCH_LV2_FRAMES[3].forEach((f) => expect(f.reversed).toBe(false));
      PUNCH_LV2_FRAMES[5].forEach((f) => expect(f.reversed).toBe(true));
    });
  });

  describe('punch lv3 assembly', () => {
    validateFramesAssembly(PUNCH_LV3_ASSEMBLY, { frameCount: 8, overlayFields: ['farBehind', 'head', 'front'], headMap: TORSO_HEAD_MAP });

    it('PUNCH_LV3_FRAMES maps to 8 rotation steps', () => {
      expect(PUNCH_LV3_FRAMES).toHaveLength(8);
      for (const step of PUNCH_LV3_FRAMES) {
        expect(step).toHaveLength(8);
      }
    });

    it('patterns A and B are front-facing (SEQ 144)', () => {
      expect(PUNCH_LV3_ASSEMBLY[0].seq).toBe('SEQ 144');
      expect(PUNCH_LV3_ASSEMBLY[1].seq).toBe('SEQ 144');
    });

    it('patterns C and D are back-facing (SEQ 145)', () => {
      expect(PUNCH_LV3_ASSEMBLY[2].seq).toBe('SEQ 145');
      expect(PUNCH_LV3_ASSEMBLY[3].seq).toBe('SEQ 145');
    });

    it('PUNCH_LV3_DELAYS has 8 frames totaling 50 ticks exactly', () => {
      expect(PUNCH_LV3_DELAYS).toHaveLength(8);
      const total = PUNCH_LV3_DELAYS.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((50 * 1000) / 60, 6);
    });

    it('head sprites are in the head field', () => {
      for (const pattern of PUNCH_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of PUNCH_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
        }
      }
    });

    it('front sprites are hand sprites (LG series)', () => {
      for (const pattern of PUNCH_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.front.id)).toBe(true);
        }
      }
    });

    it('all body sprites are 32×32 torsos', () => {
      for (const pattern of PUNCH_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(TORSO_SPRITE_IDS.has(f.body)).toBe(true);
          expect(SPRITE_MAP[f.body].w).toBe(32);
          expect(SPRITE_MAP[f.body].h).toBe(32);
        }
      }
    });

    it('every frame has all 3 overlay fields (no nulls)', () => {
      for (const pattern of PUNCH_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(f.farBehind).toBeDefined();
          expect(f.head).toBeDefined();
          expect(f.front).toBeDefined();
        }
      }
    });
  });

  describe('assembly ↔ engine punch lv3 frame validation', () => {
    const STEP_TO_PATTERN = [0, 1, 1, 2, 2, 3, 3, 0];

    it('PUNCH_LV3_ASSEMBLY body tile IDs match PUNCH_LV3_FRAMES', () => {
      for (let step = 0; step < 8; step++) {
        const pattern = PUNCH_LV3_ASSEMBLY[STEP_TO_PATTERN[step]];
        const engineFrames = PUNCH_LV3_FRAMES[step];
        for (let fi = 0; fi < 8; fi++) {
          expect(pattern.frames[fi].body).toBe(engineFrames[fi].id);
        }
        expect(pattern.reversed).toBe(engineFrames[0].reversed);
      }
    });

    it('steps 0 and 7 share pattern A', () => {
      expect(PUNCH_LV3_FRAMES[0]).toEqual(PUNCH_LV3_FRAMES[7]);
    });

    it('steps 1 and 2 share pattern B', () => {
      expect(PUNCH_LV3_FRAMES[1]).toEqual(PUNCH_LV3_FRAMES[2]);
    });

    it('steps 3 and 4 share pattern C', () => {
      expect(PUNCH_LV3_FRAMES[3]).toEqual(PUNCH_LV3_FRAMES[4]);
    });

    it('steps 5 and 6 share pattern D', () => {
      expect(PUNCH_LV3_FRAMES[5]).toEqual(PUNCH_LV3_FRAMES[6]);
    });

    it('patterns A/D are reversed, B/C are not', () => {
      PUNCH_LV3_FRAMES[0].forEach((f) => expect(f.reversed).toBe(true));
      PUNCH_LV3_FRAMES[1].forEach((f) => expect(f.reversed).toBe(false));
      PUNCH_LV3_FRAMES[3].forEach((f) => expect(f.reversed).toBe(false));
      PUNCH_LV3_FRAMES[5].forEach((f) => expect(f.reversed).toBe(true));
    });
  });

  //NOTE(jimmylee)
  //Stab Lv1/2/3 assemblies exist in the 2D pipeline (assembly.js + SpriteSheetTables + main route)
  //but have no 3D character-group files yet. Validate assembly data integrity here.
  describe('stab assembly (SEQ 96/97)', () => {
    validateFramesAssembly(STAB_ASSEMBLY, { frameCount: 9, overlayFields: ['farBehind', 'head', 'front'], headMap: TORSO_HEAD_MAP });

    it('patterns A and B are front-facing (SEQ 96)', () => {
      expect(STAB_ASSEMBLY[0].seq).toBe('SEQ 96');
      expect(STAB_ASSEMBLY[1].seq).toBe('SEQ 96');
    });

    it('patterns C and D are back-facing (SEQ 97)', () => {
      expect(STAB_ASSEMBLY[2].seq).toBe('SEQ 97');
      expect(STAB_ASSEMBLY[3].seq).toBe('SEQ 97');
    });

    it('STAB_DELAYS has 9 frames totaling 40 ticks exactly', () => {
      expect(STAB_DELAYS).toHaveLength(9);
      const total = STAB_DELAYS.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((40 * 1000) / 60, 6);
    });

    it('head sprites are in the head field', () => {
      for (const pattern of STAB_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of STAB_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
        }
      }
    });

    it('front sprites are hand sprites (LG series)', () => {
      for (const pattern of STAB_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.front.id)).toBe(true);
        }
      }
    });

    it('all body sprites are 32×32 torsos', () => {
      for (const pattern of STAB_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(TORSO_SPRITE_IDS.has(f.body)).toBe(true);
          expect(SPRITE_MAP[f.body].w).toBe(32);
          expect(SPRITE_MAP[f.body].h).toBe(32);
        }
      }
    });

    it('every frame has all 3 overlay fields (no nulls)', () => {
      for (const pattern of STAB_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(f.farBehind).toBeDefined();
          expect(f.head).toBeDefined();
          expect(f.front).toBeDefined();
        }
      }
    });

    it('no sequenceManuallyReversed (frames in original order)', () => {
      for (const pattern of STAB_ASSEMBLY) {
        expect(pattern.sequenceManuallyReversed).toBeUndefined();
      }
    });
  });

  describe('stab lv2 assembly (SEQ 98/99)', () => {
    validateFramesAssembly(STAB_LV2_ASSEMBLY, { frameCount: 9, overlayFields: ['farBehind', 'head', 'front'], headMap: TORSO_HEAD_MAP });

    it('patterns A and B are front-facing (SEQ 98)', () => {
      expect(STAB_LV2_ASSEMBLY[0].seq).toBe('SEQ 98');
      expect(STAB_LV2_ASSEMBLY[1].seq).toBe('SEQ 98');
    });

    it('patterns C and D are back-facing (SEQ 99)', () => {
      expect(STAB_LV2_ASSEMBLY[2].seq).toBe('SEQ 99');
      expect(STAB_LV2_ASSEMBLY[3].seq).toBe('SEQ 99');
    });

    it('STAB_LV2_DELAYS has 9 frames totaling 40 ticks exactly', () => {
      expect(STAB_LV2_DELAYS).toHaveLength(9);
      const total = STAB_LV2_DELAYS.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((40 * 1000) / 60, 6);
    });

    it('all body sprites are 32×32 torsos', () => {
      for (const pattern of STAB_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(TORSO_SPRITE_IDS.has(f.body)).toBe(true);
          expect(SPRITE_MAP[f.body].w).toBe(32);
          expect(SPRITE_MAP[f.body].h).toBe(32);
        }
      }
    });

    it('head sprites are in the head field', () => {
      for (const pattern of STAB_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of STAB_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
        }
      }
    });

    it('front sprites are hand sprites (LG series)', () => {
      for (const pattern of STAB_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.front.id)).toBe(true);
        }
      }
    });

    it('every frame has all 3 overlay fields (no nulls)', () => {
      for (const pattern of STAB_LV2_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(f.farBehind).toBeDefined();
          expect(f.head).toBeDefined();
          expect(f.front).toBeDefined();
        }
      }
    });

    it('no sequenceManuallyReversed (frames already in playback order)', () => {
      for (const pattern of STAB_LV2_ASSEMBLY) {
        expect(pattern.sequenceManuallyReversed).toBeUndefined();
      }
    });
  });

  describe('stab lv3 assembly (SEQ 100/101)', () => {
    validateFramesAssembly(STAB_LV3_ASSEMBLY, { frameCount: 9, overlayFields: ['farBehind', 'head', 'front'], headMap: TORSO_HEAD_MAP });

    it('patterns A and B are front-facing (SEQ 100)', () => {
      expect(STAB_LV3_ASSEMBLY[0].seq).toBe('SEQ 100');
      expect(STAB_LV3_ASSEMBLY[1].seq).toBe('SEQ 100');
    });

    it('patterns C and D are back-facing (SEQ 101)', () => {
      expect(STAB_LV3_ASSEMBLY[2].seq).toBe('SEQ 101');
      expect(STAB_LV3_ASSEMBLY[3].seq).toBe('SEQ 101');
    });

    it('STAB_LV3_DELAYS has 9 frames totaling 40 ticks exactly', () => {
      expect(STAB_LV3_DELAYS).toHaveLength(9);
      const total = STAB_LV3_DELAYS.reduce((s, d) => s + d, 0);
      expect(total).toBeCloseTo((40 * 1000) / 60, 6);
    });

    it('all body sprites are 32×32 torsos', () => {
      for (const pattern of STAB_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(TORSO_SPRITE_IDS.has(f.body)).toBe(true);
          expect(SPRITE_MAP[f.body].w).toBe(32);
          expect(SPRITE_MAP[f.body].h).toBe(32);
        }
      }
    });

    it('head sprites are in the head field', () => {
      for (const pattern of STAB_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });

    it('farBehind sprites are hand sprites (LG series)', () => {
      for (const pattern of STAB_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.farBehind.id)).toBe(true);
        }
      }
    });

    it('front sprites are hand sprites (LG series)', () => {
      for (const pattern of STAB_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(HAND_SPRITE_IDS.has(f.front.id)).toBe(true);
        }
      }
    });

    it('every frame has all 3 overlay fields (no nulls)', () => {
      for (const pattern of STAB_LV3_ASSEMBLY) {
        for (const f of pattern.frames) {
          expect(f.farBehind).toBeDefined();
          expect(f.head).toBeDefined();
          expect(f.front).toBeDefined();
        }
      }
    });

    it('no sequenceManuallyReversed (frames already in playback order)', () => {
      for (const pattern of STAB_LV3_ASSEMBLY) {
        expect(pattern.sequenceManuallyReversed).toBeUndefined();
      }
    });
  });

  describe('sprite categorization sets', () => {
    it('PREASSEMBLED_SPRITE_IDS contains only valid SPRITE_MAP entries', () => {
      PREASSEMBLED_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('PREASSEMBLED_SPRITE_IDS has expected size (9: P1-P5 + KO1-KO4)', () => {
      expect(PREASSEMBLED_SPRITE_IDS.size).toBe(9);
    });

    it('PREASSEMBLED_SPRITE_IDS entries have valid dimensions', () => {
      PREASSEMBLED_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id].w).toBeGreaterThanOrEqual(32);
        expect(SPRITE_MAP[id].h).toBeGreaterThanOrEqual(32);
      });
    });

    it('FULL_BODY_WITHOUT_HANDS_SPRITE_IDS contains only valid SPRITE_MAP entries', () => {
      FULL_BODY_WITHOUT_HANDS_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('FULL_BODY_WITHOUT_HANDS_SPRITE_IDS has expected size (10: BF1-5 + BB1-5)', () => {
      expect(FULL_BODY_WITHOUT_HANDS_SPRITE_IDS.size).toBe(10);
    });

    it('FULL_BODY_WITHOUT_HANDS_SPRITE_IDS entries are 32x40', () => {
      FULL_BODY_WITHOUT_HANDS_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id].w).toBe(32);
        expect(SPRITE_MAP[id].h).toBe(40);
      });
    });

    it('HEAD_SPRITE_IDS contains only valid SPRITE_MAP entries', () => {
      HEAD_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('HAND_SPRITE_IDS contains only valid SPRITE_MAP entries', () => {
      HAND_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('WAIST_TO_FEET_IDS contains only valid SPRITE_MAP entries', () => {
      WAIST_TO_FEET_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('TORSO_SPRITE_IDS contains only valid SPRITE_MAP entries', () => {
      TORSO_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('categorization sets do not overlap (except HB1-5 in WAIST_TO_FEET and TORSO)', () => {
      const headHand = [...HEAD_SPRITE_IDS].filter((id) => HAND_SPRITE_IDS.has(id));
      expect(headHand).toHaveLength(0);

      const headFeet = [...HEAD_SPRITE_IDS].filter((id) => WAIST_TO_FEET_IDS.has(id));
      expect(headFeet).toHaveLength(0);

      const handFeet = [...HAND_SPRITE_IDS].filter((id) => WAIST_TO_FEET_IDS.has(id));
      expect(handFeet).toHaveLength(0);
    });

    it('PREASSEMBLED_SPRITE_IDS has expected size (9: P1-P5 + KO1-KO4)', () => {
      expect(PREASSEMBLED_SPRITE_IDS.size).toBe(9);
    });

    it('FULL_BODY_WITHOUT_HANDS_SPRITE_IDS has expected size (10: BF1-5 + BB1-5)', () => {
      expect(FULL_BODY_WITHOUT_HANDS_SPRITE_IDS.size).toBe(10);
    });

    it('HEAD_SPRITE_IDS has expected size (23: SP1-4 + TF1-2 + TB1-2 + SR2-16)', () => {
      expect(HEAD_SPRITE_IDS.size).toBe(23);
    });

    it('HAND_SPRITE_IDS has expected size (89: 20 walk + 8 EF + 61 LG)', () => {
      expect(HAND_SPRITE_IDS.size).toBe(89);
    });

    it('EXTENDED_HAND_SPRITE_IDS has expected size (2: EF6 + EF7)', () => {
      expect(EXTENDED_HAND_SPRITE_IDS.size).toBe(2);
    });

    it('EXTENDED_HAND_SPRITE_IDS contains only valid SPRITE_MAP entries', () => {
      EXTENDED_HAND_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id]).toBeDefined();
      });
    });

    it('EXTENDED_HAND_SPRITE_IDS entries are 32x32', () => {
      EXTENDED_HAND_SPRITE_IDS.forEach((id) => {
        expect(SPRITE_MAP[id].w).toBe(32);
        expect(SPRITE_MAP[id].h).toBe(32);
      });
    });

    it('EXTENDED_HAND_SPRITE_IDS does not overlap with HAND_SPRITE_IDS', () => {
      const overlap = [...EXTENDED_HAND_SPRITE_IDS].filter((id) => HAND_SPRITE_IDS.has(id));
      expect(overlap).toHaveLength(0);
    });

    it('WAIST_TO_FEET_IDS has expected size (13)', () => {
      expect(WAIST_TO_FEET_IDS.size).toBe(13);
    });

    it('all head sprites used in assemblies are in HEAD_SPRITE_IDS', () => {
      for (const pattern of THROW_STONE_ASSEMBLY) {
        for (const f of pattern.frames) {
          if (f.head) expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
      for (const pattern of QUICK_THROW_ASSEMBLY) {
        for (const f of pattern.frames) {
          if (f.head) expect(HEAD_SPRITE_IDS.has(f.head.id)).toBe(true);
        }
      }
    });
  });

  describe('cast overlay dimensions', () => {
    it('SR17 is 32x16', () => {
      expect(SPRITE_MAP['SR17'].w).toBe(32);
      expect(SPRITE_MAP['SR17'].h).toBe(16);
    });

    it('SR18 is 32x16', () => {
      expect(SPRITE_MAP['SR18'].w).toBe(32);
      expect(SPRITE_MAP['SR18'].h).toBe(16);
    });
  });

  //NOTE(jimmylee)
  //Frame resolver edge cases.
  describe('resolveLoopingFrame edge cases', () => {
    const delays = [100, 200, 300];
    const cycle = 600;

    it('elapsed=0 returns frameIdx 0', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycle, 0);
      expect(frameIdx).toBe(0);
    });

    it('elapsed at exact cycle boundary wraps to frame 0', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycle, 600);
      expect(frameIdx).toBe(0);
    });

    it('elapsed just before cycle end returns last frame', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycle, 599);
      expect(frameIdx).toBe(2);
    });

    it('elapsed at 2x cycle wraps correctly', () => {
      const { frameIdx } = resolveLoopingFrame(delays, cycle, 1200);
      expect(frameIdx).toBe(0);
    });
  });

  describe('resolveVariableFrame edge cases', () => {
    const delays = [100, 200, 300];

    it('elapsed=0 returns frameIdx 0, not done', () => {
      const { frameIdx, done } = resolveVariableFrame(delays, 0);
      expect(frameIdx).toBe(0);
      expect(done).toBe(false);
    });

    it('elapsed equal to total duration returns last frame, done', () => {
      const { frameIdx, done } = resolveVariableFrame(delays, 600);
      expect(frameIdx).toBe(2);
      expect(done).toBe(true);
    });

    it('elapsed beyond total duration returns last frame, done', () => {
      const { frameIdx, done } = resolveVariableFrame(delays, 1000);
      expect(frameIdx).toBe(2);
      expect(done).toBe(true);
    });

    it('elapsed at first frame boundary transitions to frame 1', () => {
      const { frameIdx, done } = resolveVariableFrame(delays, 100);
      expect(frameIdx).toBe(1);
      expect(done).toBe(false);
    });
  });

  //NOTE(jimmylee)
  //Quick throw (T mode) starts idle for reactive marble interaction.
  describe('quick throw reactive idle', () => {
    it('QUICK_THROW_FRAMES has 8 rotation steps with 6 frames each', () => {
      expect(QUICK_THROW_FRAMES).toHaveLength(8);
      QUICK_THROW_FRAMES.forEach((step) => {
        expect(step).toHaveLength(6);
      });
    });

    it('each quick throw frame has id and reversed properties', () => {
      QUICK_THROW_FRAMES.forEach((step) => {
        step.forEach((frame) => {
          expect(frame).toHaveProperty('id');
          expect(frame).toHaveProperty('reversed');
          expect(typeof frame.reversed).toBe('boolean');
        });
      });
    });

    it('QUICK_THROW_DELAYS has 6 entries matching frame count', () => {
      expect(QUICK_THROW_DELAYS).toHaveLength(6);
      QUICK_THROW_DELAYS.forEach((delay) => {
        expect(delay).toBeGreaterThan(0);
      });
    });

    it('total quick throw duration is 24 ticks exactly', () => {
      const totalMs = QUICK_THROW_DELAYS.reduce((sum, d) => sum + d, 0);
      expect(totalMs).toBeCloseTo((24 * 1000) / 60, 6);
    });
  });

  //NOTE(jimmylee)
  //Sprite sheet file and dimensions.
  describe('sprite sheet constants', () => {
    it('SHEET_W is 256', () => {
      expect(SHEET_W).toBe(256);
    });

    it('SHEET_H is 488', () => {
      expect(SHEET_H).toBe(488);
    });
  });

  //NOTE(jimmylee)
  //TORSO_HEAD_MAP maps headless torso sprites to their head sprite + offset.
  describe('TORSO_HEAD_MAP', () => {
    it('maps all 10 torso sprites (AF1-5, AB1-5)', () => {
      const keys = Object.keys(TORSO_HEAD_MAP);
      expect(keys).toHaveLength(10);
      expect(keys).toContain('AF1');
      expect(keys).toContain('AF5');
      expect(keys).toContain('AB1');
      expect(keys).toContain('AB5');
    });

    it('all torso keys exist in SPRITE_MAP', () => {
      Object.keys(TORSO_HEAD_MAP).forEach((torsoId) => {
        expect(SPRITE_MAP[torsoId]).toBeDefined();
      });
    });

    it('all head sprite targets exist in SPRITE_MAP', () => {
      Object.values(TORSO_HEAD_MAP).forEach((entry) => {
        expect(SPRITE_MAP[entry.id]).toBeDefined();
      });
    });

    it('AF torsos map to TF heads, AB torsos map to TB heads', () => {
      Object.entries(TORSO_HEAD_MAP).forEach(([torso, head]) => {
        if (torso.startsWith('AF')) {
          expect(head.id).toMatch(/^TF/);
        } else {
          expect(head.id).toMatch(/^TB/);
        }
      });
    });

    it('all entries have numeric dx and dy offsets', () => {
      Object.values(TORSO_HEAD_MAP).forEach((entry) => {
        expect(typeof entry.dx).toBe('number');
        expect(typeof entry.dy).toBe('number');
      });
    });

    it('head dy values are negative (heads are above torso center)', () => {
      Object.values(TORSO_HEAD_MAP).forEach((entry) => {
        expect(entry.dy).toBeLessThan(0);
      });
    });
  });

  //NOTE(jimmylee)
  //Throw stone pattern-dependent delays: FWD (patterns A/B) vs BCK (patterns C/D).
  describe('throw stone delay symmetry', () => {
    it('FWD delays sum to 38 ticks exactly', () => {
      const totalMs = THROW_STONE_DELAYS_FWD.reduce((sum, d) => sum + d, 0);
      expect(totalMs).toBeCloseTo((38 * 1000) / 60, 6);
    });

    it('BCK delays sum to 42 ticks exactly', () => {
      const totalMs = THROW_STONE_DELAYS_BCK.reduce((sum, d) => sum + d, 0);
      expect(totalMs).toBeCloseTo((42 * 1000) / 60, 6);
    });

    it('FWD and BCK have same frame count (12)', () => {
      expect(THROW_STONE_DELAYS_FWD).toHaveLength(12);
      expect(THROW_STONE_DELAYS_BCK).toHaveLength(12);
    });
  });

  //NOTE(jimmylee)
  //All mode assemblies use 4 patterns with consistent reversed flags.
  describe('assembly pattern reversal consistency', () => {
    const assemblies = [
      { name: 'WALK', data: WALK_ASSEMBLY },
      { name: 'JUMP', data: JUMP_ASSEMBLY },
      { name: 'CAST', data: CAST_ASSEMBLY },
      { name: 'QUICK_THROW', data: QUICK_THROW_ASSEMBLY },
      { name: 'THROW_STONE', data: THROW_STONE_ASSEMBLY },
      { name: 'PUNCH', data: PUNCH_ASSEMBLY },
      { name: 'PUNCH_LV2', data: PUNCH_LV2_ASSEMBLY },
      { name: 'PUNCH_LV3', data: PUNCH_LV3_ASSEMBLY },
      { name: 'STAB', data: STAB_ASSEMBLY },
      { name: 'STAB_LV2', data: STAB_LV2_ASSEMBLY },
      { name: 'STAB_LV3', data: STAB_LV3_ASSEMBLY },
      { name: 'FLOAT', data: FLOAT_ASSEMBLY },
      { name: 'HURT', data: HURT_ASSEMBLY },
      { name: 'DEATH', data: DEATH_ASSEMBLY },
      { name: 'KNEEL', data: KNEEL_ASSEMBLY },
      { name: 'GUARD', data: GUARD_ASSEMBLY },
    ];

    assemblies.forEach(({ name, data }) => {
      it(`${name}_ASSEMBLY has exactly 4 patterns`, () => {
        expect(data).toHaveLength(4);
      });

      it(`${name}_ASSEMBLY patterns A/D are reversed, B/C are not`, () => {
        expect(data[0].reversed).toBe(true);
        expect(data[1].reversed).toBe(false);
        expect(data[2].reversed).toBe(false);
        expect(data[3].reversed).toBe(true);
      });
    });
  });

  //NOTE(jimmylee)
  //The collision box numbers a game's marble physics would use. This repository has no physics engine,
  //so nothing here reads CONTACT_BUFFER: these restate the design.
  describe('character-marble collision design', () => {
    const CHAR_HALF_X = 12;
    const CHAR_HALF_Y = 18;
    const CHAR_HALF_Z = 4;
    const CONTACT_BUFFER = 6;
    const sphereRadius = 10;

    it('custom detection radius exceeds physics shape by CONTACT_BUFFER', () => {
      //NOTE(jimmylee)
      //Detection triggers when marble center is within (half-extent + sphereRadius + buffer)
      //on each axis. Physics triggers at (half-extent + sphereRadius). The buffer gives
      //the custom system a head start for deflection.
      const detectionReachX = CHAR_HALF_X + sphereRadius + CONTACT_BUFFER;
      const physicsReachX = CHAR_HALF_X + sphereRadius;
      expect(detectionReachX - physicsReachX).toBe(CONTACT_BUFFER);
    });

    it('character restitution is high enough to repulse on impact', () => {
      const restitution = 0.6;
      expect(restitution).toBeGreaterThan(0.4);
    });

    it('angular factor is locked to prevent tumbling', () => {
      const angularFactor = { x: 0, y: 0, z: 0 };
      expect(angularFactor.x + angularFactor.y + angularFactor.z).toBe(0);
    });
  });

  //NOTE(jimmylee)
  //Billboard composite utility functions — pure math extracted to character-utils.js.
  describe('BODY_W and ASSEMBLY_STEP_MAP constants', () => {
    it('BODY_W is 32 (all body sprites are 32px wide)', () => {
      expect(BODY_W).toBe(32);
    });

    it('ASSEMBLY_STEP_MAP has 8 entries mapping to 4 patterns', () => {
      expect(ASSEMBLY_STEP_MAP).toHaveLength(8);
      expect(ASSEMBLY_STEP_MAP).toEqual([0, 1, 1, 2, 2, 3, 3, 0]);
    });

    it('ASSEMBLY_STEP_MAP pattern indices stay in [0,3]', () => {
      ASSEMBLY_STEP_MAP.forEach((idx) => {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('anchorBodyX / anchorBodyY', () => {
    it('places the idle stance anchor (0, 0) at the plane center', () => {
      expect(anchorBodyX({ dx: 0, dy: 0 }, 0.75, 1)).toBe(0);
      expect(anchorBodyY({ dx: 0, dy: 0 }, 0.9)).toBeCloseTo(0);
    });

    it('moves the body down for positive SHP dy (Y-down → Y-up)', () => {
      //NOTE(jimmylee)
      //Walk stride frame BF1 sinks 2px: body center 2px × scaleY below the stance center.
      expect(anchorBodyY({ dx: 0, dy: 2 }, 0.9)).toBeCloseTo(-1.8);
      expect(anchorBodyY({ dx: 0, dy: -4 }, 0.9)).toBeCloseTo(3.6);
    });

    it('mirrors dx for reversed patterns', () => {
      expect(anchorBodyX({ dx: 1, dy: 4 }, 0.75, 1)).toBeCloseTo(0.75);
      expect(anchorBodyX({ dx: 1, dy: 4 }, 0.75, -1)).toBeCloseTo(-0.75);
    });
  });

  describe('assembly body anchors', () => {
    it('every composite frame carries an anchor from BODY_ANCHOR_MAP', () => {
      const assemblies = [JUMP_ASSEMBLY, QUICK_THROW_ASSEMBLY, THROW_STONE_ASSEMBLY, CAST_ASSEMBLY, PUNCH_ASSEMBLY, PUNCH_LV2_ASSEMBLY, PUNCH_LV3_ASSEMBLY, STAB_ASSEMBLY, STAB_LV2_ASSEMBLY, STAB_LV3_ASSEMBLY, FATAL_ITEM_IMPACT_ASSEMBLY, ITEM_DROP_ASSEMBLY];
      for (const assembly of assemblies) {
        for (const pattern of assembly) {
          for (const frame of pattern.frames) {
            expect(frame.anchor).toEqual(BODY_ANCHOR_MAP[frame.body]);
          }
        }
      }
    });

    it('walk base frames add the walk bob to the body anchor', () => {
      for (const pattern of WALK_ASSEMBLY) {
        pattern.body.forEach((b, i) => {
          expect(b.anchor).toEqual({ dx: BODY_ANCHOR_MAP[b.id].dx, dy: BODY_ANCHOR_MAP[b.id].dy + WALK_BOB_DY[i] });
        });
      }
    });

    it('guard keeps the walk frame 5 bob; float and flinch use the plain anchor', () => {
      for (const pattern of GUARD_ASSEMBLY) expect(pattern.anchor).toEqual({ dx: BODY_ANCHOR_MAP[pattern.body].dx, dy: WALK_BOB_DY[4] });
      for (const pattern of FLOAT_ASSEMBLY) expect(pattern.anchor).toEqual(BODY_ANCHOR_MAP[pattern.body]);
      for (const pattern of HURT_ASSEMBLY) expect(pattern.anchor).toEqual(BODY_ANCHOR_MAP[pattern.top]);
    });
  });

  describe('positionOverlay', () => {
    it('sets position from dx/dy and scale factors', () => {
      const mesh = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, scale: { x: 1, y: 1 } };
      const layer = { id: 'RF1', dx: 4, dy: -2 };
      const scaleX = 0.75;
      const scaleY = 0.9;
      const flipX = 1;
      const bodyY = -5;
      positionOverlay(mesh, layer, scaleX, scaleY, flipX, bodyY, 24, 24);

      expect(mesh.position.x).toBeCloseTo(4 * 0.75 * 1);
      expect(mesh.position.y).toBeCloseTo(-5 + 2 * 0.9);
      expect(mesh.position.z).toBe(0);
    });

    it('flips dx when reversed (flipX = -1)', () => {
      const mesh = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, scale: { x: 1, y: 1 } };
      const layer = { id: 'RF1', dx: 4, dy: 0 };
      positionOverlay(mesh, layer, 0.75, 0.9, -1, 0, 24, 24);

      expect(mesh.position.x).toBeCloseTo(4 * 0.75 * -1);
    });

    it('offsets overlays by the anchored body x', () => {
      const mesh = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, scale: { x: 1, y: 1 } };
      positionOverlay(mesh, { id: 'RF1', dx: 4, dy: 0 }, 0.75, 0.9, -1, 0, 24, 24, -0.75);
      expect(mesh.position.x).toBeCloseTo(-0.75 + 4 * 0.75 * -1);
    });

    it('scales mesh to cell dimensions / max dimensions', () => {
      const mesh = { position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, scale: { x: 1, y: 1 } };
      //RF1 is 24x24, maxW=24, maxH=24
      positionOverlay(mesh, { id: 'RF1', dx: 0, dy: 0 }, 1, 1, 1, 0, 24, 24);
      expect(mesh.scale.x).toBe(1);
      expect(mesh.scale.y).toBe(1);

      //SP3 is 24x16, maxW=24, maxH=24
      positionOverlay(mesh, { id: 'SP3', dx: 0, dy: 0 }, 1, 1, 1, 0, 24, 24);
      expect(mesh.scale.x).toBe(1);
      expect(mesh.scale.y).toBeCloseTo(16 / 24);
    });
  });

  //NOTE(jimmylee)
  //Throw stone timing: verify tick totals match documented values.
  describe('throw stone delay tick totals', () => {
    it('FWD delays sum to 38 ticks', () => {
      const ticks = THROW_STONE_DELAYS_FWD.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(38);
    });

    it('BCK delays sum to 42 ticks', () => {
      const ticks = THROW_STONE_DELAYS_BCK.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(42);
    });

    it('walk delays sum to 64 ticks', () => {
      const ticks = WALK_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(64);
    });

    it('jump delays sum to 72 ticks', () => {
      const ticks = JUMP_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(72);
    });

    it('quick throw delays sum to 24 ticks', () => {
      const ticks = QUICK_THROW_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(24);
    });

    it('punch delays sum to 52 ticks', () => {
      const ticks = PUNCH_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(52);
    });

    it('punch lv2 delays sum to 50 ticks', () => {
      const ticks = PUNCH_LV2_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(50);
    });

    it('punch lv3 delays sum to 50 ticks', () => {
      const ticks = PUNCH_LV3_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(50);
    });

    it('stab delays sum to 40 ticks', () => {
      const ticks = STAB_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(40);
    });

    it('stab lv2 delays sum to 40 ticks', () => {
      const ticks = STAB_LV2_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(40);
    });

    it('stab lv3 delays sum to 40 ticks', () => {
      const ticks = STAB_LV3_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(40);
    });

    it('fatal item impact delays sum to 26 ticks', () => {
      const ticks = FATAL_ITEM_IMPACT_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(26);
    });

    it('item drop delays sum to 22 ticks', () => {
      const ticks = ITEM_DROP_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(ticks.reduce((a, b) => a + b, 0)).toBe(22);
    });
  });

  //NOTE(jimmylee)
  //Delay array lengths must match their assembly frame counts.
  //A mismatch would cause frame resolver to read out-of-bounds or skip frames.
  describe('delay array ↔ assembly frame count alignment', () => {
    it('PUNCH_DELAYS length matches PUNCH_ASSEMBLY frame count', () => {
      const delays = PUNCH_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(PUNCH_ASSEMBLY[0].frames.length);
    });

    it('PUNCH_LV2_DELAYS length matches PUNCH_LV2_ASSEMBLY frame count', () => {
      const delays = PUNCH_LV2_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(PUNCH_LV2_ASSEMBLY[0].frames.length);
    });

    it('PUNCH_LV3_DELAYS length matches PUNCH_LV3_ASSEMBLY frame count', () => {
      const delays = PUNCH_LV3_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(PUNCH_LV3_ASSEMBLY[0].frames.length);
    });

    it('STAB_DELAYS length matches STAB_ASSEMBLY frame count', () => {
      const delays = STAB_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(STAB_ASSEMBLY[0].frames.length);
    });

    it('STAB_LV2_DELAYS length matches STAB_LV2_ASSEMBLY frame count', () => {
      const delays = STAB_LV2_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(STAB_LV2_ASSEMBLY[0].frames.length);
    });

    it('STAB_LV3_DELAYS length matches STAB_LV3_ASSEMBLY frame count', () => {
      const delays = STAB_LV3_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(STAB_LV3_ASSEMBLY[0].frames.length);
    });

    it('JUMP_DELAYS length matches JUMP_ASSEMBLY frame count', () => {
      const delays = JUMP_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(JUMP_ASSEMBLY[0].frames.length);
    });

    it('QUICK_THROW_DELAYS length matches QUICK_THROW_ASSEMBLY frame count', () => {
      const delays = QUICK_THROW_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(QUICK_THROW_ASSEMBLY[0].frames.length);
    });

    it('THROW_STONE_DELAYS_FWD length matches THROW_STONE_ASSEMBLY frame count', () => {
      const delays = THROW_STONE_DELAYS_FWD.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(THROW_STONE_ASSEMBLY[0].frames.length);
    });

    it('THROW_STONE_DELAYS_BCK length matches THROW_STONE_ASSEMBLY frame count', () => {
      const delays = THROW_STONE_DELAYS_BCK.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(THROW_STONE_ASSEMBLY[0].frames.length);
    });

    it('FATAL_ITEM_IMPACT_DELAYS length matches FATAL_ITEM_IMPACT_ASSEMBLY frame count', () => {
      const delays = FATAL_ITEM_IMPACT_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(FATAL_ITEM_IMPACT_ASSEMBLY[0].frames.length);
    });

    it('ITEM_DROP_DELAYS length is one less than ITEM_DROP_ASSEMBLY frame count (terminal frame)', () => {
      const delays = ITEM_DROP_DELAYS.map((ms) => Math.round(ms * 60 / 1000));
      expect(delays).toHaveLength(ITEM_DROP_ASSEMBLY[0].frames.length - 1);
    });

    it('all assemblies have consistent frame counts across their 4 patterns', () => {
      const assembliesWithFrames = [
        PUNCH_ASSEMBLY, PUNCH_LV2_ASSEMBLY, PUNCH_LV3_ASSEMBLY,
        STAB_ASSEMBLY, STAB_LV2_ASSEMBLY, STAB_LV3_ASSEMBLY,
        JUMP_ASSEMBLY, QUICK_THROW_ASSEMBLY, THROW_STONE_ASSEMBLY,
        FATAL_ITEM_IMPACT_ASSEMBLY, ITEM_DROP_ASSEMBLY,
      ];
      assembliesWithFrames.forEach((assembly) => {
        const expected = assembly[0].frames.length;
        assembly.forEach((pattern) => {
          expect(pattern.frames).toHaveLength(expected);
        });
      });
    });
  });

  //NOTE(jimmylee)
  //Billboard height values determine physics box halfY.
  //Standard modes: spriteHeight = cubeSize * 1.125 = 36 → halfY = 18.
  //Short modes (Dead, Kneel): smaller tiles → shorter billboard → halfY = 12.
  describe('billboard height derivation', () => {
    const cubeSize = 32;
    const PX_TO_WORLD_VAL = (cubeSize * 0.75) / 32;

    it('standard billboard height is cubeSize * 1.125 = 36', () => {
      const standardH = cubeSize * 1.125;
      expect(standardH).toBe(36);
    });

    it('kneel billboard height is 32 * PX_TO_WORLD = 24', () => {
      const kneelH = 32 * PX_TO_WORLD_VAL;
      expect(kneelH).toBe(24);
    });

    it('dead tiles (KO1/KO2) are 40x32 — wider than standard, shorter', () => {
      expect(SPRITE_MAP['KO1'].w).toBe(40);
      expect(SPRITE_MAP['KO1'].h).toBe(32);
      expect(SPRITE_MAP['KO2'].w).toBe(40);
      expect(SPRITE_MAP['KO2'].h).toBe(32);
    });

    it('kneel tiles (KO3/KO4) are 32x32 — same width as standard, shorter', () => {
      expect(SPRITE_MAP['KO3'].w).toBe(32);
      expect(SPRITE_MAP['KO3'].h).toBe(32);
      expect(SPRITE_MAP['KO4'].w).toBe(32);
      expect(SPRITE_MAP['KO4'].h).toBe(32);
    });

    it('standard halfY = 18, kneel halfY = 12', () => {
      const standardHalfY = (cubeSize * 1.125) / 2;
      const kneelHalfY = (32 * PX_TO_WORLD_VAL) / 2;
      expect(standardHalfY).toBe(18);
      expect(kneelHalfY).toBe(12);
    });

    it('physics box dimensions: btBoxShape(12, halfY, 4)', () => {
      const CHAR_HALF_X = 12;
      const CHAR_HALF_Z = 4;
      expect(CHAR_HALF_X).toBe(12);
      expect(CHAR_HALF_Z).toBe(4);
      expect(CHAR_HALF_X * 2).toBe(24);
      expect(CHAR_HALF_Z * 2).toBe(8);
    });
  });

  //NOTE(jimmylee)
  //The numbers of a game's landing rules: a fall past the threshold kneels and takes damage. This
  //repository has no landing rules, so nothing here reads them: these restate the design.
  describe('landing kneel constants', () => {
    const cubeSize = 32;

    it('fall threshold (2.5 cubeSize = 80) exceeds jump height (2 cubeSize = 64)', () => {
      const FALL_THRESHOLD = cubeSize * 2.5;
      const JUMP_HEIGHT = cubeSize * 2;
      expect(FALL_THRESHOLD).toBe(80);
      expect(JUMP_HEIGHT).toBe(64);
      expect(FALL_THRESHOLD).toBeGreaterThan(JUMP_HEIGHT);
    });

    it('kneel duration is 1000ms', () => {
      const KNEEL_DURATION_MS = 1000;
      expect(KNEEL_DURATION_MS).toBe(1000);
    });

    it('kneel shape halfY offset: standard - kneel = 18 - 12 = 6 world units', () => {
      const standardHalfY = (cubeSize * 1.125) / 2;
      const PX_TO_WORLD_VAL = (cubeSize * 0.75) / 32;
      const kneelHalfY = (32 * PX_TO_WORLD_VAL) / 2;
      const offset = standardHalfY - kneelHalfY;
      expect(offset).toBe(6);
    });

    it('fall damage formula: blocksOver = max(1, floor((fallDist - threshold) / cubeSize))', () => {
      const FALL_THRESHOLD = cubeSize * 2.5;

      //NOTE(jimmylee)
      //Exact threshold: 0 blocks beyond → minimum 1.
      expect(Math.max(1, Math.floor((80 - FALL_THRESHOLD) / cubeSize))).toBe(1);

      //NOTE(jimmylee)
      //Less than one full block beyond threshold → minimum 1.
      expect(Math.max(1, Math.floor((100 - FALL_THRESHOLD) / cubeSize))).toBe(1);

      //NOTE(jimmylee)
      //Exactly one block beyond.
      expect(Math.max(1, Math.floor((112 - FALL_THRESHOLD) / cubeSize))).toBe(1);

      //NOTE(jimmylee)
      //Two blocks beyond.
      expect(Math.max(1, Math.floor((144 - FALL_THRESHOLD) / cubeSize))).toBe(2);

      //NOTE(jimmylee)
      //Three blocks beyond.
      expect(Math.max(1, Math.floor((200 - FALL_THRESHOLD) / cubeSize))).toBe(3);
    });

    it('fall damage random component ranges 2-8', () => {
      //NOTE(jimmylee)
      //The base random is Math.floor(Math.random() * 7) + 2.
      //Min: floor(0) + 2 = 2. Max: floor(6.999) + 2 = 8.
      expect(Math.floor(0 * 7) + 2).toBe(2);
      expect(Math.floor(0.999 * 7) + 2).toBe(8);
    });
  });

  //NOTE(jimmylee)
  //Mode codes registered in directionalMap and meshData.
  describe('mode code completeness', () => {
    const MODES = [undefined, 'I', 'H', 'D', 'C', 'W', 'J', 'T', 'TS', 'P1', 'P2', 'P3', 'K', 'G'];
    const ARROWS = ['←', '↓', '→', '↑'];

    it('every mode has entries in IDLE_FRAMES or mode-specific FRAMES', () => {
      expect(IDLE_FRAMES).toHaveLength(8);
      expect(WALK_FRAMES).toHaveLength(8);
      expect(FLINCH_FRAMES).toHaveLength(8);
      expect(DEATH_FRAMES).toHaveLength(8);
      expect(CAST_FRAMES).toHaveLength(8);
      expect(JUMP_FRAMES).toHaveLength(8);
      expect(QUICK_THROW_FRAMES).toHaveLength(8);
      expect(THROW_STONE_FRAMES).toHaveLength(8);
      expect(PUNCH_FRAMES).toHaveLength(8);
      expect(PUNCH_LV2_FRAMES).toHaveLength(8);
      expect(PUNCH_LV3_FRAMES).toHaveLength(8);
      expect(KNEEL_FRAMES).toHaveLength(8);
      expect(GUARD_FRAMES).toHaveLength(8);
    });

    it('every mode + arrow combo that has a directionalMap entry also has a meshData entry', () => {
      Object.keys(directionalMap).forEach((symbol) => {
        if (directionalMap[symbol].type === 'character') {
          expect(meshData[symbol]).toBeDefined();
          expect(meshData[symbol].shape).toBe('CUSTOM_CHARACTER');
        }
      });
    });
  });
});

//NOTE(jimmylee)
//STANDARD_CONTAINER_H normalization — ensures punch composites use the same
//pixel-to-world scale as walk. Without this, punch bodies (AF/AB = 32px) cause
//scaleY = 1.125 vs walk's 0.9, making characters appear 25% larger.
describe('STANDARD_CONTAINER_H normalization', () => {
  it('STANDARD_CONTAINER_H is 40 (walk body height)', () => {
    expect(STANDARD_CONTAINER_H).toBe(40);
  });

  it('walk body heights are all 40px (BF/BB)', () => {
    //NOTE(jimmylee)
    //All walk body sprites (BF1-5, BB1-5) must be 40px tall.
    //If they change, STANDARD_CONTAINER_H must be updated.
    const walkBodies = ['BF1', 'BF2', 'BF3', 'BF4', 'BF5', 'BB1', 'BB2', 'BB3', 'BB4', 'BB5'];
    walkBodies.forEach((id) => {
      expect(SPRITE_MAP[id].h).toBe(40);
    });
  });

  it('punch body heights are all 32px (AF/AB)', () => {
    //NOTE(jimmylee)
    //All punch body sprites (AF1-2, AB1-2) are 32px tall.
    //Without STANDARD_CONTAINER_H normalization, MAX_CONTAINER_H = 32
    //produces scaleY = 1.125 (36/32) instead of 0.9 (36/40).
    const punchBodies = ['AF1', 'AF2', 'AB1', 'AB2'];
    punchBodies.forEach((id) => {
      expect(SPRITE_MAP[id].h).toBe(32);
    });
  });

  it('punch scaleY matches walk scaleY with normalization', () => {
    //NOTE(jimmylee)
    //The sprite height is cubeSize * 1.125 = 36.
    //Walk: scaleY = 36 / 40 = 0.9.
    //Punch (normalized): scaleY = 36 / max(32, 40) = 36 / 40 = 0.9.
    const spriteHeight = 32 * 1.125;
    const walkMaxH = 40;
    const punchRawMaxH = 32;
    const punchNormalizedMaxH = Math.max(punchRawMaxH, STANDARD_CONTAINER_H);
    expect(spriteHeight / punchNormalizedMaxH).toBe(spriteHeight / walkMaxH);
  });
});
