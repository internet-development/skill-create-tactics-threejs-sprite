//NOTE(@jimmylee)
//The web service as a stranger meets it: what it refuses to serve, whether a link in the skill leads anywhere,
//and whether the installable archive matches the digest published for it. Routes are pure, so these call them
//with no server.

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { respond } from '@engine/web/routes';
import { skillFrontmatter } from '@engine/web/site-files';

const ROOT = process.cwd();
const get = (parts, query) => respond(ROOT, { method: 'GET', parts, query });
const site = (file) => get(['site', ...file.split('/')]);
const api = (...parts) => get(['v1', ...parts]);
const jsonOf = (response) => JSON.parse(response.body.toString());

function tarNames(gz) {
  const tar = zlib.gunzipSync(gz);
  const names = [];
  for (let o = 0; o + 512 <= tar.length; ) {
    const name = tar.toString('utf8', o, o + 100).replace(/\0.*$/, '');
    if (!name) break;
    names.push(name);
    o += 512 + Math.ceil(parseInt(tar.toString('latin1', o + 124, o + 135), 8) / 512) * 512;
  }
  return names;
}

describe('agent documents', () => {
  it('llms.txt has the llmstxt.org shape and links only real routes', () => {
    const lines = site('llms.txt').body.split('\n');
    expect(lines[0]).toMatch(/^# /);
    expect(lines[2]).toMatch(/^> /);
    const links = [...site('llms.txt').body.matchAll(/\]\(https:\/\/3d\.internet\.dev\/([^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(15);
    for (const link of links) {
      const [pathname, search] = link.split('?');
      const query = Object.fromEntries(new URLSearchParams(search));
      const response = pathname.startsWith('api/') ? get(pathname.split('/').slice(1), query) : site(pathname);
      expect(response.status, link).toBe(200);
    }
  });

  it('llms-full.txt carries the skill and every reference', () => {
    const full = site('llms-full.txt').body;
    expect(full).toContain('name: create-tactics-threejs-sprite');
    for (const file of fs.readdirSync('references')) expect(full).toContain(`/references/${file}`);
  });

  it('every OpenAPI route answers', () => {
    const { paths } = jsonOf(site('openapi.json'));
    const samples = { '{id}': 'P1', '{index}': '93', '{seq}': '102', '{name}': 'Swing High' };
    for (const [route, operations] of Object.entries(paths)) {
      if (!operations.get) continue;
      const parts = route.split('/').slice(2).map((part) => samples[part] ?? part);
      const response = get(parts, route.endsWith('draw') ? { animation: 'Walk' } : {});
      expect(response.status, route).toBe(200);
    }
  });

  it('the skill index digest is the digest of the archive it names', () => {
    const { skills } = jsonOf(site('.well-known/agent-skills/index.json'));
    expect(skills).toHaveLength(1);
    const [skill] = skills;
    const archive = site(`.well-known/agent-skills/${skill.url}`).body;
    expect(skill.digest).toBe(`sha256:${crypto.createHash('sha256').update(archive).digest('hex')}`);
    expect(skill.description.length).toBeLessThanOrEqual(1024);
    expect(tarNames(archive)).toEqual(expect.arrayContaining(['SKILL.md', 'NOTICE.md', 'references/data.md', 'assets/tactics-sprite.mjs', 'assets/tactics-sprite-data.json', 'assets/a1.png']));
  });

  it('builds the same archive bytes twice', () => {
    expect(zlib.gunzipSync(site('.well-known/agent-skills/create-tactics-threejs-sprite.tar.gz').body).length % 512).toBe(0);
    const again = respond(`${ROOT}/.`, { method: 'GET', parts: ['site', '.well-known', 'agent-skills', 'create-tactics-threejs-sprite.tar.gz'] }).body;
    expect(Buffer.compare(again, site('.well-known/agent-skills/create-tactics-threejs-sprite.tar.gz').body)).toBe(0);
  });
});

describe('what the site refuses', () => {
  it('serves nothing that is not on its list', () => {
    for (const file of ['NEXT.md', 'package.json', '.env', '.git/config', '../README.md', 'references/../NEXT.md', 'references/../../etc/passwd', 'public/static/textures/a1.png', 'scripts/export-sprite-kit.mjs', 'assets/nope.mjs']) expect(site(file).status, file).toBe(404);
  });

  it('allows only reads, and a POST only on the sheet check', () => {
    expect(respond(ROOT, { method: 'POST', parts: ['v1', 'cells'] }).status).toBe(405);
    expect(respond(ROOT, { method: 'DELETE', parts: ['site', 'SKILL.md'] }).status).toBe(405);
    expect(respond(ROOT, { method: 'GET', parts: ['v1', 'sheets', 'check'] }).status).toBe(405);
    expect(respond(ROOT, { method: 'POST', parts: ['v1', 'sheets', 'check'], body: new Uint8Array() }).status).toBe(400);
  });

  it('rejects bad parameters with a 4xx', () => {
    expect(api('draw').status).toBe(400);
    expect(get(['v1', 'draw'], { animation: 'Walk', view: '9' }).status).toBe(400);
    expect(get(['v1', 'draw'], { animation: 'Walk', tick: '-1' }).status).toBe(400);
    expect(get(['v1', 'draw'], { animation: 'No Such Move' }).status).toBe(404);
    expect(get(['v1', 'sheet-template.svg'], { scale: '999999' }).status).toBe(400);
    expect(api('frames', '364').status).toBe(404);
    expect(api('sequences', '218').status).toBe(404);
  });

  it('keeps the copyright notice with every table', () => {
    const readme = fs.readFileSync('README.md', 'utf8');
    for (const parts of [['data'], ['cells'], ['frames'], ['frames', '1'], ['sequences'], ['sequences', '6'], ['animations'], ['animations', 'Walk']]) {
      const { notice } = jsonOf(api(...parts));
      expect(readme, parts.join('/')).toContain(notice.split('\n')[0]);
    }
    const names = tarNames(api('kit.tar.gz').body);
    expect(names).toContain('NOTICE.md');
  });
});

describe('the draw route', () => {
  it('names the tiles and the hit frame of a known moment', () => {
    const pose = jsonOf(get(['v1', 'draw'], { animation: 'Swing High', view: '1', tick: '18' }));
    expect([pose.shp, pose.frame, pose.mirrored, pose.fb, pose.tiles.length]).toEqual([88, 5, false, 2, 4]);
  });
});

describe('the kit export', () => {
  it('writes the same files as the download, refuses to overwrite, and carries no grips for another sheet', () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tactics-kit-'));
    try {
      const run = (...args) => execFileSync(process.execPath, ['scripts/export-sprite-kit.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' });
      run(folder);
      expect(fs.readdirSync(folder).sort()).toEqual(tarNames(api('kit.tar.gz').body).sort());
      expect(fs.readFileSync(path.join(folder, 'NOTICE.md'), 'utf8')).toContain('Permission is hereby granted');
      expect(fs.readFileSync(path.join(folder, 'NOTICE.md'), 'utf8')).toContain('Creative Commons Attribution 4.0');
      execFileSync(process.execPath, [path.join(folder, 'check-sheet.mjs'), path.join(folder, 'a1.png')], { stdio: 'pipe' });

      fs.writeFileSync(path.join(folder, 'NOTICE.md'), 'changed');
      expect(() => run(folder)).toThrow();
      expect(fs.readFileSync(path.join(folder, 'NOTICE.md'), 'utf8')).toBe('changed');

      const own = path.join(folder, 'mine.png');
      fs.copyFileSync('public/static/textures/a1.png', own);
      const second = path.join(folder, 'second');
      run(second, '--sheet', own);
      const data = JSON.parse(fs.readFileSync(path.join(second, 'tactics-sprite-data.json'), 'utf8'));
      expect([data.sheet.file, data.hands]).toEqual(['mine.png', null]);
      expect(fs.existsSync(path.join(second, 'a1.png'))).toBe(false);
    } finally {
      fs.rmSync(folder, { recursive: true, force: true });
    }
  });
});

describe('the root skill', () => {
  const skill = fs.readFileSync('SKILL.md', 'utf8');

  it('meets the Agent Skills limits', () => {
    const { name, description } = skillFrontmatter(skill);
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(skill.split('\n').length).toBeLessThan(500);
  });

  it('links only files that exist', () => {
    const documents = ['SKILL.md', ...fs.readdirSync('references').map((file) => `references/${file}`)];
    for (const document of documents) {
      const text = fs.readFileSync(document, 'utf8');
      for (const [, target] of text.matchAll(/`((?:references|skills|scripts|documentation|pages|three-isometric-engine)\/[\w./-]+\.(?:md|mjs|js|tsx))`/g)) expect(fs.existsSync(target), `${document}: ${target}`).toBe(true);
    }
  });
});
