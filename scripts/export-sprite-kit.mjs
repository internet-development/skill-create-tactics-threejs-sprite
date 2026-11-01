#!/usr/bin/env node
//NOTE(@jimmylee)
//Writes the kit into a project: node scripts/export-sprite-kit.mjs <folder> [--sheet my-sheet.png] [--force]
//It needs Node and this checkout, no install. It stops rather than overwrite a file that differs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSheet } from '../assets/check-sheet.mjs';
import { SPRITE_CELLS } from '../three-isometric-engine/constants/sprites/index.js';
import { kitFiles } from '../three-isometric-engine/web/kit.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const sheetFlag = args.indexOf('--sheet');
const sheetPath = sheetFlag === -1 ? null : args[sheetFlag + 1];
const target = args.filter((arg, i) => !arg.startsWith('--') && (sheetFlag === -1 || i !== sheetFlag + 1))[0];

if (!target || (sheetFlag !== -1 && !sheetPath)) {
  console.error('Usage: node scripts/export-sprite-kit.mjs <folder> [--sheet my-sheet.png] [--force]');
  process.exit(2);
}

let sheet = null;
if (sheetPath) {
  const bytes = fs.readFileSync(sheetPath);
  const report = checkSheet(bytes, SPRITE_CELLS);
  for (const { message } of report.errors) console.error(`error: ${message}`);
  for (const { message } of report.warnings) console.warn(`warning: ${message}`);
  if (!report.ok) process.exit(1);
  sheet = { name: path.basename(sheetPath), bytes };
}

const folder = path.resolve(target);
const files = kitFiles(ROOT, sheet);
const blocked = files.filter(({ path: file, bytes }) => {
  const existing = path.join(folder, file);
  return !force && fs.existsSync(existing) && !fs.readFileSync(existing).equals(bytes);
});
if (blocked.length) {
  console.error(`These files exist and differ, so nothing was written. Pass --force to replace them:\n${blocked.map(({ path: file }) => `  ${path.join(folder, file)}`).join('\n')}`);
  process.exit(1);
}

fs.mkdirSync(folder, { recursive: true });
for (const { path: file, bytes } of files) fs.writeFileSync(path.join(folder, file), bytes);
console.log(`Wrote ${files.length} files to ${folder}:\n${files.map(({ path: file }) => `  ${file}`).join('\n')}`);
