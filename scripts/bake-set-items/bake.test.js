//NOTE(@jimmylee)
//Bakes Set's held items into public/static/models/set-items.glb. It runs as a test only because vitest
//resolves Set's TypeScript and aliases; it asserts nothing. Set's models are CC BY 4.0 and the code that
//builds them is not, so the models come here as a file and the builders stay in Set.
//
//Each model is simplified to what a sprite-sized prop can show, painted per shell (Set draws an item in
//one finish) and turned into the item frame of weapons/set-items.js: +x along the item, +y its up, the
//hand at the origin. The tome's pages are a simulation in Set, so here they are two still blocks.

import { it } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';
import { weaponCatalog } from '@engine/weapons/catalog';
import { buildWeapon } from '@engine/weapons/meshes';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SET_LICENSE, ASSET_ATTRIBUTION } from '@common/license';

const OUTPUT = path.resolve(import.meta.dirname, '../../public/static/models/set-items.glb');
//NOTE(@jimmylee)
//Set's mythril, from its material tokens: the plate, its blue second tone, the mail and the dark of the
//mail. Every item takes the finish Set's mythril roles give it: solid and trim in the plate, a wrapped
//grip in the mail's dark, and the tome keeps its paper.
const MYTHRIL = 0xd4e0ed;
const MYTHRIL_SECOND = 0x8fbbe8;
const MYTHRIL_MAIL = 0xcfdcea;
const MYTHRIL_DARK = 0x2b3a4d;
const PAPER = 0xefe8d6;
const MAX_TRIANGLES = 1200;
const MAX_ERROR = 0.008;

//NOTE(@jimmylee)
//`x` and `y` name the Set axes the item frame's +x and +y lie along, `paint` colors a shell from its size
//and place, `from` names the catalog entry when the item's name is not its own, and `size` scales it about
//the hand.
const span = (shell, axis) => shell.max[axis] - shell.min[axis];
const ITEMS = [
  { name: 'rifle', x: [1, 1], y: [2, 1], paint: (s) => (s.vertices > 1000 ? MYTHRIL_DARK : span(s, 1) > 1 ? MYTHRIL : s.max[1] < 0.2 || s.min[2] > 0.5 ? MYTHRIL_SECOND : MYTHRIL) },
  { name: 'sword', x: [1, 1], y: [0, 1], paint: (s) => (span(s, 1) > 2 ? MYTHRIL : s.vertices > 1000 ? MYTHRIL_DARK : MYTHRIL_SECOND) },
  { name: 'katana', x: [1, 1], y: [0, 1], paint: (s) => (span(s, 1) > 2 ? MYTHRIL : s.vertices > 1000 ? MYTHRIL_DARK : MYTHRIL_SECOND) },
  { name: 'spear', x: [1, 1], y: [0, 1], paint: (s) => (span(s, 1) > 2 ? MYTHRIL_MAIL : s.vertices > 1000 ? MYTHRIL_DARK : s.min[1] > 3.4 ? MYTHRIL : MYTHRIL_SECOND) },
  { name: 'shield', from: 'pavise', size: 1.5, x: [2, 1], y: [1, 1], paint: (s) => (s.vertices > 300 ? MYTHRIL : s.max[2] < 0.1 ? MYTHRIL_DARK : MYTHRIL_SECOND) },
  { name: 'harp', size: 1.75, x: [1, 1], y: [2, 1], paint: (s) => (s.vertices > 1000 ? MYTHRIL_DARK : span(s, 2) > 1 ? MYTHRIL : MYTHRIL_SECOND) },
  { name: 'tome', size: 1.5, x: [2, 1], y: [1, 1], paint: (s) => (s.paper ? PAPER : MYTHRIL), extra: tomePages },
];

function tomePages(built) {
  const { gutter, cover, leafWidth, depth, pageWidth, pageDepth, block, center } = built.pages;
  const parts = [];
  for (const side of [-1, 1]) {
    const board = new THREE.BoxGeometry(leafWidth, cover, depth).translate(side * (gutter + leafWidth / 2), cover / 2, center);
    const leaves = new THREE.BoxGeometry(pageWidth, block, pageDepth).translate(side * (gutter + pageWidth / 2), cover + block / 2, center);
    parts.push({ geometry: board, paper: false }, { geometry: leaves, paper: true });
  }
  return parts;
}

function weld(positions) {
  const known = new Map();
  const ids = new Uint32Array(positions.length / 3);
  for (let i = 0; i < ids.length; i++) {
    const key = `${positions[i * 3].toFixed(5)},${positions[i * 3 + 1].toFixed(5)},${positions[i * 3 + 2].toFixed(5)}`;
    if (!known.has(key)) known.set(key, known.size);
    ids[i] = known.get(key);
  }
  return ids;
}

//NOTE(@jimmylee)
//One color per vertex, by the connected shell it belongs to.
function shellColors(positions, index, paint, papers) {
  const ids = weld(positions);
  const parent = Array.from({ length: ids.reduce((a, b) => Math.max(a, b), 0) + 1 }, (_, i) => i);
  const find = (a) => {
    while (parent[a] !== a) a = parent[a] = parent[parent[a]];
    return a;
  };
  for (let t = 0; t < index.length; t += 3) {
    const root = find(ids[index[t]]);
    parent[find(ids[index[t + 1]])] = root;
    parent[find(ids[index[t + 2]])] = root;
  }
  const shells = new Map();
  for (let i = 0; i < ids.length; i++) {
    const root = find(ids[i]);
    if (!shells.has(root)) shells.set(root, { vertices: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], paper: papers?.[i] === 1 });
    const shell = shells.get(root);
    shell.vertices++;
    for (let k = 0; k < 3; k++) {
      shell.min[k] = Math.min(shell.min[k], positions[i * 3 + k]);
      shell.max[k] = Math.max(shell.max[k], positions[i * 3 + k]);
    }
  }
  const colors = new Uint8Array(ids.length * 4);
  const color = new THREE.Color();
  for (let i = 0; i < ids.length; i++) {
    color.setHex(paint(shells.get(find(ids[i]))), THREE.LinearSRGBColorSpace);
    colors.set([color.r * 255, color.g * 255, color.b * 255, 255], i * 4);
  }
  return colors;
}

function bakeItem(item, built) {
  const parts = [{ geometry: built.geometry, paper: false }, ...(item.extra?.(built) ?? [])];
  const merged = mergeGeometries(parts.map(({ geometry }) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    return g;
  }));
  const papers = new Uint8Array(merged.attributes.position.count);
  let offset = 0;
  for (const { geometry, paper } of parts) {
    const count = (geometry.index ?? geometry.attributes.position).count;
    if (paper) papers.fill(1, offset, offset + count);
    offset += count;
  }
  const positions = merged.attributes.position.array;
  const normals = merged.attributes.normal.array;
  const index = Uint32Array.from({ length: positions.length / 3 }, (_, i) => i);
  const colors = shellColors(positions, index, item.paint, papers);

  //NOTE(@jimmylee)
  //Vertices that agree on place, normal and color are one vertex, so only real seams survive simplifying.
  const known = new Map();
  const outPositions = [];
  const outNormals = [];
  const outColors = [];
  const welded = new Uint32Array(index.length);
  for (let i = 0; i < index.length; i++) {
    const key = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]].map((v) => v.toFixed(4)).join() + [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]].map((v) => v.toFixed(2)).join() + colors[i * 4] + colors[i * 4 + 1];
    if (!known.has(key)) {
      known.set(key, known.size);
      outPositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      outNormals.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
      outColors.push(colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], 255);
    }
    welded[i] = known.get(key);
  }
  const weldedPositions = Float32Array.from(outPositions);
  const weldedNormals = Float32Array.from(outNormals);
  const weights = [0.4, 0.4, 0.4];
  const [simplified] = MeshoptSimplifier.simplifyWithAttributes(welded, weldedPositions, 3, weldedNormals, 3, weights, null, Math.min(welded.length, MAX_TRIANGLES * 3), MAX_ERROR);
  const used = new Map();
  const finalIndex = new Uint16Array(simplified.length);
  for (let i = 0; i < simplified.length; i++) {
    if (!used.has(simplified[i])) used.set(simplified[i], used.size);
    finalIndex[i] = used.get(simplified[i]);
  }

  const axisVector = ([axis, sign]) => new THREE.Vector3().setComponent(axis, sign);
  const xAxis = axisVector(item.x);
  const yAxis = axisVector(item.y);
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis);
  const toItem = (x, y, z, out, at) => {
    const v = new THREE.Vector3(x, y, z);
    out[at] = v.dot(xAxis);
    out[at + 1] = v.dot(yAxis);
    out[at + 2] = v.dot(zAxis);
  };
  const size = item.size ?? 1;
  const count = used.size;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const color = new Uint8Array(count * 4);
  for (const [from, to] of used) {
    toItem(weldedPositions[from * 3] * size, weldedPositions[from * 3 + 1] * size, weldedPositions[from * 3 + 2] * size, position, to * 3);
    toItem(weldedNormals[from * 3], weldedNormals[from * 3 + 1], weldedNormals[from * 3 + 2], normal, to * 3);
    color.set(outColors.slice(from * 4, from * 4 + 4), to * 4);
  }
  const extras = {};
  if (built.muzzle) {
    extras.muzzle = [0, 0, 0];
    toItem(...built.muzzle.position, extras.muzzle, 0);
    extras.bore = built.muzzle.radius;
  }
  return { name: item.name, position, normal, color, index: finalIndex, extras };
}

function writeGlb(items) {
  const chunks = [];
  const bufferViews = [];
  const accessors = [];
  let length = 0;
  const addView = (array, target) => {
    const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    chunks.push(bytes);
    bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target });
    length += bytes.length;
    const padding = (4 - (bytes.length % 4)) % 4;
    if (padding) {
      chunks.push(new Uint8Array(padding));
      length += padding;
    }
    return bufferViews.length - 1;
  };
  const addAccessor = (array, componentType, type, target, extra = {}) => {
    const size = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
    accessors.push({ bufferView: addView(array, target), componentType, type, count: array.length / size, ...extra });
    return accessors.length - 1;
  };
  const bounds = (array) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < array.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], array[i + k]);
        max[k] = Math.max(max[k], array[i + k]);
      }
    }
    return { min, max };
  };
  const meshes = items.map(({ name, position, normal, color, index }) => ({
    name,
    primitives: [
      {
        attributes: { POSITION: addAccessor(position, 5126, 'VEC3', 34962, bounds(position)), NORMAL: addAccessor(normal, 5126, 'VEC3', 34962), COLOR_0: addAccessor(color, 5121, 'VEC4', 34962, { normalized: true }) },
        indices: addAccessor(index, 5123, 'SCALAR', 34963),
      },
    ],
  }));
  const json = {
    asset: { version: '2.0', generator: 'scripts/bake-set-items', copyright: SET_LICENSE.copyright, extras: { ...ASSET_ATTRIBUTION, changes: 'Simplified, painted per shell in the colors of Set mythril and turned into a shared item frame. The shield is a pavise and the tome a book, both at 1.5 times their size, and the harp is at 1.75 times its size. The tome has still page blocks.' } },
    scene: 0,
    scenes: [{ nodes: items.map((_, i) => i) }],
    nodes: items.map(({ name, extras }, mesh) => ({ name, mesh, extras })),
    meshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: length }],
  };
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadding = (4 - (text.length % 4)) % 4;
  const total = 12 + 8 + text.length + jsonPadding + 8 + length;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, text.length + jsonPadding, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(text, 20);
  out.fill(0x20, 20 + text.length, 20 + text.length + jsonPadding);
  const binary = 20 + text.length + jsonPadding;
  view.setUint32(binary, length, true);
  view.setUint32(binary + 4, 0x004e4942, true);
  let at = binary + 8;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

it('bakes the models', async () => {
  await MeshoptSimplifier.ready;
  const catalog = weaponCatalog();
  const items = ITEMS.map((item) => bakeItem(item, buildWeapon(catalog.find((entry) => entry.name === (item.from ?? item.name)))));
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, writeGlb(items));
  for (const { name, position, index } of items) console.log(`${name}: ${position.length / 3} vertices, ${index.length / 3} triangles`);
});
