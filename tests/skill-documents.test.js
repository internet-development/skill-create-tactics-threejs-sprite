//NOTE(@jimmylee)
//The skill as a stranger reads it. A document here is a claim about the code, so these tests run the claims:
//every recipe in references/rebuild-animations.md, every number in its table, every card, every name, path
//and constant a document cites. A failure here means a document went stale, or a change forgot one.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as THREE from 'three';
import * as gltfLoader from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as roomEnvironment from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as kitCore from '@root/assets/tactics-sprite.mjs';
import * as kitThree from '@root/assets/tactics-sprite-three.mjs';
import * as bowModule from '@engine/weapons/bow';
import * as bowMesh from '@engine/weapons/bow-mesh';
import * as catalog from '@engine/debug/sprite-animation-demo-catalog';
import * as stage from '@engine/debug/sprite-animation-demos';
import * as spawnEffect from '@engine/meshes/spawn-effect';
import * as spriteBody from '@engine/physics/sprite-body';
import * as constants from '@engine/constants';
import * as character from '@engine/constants/character';
import * as physics from '@engine/constants/physics';
import * as timelines from '@engine/actions/action-timelines';
import * as held from '@engine/weapons/held-items';
import { solveArc } from '@engine/weapons/ballistics';
import { buildSpriteData } from '@engine/web/sprite-data';
import { respond } from '@engine/web/routes';
import { skillArchiveFiles } from '@engine/web/kit';
import { DEFAULT_AZIMUTH } from '@engine/meshes/character-utils';
import { GAME_ELEVATION } from '@engine/constants/character';

const data = buildSpriteData({ notice: 'test', version: 'test' });
const atlas = kitCore.createAtlas(data);
const files = (...patterns) => execFileSync('git', ['ls-files', '-co', '--exclude-standard', ...patterns], { encoding: 'utf8' }).trim().split('\n').filter((file) => fs.existsSync(file));
const DOCUMENTS = files('*.md').filter((file) => file !== 'NEXT.md');
const SKILL_DOCUMENTS = ['SKILL.md', ...files('references/*.md')];
const REBUILD = fs.readFileSync('references/rebuild-animations.md', 'utf8');

const blocksIn = (text) => [...text.matchAll(/```js\n([\s\S]*?)```/g)].map((match) => match[1]);
const sectionOf = (text, from, to) => text.slice(text.indexOf(from), to ? text.indexOf(to) : undefined);

//NOTE(@jimmylee)
//The recipes as the page gives them, with each import line answered from here.
const MODULES = {
  three: THREE,
  'three/addons/loaders/GLTFLoader.js': gltfLoader,
  'three/addons/environments/RoomEnvironment.js': roomEnvironment,
  './tactics-sprite/tactics-sprite.mjs': kitCore,
  './tactics-sprite/tactics-sprite-three.mjs': kitThree,
  '@engine/weapons/bow': bowModule,
  '@engine/weapons/bow-mesh': bowMesh,
  '@engine/debug/sprite-animation-demo-catalog': catalog,
  '@engine/meshes/spawn-effect': spawnEffect,
  '@engine/physics/sprite-body': spriteBody,
};

function loadRecipes(sheet) {
  const code = blocksIn(sectionOf(REBUILD, '## Rebuild It in Your Scene', '## Every Card')).join('\n');
  const names = [...code.matchAll(/^(?:async )?function (\w+)/gm)].map((match) => match[1]);
  const body = code.replace(/^import (.+) from '(.+)';$/gm, (_, what, from) => {
    if (!MODULES[from]) throw new Error(`No module for ${from}`);
    const binding = what.startsWith('* as ') ? what.slice(5) : what.replace(/ as /g, ': ');
    return `const ${binding} = modules[${JSON.stringify(from)}];`;
  });
  return new Function('modules', 'atlas', 'sheet', `${body}\nreturn { ${names.join(', ')} };`)(MODULES, atlas, sheet);
}

function gameCamera(step = 0) {
  const camera = new THREE.OrthographicCamera(-60, 60, 60, -60, 1, 2000);
  const azimuth = DEFAULT_AZIMUTH + (step * Math.PI) / 4;
  const flat = Math.cos(GAME_ELEVATION) * 400;
  camera.position.set(Math.sin(azimuth) * flat, Math.sin(GAME_ELEVATION) * 400, Math.cos(azimuth) * flat);
  camera.lookAt(0, 18, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

function run(card, seconds, each = () => {}, step = 0) {
  const camera = gameCamera(step);
  for (let frame = 0; frame <= seconds * 60; frame++) {
    card.update(frame / 60, camera);
    each(frame, card);
  }
}

const firstHit = (card, seconds) => {
  let at = -1;
  run(card, seconds, (frame) => {
    if (at < 0 && card.units[1].player.animation.name === 'Taking Damage') at = frame;
  });
  return at;
};

describe('the recipes in references/rebuild-animations.md', () => {
  const recipes = loadRecipes(new THREE.Texture());
  const scene = () => new THREE.Scene();
  const items = { models: new Proxy({}, { get: () => new THREE.BoxGeometry() }), metal: new THREE.MeshBasicMaterial() };

  it('flies what the engine flies', () => {
    expect(recipes.solveArc(80, 2, 160)).toEqual(solveArc(80, 2, 160));
    expect(recipes.solveArc(4000, 0, 10)).toBeNull();
    const [launch, from, out] = [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, {}];
    const expected = timelines.throwStoneFlightPoint(launch, from, 1, 0, 0.05, {}, 10, 20, 0.1);
    expect(recipes.flightPoint(launch, from, { x: 1, z: 0 }, 10, 20, 0.05, 0.1, out)).toEqual(expected);
  });

  it('plays every plain kind', () => {
    for (const name of ['Idle', 'Walk', 'Singing', 'Dead']) run(recipes.createLoopCard(scene(), name), 1);
    const reaction = recipes.createReactionCard(scene(), 'Found Item');
    let starts = 0;
    run(reaction, 3, (frame, built) => {
      if (built.units[0].player.startedAt === frame / 60) starts++;
    });
    expect(starts).toBeGreaterThan(1);
  });

  it('lands a strike on the sequence, with its item in the hand', () => {
    expect(firstHit(recipes.createStrikeCard(scene(), 'Swing High'), 1)).toBe(18);
    const armed = recipes.withItem(scene(), recipes.createStrikeCard(scene(), 'Swing High'), 'Swing High', items);
    run(armed, 0.2);
    expect(armed.mesh.visible).toBe(true);
    expect(armed.mesh.position.length()).toBeGreaterThan(10);
  });

  it('stops a thrust on a shield', () => {
    const built = recipes.createRecoilCard(scene(), 'Thrust Recoil High', 'Shield Block High', { gap: 22, targetFloor: 16 }, items);
    run(built, 3);
    expect(built.units[1].group.position.y).toBe(34);
  });

  it('fires a gun at each height, on its tick', () => {
    for (const [name, height, tick] of [['Gun High', 'high', 24], ['Gun Mid', 'mid', 24], ['Gun Low', 'low', 20]]) expect(firstHit(recipes.createGunCard(scene(), name, height, items), 1), name).toBe(tick);
  });

  it('throws a stone, a heavy stone and a marble', () => {
    const small = catalog.STONE_VARIANTS.small;
    const stoneHit = firstHit(recipes.createThrowStoneCard(scene()), 3);
    expect(Math.abs(stoneHit - small.hitTick)).toBeLessThanOrEqual(2);
    const heavy = catalog.STONE_VARIANTS.heavy;
    const heavyHit = firstHit(recipes.createThrowStoneCard(scene(), { radius: 10, range: 95.9, arc: { vh: 44.72, vv: 44.72, flightS: 80 / 44.72 } }), 4);
    expect(Math.abs(heavyHit - heavy.hitTick)).toBeLessThanOrEqual(2);
    const quick = recipes.createQuickThrowCard(scene());
    run(quick, 4);
    expect(quick.units[0].player.animation.name).toBeDefined();
  });

  it('throws a sword at the moment the catalog plans', () => {
    const { plan } = catalog.SPRITE_DEMOS.find((demo) => demo.title === 'Weapon Throw (WP)');
    const hit = firstHit(recipes.createThrownCard(scene(), 'Weapon Throw', { frame: 4, releaseTick: 18 }, items), 2);
    expect(Math.abs(hit - plan.hitTick)).toBeLessThanOrEqual(1);
  });

  it('throws a marble at the moment the catalog plans, at each height', () => {
    for (const [title, name, options] of [['Item Throw High Release (IR1)', 'Item Throw High Release', { targetFloor: 16 }], ['Item Throw Mid Release (IR2)', 'Item Throw Mid Release', {}], ['Item Throw Low Release (IR3)', 'Item Throw Low Release', { unitFloor: 16 }]]) {
      const { plan } = catalog.SPRITE_DEMOS.find((demo) => demo.title === title);
      const hit = firstHit(recipes.createItemThrowCard(scene(), name, options), 2);
      expect(Math.abs(hit - plan.hitTick), title).toBeLessThanOrEqual(1);
    }
  });

  it('looses a bow and lands the arrow', () => {
    const { plan } = catalog.SPRITE_DEMOS.find((demo) => demo.title === 'Bow Mid (P2)');
    expect(Math.abs(firstHit(recipes.createBowCard(scene(), 'Bow Mid (P2)', 'Bow Mid'), 1.5) - plan.hitTick)).toBeLessThanOrEqual(2);
  });

  it('jumps as high as the engine, on the ticks the engine does', () => {
    const jump = recipes.createJumpCard(scene());
    run(jump, 72 / 60, (frame, { units: [unit] }) => expect(unit.group.position.y - 18, `tick ${frame}`).toBeCloseTo(timelines.jumpLift(frame / 60), 5));
    const leap = catalog.SPRITE_DEMOS.find((demo) => demo.mode === 'HH').leap;
    for (const ticks of [5, 14, 40, 80, 88]) expect(recipes.leapHeight(ticks, 14, 60, 14)).toBeCloseTo(catalog.leapHeight(leap, ticks), 5);
    run(recipes.createLeapCard(scene(), 'High Jump Start', 'High Jump Hold', 14, 60, 14), 3);
    const down = recipes.createJumpDownCard(scene());
    const pair = catalog.SPRITE_DEMOS.find((demo) => demo.mode === 'JD');
    run(down, pair.landTicks / 60, (frame, { units: [unit] }) => {
      const s = Math.max(0, Math.min(1, (frame - pair.leaveTicks) / (pair.landTicks - pair.leaveTicks)));
      expect(unit.group.position.y - 18, `tick ${frame}`).toBeCloseTo(catalog.jumpDownHeight(s), 5);
    });
    run(recipes.createPlayerJumpCard(scene()), 3);
  });

  it('dithers a teleport on a unit of its own', () => {
    const built = recipes.createTeleportCard(scene());
    run(built, 3);
    const materials = new Set();
    built.units[0].group.traverse((object) => object.isMesh && materials.add(object.material));
    expect(materials.size).toBe(6);
  });

  it('reads the shadow and the body', () => {
    const place = recipes.createShadow(scene());
    place(1, 2, 32);
    const opaque = { width: 256, height: 488, data: new Uint8Array(256 * 488 * 4).fill(255) };
    const bodyOf = recipes.createBodies(opaque);
    const unit = kitThree.createTacticsSprite(atlas, new THREE.Texture());
    unit.update(0, gameCamera());
    expect(bodyOf(unit).count).toBeGreaterThan(0);
  });

  it('plays the same anywhere a moved group puts it', () => {
    const place = () => {
      const group = new THREE.Group();
      group.position.set(200, 32, -120);
      group.updateMatrixWorld(true);
      return group;
    };
    const built = recipes.createBowCard(place(), 'Bow Mid (P2)', 'Bow Mid');
    const camera = gameCamera();
    let hitAt = -1;
    for (let frame = 0; frame <= 90; frame++) {
      built.update(frame / 60, camera);
      if (hitAt < 0 && built.units[1].player.animation.name === 'Taking Damage') hitAt = frame;
    }
    const { plan } = catalog.SPRITE_DEMOS.find((demo) => demo.title === 'Bow Mid (P2)');
    expect(Math.abs(hitAt - plan.hitTick)).toBeLessThanOrEqual(2);
    const stone = recipes.createThrowStoneCard(place());
    let peak = 0;
    run(stone, 1, (frame, { units: [unit] }) => {
      peak = Math.max(peak, unit.group.getWorldPosition(new THREE.Vector3()).x);
    });
    expect(peak).toBe(200);
  });

  it('draws a fading unit whole until it fades', () => {
    const built = recipes.createTeleportCard(new THREE.Scene());
    expect(built.units[0].group.children[0].material.userData._spawnProgress.value).toBe(1);
  });

  it('holds its stage numbers to the source', () => {
    const owners = { ...constants, ...character, ...physics, ...timelines, ...catalog, ...held, REST_Y: stage.REST_Y, STRIKE_GAP: stage.STRIKE_GAP };
    const rows = [...sectionOf(REBUILD, '### The Stage in Numbers', '### Flight').matchAll(/^\| `(\w+)` \| (-?[\d.]+) \|/gm)];
    expect(rows.length).toBeGreaterThan(10);
    for (const [, name, value] of rows) expect(owners[name], name).toBe(Number(value));
  });
});

describe('the card table', () => {
  it('lists every card of the catalog, in order', () => {
    const prop = (def) => def.held?.item ?? (def.marble ? 'marble' : def.bag ? 'bag' : def.kind === 'bow' ? 'bow' : def.kind === 'throw' ? 'stone' : def.kind === 'quick-throw' ? 'marble' : '');
    const rows = catalog.SPRITE_DEMOS.map((def) => `| ${def.title} | \`${def.kind}\` | ${prop(def)} |`);
    const table = REBUILD.slice(REBUILD.indexOf('| Card | Kind | Prop |')).trim().split('\n').slice(2);
    expect(table).toEqual(rows);
  });

  it('names a recipe for every kind', () => {
    const kinds = sectionOf(REBUILD, '## Every Card', '| Card | Kind | Prop |');
    for (const { kind } of catalog.SPRITE_DEMOS) expect(kinds, kind).toContain(`\`${kind}\``);
    for (const [, heading] of kinds.matchAll(/^\| `[^|]+ \| "([^"]+)" \|$/gm)) expect(REBUILD, heading).toContain(`### ${heading}`);
  });
});

describe('every document', () => {
  const code = files('*.js', '*.jsx', '*.mjs', '*.ts', '*.tsx', '*.css').map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  it('names only files that exist', () => {
    const roots = /^(references|skills|scripts|documentation|pages|three-isometric-engine|tests|assets|public)\/[\w./\[\]-]+$/;
    for (const document of DOCUMENTS) {
      for (const [, target] of fs.readFileSync(document, 'utf8').matchAll(/`([^`\s]+)`/g)) {
        if (roots.test(target)) expect(fs.existsSync(target.replace(/\/$/, '')), `${document}: ${target}`).toBe(true);
      }
    }
  });

  it('points only at sections that exist', () => {
    const resolve = (from, target) => [target, `three-isometric-engine/${target}`, `${from.slice(0, from.lastIndexOf('/') + 1)}${target}`, `documentation/${target}`, `skills/${target}/SKILL.md`].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
    let followed = 0;
    for (const document of DOCUMENTS) {
      for (const [, target, title] of fs.readFileSync(document, 'utf8').matchAll(/`([\w./-]+\.md|skills\/[\w-]+)` "([^"]+)"/g)) {
        const file = resolve(document, target);
        if (!file) continue;
        followed++;
        expect(fs.readFileSync(file, 'utf8'), `${document}: ${target} "${title}"`).toMatch(new RegExp(`^(?:#+ .*|- )${title.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')}`, 'mi'));
      }
    }
    expect(followed).toBeGreaterThan(30);
  });

  it('names only constants that exist', () => {
    for (const document of DOCUMENTS) {
      for (const [, name] of fs.readFileSync(document, 'utf8').matchAll(/`([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)(?:[`\[.(/])/g)) expect(code.includes(name), `${document}: ${name}`).toBe(true);
    }
  });

  it('imports only what the kit exports', () => {
    const modules = { 'tactics-sprite.mjs': kitCore, 'tactics-sprite-three.mjs': kitThree };
    for (const document of SKILL_DOCUMENTS) {
      for (const [, names, file] of fs.readFileSync(document, 'utf8').matchAll(/import \{ ([^}]+) \} from '[^']*\/(tactics-sprite(?:-three)?\.mjs)'/g)) {
        for (const name of names.split(',').map((entry) => entry.trim())) expect(modules[file][name], `${document}: ${name}`).toBeDefined();
      }
    }
  });

  it('plays only animations that exist', () => {
    const table = sectionOf(fs.readFileSync('references/animations.md', 'utf8'), '## What a Game Plays', '## Props in a Hand');
    const names = [...table.matchAll(/^\| [^|]+ \| ([^|]+) \|/gm)].flatMap(([, cell]) => [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]));
    expect(names.length).toBeGreaterThan(50);
    for (const name of names) expect(() => kitCore.findAnimation(atlas, name), name).not.toThrow();
  });

  it('tells a game every animation it can play', () => {
    const table = sectionOf(fs.readFileSync('references/animations.md', 'utf8'), '## What a Game Plays', '## Props in a Hand');
    const missing = data.animations.map(({ name }) => name).filter((name) => !table.includes(`\`${name}\``) && !/^(Null|Idle )/.test(name));
    expect(missing).toEqual([]);
  });

  it('counts what is there', () => {
    const dataDoc = fs.readFileSync('references/data.md', 'utf8');
    for (const [field, count] of [['cells', data.cells.length], ['frames', data.frames.length], ['sequences', data.sequences.length], ['animations', data.animations.length]]) expect(dataDoc).toMatch(new RegExp(`\\| \`${field}\` \\| ${count} `));
    expect(fs.readFileSync('pages/AGENTS.md', 'utf8')).toContain(`${catalog.SPRITE_DEMOS.length} cards`);
  });
});

//NOTE(@jimmylee)
//The TYPE1 files are partial foundations and the rest was built here, so a reader never needs to leave. An install from the
//site holds what skillArchiveFiles lists, so a path a document needs has to be in it, and a link has to stay
//home. The only hosts below are ours, the one recommendation for a game's rules, and what a license asks for.
describe('the skill stands alone', () => {
  const archive = new Set(skillArchiveFiles(process.cwd()).map((file) => file.path));
  const HOSTS = ['3d.internet.dev', 'set.world', 'localhost'];
  const CREDITS = { 'README.md': ['github.com', 'creativecommons.org', 'int10h.org'], 'pages/AGENTS.md': ['vercel.com', 'int10h.org'] };
  const REPOSITORY_ONLY = /^(tests|public|scripts|pages\/index\.tsx)/;

  it('carries every file its documents name', () => {
    const named = /`((?:references|skills|documentation|three-isometric-engine|tests|public|scripts|pages)\/[\w./\[\]-]+\.\w+|(?:AGENTS|README|LICENSE|NOTICE)\.md)`/g;
    for (const document of SKILL_DOCUMENTS) {
      for (const [, target] of fs.readFileSync(document, 'utf8').matchAll(named)) {
        if (!REPOSITORY_ONLY.test(target)) expect(archive.has(target), `${document}: ${target}`).toBe(true);
      }
    }
    for (const file of ['documentation/AGENTS.md', 'skills/reverse-engineer-type1-binaries/SKILL.md', 'tests/helpers/fft-type1.js', 'LICENSE.md', 'README.md', 'NOTICE.md', 'assets/tactics-sprite-data.json', 'assets/a1.png', 'assets/set-items.glb', 'assets/marble-black.gif']) expect(archive.has(file), file).toBe(true);
    expect([...archive].filter((file) => /^(tests\/fixtures|pages\/.*\.tsx|public)/.test(file) || file === 'NEXT.md')).toEqual([]);
  });

  it('carries everything the engine imports, so a card mounts from it', () => {
    const importers = [...archive].filter((file) => /^three-isometric-engine\/.*\.jsx?$/.test(file) && !file.includes('/components/'));
    expect(importers.length).toBeGreaterThan(40);
    const resolve = (from, spec) => (spec.startsWith('@engine/') ? spec.replace('@engine', 'three-isometric-engine') : path.posix.join(path.posix.dirname(from), spec));
    for (const file of importers) {
      for (const [, spec] of fs.readFileSync(file, 'utf8').matchAll(/from '((?:\.|@engine)[^']*)'/g)) {
        const target = resolve(file, spec);
        expect([target, `${target}.js`, `${target}.jsx`, `${target}/index.js`].some((candidate) => archive.has(candidate)), `${file}: ${spec}`).toBe(true);
      }
    }
  });

  it('sends nobody to another website', () => {
    for (const document of DOCUMENTS) {
      const allowed = [...HOSTS, ...(CREDITS[document] ?? [])];
      for (const [, host] of fs.readFileSync(document, 'utf8').matchAll(/(?:https?:\/\/|\bwww\.)([\w.-]+\.\w+|localhost)/g)) expect(allowed, `${document}: ${host}`).toContain(host);
    }
  });

  it('runs the test a port needs with no network, and gets what the route gives', () => {
    const [, command] = /```sh\n(node --input-type=module[\s\S]*?)```/.exec(sectionOf(fs.readFileSync('references/data.md', 'utf8'), '## Test a Port', '## The Runtime'));
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tactics-port-'));
    try {
      execFileSync(process.execPath, ['scripts/export-sprite-kit.mjs', path.join(folder, 'src/tactics-sprite')], { stdio: 'pipe' });
      const printed = JSON.parse(execFileSync('sh', ['-c', command], { cwd: folder, encoding: 'utf8' }));
      const { animation, view, tick, ...route } = JSON.parse(respond(process.cwd(), { method: 'GET', parts: ['v1', 'draw'], query: { animation: 'Swing High', view: '1', tick: '18' } }).body);
      expect([animation, view, tick]).toEqual(['Swing High', 1, 18]);
      expect(printed).toEqual(route);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});
