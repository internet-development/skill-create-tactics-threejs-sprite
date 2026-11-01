import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('three', () => {
  class MockGeometry {
    constructor(w, h) { this.parameters = { width: w || 1, height: h || 1 }; this.dispose = vi.fn(); }
  }
  class MockMaterial {
    constructor(opts) { Object.assign(this, opts || {}); this.dispose = vi.fn(); }
    clone() {
      const m = new MockMaterial();
      m.map = this.map;
      return m;
    }
  }
  class MockMesh {
    constructor(geo, mat) {
      this.geometry = geo || new MockGeometry();
      this.material = mat || new MockMaterial();
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.quaternion = { copy: vi.fn(), set: vi.fn() };
      this.renderOrder = 0;
      this.visible = true;
      this.frustumCulled = true;
      this.castShadow = false;
      this.receiveShadow = false;
      this.onBeforeRender = null;
      this.userData = {};
      this.parent = null;
    }
  }
  class MockGroup {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
      this.quaternion = { copy: vi.fn() };
      this.frustumCulled = true;
      this.userData = {};
      this.updateMatrixWorld = vi.fn();
    }
    add(child) { this.children.push(child); child.parent = this; }
  }
  class MockQuaternion {
    copy() { return this; }
    invert() { return this; }
  }
  return {
    Group: MockGroup,
    Mesh: MockMesh,
    PlaneGeometry: MockGeometry,
    MeshBasicMaterial: MockMaterial,
    Quaternion: MockQuaternion,
    DoubleSide: 0,
    RepeatWrapping: 1000,
    ClampToEdgeWrapping: 1001,
    NearestFilter: 1003,
  };
});

const { playerJumpFrameMock, playerLandFrameMock } = vi.hoisted(() => ({ playerJumpFrameMock: vi.fn(() => 0), playerLandFrameMock: vi.fn(() => -1) }));

const mockSpriteMap = {};
for (let i = 1; i <= 5; i++) {
  mockSpriteMap[`BF${i}`] = { x: 0, y: 0, w: 32, h: 40 };
  mockSpriteMap[`BB${i}`] = { x: 0, y: 0, w: 32, h: 40 };
  mockSpriteMap[`RF${i}`] = { x: 0, y: 0, w: 16, h: 24 };
  mockSpriteMap[`LF${i}`] = { x: 0, y: 0, w: 16, h: 24 };
  mockSpriteMap[`RB${i}`] = { x: 0, y: 0, w: 16, h: 24 };
  mockSpriteMap[`LB${i}`] = { x: 0, y: 0, w: 16, h: 24 };
  mockSpriteMap[`P${i}`] = { x: 0, y: 0, w: 32, h: 40 };
}
// Jump overlay sprites
for (const id of ['EF1', 'EF2', 'EFR3', 'EFR4', 'EFR5', 'EFL3', 'EFL4', 'EFL5']) {
  mockSpriteMap[id] = { x: 0, y: 0, w: 16, h: 24 };
}
// Stab Lv3 body sprites (AF1-AF4, AB1-AB4)
for (let i = 1; i <= 4; i++) {
  mockSpriteMap[`AF${i}`] = { x: 0, y: 0, w: 24, h: 24 };
  mockSpriteMap[`AB${i}`] = { x: 0, y: 0, w: 24, h: 24 };
}
// Stab overlay sprites (LG, TF, TB)
for (const id of ['LG3', 'LG6', 'LG11', 'LG12', 'LG14', 'LG16', 'LG27', 'LG30', 'LG42', 'LG43', 'LG44', 'LG47', 'LG56', 'TF1', 'TF2', 'TB1', 'TB2']) {
  mockSpriteMap[id] = { x: 0, y: 0, w: 24, h: 24 };
}
// Cast body sprites (CH1-CH4) and overlay sprites (SR17, SR18)
for (let i = 1; i <= 4; i++) mockSpriteMap[`CH${i}`] = { x: 0, y: 0, w: 32, h: 32 };
mockSpriteMap['SR17'] = { x: 0, y: 0, w: 32, h: 16 };
mockSpriteMap['SR18'] = { x: 0, y: 0, w: 32, h: 16 };

vi.mock('@engine/constants/sprites', () => ({
  SPRITE_MAP: mockSpriteMap,
  SHEET_W: 256,
  SHEET_H: 488,
}));

function makePattern(bodyPrefix, handBehind, handFront, reversed) {
  const body = [];
  const hands = [];
  for (let i = 1; i <= 5; i++) {
    body.push({ id: `${bodyPrefix}${i}`, reversed, anchor: { dx: 0, dy: [2, 1, 0, 1, 2][i - 1] } });
    hands.push([
      { id: `${handBehind}${i}`, dx: -8, dy: 0 },
      { id: `${handFront}${i}`, dx: 8, dy: 0 },
    ]);
  }
  return { body, hands, reversed, sequenceManuallyReversed: false };
}

function makeJumpPattern(bodyPrefix, behindId, frontId, reversed) {
  const frames = [];
  for (let i = 0; i < 9; i++) {
    frames.push({
      body: `${bodyPrefix}${i < 5 ? 4 : 3}`,
      behind: { id: behindId, dx: -4, dy: 0 },
      front: { id: frontId, dx: 4, dy: 4 },
      anchor: { dx: 0, dy: 0 },
    });
  }
  return { frames, reversed };
}

function makeStabPattern(bodyPrefix, overlayFarBehind, overlayHead, overlayFront, reversed) {
  const frames = [];
  for (let i = 0; i < 9; i++) {
    frames.push({
      body: `${bodyPrefix}${(i % 4) + 1}`,
      farBehind: { id: overlayFarBehind, dx: -4, dy: 0 },
      head: { id: overlayHead, dx: 0, dy: -8 },
      front: { id: overlayFront, dx: 4, dy: 0 },
      anchor: { dx: 1, dy: 4 },
    });
  }
  return { frames, reversed };
}

function makeCastPattern(body1, body2, overlay, reversed) {
  return {
    frames: [
      { body: body1, overlay, overlayDx: 0, overlayDy: 16, reversed, anchor: { dx: 0, dy: -4 } },
      { body: body2, overlay, overlayDx: 0, overlayDy: 16, reversed, anchor: { dx: 0, dy: -4 } },
    ],
    reversed,
  };
}

vi.mock('@engine/actions/action-timelines', () => ({
  CAST_FRAME_S: 1 / 3,
  playerJumpFrame: playerJumpFrameMock,
  playerLandFrame: playerLandFrameMock,
}));

vi.mock('@engine/constants/sprites/assembly', () => ({
  STAB_LV3_DELAYS: [4, 8, 2, 2, 2, 14, 2, 2, 4].map((t) => (t * 1000) / 60),
  WALK_ASSEMBLY: [
    makePattern('BF', 'RF', 'LF', true),
    makePattern('BF', 'RF', 'LF', false),
    makePattern('BB', 'LB', 'RB', false),
    makePattern('BB', 'LB', 'RB', true),
  ],
  JUMP_ASSEMBLY: [
    makeJumpPattern('BF', 'RF4', 'LF3', true),
    makeJumpPattern('BF', 'RF4', 'LF3', false),
    makeJumpPattern('BB', 'RB1', 'LB4', false),
    makeJumpPattern('BB', 'RB1', 'LB4', true),
  ],
  STAB_LV3_ASSEMBLY: [
    makeStabPattern('AF', 'LG16', 'TF1', 'LG12', true),
    makeStabPattern('AF', 'LG16', 'TF1', 'LG12', false),
    makeStabPattern('AB', 'LG56', 'TB1', 'LG42', false),
    makeStabPattern('AB', 'LG56', 'TB1', 'LG42', true),
  ],
  CAST_ASSEMBLY: [
    makeCastPattern('CH1', 'CH2', 'SR17', true),
    makeCastPattern('CH1', 'CH2', 'SR17', false),
    makeCastPattern('CH3', 'CH4', 'SR18', false),
    makeCastPattern('CH3', 'CH4', 'SR18', true),
  ],
}));

const applySpriteFrameSpy = vi.fn();
vi.mock('@engine/meshes/character-utils', () => ({
  BODY_W: 32,
  ASSEMBLY_STEP_MAP: [0, 1, 1, 2, 2, 3, 3, 0],
  FAR_BEHIND: -2,
  BEHIND: -1,
  IN_FRONT: 2,
  STANDARD_CONTAINER_H: 40,
  resolveLoopingFrame: vi.fn(() => ({ frameIdx: 0 })),
  resolveVariableFrame: vi.fn(() => ({ frameIdx: 0, done: false })),
  azimuthToStep: vi.fn(() => 1),
  applySpriteFrame: applySpriteFrameSpy,
  createBillboardOverlay: vi.fn(() => ({
    mesh: {
      position: { x: 0, y: 0, z: 0, set: vi.fn() },
      scale: { x: 1, y: 1, z: 1 },
      renderOrder: 0,
      visible: true,
      frustumCulled: false,
      castShadow: false,
      receiveShadow: false,
      material: { map: { offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1 } } },
    },
    texture: { offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1 } },
  })),
  FACE: 3,
  anchorBodyX: vi.fn(() => 0),
  anchorBodyY: vi.fn(() => 0),
  positionOverlay: vi.fn(),
  isCharacterOnScreen: vi.fn(() => true),
  placeIdleBody: vi.fn(),
  seqMoveLocal: vi.fn(() => ({ x: 0, y: 0 })),
  setVisualDriver: vi.fn((root, driver, update) => {
    driver.onBeforeRender = update;
  }),
}));

vi.mock('@engine/meshes/createCharacter', () => ({
  IDLE_FRAMES: [
    { id: 'P3', reversed: false },
    { id: 'P2', reversed: false },
    { id: 'P1', reversed: false },
    { id: 'P4', reversed: false },
    { id: 'P5', reversed: false },
    { id: 'P4', reversed: true },
    { id: 'P1', reversed: true },
    { id: 'P2', reversed: true },
  ],
}));

vi.mock('@engine/actions/character-state', () => ({
  State: {
    SPAWNING: 'SPAWNING',
    FALLING: 'FALLING',
    IDLE: 'IDLE',
    KNEELING: 'KNEELING',
    DEAD: 'DEAD',
    KNOCKBACK: 'KNOCKBACK',
    CRITICALLY_HURT: 'CRITICALLY_HURT',
  },
  ActionType: {
    PUNCH: 'PUNCH',
    QUICK_THROW: 'QUICK_THROW',
    THROW: 'THROW',
    CAST: 'CAST',
    JUMP: 'JUMP',
    CATCH: 'CATCH',
  },
}));

describe('walk-to-idle transition', () => {
  let group, camera;

  beforeEach(async () => {
    applySpriteFrameSpy.mockClear();

    const THREE = await import('three');
    const geo = new THREE.PlaneGeometry(24, 30);
    const bodyMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    bodyMesh.material.map = { offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1 } };

    const textures = {
      skins: {
        characterSpriteSheet: {
          clone: () => ({ offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1 }, needsUpdate: false }),
        },
      },
    };

    const { createWalkGroup } = await import('@engine/meshes/character-groups/group-walk');
    group = createWalkGroup({
      node: { x: 0, y: 0, z: 0 },
      textures,
      direction: 'SE',
      directionOffset: 1,
      walkStart: performance.now(),
      worldX: 0,
      worldY: 0,
      worldZ: 0,
      bodyMesh,
      mode: 'A1',
    });

    camera = {
      quaternion: { copy: vi.fn() },
      position: { x: 0.5, z: -0.5 },
      userData: { isMainCamera: true, frustum: null, now: performance.now() },
    };
  });

  it('applies idle frame when walkStopped becomes true even if step unchanged', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);

    // Walk mode: sets lastStep and lastFrame to walk values
    ch.state = 'IDLE';
    ch.walkStopped = false;
    render({}, {}, camera);

    expect(ch.lastFrame).toBeGreaterThanOrEqual(0);
    const walkStep = ch.lastStep;

    applySpriteFrameSpy.mockClear();

    // Transition to idle (walkStopped = true) at the same camera step
    ch.walkStopped = true;
    render({}, {}, camera);

    // The idle frame MUST have been applied — body sprite must switch from BF/BB to P*
    expect(applySpriteFrameSpy).toHaveBeenCalled();
    const lastCall = applySpriteFrameSpy.mock.calls[applySpriteFrameSpy.mock.calls.length - 1];
    expect(lastCall[1]).toMatch(/^P[1-5]$/);
    expect(ch.lastFrame).toBe(-1);
    expect(ch.lastStep).toBe(walkStep);
  });

  it('hides hand meshes when entering idle', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);

    // Walk mode shows hands
    ch.state = 'IDLE';
    ch.walkStopped = false;
    render({}, {}, camera);
    expect(group.children[1].visible).toBe(true);
    expect(group.children[2].visible).toBe(true);

    // Idle mode hides hands (idle sprite P1-P5 has arms baked in)
    ch.walkStopped = true;
    render({}, {}, camera);
    expect(group.children[1].visible).toBe(false);
    expect(group.children[2].visible).toBe(false);
  });

  it('does not re-apply idle frame on subsequent idle renders at same step', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);

    // Walk then idle
    ch.state = 'IDLE';
    ch.walkStopped = false;
    render({}, {}, camera);
    ch.walkStopped = true;
    render({}, {}, camera);

    applySpriteFrameSpy.mockClear();

    // Second idle render at same step — should NOT call applySpriteFrame
    render({}, {}, camera);
    expect(applySpriteFrameSpy).not.toHaveBeenCalled();
  });
});

describe('Player-team jump animation', () => {
  let group, camera, resolveVariableFrameMock;

  beforeEach(async () => {
    applySpriteFrameSpy.mockClear();

    const charUtils = await import('@engine/meshes/character-utils');
    resolveVariableFrameMock = charUtils.resolveVariableFrame;
    resolveVariableFrameMock.mockClear();

    const THREE = await import('three');
    const geo = new THREE.PlaneGeometry(24, 30);
    const bodyMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    bodyMesh.material.map = { offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1 } };

    const textures = {
      skins: {
        characterSpriteSheet: {
          clone: () => ({ offset: { x: 0, y: 0 }, repeat: { x: 1, y: 1 }, needsUpdate: false }),
        },
      },
    };

    const { createWalkGroup } = await import('@engine/meshes/character-groups/group-walk');
    group = createWalkGroup({
      node: { x: 0, y: 0, z: 0 },
      textures,
      direction: 'SE',
      directionOffset: 1,
      walkStart: performance.now(),
      worldX: 0,
      worldY: 0,
      worldZ: 0,
      bodyMesh,
      mode: 'A1',
    });

    camera = {
      quaternion: { copy: vi.fn() },
      position: { x: 0.5, z: -0.5 },
      userData: { isMainCamera: true, frustum: null, now: performance.now() },
    };
  });

  it('shows jump animation when _jumpAction is set on A1', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);

    ch.state = 'FALLING';
    ch._jumpAction = { phase: 'rise', startTime: performance.now() };
    resolveVariableFrameMock.mockReturnValue({ frameIdx: 0, done: false });
    applySpriteFrameSpy.mockClear();

    render({}, {}, camera);

    // Jump animation shows hands (unlike idle which hides them)
    expect(group.children[1].visible).toBe(true);
    expect(group.children[2].visible).toBe(true);

    // The frame comes from the time since the jump started
    expect(playerJumpFrameMock).toHaveBeenCalled();

    // Body sprite is a jump body tile (BF3/BF4/BB3/BB4), not idle P*
    expect(applySpriteFrameSpy).toHaveBeenCalled();
    const bodyCall = applySpriteFrameSpy.mock.calls[0];
    expect(bodyCall[1]).toMatch(/^(BF|BB)[34]$/);
  });


  it('falls through to idle when _jumpAction is null (landing)', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);

    // Jump active
    ch.state = 'FALLING';
    ch._jumpAction = { phase: 'rise', startTime: performance.now() };
    resolveVariableFrameMock.mockReturnValue({ frameIdx: 0, done: false });
    render({}, {}, camera);

    expect(group.children[1].visible).toBe(true);

    applySpriteFrameSpy.mockClear();

    // Landing: _jumpAction cleared, state goes to IDLE
    ch._jumpAction = null;
    ch.state = 'IDLE';
    ch.walkStopped = true;
    render({}, {}, camera);

    // Back to idle — hands hidden, idle sprite applied
    expect(group.children[1].visible).toBe(false);
    expect(group.children[2].visible).toBe(false);
    expect(applySpriteFrameSpy).toHaveBeenCalled();
    const lastCall = applySpriteFrameSpy.mock.calls[applySpriteFrameSpy.mock.calls.length - 1];
    expect(lastCall[1]).toMatch(/^P[1-5]$/);
  });

  it('resolves the frame from the time since the jump started (playerJumpFrame)', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);

    ch.state = 'FALLING';
    ch._jumpAction = { phase: 'rise', startTime: performance.now() - 500 };
    playerJumpFrameMock.mockClear();
    playerJumpFrameMock.mockReturnValue(3);

    render({}, {}, camera);

    expect(playerJumpFrameMock).toHaveBeenCalledTimes(1);
    const [elapsed] = playerJumpFrameMock.mock.calls[0];
    expect(elapsed).toBeGreaterThan(0.4);
    expect(elapsed).toBeLessThan(10);
  });

  it('draws the landing frames only while the unit stands still after a jump', () => {
    const ch = group.userData.character;
    const body = group.children[0];
    const render = body.onBeforeRender.bind(body);
    ch.state = 'IDLE';
    ch.walkStopped = true;

    ch._landedAt = undefined;
    playerLandFrameMock.mockClear();
    render({}, {}, camera);
    expect(playerLandFrameMock).not.toHaveBeenCalled();

    ch._landedAt = performance.now();
    ch.walkStopped = false;
    render({}, {}, camera);
    expect(playerLandFrameMock).not.toHaveBeenCalled();

    ch.walkStopped = true;
    playerLandFrameMock.mockReturnValue(2);
    ch.lastFrame = -1;
    render({}, {}, camera);
    expect(playerLandFrameMock).toHaveBeenCalledTimes(1);
    expect(group.children[1].visible).toBe(true);
    expect(ch.lastFrame).toBe(2);

    playerLandFrameMock.mockReturnValue(-1);
    render({}, {}, camera);
    expect(ch.lastFrame).toBe(-1);
    expect(group.children[1].visible).toBe(false);
  });
});
