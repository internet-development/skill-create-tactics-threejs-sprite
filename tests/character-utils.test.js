import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { getCharacterHalfY, azimuthToStep, computeAzimuthToStep, cloneSpriteTexture, createBillboardOverlay, createBodyMaterial, createOverlayMaterial } from '@engine/meshes/character-utils';
import {
  CHAR_HALF_Y_DEFAULT,
  STANDARD_BILLBOARD_H,
  KNEEL_BILLBOARD_H,
} from '@engine/constants/character';

describe('getCharacterHalfY', () => {
  it('returns default halfY when ch is null', () => {
    expect(getCharacterHalfY(null)).toBe(CHAR_HALF_Y_DEFAULT);
  });

  it('returns default halfY when ch is undefined', () => {
    expect(getCharacterHalfY(undefined)).toBe(CHAR_HALF_Y_DEFAULT);
  });

  it('returns default halfY when billboardHeight is missing', () => {
    expect(getCharacterHalfY({})).toBe(CHAR_HALF_Y_DEFAULT);
  });

  it('returns default halfY when billboardHeight is 0', () => {
    expect(getCharacterHalfY({ billboardHeight: 0 })).toBe(CHAR_HALF_Y_DEFAULT);
  });

  it('returns correct halfY for standard billboard height', () => {
    expect(getCharacterHalfY({ billboardHeight: STANDARD_BILLBOARD_H }))
      .toBe(STANDARD_BILLBOARD_H / 2);
  });

  it('returns correct halfY for kneel billboard height', () => {
    expect(getCharacterHalfY({ billboardHeight: KNEEL_BILLBOARD_H }))
      .toBe(KNEEL_BILLBOARD_H / 2);
  });

  it('returns correct halfY for arbitrary billboard height', () => {
    expect(getCharacterHalfY({ billboardHeight: 48 })).toBe(24);
  });

  it('standard halfY equals CHAR_HALF_Y_DEFAULT', () => {
    expect(STANDARD_BILLBOARD_H / 2).toBe(CHAR_HALF_Y_DEFAULT);
  });
});

describe('azimuthToStep cache', () => {
  it('returns cached value from camera.userData.azimuthStep when present', () => {
    const camera = { position: { x: 1, z: 1 }, userData: { azimuthStep: 3 } };
    expect(azimuthToStep(camera)).toBe(3);
  });

  it('computes from camera position when cache is not set', () => {
    const camera = { position: { x: 0, z: 10 }, userData: {} };
    const step = azimuthToStep(camera);
    expect(step).toBeGreaterThanOrEqual(0);
    expect(step).toBeLessThan(8);
  });

  it('computeAzimuthToStep always computes fresh (ignores cache)', () => {
    const camera = { position: { x: 0, z: 10 }, userData: { azimuthStep: 7 } };
    const computed = computeAzimuthToStep(camera);
    expect(typeof computed).toBe('number');
    expect(computed).toBeGreaterThanOrEqual(0);
    expect(computed).toBeLessThan(8);
  });

  it('cached and computed agree when cache is freshly set', () => {
    const camera = { position: { x: 5, z: 5 }, userData: {} };
    const computed = computeAzimuthToStep(camera);
    camera.userData.azimuthStep = computed;
    expect(azimuthToStep(camera)).toBe(computed);
  });

  it('returns integer step 0-7 for all 8 positions', () => {
    const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    for (const a of angles) {
      const camera = { position: { x: Math.sin(a) * 10, z: Math.cos(a) * 10 }, userData: {} };
      const step = computeAzimuthToStep(camera);
      expect(Number.isInteger(step)).toBe(true);
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(8);
    }
  });
});

describe('sprite GPU state', () => {
  const textures = () => ({ skins: { characterSpriteSheet: new THREE.Texture() } });

  //NOTE(@jimmylee)
  //Without forceSinglePass, three draws transparent DoubleSide materials twice and runs a full
  //program lookup around each draw, per sprite layer, per frame.
  it('draws sprite layers in a single pass', () => {
    const texture = new THREE.Texture();
    expect(createBodyMaterial(texture).forceSinglePass).toBe(true);
    expect(createOverlayMaterial(texture).forceSinglePass).toBe(true);
  });

  it('clones the sheet without scheduling a re-upload of its pixels', () => {
    const t = textures();
    t.skins.characterSpriteSheet.needsUpdate = true;
    const { source } = t.skins.characterSpriteSheet;
    const version = source.version;
    const clone = cloneSpriteTexture(t);
    expect(source.version).toBe(version);
    expect(clone.source).toBe(source);
    expect(clone.version).toBeGreaterThan(0);
    expect(clone.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('uploads no mip levels for a sheet that is only sampled with NearestFilter', () => {
    const clone = cloneSpriteTexture(textures());
    expect(clone.minFilter).toBe(THREE.NearestFilter);
    expect(clone.generateMipmaps).toBe(false);
  });

  it('shares overlay plane geometry between same-sized layers', () => {
    const t = textures();
    const a = createBillboardOverlay(t, 24, 24, 0.75, 0.9);
    const b = createBillboardOverlay(t, 24, 24, 0.75, 0.9);
    const c = createBillboardOverlay(t, 32, 16, 0.75, 0.9);
    expect(a.mesh.geometry).toBe(b.mesh.geometry);
    expect(c.mesh.geometry).not.toBe(a.mesh.geometry);
    expect(a.mesh.material).not.toBe(b.mesh.material);
    expect(a.mesh.geometry.parameters.width).toBeCloseTo(18);
  });
});
