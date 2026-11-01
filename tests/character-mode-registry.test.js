//NOTE(jimmylee)
//Source-analysis regression test for the character mode registry migration.
//Ensures createCharacter.js stays thin (single registry lookup) and every
//built-in mode self-registers from exactly one group-*.js file. A failure here
//means a new `if (mode === 'X')` branch, a direct create*Group import, or a
//missing/duplicated registerCharacterMode call crept back in — all of which
//re-introduce the hand-rolled dispatch this migration deleted.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEQUENCE_MODES } from '@engine/constants/sprites/seq-library';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GROUPS_DIR = join(ROOT, 'three-isometric-engine/meshes/character-groups');
const CREATE_CHARACTER_PATH = join(ROOT, 'three-isometric-engine/meshes/createCharacter.js');

const BUILT_IN_MODES = ['I', 'H', 'D', 'C', 'J', 'T', 'TS', 'P1', 'P2', 'P3', 'S1', 'S2', 'S3', 'FI', 'ID', 'SQ', 'K', 'G', 'FL', 'W', 'A1'];

function readFile(path) {
  return readFileSync(path, 'utf8');
}

describe('character mode registry — createCharacter.js source analysis', () => {
  const source = readFile(CREATE_CHARACTER_PATH);

  it('has no per-mode if-blocks (mode === "X")', () => {
    //NOTE(jimmylee)
    //Previously createCharacter.js contained 14 hand-rolled dispatch branches.
    //The registry migration deleted every one; reintroducing any would defeat
    //the purpose of the registry.
    const modeBranchPattern = /mode\s*===\s*['"][A-Z0-9]+['"]/;
    expect(modeBranchPattern.test(source)).toBe(false);
  });

  it('does not import any create*Group or create*Mesh factory from character-groups/', () => {
    //NOTE(jimmylee)
    //All group factories are looked up via getCharacterModeFactory now, so
    //createCharacter.js should never name any of them directly.
    const namedImportPattern = /import\s*\{[^}]*\b(create[A-Z][A-Za-z0-9]*(?:Group|Mesh))\b[^}]*\}\s*from\s*['"][^'"]*character-groups/;
    expect(namedImportPattern.test(source)).toBe(false);
  });

  it('dispatches modes through a single registry lookup', () => {
    //NOTE(jimmylee)
    //Exactly one `getCharacterModeFactory(mode)` call should drive all mode
    //dispatch. More than one means branching has crept back in.
    const matches = source.match(/getCharacterModeFactory\s*\(/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('imports getCharacterModeFactory from @engine/common/registry', () => {
    expect(/import\s*\{[^}]*\bgetCharacterModeFactory\b[^}]*\}\s*from\s*['"]@engine\/common\/registry['"]/.test(source)).toBe(true);
  });
});

describe('character mode registry — group-*.js self-registration', () => {
  const groupFiles = readdirSync(GROUPS_DIR).filter((f) => f.startsWith('group-') && f.endsWith('.js'));
  const registrations = new Map(); // mode -> file
  const filesWithRegistration = new Set();

  for (const file of groupFiles) {
    const source = readFile(join(GROUPS_DIR, file));
    const pattern = /registerCharacterMode\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const mode = match[1];
      if (registrations.has(mode)) {
        registrations.set(mode, `${registrations.get(mode)}, ${file}`);
      } else {
        registrations.set(mode, file);
      }
      filesWithRegistration.add(file);
    }
  }

  it('registers every built-in mode exactly once', () => {
    for (const mode of BUILT_IN_MODES) {
      expect(registrations.has(mode)).toBe(true);
      //NOTE(jimmylee)
      //A comma in the value means the same mode was registered from multiple
      //files — the registry dispatch table would shadow all but the last.
      expect(registrations.get(mode)).not.toContain(',');
    }
  });

  it('registers exactly the built-in modes (no extras, no missing)', () => {
    expect(registrations.size).toBe(BUILT_IN_MODES.length);
    const registeredModes = new Set(registrations.keys());
    for (const mode of BUILT_IN_MODES) {
      expect(registeredModes.has(mode)).toBe(true);
    }
  });

  it('every group-*.js file participates in registration', () => {
    //NOTE(jimmylee)
    //A group file that does not self-register is dead code from the registry's
    //perspective — createCharacter.js can no longer reach it.
    for (const file of groupFiles) {
      expect(filesWithRegistration.has(file)).toBe(true);
    }
  });

  it('mode I lives in group-walk.js (walk-in-place)', () => {
    expect(registrations.get('I')).toBe('group-walk.js');
  });

  it('mode W lives in group-walk.js (walking NPC reuses walk)', () => {
    expect(registrations.get('W')).toBe('group-walk.js');
  });

  it('mode A1 lives in group-walk.js (player reuses walk)', () => {
    expect(registrations.get('A1')).toBe('group-walk.js');
  });

  it('mode H lives in group-flinch.js', () => {
    expect(registrations.get('H')).toBe('group-flinch.js');
  });

  it('mode D lives in group-dead.js', () => {
    expect(registrations.get('D')).toBe('group-dead.js');
  });

  it('mode K lives in group-kneel.js', () => {
    expect(registrations.get('K')).toBe('group-kneel.js');
  });

  it('mode C lives in group-magic-charge.js', () => {
    expect(registrations.get('C')).toBe('group-magic-charge.js');
  });

  it('mode J lives in group-jump.js', () => {
    expect(registrations.get('J')).toBe('group-jump.js');
  });

  it('mode T lives in group-quick-throw.js', () => {
    expect(registrations.get('T')).toBe('group-quick-throw.js');
  });

  it('mode TS lives in group-throw-stone.js', () => {
    expect(registrations.get('TS')).toBe('group-throw-stone.js');
  });

  it('mode P1 lives in group-punch.js', () => {
    expect(registrations.get('P1')).toBe('group-punch.js');
  });

  it('mode P2 lives in group-punch-lv2.js', () => {
    expect(registrations.get('P2')).toBe('group-punch-lv2.js');
  });

  it('mode P3 lives in group-punch-lv3.js', () => {
    expect(registrations.get('P3')).toBe('group-punch-lv3.js');
  });

  it('mode G lives in group-guard.js', () => {
    expect(registrations.get('G')).toBe('group-guard.js');
  });
});

describe('character mode registry — runtime dispatch', () => {
  //NOTE(jimmylee)
  //Complements the source-analysis tests by asserting the registry is actually
  //populated at runtime after importing createCharacter.js. A group-*.js file
  //that exports a factory but forgets to call registerCharacterMode will pass
  //the source tests and fail here.
  it('getCharacterModeFactory resolves every built-in mode after importing createCharacter', async () => {
    await import('@engine/meshes/createCharacter');
    const { getCharacterModeFactory } = await import('@engine/common/registry');
    for (const mode of BUILT_IN_MODES) {
      expect(typeof getCharacterModeFactory(mode)).toBe('function');
    }
  });

  //NOTE(@jimmylee)
  //group-sequence.js registers these from the table, so the source scan above does not see them.
  it('every SEQUENCE_MODES row registers a mode, with a code of its own', async () => {
    await import('@engine/meshes/createCharacter');
    const { getCharacterModeFactory, getMeshData } = await import('@engine/common/registry');
    const modes = SEQUENCE_MODES.map((m) => m.mode);
    expect(new Set([...modes, ...BUILT_IN_MODES]).size).toBe(modes.length + BUILT_IN_MODES.length);
    for (const mode of modes) {
      expect(typeof getCharacterModeFactory(mode), mode).toBe('function');
      for (const arrow of ['↓', '↑', '→', '←']) expect(getMeshData(`${arrow}${mode}`), mode).not.toBe(null);
    }
  });
});
