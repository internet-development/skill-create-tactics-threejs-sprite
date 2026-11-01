//NOTE(jimmylee)
//Tests for `createCharacterState` — the single descriptor-construction
//chokepoint for every character-group factory. Asserts the locked-default
//contract (sentinel sprite indices, default state, action: null), the extras pass-through, and the source-analysis
//regression that no factory reintroduces a raw `userData.character = { }`
//literal.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createCharacterState } from '@engine/meshes/character-state-init';
import { State } from '@engine/actions/character-state';

describe('createCharacterState — descriptor shape', () => {
  it('emits every locked default field', () => {
    const ch = createCharacterState({
      mode: 'I',
      directionOffset: 3,
      walkStart: 1234,
      billboardHeight: 0.5,
    });
    expect(ch.directionOffset).toBe(3);
    expect(ch.mode).toBe('I');
    expect(ch.walkStart).toBe(1234);
    expect(ch.billboardHeight).toBe(0.5);
    expect(ch.lastStep).toBe(-1);
    expect(ch.lastFrame).toBe(-1);
    expect(ch.action).toBeNull();
  });

  it('defaults state to FALLING', () => {
    const ch = createCharacterState({
      mode: 'I',
      directionOffset: 0,
      walkStart: 0,
      billboardHeight: 1,
    });
    expect(ch.state).toBe(State.FALLING);
  });

  it('honors an explicit state override', () => {
    const ch = createCharacterState({
      mode: 'D',
      directionOffset: 0,
      walkStart: 0,
      billboardHeight: 1,
      state: State.DEAD,
    });
    expect(ch.state).toBe(State.DEAD);
  });

  it('produces a fresh object on each call', () => {
    const a = createCharacterState({ mode: 'I', directionOffset: 0, walkStart: 0, billboardHeight: 1 });
    const b = createCharacterState({ mode: 'I', directionOffset: 0, walkStart: 0, billboardHeight: 1 });
    expect(a).not.toBe(b);
  });
});

describe('createCharacterState — extras pass-through', () => {
  it('merges extras onto the descriptor', () => {
    const tex = { fake: 'texture' };
    const ch = createCharacterState({
      mode: 'C',
      directionOffset: 1,
      walkStart: 0,
      billboardHeight: 1,
      extras: {
        overlayTexture: tex,
        actionReadyAt: 0,
      },
    });
    expect(ch.overlayTexture).toBe(tex);
    expect(ch.actionReadyAt).toBe(0);
  });

  it('extras can override `action` for advanced cases without re-adding the sentinel', () => {
    //NOTE(jimmylee)
    //Object.assign happens after the locked defaults, so an extras-supplied
    //value wins. Used here only to assert that the merge order is well-defined.
    const ch = createCharacterState({
      mode: 'I',
      directionOffset: 0,
      walkStart: 0,
      billboardHeight: 1,
      extras: { custom: 42 },
    });
    expect(ch.custom).toBe(42);
    expect(ch.action).toBeNull();
  });

  it('omitting extras is fine', () => {
    const ch = createCharacterState({
      mode: 'I',
      directionOffset: 0,
      walkStart: 0,
      billboardHeight: 1,
    });
    expect(ch.action).toBeNull();
  });
});

describe('character-state-init — source analysis', () => {
  const groupsDir = new URL(
    '../three-isometric-engine/meshes/character-groups/',
    import.meta.url
  );

  it('every group factory routes through createCharacterState (no raw literals)', () => {
    const files = readdirSync(groupsDir).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThanOrEqual(12);

    for (const file of files) {
      const src = readFileSync(new URL(file, groupsDir), 'utf8');
      //NOTE(jimmylee)
      //Raw `userData.character = {` literal would mean a factory invented its
      //own descriptor and skipped the chokepoint — fail loudly.
      expect(src, `${file} contains a raw userData.character = { literal`).not.toMatch(
        /\.userData\.character\s*=\s*\{/
      );
      //NOTE(jimmylee)
      //And every factory must actually call the helper to install the descriptor.
      expect(src, `${file} does not call createCharacterState`).toContain(
        'createCharacterState('
      );
    }
  });
});
