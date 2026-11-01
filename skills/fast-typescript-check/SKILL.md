---
name: fast-typescript-check
description: Optimize TypeScript for runtime speed and compiler throughput. Use when profiling hot paths, tightening render loops, reducing per-frame allocations, improving type-check times, or auditing code for performance regressions. Covers both runtime execution patterns and TypeScript compiler performance.
---

# fast-typescript-check

A performance discipline for TypeScript codebases that run real-time render loops. Every rule here has a measurable effect: either fewer CPU cycles per frame, or faster `tsc --noEmit` wall-clock time. Nothing is cosmetic.

## In this repository

The code samples below are generic TypeScript illustrations. Where they differ from this repository, follow the repository:

- Engine code (`three-isometric-engine/`) is JavaScript. `tsconfig.json` has `allowJs` without `checkJs`, so `tsc` type-checks only the `.ts` / `.tsx` files (`pages/`, `three-isometric-engine/components/*.tsx`, `next-env.d.ts` and the generated `.next/types/**/*.ts`). The runtime rules in Part 1 apply to the JavaScript render loop; Part 2 applies to the TypeScript files.
- `tsconfig.json` sets `strict: false` with `strictNullChecks: true`, `skipLibCheck`, `isolatedModules`, `incremental` (writes `tsconfig.tsbuildinfo`), `moduleResolution: "bundler"`, the `@engine/*`, `@root/*`, `@pages/*` path aliases, and excludes `node_modules` and `**/*.spec.ts`. Do not add exclusions, `any` or broad casts to make a check pass.
- Type-check: `./node_modules/.bin/tsc --noEmit -p tsconfig.json`. There is no lint, format or type-check npm script. The required checks are the three commands in `AGENTS.md` "Verify".
- Naming: spell names out (`candidateCount`, not `cnt`; `dt` is the established frame delta). Private module and instance state uses the existing single-underscore prefix (`_visualPass`, `_geometryCache`) — do not rename to another scheme.
- Comments: `//NOTE(@jimmylee)` on its own line (no space after `//`, no colon), the explanation on the following `//` lines; explain why, not what. Older comments use `//NOTE(jimmylee)`.

## Profiling runtime execution

Before optimizing, find the bottleneck. These tools measure what actually runs in the browser, not what the compiler does.

### Chrome DevTools Performance tab

1. Open DevTools → Performance.
2. Click Record, orbit the camera for 5 seconds, click Stop.
3. Look at the flame chart. The widest bars in each frame are the expensive functions.
4. Sort the Bottom-Up tab by Self Time to find where the CPU actually spends cycles (not just call tree depth).
5. Look at the Summary pie chart: if Scripting dominates, the bottleneck is JavaScript. If Rendering or Painting dominates, it's the GPU or layout.

### `performance.mark` and `performance.measure`

For targeted profiling of specific code sections without DevTools overhead:

```typescript
performance.mark('entityUpdateStart');
this.__privateSceneContext.update(elapsedSeconds);
performance.mark('entityUpdateEnd');
performance.measure('entityUpdate', 'entityUpdateStart', 'entityUpdateEnd');
```

These marks appear as labeled ranges in the DevTools Performance timeline. Use them to isolate which subsystem owns the frame budget. Remove them after profiling — they are diagnostic instrumentation (see 1.18).

### Frame budget math

At 60fps, each frame has 16.67ms. The browser needs ~4ms for compositing and layout. That leaves ~12ms for JavaScript. If a single function takes 8ms, it owns two-thirds of the budget and is the target.

At 30fps (degraded mode), the budget is 33.3ms. If the scene is already in degraded mode and a function takes 15ms, it's still the dominant cost.

## Compiler diagnostic commands

Run these before and after any optimization pass to measure compiler impact.

| Command                                    | What it tells you                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit --extendedDiagnostics`   | Compiler wall-clock: Files, Program, Bind, Check, and Emit times. High `Check time` means type complexity; high `Files` + `I/O Read` means bad `include`/`exclude`. |
| `npx tsc --noEmit --generateTrace ./trace` | Generates a Chrome-compatible trace. Open in `about://tracing`.                                                                                                     |
| `npx @typescript/analyze-trace ./trace`    | Identifies slow files, expensive type instantiations, and check-time hotspots from a trace.                                                                         |
| `npx tsc --listFilesOnly \| wc -l`         | File count sanity check. If this is surprisingly high, `include`/`exclude` is misconfigured.                                                                        |
| `npx tsc --showConfig`                     | Reveals the resolved config including extended bases.                                                                                                               |
| `npx tsc --explainFiles > explain.txt`     | Why each file was included. Search for `node_modules` entries that shouldn't be there.                                                                              |
| `time npx tsc --noEmit`                    | CI budget check. Type-checking should stay under 30 seconds for good developer experience.                                                                          |

`tsconfig.json` sets `incremental`, so a run with nothing changed checks nothing, and its `Check time` and trace come back empty. Add `--incremental false` to measure.

## Part 1 — Runtime performance

These patterns target the per-frame update loop. Every rule applies to code inside `render()`, `update(elapsedSeconds, context)`, `__privateTickBurn()`, `__privateTickFade()`, visibility loops, collision passes, and any function called 60 times per second.

### 1.1 Cache property chains before loops

Every `.` in a property access is a hidden HashMap lookup at runtime. V8 uses inline caches to accelerate monomorphic access, but deep chains (`object.child.grandchild.value`) defeat this when any link in the chain is polymorphic or when the engine falls back to megamorphic stubs. V8's inline cache capacity for property loads is 4 shapes — past that, the site goes megamorphic and falls back to a global hashtable where entries collide and overwrite.

```typescript
// NOTE(@jimmylee):
// 5 lookups per iteration through the same chain
for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
  const leafMesh = leaves[leafIndex];
  leafMesh.userData.clumpX;
  leafMesh.userData.clumpZ;
  leafMesh.userData.__privateFadeAlpha;
  leafMesh.userData.__privateFadeTarget;
  leafMesh.userData.__privateBranchMesh;
}

// NOTE(@jimmylee):
// 1 lookup, then direct access on a stable reference
for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
  const leafMesh = leaves[leafIndex];
  const leafData = leafMesh.userData;
  leafData.clumpX;
  leafData.clumpZ;
  leafData.__privateFadeAlpha;
  leafData.__privateFadeTarget;
  leafData.__privateBranchMesh;
}
```

Cache anything accessed more than once inside a loop body: `this.state.scene.userData`, `this.state.renderer.info.render`, `chunk.userData`, `leafMesh.material.uniforms`.

### 1.2 Use typed arrays for numeric bulk data

Regular `number[]` arrays box values and have GC pressure. Typed arrays (`Float32Array`, `Float64Array`, `Uint8Array`, `Int32Array`) store raw bytes with zero boxing, better cache locality, and no GC scanning.

Use typed arrays for:

- Position and velocity buffers (`Float32Array`)
- Grid data and blocked-cell maps (`Uint8Array`)
- Index buffers and parent pointers (`Int32Array`)
- Cost maps and distance fields (`Float32Array` or `Uint8Array`)
- Scratch buffers for BFS and graph traversal (`Uint8Array` for reached, `Int32Array` for queue)

```typescript
const gridScores = new Float32Array(cellCount);
const parentPointers = new Int32Array(cellCount);
const blockedCells = new Uint8Array(cellCount);
```

Do not use typed arrays for heterogeneous data, short-lived temporaries of 3-4 elements, or arrays that need `push`/`pop` semantics.

### 1.3 Pre-allocate and pool objects

Allocation inside a per-frame loop creates GC pressure. The garbage collector pauses all execution to collect — a single 2ms GC stall at 60fps is a visible frame skip.

**Pool pattern:** Allocate a fixed-size array of objects once at build time, reuse by index each frame.

```typescript
// NOTE(@jimmylee):
// Pre-allocate shadow candidate slots at build time
this.__privateShadowSlotPool = [];
for (let slotIndex = 0; slotIndex < maximumLeafCount; slotIndex++) {
  this.__privateShadowSlotPool.push({
    leafMesh: null,
    branchMesh: null,
    distanceSquared: 0,
    originalOrder: 0,
    triangleCount: 0,
  });
}

// NOTE(@jimmylee):
// Reuse slots each frame — zero allocations
let candidateCount = 0;
for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
  if (shouldInclude) {
    const slot = this.__privateShadowSlotPool[slotIndex++]!;
    slot.leafMesh = leafMesh;
    slot.branchMesh = branchMesh;
    slot.distanceSquared = distanceSquared;
    shadowCandidates[candidateCount++] = slot;
  }
}
shadowCandidates.length = candidateCount;
```

**Vector pool pattern:** Reuse `THREE.Vector3` instances across frames.

```typescript
// NOTE(@jimmylee):
// Module-level reusable vectors — never allocate in render
const __privateProjectionScreenMatrix = new THREE.Matrix4();
const __privateViewFrustum = new THREE.Frustum();
const __privateCameraTarget = new THREE.Vector3();
```

### 1.4 Never allocate closures inside hot loops

Every arrow function or `function` expression inside a loop body creates a new function object on the heap. In a per-frame loop, that's 60 allocations per second per closure per iteration — pure GC pressure that produces nothing.

```typescript
// NOTE(@jimmylee):
// Allocates a new function object every frame
for (let boatIndex = 0; boatIndex < boats.length; boatIndex++) {
  boats[boatIndex].onCollision((other) => resolveCollision(boats[boatIndex], other));
}

// NOTE(@jimmylee):
// Function reference created once, reused every frame
for (let boatIndex = 0; boatIndex < boats.length; boatIndex++) {
  this.__privateResolveBoatCollision(boats[boatIndex]);
}
```

This includes `Array.prototype.map`, `filter`, `reduce`, `forEach`, and `sort` comparators when called per-frame. Each one receives a fresh closure. In hot paths, use indexed `for` loops with inline logic instead.

```typescript
// NOTE(@jimmylee):
// Creates a new comparator function object every frame
shadowCandidates.sort((a, b) => a.distanceSquared - b.distanceSquared);
```

If a sort must happen per-frame, that comparator allocation is unavoidable — but verify the sort is actually needed every frame (see the shadow sort threshold pattern: only re-sort when the camera moves past a distance threshold).

### 1.5 Indexed assignment over Array.push in hot loops

`Array.prototype.push` has call overhead (argument adaptation, length check, possible reallocation). In a tight loop that runs hundreds of times per frame, indexed assignment with a manual length truncation is measurably faster.

```typescript
// NOTE(@jimmylee):
// Slower — push overhead per iteration
shadowCandidates.length = 0;
for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
  if (shouldInclude) shadowCandidates.push(slot);
}

// NOTE(@jimmylee):
// Faster — indexed write, single length set
let candidateCount = 0;
for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
  if (shouldInclude) shadowCandidates[candidateCount++] = slot;
}
shadowCandidates.length = candidateCount;
```

### 1.6 Indexed for-loops over for...of in hot paths

`for...of` invokes the iterator protocol (`.next()` calls, result object allocation). V8 optimizes simple array `for...of` well, but in polymorphic or megamorphic call sites — common in entity update loops — it deoptimizes. Use indexed loops in any per-frame code.

```typescript
const islands = this.__privateIslands;
for (let islandIndex = 0; islandIndex < islands.length; islandIndex++) {
  const island = islands[islandIndex]!;
  // ...
}
```

`for...of` is fine in lifecycle methods (`dispose`, `build`), one-shot queries, and any code that runs fewer than once per second.

### 1.7 Hoist invariant checks to module scope

`typeof` checks against globals (`document`, `window`, `performance`) are not free — the engine must look up the binding in the scope chain each time. If the answer never changes at runtime, compute it once.

```typescript
const HAS_DOCUMENT = typeof document !== 'undefined';
const HAS_PERFORMANCE = typeof performance !== 'undefined' && typeof performance.now === 'function';

// NOTE(@jimmylee):
// Per-frame — reads a boolean, not a typeof chain
frame.tabHidden = HAS_DOCUMENT && document.visibilityState === 'hidden';
```

### 1.8 Guard expensive call sites at the caller

When an entire subsystem has nothing to do, skip the function call entirely rather than entering the function to early-return. Function call overhead (stack frame, argument adaptation) is non-zero at 60fps over dozens of subsystems.

```typescript
if (this.__privateHeatField) this.__privateTickBurn(elapsedSeconds);
if (this.__privateFadeQueue.length > 0) this.__privateTickFade(elapsedSeconds);
if (this.__privateMovements.length > 0) this.updateMovements(elapsedSeconds);
```

### 1.9 Order conditions cheapest-first

In a chain of `&&` conditions, JavaScript short-circuits left to right. Put the cheapest check and the most likely to fail first. Expensive checks that would have been skipped anyway are wasted cycles.

```typescript
// NOTE(@jimmylee):
// Expensive check runs even when the cheap one would reject
if (this.__privateComputeExpensiveDistance(agent) < threshold && agent.phase === PHASE.IDLE) {
  // ...
}

// NOTE(@jimmylee):
// Cheap enum comparison short-circuits before the distance math
if (agent.phase === PHASE.IDLE && this.__privateComputeExpensiveDistance(agent) < threshold) {
  // ...
}
```

This applies inside loop bodies where the condition runs hundreds of times per frame. Outside hot paths, prioritize readability.

### 1.10 Avoid conditional property writes

`material.needsUpdate = true` bumps the material version and forces a full program lookup on the next draw. Plain fields such as `castShadow` and `visible` are cheap to write, but `material.needsUpdate` must stay out of per-frame paths.

```typescript
// NOTE(@jimmylee):
// Redundant write
leafMesh.castShadow = false;

// NOTE(@jimmylee):
// No-op when already false
if (leafMesh.castShadow !== false) leafMesh.castShadow = false;
if (leafMesh.visible !== shouldBeVisible) leafMesh.visible = shouldBeVisible;
```

### 1.11 Never use `delete` on objects in hot paths

`delete object.property` removes the property and triggers a hidden class transition. Every future property access on that object (and any object that shared the same hidden class) deoptimizes because V8 must look up the new shape.

```typescript
// NOTE(@jimmylee):
// Destroys the hidden class — deoptimizes all access
delete slot.leafMesh;

// NOTE(@jimmylee):
// Preserves the hidden class — fast access continues
slot.leafMesh = null;
```

This is especially destructive on pooled objects. If a pool slot has its shape changed by `delete`, every subsequent reuse of that slot runs through a slower property access path. Always null-out instead.

### 1.12 Bitwise floor for positive numbers

`Math.floor(x)` is a function call. `x | 0` truncates to integer via bitwise OR — a single CPU instruction. Use it in grid indexing, spatial hashing, and any hot integer conversion.

```typescript
const column = ((x + this.__privateOffset) / this.__privateCellSize) | 0;
const row = ((z + this.__privateOffset) / this.__privateCellSize) | 0;
```

Only safe for positive values and numbers that fit in 32-bit signed range (`-2147483648` to `2147483647`). Do not use on negative numbers where floor and truncation differ (`Math.floor(-1.5)` is `-2`, but `-1.5 | 0` is `-1`).

### 1.13 Pre-square distance thresholds

Distance comparisons don't need a square root. Compute `threshold * threshold` once at module scope and compare against `dx * dx + dz * dz` directly.

```typescript
const VISUAL_CUTOFF_DISTANCE = 280;
const VISUAL_CUTOFF_DISTANCE_SQUARED = VISUAL_CUTOFF_DISTANCE * VISUAL_CUTOFF_DISTANCE;

const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
const isInRange = distanceSquared <= VISUAL_CUTOFF_DISTANCE_SQUARED;
```

### 1.14 Keep hot objects monomorphic

V8 optimizes property access by tracking object "shapes" (hidden classes). When every instance of a pool slot has the same properties in the same order, V8 uses the fast monomorphic inline cache. Adding or deleting properties at runtime creates a new hidden class and forces a transition to polymorphic or megamorphic access.

V8 tracks up to 4 shapes per inline cache site before going megamorphic. Megamorphic access uses a global hashtable with fixed size where entries collide and overwrite — much slower than a monomorphic direct-offset read.

```typescript
// NOTE(@jimmylee):
// Every slot has identical shape from creation
for (let slotIndex = 0; slotIndex < capacity; slotIndex++) {
  pool.push({
    leafMesh: null,
    branchMesh: null,
    distanceSquared: 0,
    originalOrder: 0,
    triangleCount: 0,
  });
}

// NOTE(@jimmylee):
// Conditional properties create polymorphic shapes — never do this
pool.push(hasBranch ? { leafMesh, branchMesh, distanceSquared } : { leafMesh, distanceSquared });
```

Shapes also diverge when objects are created by different constructors, or when properties are added after initial creation. Initialize all properties in the same order at construction time.

**Method call polymorphism:** When the same function is called on objects of different classes, the `this` context becomes polymorphic. V8 must check which hidden class `this` belongs to before accessing any property. In entity update loops, this means calling `entity.update()` on a mixed array of `ForestEntity`, `GrassEntity`, and `CastleEntity` objects makes every `this.` access inside `update()` polymorphic. The codebase accepts this cost because entity diversity is inherent to the architecture — but don't introduce it where it's avoidable (e.g., don't mix unrelated object types into the same array and call methods on them in a shared loop when they could be separate loops).

### 1.15 Keep numbers in one type lane

V8 internally represents numbers as either Smis (Small Integers — tagged, no heap allocation, fast arithmetic) or HeapNumbers (boxed IEEE 754 doubles — heap-allocated, slower). When a variable starts as an integer and later receives a float, V8 transitions its representation and may deoptimize the surrounding function.

```typescript
// NOTE(@jimmylee):
// Starts as Smi, becomes HeapNumber — V8 transitions representation
let accumulator = 0;
for (let index = 0; index < items.length; index++) {
  accumulator += items[index].fractionalWeight;
}

// NOTE(@jimmylee):
// Starts as double — V8 stays in HeapNumber lane, no transition
let accumulator = 0.0;
for (let index = 0; index < items.length; index++) {
  accumulator += items[index].fractionalWeight;
}
```

In practice: if a variable accumulates floating-point values, initialize it as `0.0` (or assign from a float source on the first iteration). If it counts integers, keep it integer throughout — don't mix in `Math.random()` or division results.

This matters most in tight inner loops (collision grid traversal, particle integration, bilinear sampling). In one-shot code, the JIT handles transitions without visible impact.

### 1.16 Keep try/catch outside inner loops

`try/catch` blocks can inhibit V8 TurboFan's ability to optimize the code inside them. When a try/catch wraps a tight inner loop, the entire loop body may run in a less-optimized tier.

```typescript
// NOTE(@jimmylee):
// Entire loop body runs inside catch scope — optimization barrier
for (let entityIndex = 0; entityIndex < entities.length; entityIndex++) {
  try {
    entities[entityIndex].update(elapsedSeconds, context);
  } catch (error) {
    handleError(error);
  }
}

// NOTE(@jimmylee):
// try/catch wraps the outer call — inner loop is optimizable
try {
  for (let entityIndex = 0; entityIndex < entities.length; entityIndex++) {
    entities[entityIndex].update(elapsedSeconds, context);
  }
} catch (error) {
  handleError(error);
}
```

If you need per-iteration error isolation (e.g., one entity failing shouldn't stop others), extract the try/catch into a separate non-inlined function so the main loop body stays in the optimized tier:

```typescript
function safeUpdateEntity(entity: any, elapsedSeconds: number, context: any): void {
  try {
    entity.update(elapsedSeconds, context);
  } catch (error) {
    handleError(error);
  }
}

for (let entityIndex = 0; entityIndex < entities.length; entityIndex++) {
  safeUpdateEntity(entities[entityIndex], elapsedSeconds, context);
}
```

### 1.17 Use plain objects with string keys, not Map

`Map` has per-operation overhead that plain objects avoid: every `.get()` and `.set()` is a function call through a hash table, while a plain object property read is a direct offset lookup when V8's inline cache is monomorphic. Maps also cannot benefit from hidden class optimizations.

Use plain objects with string keys for all lookup tables. There is no scenario in a render loop codebase where you need non-string keys or where the `Map` API justifies the cost.

```typescript
// NOTE(@jimmylee):
// Function call + hash probe on every read
const agentLookup = new Map<string, Agent>();
agentLookup.set(agent.id, agent);
const found = agentLookup.get(agentId);

// NOTE(@jimmylee):
// Direct property offset read when monomorphic
const agentLookup: Record<string, Agent> = {};
agentLookup[agent.id] = agent;
const found = agentLookup[agentId];
```

When you need to remove entries, set the value to `null` or `undefined` instead of using `delete` (see 1.11). This preserves the object's hidden class and keeps all future reads fast.

```typescript
// NOTE(@jimmylee):
// Removal without hidden class transition
agentLookup[departedAgentId] = undefined;
```

If a lookup table is rebuilt from scratch on a recurring basis (not every frame, but periodically), create a fresh object rather than deleting keys from the old one. A fresh object starts with a clean hidden class.

### 1.18 Remove diagnostic instrumentation from hot paths

`performance.now()`, `Math.round()`, `console.log()`, `JSON.stringify()`, and array writes for profiling sections add real cost when called 60 times per second. Keep diagnostic instrumentation behind `?debug=true` gates or remove it from the per-frame path entirely.

As an example, a stall profiler that adds 34 `performance.now()` calls + 15 array writes per frame for manifests that only fire above 80ms is a real cost. A frame budget system already tracks degradation independently with just 2 `performance.now()` calls. Boot-time profiling is fine — it runs once.

### 1.19 Prefer `as const` objects over enums, ES modules over namespaces

These two patterns affect bundle size and load-time performance rather than per-frame execution speed, but they're worth noting because they reduce the total JavaScript the engine must parse and compile at startup.

**Enums** compile to runtime IIFEs with reverse mappings (~100 bytes each). `as const` objects produce zero runtime code — values are inlined by the bundler and the object is tree-shaken if unused.

```typescript
// NOTE(@jimmylee):
// Zero runtime cost — values inlined, object tree-shaken
const DIRECTION = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
} as const;

type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];
```

Use `as const satisfies Record<K, V>` for frozen constant objects. `const enum` does not work with `isolatedModules: true`.

**Namespaces** compile to IIFEs that prevent tree-shaking. Use ES module exports. This codebase has zero namespaces — keep it that way.

## Part 2 — Compiler performance

These patterns reduce `tsc --noEmit` wall-clock time and improve editor responsiveness.

### 2.1 Prefer interface over intersection types

Interfaces create a single flat object type with cached relationships. Intersection types (`A & B & C`) recursively merge properties on every use without caching. Interfaces also detect property conflicts at declaration time; intersections silently produce `never` fields.

```typescript
// NOTE(@jimmylee):
// Uncached merge — re-evaluated at every use site
type EntityProperties = BaseProperties & ThemeProperties & { extraField: string };

// NOTE(@jimmylee):
// Cached flat type — evaluated once, relationships stored
interface EntityProperties extends BaseProperties, ThemeProperties {
  extraField: string;
}
```

This applies to types that appear at function boundaries. Interior-only types used once have negligible impact.

### 2.2 Add explicit return types on exported functions

When the compiler infers a return type, it may produce a large anonymous type that includes `import("./path").Type` chains. This slows declaration emit and incremental rebuilds. Named return types are compact and cacheable.

```typescript
// NOTE(@jimmylee):
// Compiler infers complex anonymous type with import chains
export function createState() {
  return { x: computeX(), y: computeY(), nested: buildNested() };
}

// NOTE(@jimmylee):
// Named type — fast to emit, compact in .d.ts
export function createState(): EngineState {
  return { x: computeX(), y: computeY(), nested: buildNested() };
}
```

This matters most for functions that return complex objects and are exported across module boundaries.

### 2.3 Keep union types small

Union deduplication is pairwise (quadratic). A union of 50 members compares 1,225 pairs. Intersecting two large unions creates an enormous intermediate type.

When a union grows past ~12 members, refactor to a base type with discriminated subtypes:

```typescript
// NOTE(@jimmylee):
// Quadratic cost at every call site
type WorldEntity = ForestEntity | GrassEntity | CastleEntity | /* 20 more */;

// NOTE(@jimmylee):
// Linear — single base type, compiler checks once
interface WorldEntity {
  kind: string;
  update(elapsedSeconds: number, context: WorldContext): void;
}
interface ForestEntity extends WorldEntity { kind: 'forest'; }
```

### 2.4 Extract conditional types into named aliases

Conditional types defined inline in generic interfaces re-evaluate on every call. Extracting them into a named type alias enables caching.

```typescript
// NOTE(@jimmylee):
// Re-evaluates the conditional on every call
interface Handler<T> {
  process<U>(input: U): U extends string ? StringResult<T> : U extends number ? NumberResult<T> : DefaultResult;
}

// NOTE(@jimmylee):
// Cached — evaluated once per unique (U, T) pair
type ProcessResult<U, T> = U extends string ? StringResult<T> : U extends number ? NumberResult<T> : DefaultResult;

interface Handler<T> {
  process<U>(input: U): ProcessResult<U, T>;
}
```

### 2.5 Limit generic nesting depth

Deeply nested recursive generics are the single most common cause of slow type-checking. Each level of nesting multiplies the type instantiations the compiler must resolve.

```typescript
// NOTE(@jimmylee):
// Exponential type instantiation — compiler crawls
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// NOTE(@jimmylee):
// Flatten to explicit types for known shapes
interface PartialDatabaseConfig {
  host?: string;
  port?: number;
  ssl?: { cert?: string; key?: string };
}
```

If you need a recursive utility type, keep nesting to a maximum of 3 levels. Beyond that, define concrete types for each level.

### 2.6 Prefer explicit unions over computed template literal types

Template literal types are powerful but force the compiler to enumerate every combination. For small inputs this is fine; for larger inputs the combinatorial expansion is expensive.

```typescript
// NOTE(@jimmylee):
// Compiler must expand the Uppercase mapped type
type HttpMethod = Uppercase<'get' | 'post' | 'put' | 'delete' | 'patch'>;

// NOTE(@jimmylee):
// Compiler reads a flat 5-member union directly
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
```

### 2.7 tsconfig.json hygiene

These settings affect compiler speed (a generic example — this repository's actual `tsconfig.json` is summarized in "In this repository"):

```jsonc
{
  "compilerOptions": {
    "incremental": true, // saves .tsbuildinfo, skips unchanged files
    "skipLibCheck": true, // skips .d.ts checking — safe for builds
    "strict": true, // includes strictFunctionTypes, which enables
    // variance-based assignability (faster than
    // member-by-member structural comparison)
    "types": [], // only include @types packages you explicitly list —
    // the default since TypeScript 6.0, which used to pull in
    // everything under node_modules/@types
    "isolatedModules": true, // required for single-file transpilers (SWC, esbuild)
    "verbatimModuleSyntax": true, // prevents unnecessary type-only re-exports,
    // reduces work for the compiler and bundler
    "moduleDetection": "force" // treats every file as a module without re-analysis
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["**/node_modules", "**/.*/", "dist", ".next"]
}
```

**Critical:** Without an `exclude` list, `node_modules` is excluded by default. The moment you add _any_ `exclude` entry, you must explicitly re-add `**/node_modules` or the compiler will crawl every installed package. Use the glob form `**/node_modules` to catch nested installs.

### 2.8 Barrel file awareness

Barrel files (`index.ts` re-exports) force the compiler to load every file the barrel touches, even when only one export is consumed. This repository's engine is JavaScript and has no `@engine/meshes` barrel, so the first import below is an illustration, but the rule applies wherever TypeScript consumes one.

When importing from a barrel, the compiler resolves every export. In editor mode (tsserver), this means hovering over any symbol from a barrel loads the entire subsystem graph.

For hot-path files with few dependencies, prefer deep imports:

```typescript
//NOTE(@jimmylee)
//Loads every mesh factory through the barrel
import { createCharacter } from '@engine/meshes';

//NOTE(@jimmylee)
//Loads only the character module
import createCharacter from '@engine/meshes/createCharacter';
```

Both compile identically. The difference is editor speed and incremental rebuild scope. Use the barrel for consumer code; use deep imports for hot-path engine internals that change frequently.

### 2.9 Use `import type` for type-only imports

`import type` tells both the compiler and the bundler that the import is erased at runtime. This reduces the module graph the bundler must traverse and can prevent circular dependency issues during emit.

```typescript
import type { ReactNode } from 'react';
import type { NextPage } from 'next';
```

`verbatimModuleSyntax: true` requires `import type` for type-only imports; the compiler errors if you use a regular `import` for something that's only used as a type. This repository's `tsconfig.json` does not set it.

### 2.10 Project references for large monorepos

When a monorepo exceeds ~200 source files, project references let the compiler treat each package as an independent compilation unit. Only changed packages are re-checked.

```jsonc
// Root tsconfig.json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/api" },
    { "path": "./packages/ui" }
  ]
}

// Each package tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declarationMap": true
  }
}
```

Build with `tsc --build`. Only packages whose inputs changed are re-checked. Aim for 5-20 evenly-sized projects.

This codebase currently uses a single tsconfig. Project references are a future optimization if type-check times grow past 30 seconds.

### 2.11 CI caching for incremental builds

Cache the `.tsbuildinfo` file in CI to carry forward incremental state across runs. With incremental compilation and caching, type-check runs can drop from 30 seconds to under 5 seconds on unchanged files.

```yaml
- name: Cache TypeScript incremental compilation
  uses: actions/cache@v4
  with:
    path: .tsbuildinfo
    key: tsc-${{ hashFiles('tsconfig.json', 'src/**/*.ts') }}
    restore-keys: |
      tsc-
```

## Part 3 — TypeScript 7.0, the native compiler

TypeScript 7.0, the compiler ported to Go, shipped on July 8, 2026 in the same `typescript` npm package and with the same `tsc` command. Microsoft's full build times, with 7.0 at its default `--checkers 4`:

| Codebase   | TypeScript 6 | TypeScript 7 | Speedup |
| ---------- | ------------ | ------------ | ------- |
| vscode     | 125.7s       | 10.6s        | 11.9x   |
| sentry     | 139.8s       | 15.7s        | 8.9x    |
| bluesky    | 24.3s        | 2.8s         | 8.7x    |
| playwright | 12.8s        | 1.47s        | 8.7x    |
| tldraw     | 11.2s        | 1.46s        | 7.7x    |

This repository is on TypeScript 7 (`^7.0.2` in `package.json`). TypeScript 7.0 ships no programmatic API, so tools that import the compiler stay on 6.0 or run it beside 7.0 through `@typescript/typescript6`. `next build` is not one of them: it runs the project's `tsc` through `experimental.useTypeScriptCli`, which Next.js 16.4 turns on by default. TypeScript 7.0 does not load language service plugins, so the `next` plugin in `tsconfig.json` does nothing in an editor on this compiler. TypeScript 7.1, in beta since October 20, 2026, ships a new API organized into entry points such as `typescript/sync` and `typescript/async`. Read the current release notes before moving to it, and check that `next build` still works.

The native compiler does not change the language semantics. Every pattern in this skill applies equally to both compilers. The native port makes compilation faster; it does not make the type system cheaper to evaluate.

## Source contradictions and resolution

Different sources disagree on some points. This section documents contradictions and this skill's resolution, with the TypeScript team's performance guide taking precedence over blog posts.

### `moduleResolution: "bundler"` as a performance setting

**Blog claim:** The dev.to article lists `moduleResolution: "bundler"` as "fastest for bundler-based projects."

**Resolution:** The TypeScript team's performance guide does not mention `moduleResolution` as a performance lever. Module resolution mode affects which files are found, not how fast they're checked. `"bundler"` is correct for this codebase because it matches the bundler's resolution semantics, but it's not a performance optimization — it's a correctness setting.

### `const enum` as zero-cost

**Blog claim:** `const enum` inlines values at compile time with zero runtime cost.

**Reality:** `const enum` does not work with `isolatedModules: true` across module boundaries. The TypeScript docs explicitly warn that `const enum` values cannot be inlined when each file is compiled independently (as SWC, esbuild, and this codebase's bundler do). Use `as const` objects instead.

### Template literal types are "powerful but slow"

**Blog claim:** Template literal types slow the compiler.

**Resolution:** The TypeScript team's performance guide does not specifically call out template literal types. The underlying issue is combinatorial expansion — `Uppercase<A>` where `A` is a union of N members produces N instantiations. This is the same quadratic union problem documented in the wiki. The guidance is correct but the mechanism is unions, not template literals per se.

### `noEmit: true` as a performance setting

**Blog claim:** Setting `noEmit: true` speeds up compilation.

**Resolution:** `noEmit` skips the emit phase but does not skip type-checking, which is where 80%+ of compilation time is spent. If emit time (`printTime` in `--extendedDiagnostics`) is negligible relative to check time, `noEmit` saves almost nothing. It's useful for separating type-checking from bundler emit, not as a standalone performance fix.

### Generic nesting as "#1 cause of slow compilation"

**Blog claim:** Deeply nested generics are "the #1 cause of slow TypeScript compilation."

**Resolution:** The TypeScript team's performance guide identifies multiple causes: large union types, uncached intersection types, misconfigured `include`/`exclude` pulling in too many files, and deeply nested conditional types. Generic nesting is one cause among several. Use `--extendedDiagnostics` and `--generateTrace` to find the actual bottleneck rather than assuming it's generics.

### V8 inline cache capacity

**Source:** Vyacheslav Egorov's monomorphism analysis (referenced by V8 team).

**Fact:** V8 property load inline caches hold 4 shapes before going megamorphic. This is a V8 implementation detail that may change across engine versions, but the principle — fewer shapes at a call site means faster access — is stable across all major engines.

## Sources

Where each fact above came from, in order of authority. What matters from them is already in this skill, so there is nothing to go and read. When sources conflict, higher-ranked sources take precedence.

1. **Microsoft, TypeScript performance guide**
   Official guidance from the TypeScript team. Covers compiler performance: tsconfig settings, type system complexity, project references, diagnostics.

2. **Microsoft TypeScript Blog — TypeScript 7.0 Release**
   The stable Go-based compiler: official benchmarks, the missing programmatic API and running it beside TypeScript 6.0.

3. **Microsoft TypeScript Blog — TypeScript 7.1 Beta**
   The new programmatic API and its entry points.

4. **Microsoft TypeScript Blog — TypeScript 5.8 Release**
   Path normalization optimization, options validation caching.

5. **Microsoft TypeScript Blog — TypeScript 5.7 Release**
   V8 compile caching via `module.enableCompileCache()` (2.5x startup speedup). Composite project editor optimization.

6. **Microsoft TypeScript Blog — TypeScript 5.6 Release**
   Region-prioritized diagnostics (3330ms → 143ms for visible-region checking). `--noCheck` flag for emit-only builds.

7. **Vyacheslav Egorov — "What's up with monomorphism?"**
   Definitive reference on V8 inline caches, hidden class transitions, monomorphic/polymorphic/megamorphic states. Source for the 4-shape IC capacity number.

8. **V8 Blog — TurboFan JIT**
   V8's optimizing compiler architecture. Numerical range analysis, code motion, scheduling.

9. **dev.to — "TypeScript Performance Optimization 2026"**
   Community article. Good coverage of `as const` vs enum, namespace elimination, and build tooling. Some claims about `moduleResolution` and `noEmit` are weaker than stated (see contradictions section).

## Audit checklist

When reviewing a PR or optimizing a file, check each item:

**Runtime (per-frame code):**

- [ ] No `new` allocations inside per-frame loops (objects, arrays, closures, THREE vectors)
- [ ] No arrow functions or callbacks created inside per-frame loops
- [ ] Property chains accessed more than once in a loop body are cached in a local
- [ ] Typed arrays used for numeric bulk data (grid cells, positions, costs)
- [ ] Pool objects maintain consistent shapes (same properties, same order, no conditional adds)
- [ ] No `delete` on any object in a hot path — null-out instead
- [ ] No `Map` — use plain objects with string keys and `Record<string, T>` typing
- [ ] Distance comparisons use pre-squared thresholds, no `Math.sqrt`
- [ ] `for...of` only appears in non-hot paths (lifecycle, build, dispose)
- [ ] `typeof` checks against globals are hoisted to module-level constants
- [ ] Condition chains ordered cheapest-first / most-likely-to-short-circuit-first
- [ ] Three.js setter writes guarded by difference checks
- [ ] Expensive subsystem calls gated at the caller when the subsystem has nothing to do
- [ ] No `try/catch` wrapping the inner body of a tight loop — wrap the outer call instead
- [ ] Numeric variables stay in one lane (integer throughout or float throughout)
- [ ] No diagnostic `performance.now()` / `console.log` in the per-frame path without a debug gate
- [ ] No `enum` — use `as const` objects or `as const satisfies` instead
- [ ] No `namespace` — use ES module exports

**Compiler (type system):**

- [ ] Exported functions have explicit return type annotations
- [ ] Object types composed with `interface extends`, not `&` intersections
- [ ] Union types stay under ~12 members; larger sets use base-type inheritance
- [ ] Conditional types in generic interfaces extracted into named aliases
- [ ] Recursive generic types nest no deeper than 3 levels
- [ ] Type-only imports use `import type`
- [ ] Template literal types over unions use the pre-expanded form when the union is small and fixed

**Naming:**

- [ ] Variable names are spelled out fully — `candidateCount` not `cnt`, `shadowCandidates` not `sc`
- [ ] Private members use the `_` prefix — `this._heatField`
- [ ] Module-scoped private variables use the `_` prefix — `_cameraTarget`
- [ ] Code reads without needing comments to decode what a variable holds
