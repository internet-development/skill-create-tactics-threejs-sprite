import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
  class MockPlaneGeometry {
    dispose = vi.fn();
  }
  class MockMesh {
    constructor() {
      this.position = { x: 0, y: 0, z: 0, set: vi.fn() };
      this.frustumCulled = true;
      this.castShadow = false;
      this.receiveShadow = false;
      this.material = {
        map: { dispose: vi.fn() },
        dispose: vi.fn(),
      };
      this.geometry = { dispose: vi.fn() };
      this.userData = {};
      this.visible = true;
      this.quaternion = { copy: vi.fn() };
    }
  }
  class MockGroup {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set: vi.fn() };
      this.frustumCulled = true;
      this.userData = {};
      this.visible = true;
    }
    add(child) { this.children.push(child); }
    traverse(fn) {
      fn(this);
      for (const child of this.children) {
        fn(child);
        if (child.traverse) child.traverse(fn);
      }
    }
  }
  return {
    PlaneGeometry: MockPlaneGeometry,
    Mesh: MockMesh,
    Group: MockGroup,
    RepeatWrapping: 1000,
    ClampToEdgeWrapping: 1001,
    NearestFilter: 1003,
  };
});

vi.mock('@engine/constants', () => ({
  cubeSize: 32,
  //NOTE(jimmylee)
  //registerCharacterMode (invoked at import time from group-*.js files) mutates
  //directionalMap, so the mock must expose a writable object.
  directionalMap: {},
}));

vi.mock('@engine/meshes/character-utils', () => ({
  PX_TO_WORLD: 0.75,
  azimuthToStep: vi.fn(() => 0),
  applySpriteFrame: vi.fn(),
  cloneSpriteTexture: vi.fn(() => ({
    clone: vi.fn(),
    dispose: vi.fn(),
    needsUpdate: false,
    wrapS: 0,
    wrapT: 0,
    magFilter: 0,
    minFilter: 0,
    repeat: { set: vi.fn() },
    offset: { set: vi.fn() },
  })),
  createBodyMaterial: vi.fn((tex) => ({
    map: tex,
    dispose: vi.fn(),
    transparent: true,
    alphaTest: 0.01,
  })),
  setVisualDriver: vi.fn((root, driver, update) => {
    driver.onBeforeRender = update;
  }),
}));

vi.mock('@engine/actions/character-state', () => ({
  State: {
    FALLING: 'FALLING',
    DEAD: 'DEAD',
    KNEELING: 'KNEELING',
  },
}));

import { MAX_VISUAL_POOL_SIZE } from '@engine/constants/physics';
import {
  releaseFlinchGroup,
  destroyFlinchPool,
} from '@engine/meshes/character-groups/group-flinch';
import {
  releaseDeadMesh,
  destroyDeadPool,
} from '@engine/meshes/character-groups/group-dead';
import {
  releaseKneelMesh,
  destroyKneelPool,
} from '@engine/meshes/character-groups/group-kneel';

function makeMockFlinchGroup() {
  const topMat = { map: { dispose: vi.fn() }, dispose: vi.fn() };
  const bottomMat = { map: { dispose: vi.fn() }, dispose: vi.fn() };
  const topGeo = { dispose: vi.fn() };
  const bottomGeo = { dispose: vi.fn() };
  const group = {
    visible: true,
    children: [
      { material: topMat, geometry: topGeo },
      { material: bottomMat, geometry: bottomGeo },
    ],
    traverse(fn) {
      fn(this);
      for (const child of this.children) fn(child);
    },
  };
  return { group, topMat, bottomMat, topGeo, bottomGeo };
}

function makeMockMesh() {
  const mat = { map: { dispose: vi.fn() }, dispose: vi.fn() };
  const geo = { dispose: vi.fn() };
  return { mesh: { visible: true, material: mat, geometry: geo }, mat, geo };
}

describe('visual pool cap — flinch pool', () => {
  beforeEach(() => {
    destroyFlinchPool();
  });

  it('MAX_VISUAL_POOL_SIZE is 8', () => {
    expect(MAX_VISUAL_POOL_SIZE).toBe(8);
  });

  it('pools groups below capacity', () => {
    const { group } = makeMockFlinchGroup();
    releaseFlinchGroup(group);
    expect(group.visible).toBe(false);
    // Group was pooled, not disposed — materials should NOT have been disposed
    expect(group.children[0].material.dispose).not.toHaveBeenCalled();
  });

  it('disposes GPU resources when pool is at capacity', () => {
    // Fill the pool to capacity
    for (let i = 0; i < MAX_VISUAL_POOL_SIZE; i++) {
      const { group } = makeMockFlinchGroup();
      releaseFlinchGroup(group);
    }

    // Next release should dispose instead of pooling
    const { group, topMat, bottomMat, topGeo, bottomGeo } = makeMockFlinchGroup();
    releaseFlinchGroup(group);

    expect(topMat.map.dispose).toHaveBeenCalled();
    expect(topMat.dispose).toHaveBeenCalled();
    expect(bottomMat.map.dispose).toHaveBeenCalled();
    expect(bottomMat.dispose).toHaveBeenCalled();
    //NOTE(@jimmylee)
    //Flinch planes are shared geometry, so one group leaving the pool must not free them.
    expect(topGeo.dispose).not.toHaveBeenCalled();
    expect(bottomGeo.dispose).not.toHaveBeenCalled();
  });
});

describe('visual pool cap — dead pool', () => {
  beforeEach(() => {
    destroyDeadPool();
  });

  it('pools meshes below capacity', () => {
    const { mesh } = makeMockMesh();
    releaseDeadMesh(mesh);
    expect(mesh.visible).toBe(false);
    expect(mesh.material.dispose).not.toHaveBeenCalled();
  });

  it('disposes GPU resources when pool is at capacity', () => {
    for (let i = 0; i < MAX_VISUAL_POOL_SIZE; i++) {
      const { mesh } = makeMockMesh();
      releaseDeadMesh(mesh);
    }

    const { mesh, mat, geo } = makeMockMesh();
    releaseDeadMesh(mesh);

    expect(mat.map.dispose).toHaveBeenCalled();
    expect(mat.dispose).toHaveBeenCalled();
    expect(geo.dispose).toHaveBeenCalled();
  });
});

describe('visual pool cap — kneel pool', () => {
  beforeEach(() => {
    destroyKneelPool();
  });

  it('pools meshes below capacity', () => {
    const { mesh } = makeMockMesh();
    releaseKneelMesh(mesh);
    expect(mesh.visible).toBe(false);
    expect(mesh.material.dispose).not.toHaveBeenCalled();
  });

  it('disposes GPU resources when pool is at capacity', () => {
    for (let i = 0; i < MAX_VISUAL_POOL_SIZE; i++) {
      const { mesh } = makeMockMesh();
      releaseKneelMesh(mesh);
    }

    const { mesh, mat, geo } = makeMockMesh();
    releaseKneelMesh(mesh);

    expect(mat.map.dispose).toHaveBeenCalled();
    expect(mat.dispose).toHaveBeenCalled();
    expect(geo.dispose).toHaveBeenCalled();
  });
});
