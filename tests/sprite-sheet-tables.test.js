//NOTE(jimmylee)
//SpriteSheetTables contract: one table per assembly mode, rendered on the main route.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

describe('constants', () => {
  //NOTE(jimmylee)
  //SpriteSheetTables contract: every assembly mode must have a SpriteSheetTable export
  //AND be rendered on the main route. Skipping this is how sprite bugs reach the engine.
  describe('SpriteSheetTables contract', () => {
    const testDir = dirname(fileURLToPath(import.meta.url));
    const tablesSource = readFileSync(
      resolve(testDir, '../three-isometric-engine/components/SpriteSheetTables.tsx'),
      'utf-8'
    );
    const spritesSource = readFileSync(
      resolve(testDir, '../pages/index.tsx'),
      'utf-8'
    );

    const ASSEMBLY_MODES = ['Idle', 'Float', 'Guard', 'Walk', 'Punch', 'PunchLv2', 'PunchLv3', 'Stab', 'StabLv2', 'StabLv3', 'QuickThrow', 'ThrowStone', 'Kneel', 'Flinch', 'Dead', 'MagicCharge', 'Jump'];

    ASSEMBLY_MODES.forEach((mode) => {
      const fnName = `SpriteSheetTable${mode}`;

      it(`SpriteSheetTables.tsx exports ${fnName}`, () => {
        expect(tablesSource).toContain(`export function ${fnName}`);
      });

      it(`the main route renders <${fnName} />`, () => {
        expect(spritesSource).toContain(`<${fnName}`);
      });
    });
  });
});
