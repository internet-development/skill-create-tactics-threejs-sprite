//NOTE(jimmylee)
//Main route: 2D CSS verification of all character sprite data, plus the ThreeJS demos.
//Uses the same SPRITE_CELLS and SPRITE_MAP the ThreeJS engine consumes.
//If sprites look wrong here, they will look wrong in 3D.

import styles from '@pages/SpriteTest.module.css';

import * as React from 'react';

import Head from 'next/head';
import { version } from '@root/package.json';

import { SPRITE_CELLS, SPRITE_MAP, SHEET_W, SHEET_H, SPRITE_SHEET_FILE, HAND_SPRITE_IDS, HEAD_SPRITE_IDS, WAIST_TO_FEET_IDS } from '@engine/constants/sprites';
import { WALK_DELAYS, JUMP_DELAYS, QUICK_THROW_DELAYS, THROW_STONE_DELAYS_FWD, THROW_STONE_DELAYS_BCK, PUNCH_DELAYS, PUNCH_LV2_DELAYS, PUNCH_LV3_DELAYS, STAB_DELAYS, STAB_LV2_DELAYS, STAB_LV3_DELAYS, FATAL_ITEM_IMPACT_DELAYS, FATAL_ITEM_IMPACT_TIMELINE, ITEM_DROP_DELAYS, FLOAT_DELAYS, FLOAT_MOVES, HURT_SHIVER_DELAYS, HURT_SHIVER_MOVES, IDLE_ASSEMBLY, FLOAT_ASSEMBLY, GUARD_ASSEMBLY, WALK_ASSEMBLY, QUICK_THROW_ASSEMBLY, THROW_STONE_ASSEMBLY, PUNCH_ASSEMBLY, PUNCH_LV2_ASSEMBLY, PUNCH_LV3_ASSEMBLY, STAB_ASSEMBLY, STAB_LV2_ASSEMBLY, STAB_LV3_ASSEMBLY, FATAL_ITEM_IMPACT_ASSEMBLY, ITEM_DROP_ASSEMBLY, KNEEL_ASSEMBLY, HURT_ASSEMBLY, DEATH_ASSEMBLY, CAST_ASSEMBLY, JUMP_ASSEMBLY } from '@engine/constants/sprites/assembly';
import { SHP_FRAMES, SEQ_PAIRS, SEQUENCE_MODES, SHP_WATER_OFFSET, DEFAULT_LIBRARY_PAIR } from '@engine/constants/sprites/seq-library';
import { SpriteSheetTableIdle, SpriteSheetTableFloat, SpriteSheetTableGuard, SpriteSheetTableWalk, SpriteSheetTablePunch, SpriteSheetTablePunchLv2, SpriteSheetTablePunchLv3, SpriteSheetTableStab, SpriteSheetTableStabLv2, SpriteSheetTableStabLv3, SpriteSheetTableThrowStone, SpriteSheetTableQuickThrow, SpriteSheetTableFatalItemImpact, SpriteSheetTableItemDrop, SpriteSheetTableSequence, SpriteSheetTableKneel, SpriteSheetTableFlinch, SpriteSheetTableDead, SpriteSheetTableMagicCharge, SpriteSheetTableJump } from '@engine/components/SpriteSheetTables';
import MainLayout from '@engine/components/MainLayout';
import MainSidebar from '@engine/components/MainSidebar';
import SpriteAnimationDemos from '@engine/components/SpriteAnimationDemos';
import SpriteSequencePicker from '@engine/components/SpriteSequencePicker';
import { REPOSITORY_URL, SITE_URL } from '@engine/web/site-urls';

const PAGE_TITLE = 'Create Tactics ThreeJS Sprite SKILL.md';
const PAGE_DESCRIPTION = 'Every tactical RPG character frame, sequence and unit move, decoded from TYPE1.SHP and TYPE1.SEQ, drawn in CSS and in ThreeJS from the same data.';
const SOCIAL_IMAGE_URL = `${SITE_URL}/static/social.jpg`;
const SCALE = 2;
const SPRITE_URL = `/static/textures/${SPRITE_SHEET_FILE}`;

//NOTE(jimmylee)
//Animation timing constants. DEFAULT_FRAME_INTERVAL is the base rate for most animated sequences.
//CAST_FRAME_INTERVAL is the slower rate for magic charge (Mode C): 20 ticks.
const DEFAULT_FRAME_INTERVAL = 150;
const CAST_FRAME_INTERVAL = (20 * 1000) / 60;

//NOTE(jimmylee)
//A SEQ delay of 0 ends a non-looping sequence on a held frame (the game keeps drawing it until the
//animation is ended). The preview loops, so a held frame is shown for this long before restarting.
const SEQ_HOLD_MS = 1000;
const FATAL_ITEM_IMPACT_DELAYS_SEQ = FATAL_ITEM_IMPACT_TIMELINE.map((e) => e.delay);

//NOTE(jimmylee)
//Renders a single sprite cell positioned absolutely within a composite container.
//Converts SHP center-to-center dx/dy offsets into CSS top-left coordinates
//relative to the body tile's origin.
function PositionedSpriteSlice({ id, dx, dy, bodyW, bodyH, zIndex, headHighlight = false, handHighlight = false, feetHighlight = false, flipped = false }) {
  const cell = SPRITE_MAP[id];
  if (!cell) return null;

  const left = (bodyW / 2 + dx - cell.w / 2) * SCALE;
  const top = (bodyH / 2 + dy - cell.h / 2) * SCALE;

  return (
    <div
      className={styles.compositeLayer}
      style={{
        width: cell.w * SCALE,
        height: cell.h * SCALE,
        backgroundImage: `url('${SPRITE_URL}')`,
        backgroundSize: `${SHEET_W * SCALE}px ${SHEET_H * SCALE}px`,
        backgroundPosition: `-${cell.x * SCALE}px -${cell.y * SCALE}px`,
        imageRendering: 'pixelated',
        backgroundRepeat: 'no-repeat',
        left,
        top,
        zIndex,
        transform: flipped ? 'scaleX(-1)' : undefined,
        boxShadow: headHighlight ? 'inset 0 0 0 1px rgba(80, 140, 255, 1)' : handHighlight ? 'inset 0 0 0 1px rgba(255, 100, 180, 1)' : feetHighlight ? 'inset 0 0 0 1px rgba(255, 160, 40, 1)' : undefined,
      }}
    />
  );
}

//NOTE(@jimmylee)
//Fixed stage around the unit (SHP canvas pixels). Every composite frame is placed by its body
//anchor (BODY_ANCHOR_MAP), so frames of a sequence sit exactly where TYPE1.SHP draws them — the
//walk bob, stab lunges and kneels move against the stance ground line instead of being pinned to
//their own bounding box. (STAGE_CX, STAGE_CY) is the unit origin column SHP_ORIGIN_X (canvas 53)
//at the stance center row STANCE_Y (canvas 103); the stance is 40px tall, so the ground line is
//STAGE_CY + 20. Reversed patterns mirror about the origin, as the game does. `move` is the SEQ unit
//motion ({ fb, du }, BODY move opcodes): du is screen pixels down; fb is shown as screen-horizontal
//travel toward the sprite's facing (left for B/C, right for mirrored A/D) — in 3D it follows the
//unit's world facing. Frames span ±23px (±25 with lunges) and -24..+28px (fatal impact hop).
//`headroom` adds rows above the stage for the one sequence that rises past it (Jump Up).
const STAGE_W = 50;
const STAGE_H = 54;
const STAGE_CX = 25;
const STAGE_CY = 25;

function AnchoredStage({ anchor, reversed, bodyW, bodyH, move = null as { fb: number; du: number } | null, headroom = 0, children }) {
  const facing = reversed ? 1 : -1;
  const dx = (reversed ? -anchor.dx : anchor.dx) + (move ? move.fb * facing : 0);
  const dy = anchor.dy + (move ? move.du : 0);
  const cy = STAGE_CY + headroom;

  return (
    <div className={styles.anchorStage} style={{ width: STAGE_W * SCALE, height: (STAGE_H + headroom) * SCALE }}>
      <div className={styles.anchorStageGround} style={{ top: (cy + 20) * SCALE }} />
      <div className={styles.anchorStageBody} style={{ left: (STAGE_CX + dx - bodyW / 2) * SCALE, top: (cy + dy - bodyH / 2) * SCALE }}>
        {children}
      </div>
    </div>
  );
}

//NOTE(jimmylee)
//Single-tile pose (idle P1-P5, kneel KO3/KO4, dead KO1/KO2) at its anchor on the stage.
function AnchoredTile({ id, anchor, reversed }) {
  const cell = SPRITE_MAP[id];
  if (!cell) return null;

  return (
    <AnchoredStage anchor={anchor} reversed={reversed} bodyW={cell.w} bodyH={cell.h}>
      <div className={styles.compositeContainer} style={{ width: cell.w * SCALE, height: cell.h * SCALE, transform: reversed ? 'scaleX(-1)' : undefined }}>
        <PositionedSpriteSlice id={id} dx={0} dy={0} bodyW={cell.w} bodyH={cell.h} zIndex={0} />
      </div>
    </AnchoredStage>
  );
}

//NOTE(@jimmylee)
//One SHP frame on the stage: its tiles back to front, each at its own unit offset, so a frame needs no
//assembly. The origin of the zero-sized container is the unit origin, which the mirror turns around.
const STAGE_ORIGIN = { dx: 0, dy: 0 };
function SequenceFrame({ shpFrame, reversed, move, headroom }: { shpFrame: number; reversed: boolean; move: { fb: number; du: number }; headroom: number }) {
  return (
    <AnchoredStage anchor={STAGE_ORIGIN} move={move} reversed={reversed} bodyW={0} bodyH={0} headroom={headroom}>
      <div className={styles.compositeContainer} style={{ width: 0, height: 0, transform: reversed ? 'scaleX(-1)' : undefined }}>
        {SHP_FRAMES[shpFrame].map(([id, u, v, flip], i) => (
          <PositionedSpriteSlice key={i} id={id} dx={u} dy={v} bodyW={0} bodyH={0} zIndex={i} flipped={flip === 1} headHighlight={HEAD_SPRITE_IDS.has(id as string)} handHighlight={HAND_SPRITE_IDS.has(id as string)} feetHighlight={WAIST_TO_FEET_IDS.has(id as string)} />
        ))}
      </div>
    </AnchoredStage>
  );
}

//NOTE(@jimmylee)
//The 4 patterns of a front/back pair: A/B play the front sequence, C/D the back one, A/D mirrored.
function sequencePatterns(pair: (typeof SEQ_PAIRS)[number], water: boolean) {
  const offset = water ? SHP_WATER_OFFSET : 0;
  return [
    { name: 'Pattern A (0, 7) ←', reversed: true, entry: pair.front },
    { name: 'Pattern B (1, 2) ↓', reversed: false, entry: pair.front },
    { name: 'Pattern C (3, 4) →', reversed: false, entry: pair.back },
    { name: 'Pattern D (5, 6) ↑', reversed: true, entry: pair.back },
  ].map(({ name, reversed, entry }) => {
    const frames = entry.frames.map((f, k) => ({ shpFrame: f + offset, move: { fb: entry.fb?.[k] ?? 0, du: entry.du?.[k] ?? 0 } }));
    let rise = 0;
    for (const { shpFrame, move } of frames) {
      for (const [id, , v] of SHP_FRAMES[shpFrame]) rise = Math.max(rise, SPRITE_MAP[id as string].h / 2 - (v as number) - move.du);
    }
    return { name, reversed, delays: entry.ticks.map((t) => (t * 1000) / 60), frames, shpFrames: [...new Set<number>(frames.map((f) => f.shpFrame))], headroom: Math.max(0, rise - STAGE_CY) };
  });
}

//NOTE(@jimmylee)
//One SEQUENCE_MODES row, laid out as the Unarmed sections: pipeline table, then each pattern's tiles,
//composited frames and animation. There are as many of these as every other section together, so the
//body mounts when it first nears the screen and pauses while it is away.
function SequenceModeSection({ title, number = undefined as string | undefined, pair, loop, water }: { title: string; number?: string; pair: (typeof SEQ_PAIRS)[number]; loop: boolean; water: boolean }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [near, setNear] = React.useState(false);
  const patterns = React.useMemo(() => sequencePatterns(pair, water), [pair, water]);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setMounted(true);
      },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={mounted ? undefined : styles.sequencePlaceholder}>
      <SpriteSheetSection title={title} number={number}>
        {mounted ? (
          <>
            <SpriteSheetTableSequence pair={pair} loop={loop} water={water} />
            <SpriteSheetSectionRow>
              {patterns.map((p) => {
                const renderFrame = (f) => <SequenceFrame shpFrame={f.shpFrame} reversed={p.reversed} move={f.move} headroom={p.headroom} />;

                return (
                  <SpriteSheetSection title={p.name} key={p.name}>
                    <SpriteSheetSectionRow>
                      {p.shpFrames.map((shpFrame) => (
                        <div key={shpFrame}>
                          {SHP_FRAMES[shpFrame].map(([id], i) => (
                            <SpriteSlice key={i} id={id} reversed={p.reversed} />
                          ))}
                        </div>
                      ))}
                    </SpriteSheetSectionRow>
                    <AnimationFrames frames={p.frames} renderFrame={renderFrame} />
                    <AnimatedSequence delays={p.delays} frames={p.frames} renderFrame={renderFrame} paused={!near} />
                  </SpriteSheetSection>
                );
              })}
            </SpriteSheetSectionRow>
          </>
        ) : null}
      </SpriteSheetSection>
    </div>
  );
}

//NOTE(@jimmylee)
//Every TYPE1.SEQ sequence, dry or in water, from the same tables the ThreeJS sequence modes play.
function SequenceLibrary({ title, number = undefined as string | undefined }: { title: string; number?: string }) {
  const [index, setIndex] = React.useState(DEFAULT_LIBRARY_PAIR);
  const [water, setWater] = React.useState(false);
  const pair = SEQ_PAIRS[index];
  const patterns = React.useMemo(() => sequencePatterns(pair, water), [pair, water]);

  return (
    <SpriteSheetSection title={title} number={number}>
      <div className={styles.libraryControls}>
        <SpriteSequencePicker className={styles.librarySelect} value={index} onChange={setIndex} />
        <button type="button" className={styles.libraryButton} aria-pressed={water} onClick={() => setWater(!water)}>
          In water
        </button>
      </div>
      <SpriteSheetSectionRow>
        {patterns.map((p) => (
          <SpriteSheetSection title={p.name} key={p.name}>
            <AnimatedSequence key={`${index}-${water}`} delays={p.delays} frames={p.frames} renderFrame={(f) => <SequenceFrame shpFrame={f.shpFrame} reversed={p.reversed} move={f.move} headroom={p.headroom} />} />
          </SpriteSheetSection>
        ))}
      </SpriteSheetSectionRow>
    </SpriteSheetSection>
  );
}

//NOTE(jimmylee)
//Renders a single sprite cell cropped from the sheet via CSS background-position.
//Supports horizontal reverse. Highlighted when active in an animation sequence.
function SpriteSlice({ id, reversed = false, active = false, scale = SCALE }) {
  const cell = SPRITE_MAP[id];
  if (!cell) return null;

  return (
    <SpriteSheetSection title={id}>
      <div
        className={`${styles.spriteCell} ${reversed ? styles.reversed : ''} ${active ? styles.active : ''}`}
        style={{
          width: cell.w * scale,
          height: cell.h * scale,
          backgroundImage: `url('${SPRITE_URL}')`,
          backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
          backgroundPosition: `-${cell.x * scale}px -${cell.y * scale}px`,
        }}
      />
    </SpriteSheetSection>
  );
}

//NOTE(@jimmylee)
//Animated sequence player. Cycles through frames at a configurable interval.
//When `delays` is provided (array of ms per frame), uses variable timing per SEQ binary data.
//Otherwise uses flat `interval` (default 150ms). Shows the current frame with a timeline indicator below.
//Click any timeline segment or filmstrip bar to freeze on that frame. Click again to resume.
//`paused` stops the clock on the current frame.
function AnimatedSequence({ frames, renderFrame, interval = DEFAULT_FRAME_INTERVAL, delays = null as number[] | null, paused = false }) {
  const [frameIdx, setFrameIdx] = React.useState(0);
  const [frozenIdx, setFrozenIdx] = React.useState<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const frozen = frozenIdx !== null;

  React.useEffect(() => {
    if (frozen || paused) {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      return;
    }

    let mounted = true;
    let idx = frameIdx;

    const getDelay = (i: number) => (delays ? delays[i] || SEQ_HOLD_MS : interval);

    const advance = () => {
      if (!mounted) return;
      idx = (idx + 1) % frames.length;
      setFrameIdx(idx);
      timerRef.current = setTimeout(advance, getDelay(idx));
    };

    timerRef.current = setTimeout(advance, getDelay(idx));

    return () => {
      mounted = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [frames.length, interval, delays, frozen, paused, frameIdx]);

  //NOTE(jimmylee)
  //Click a timeline segment to freeze on that frame. Click the same frame again to resume playback.
  const handleScrub = (i: number) => {
    if (frozenIdx === i) {
      setFrozenIdx(null);
    } else {
      setFrozenIdx(i);
      setFrameIdx(i);
    }
  };

  const displayIdx = frozen ? frozenIdx : frameIdx;
  const safeIdx = displayIdx < frames.length ? displayIdx : 0;

  //NOTE(jimmylee)
  //Per-frame delay values for the filmstrip. Each segment's width is proportional
  //to its delay duration, showing timing weight visually.
  const frameDelays = frames.map((_, i) => (delays ? delays[i] || SEQ_HOLD_MS : interval));
  const totalDuration = frameDelays.reduce((sum, d) => sum + d, 0);

  return (
    <SpriteSheetSection title={frozen ? `Animation (frame ${safeIdx + 1}/${frames.length})` : `Animation`}>
      <div className={styles.animPreview}>
        {renderFrame(frames[safeIdx], safeIdx)}
        <div className={styles.timeline}>
          {frames.map((_, i) => {
            let cumulative = 0;
            for (let k = 0; k <= i; k++) {
              cumulative += frameDelays[k];
            }
            return (
              <div
                key={i}
                className={`${styles.timelineDot} ${i === safeIdx ? styles.timelineDotActive : ''} ${frozen ? styles.timelineDotFrozen : ''}`}
                onClick={() => handleScrub(i)}
              >
                {Math.round(cumulative)}
              </div>
            );
          })}
        </div>
        <div className={styles.filmstrip}>
          {frameDelays.map((d, i) => (
            <div
              key={i}
              className={`${styles.filmstripSegment} ${i === safeIdx ? styles.filmstripSegmentActive : ''} ${frozen ? styles.filmstripSegmentFrozen : ''}`}
              style={{ flex: `${d / totalDuration}` }}
              title={`${Math.round(d)}ms`}
              onClick={() => handleScrub(i)}
            />
          ))}
        </div>
      </div>
    </SpriteSheetSection>
  );
}

//NOTE(jimmylee)
//Static filmstrip showing all composited frames of a sequence side by side.
//Place above AnimatedSequence so every frame can be assessed at a glance.
function AnimationFrames({ frames, renderFrame }) {
  return (
    <SpriteSheetSection title="Animation Frames">
      <div className={styles.frameGroup}>
        {frames.map((frame, i) => (
          <div key={i}>{renderFrame(frame, i)}</div>
        ))}
      </div>
    </SpriteSheetSection>
  );
}

//NOTE(jimmylee)
//Reusable wrapper for each sprite sheet section (idle, walk, hurt, etc.).
//Ported from www-sacred Card component.
function SpriteSheetSection({ title, number = undefined as string | undefined, mode = undefined, children }) {
  let titleElement = (
    <header className={styles.spriteSheetPart}>
      <div className={styles.spriteSheetLeft} aria-hidden="true"></div>
      {title ? <h2 className={styles.spriteSheetTitle}>{number ? `${number} ${title}` : title}</h2> : null}
      <div className={styles.spriteSheetRight} aria-hidden="true"></div>
    </header>
  );

  if (mode === 'left') {
    titleElement = (
      <header className={styles.spriteSheetPart}>
        <div className={styles.spriteSheetLeftCorner} aria-hidden="true"></div>
        <h2 className={styles.spriteSheetTitle}>{title}</h2>
        <div className={styles.spriteSheetRight} aria-hidden="true"></div>
      </header>
    );
  }

  if (mode === 'right') {
    titleElement = (
      <header className={styles.spriteSheetPart}>
        <div className={styles.spriteSheetLeft} aria-hidden="true"></div>
        <h2 className={styles.spriteSheetTitle}>{title}</h2>
        <div className={styles.spriteSheetRightCorner} aria-hidden="true"></div>
      </header>
    );
  }

  return (
    <article className={styles.spriteSheetSection} id={number}>
      {titleElement}
      <section className={styles.spriteSheetChildren}>{children}</section>
    </article>
  );
}

function SpriteSheetSectionRow({ children }) {
  return <div className={styles.spriteSheetSectionRow}>{children}</div>;
}

//NOTE(@jimmylee)
//Numbers the top-level sections in the order they are written and gives the sidebar that same list,
//so a new section needs only a title.
function NumberedSections({ children }) {
  const elements = React.Children.toArray(children) as React.ReactElement<{ title: string; number?: string }>[];
  const sections = React.useMemo(() => elements.map((element, i) => ({ id: String(i + 1).padStart(3, '0'), title: element.props.title })), [elements.length]);

  return (
    <MainLayout sidebar={<MainSidebar sections={sections} />}>
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.frontmatter}>
            {`---\nname: create-tactics-threejs-sprite-${version}\nskill: `}
            <a href={REPOSITORY_URL}>{REPOSITORY_URL}</a>
            {'\ndescription: Add sprites to your own project. Every character frame and animation is decoded into data and drawn on this page, in CSS and in ThreeJS. Point your agent at the repository above, and SKILL.md takes it from there.\n---'}
          </p>
          <p>

This agent <a href="https://3d.internet.dev/SKILL.md">SKILL.md</a> is for those who love the January 28, 1998 PlayStation release of Final Fantasy Tactics and want to use sprites with a similar aesthetic in their own web projects. This work builds on the TYPE1.SEQ and TYPE1.SHP files supported by FFTPatcher’s <a href="https://github.com/Glain/FFTPatcher/tree/master/ShishiSpriteEditor">Shishi Sprite Editor</a> and the contributions of its open-source community.


          </p>
          <p>

Building a browser-based Three.js engine from partial foundations required engineering to bring these sprites into real-time combat and fully three-dimensional scenes. The work extends beyond displaying sprites to integrating them into a coherent rendering system, where they can share space with other meshes and participate in dynamic combat. This skill makes that foundation available for your own projects, whether you continue working in the browser or adapt it to another environment. To get started, point your agents to <a href="https://3d.internet.dev/SKILL.md">this URL</a> or to the <a href="https://3d.internet.dev/SKILL.md">SKILL.md</a> in the open-source <a href={REPOSITORY_URL}>GitHub repository</a>.

          </p>
          <p>
            This website uses <a href="https://vercel.com/blog/introducing-geist-serif">Geist Serif</a> produced by Vercel. Every label, number and control below is set in Nix8810 M16 from <a href="https://int10h.org/oldschool-pc-fonts/">VileR</a>'s The Ultimate Oldschool PC Font Pack.
          </p>
        </header>
        {elements.map((element, i) => React.cloneElement(element, { number: sections[i].id }))}
      </div>
    </MainLayout>
  );
}

function SpriteTestPage() {
  const title = `${PAGE_TITLE} ${version}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="title" content={title} />
        <meta name="description" content={PAGE_DESCRIPTION} />
        <link rel="canonical" href={SITE_URL} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:image" content={SOCIAL_IMAGE_URL} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content={SITE_URL} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <meta name="twitter:image" content={SOCIAL_IMAGE_URL} />
      </Head>
      <NumberedSections>
        <SpriteSheetSection title="SpriteSheet">
          <div
            style={{
              position: 'relative',
              width: SHEET_W * SCALE,
              height: SHEET_H * SCALE,
            }}
          >
            <img
              src={SPRITE_URL}
              alt="Character sprite sheet"
              style={{
                width: SHEET_W * SCALE,
                height: SHEET_H * SCALE,
                imageRendering: 'pixelated',
                display: 'block',
              }}
            />

            {SPRITE_CELLS.map((cell) => (
              <div
                key={cell.id}
                className={`${styles.cell}${cell.id.startsWith('SR') ? ` ${styles.subRegion}` : ''}`}
                data-cell-id={cell.id}
                title={`${cell.id} (${cell.x},${cell.y} ${cell.w}x${cell.h})`}
                style={{
                  left: cell.x * SCALE,
                  top: cell.y * SCALE,
                  width: cell.w * SCALE,
                  height: cell.h * SCALE,
                }}
              >
                <span className={styles.label}>{cell.id}</span>
              </div>
            ))}
          </div>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            ThreeJS demos — the engine's own character groups in one shared renderer, loaded when this
            section scrolls into view. */}
        <SpriteSheetSection title="ThreeJS Demos">
          <SpriteAnimationDemos />
        </SpriteSheetSection>

        <SequenceLibrary title="Sequence Library" />

        <SpriteSheetSection title="Dead (40, 41)">
          <SpriteSheetTableDead />
          <SpriteSheetSectionRow>
            {DEATH_ASSEMBLY.map((pattern) => (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSlice id={pattern.id} reversed={pattern.reversed} />
                <AnchoredTile id={pattern.id} anchor={pattern.anchor} reversed={pattern.reversed} />
              </SpriteSheetSection>
            ))}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        <SpriteSheetSection title="Taking Damage (38, 39)">
          <SpriteSheetTableFlinch />
          <SpriteSheetSectionRow>
            {HURT_ASSEMBLY.map((pattern) => {
              const topCell = SPRITE_MAP[pattern.top];
              const bottomCell = SPRITE_MAP[pattern.bottom];
              if (!topCell || !bottomCell) return null;

              const bodyW = topCell.w;
              const bodyH = topCell.h;

              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSlice id={pattern.top} reversed={pattern.reversed} />
                  <SpriteSlice id={pattern.bottom} reversed={pattern.reversed} />
                  {/* NOTE(jimmylee)
                      SEQ 38/39 redraws F68/F69 1px up, then back, every 2 ticks (HURT_SHIVER_MOVES). */}
                  <AnimatedSequence
                    delays={HURT_SHIVER_DELAYS}
                    frames={HURT_SHIVER_MOVES}
                    renderFrame={(move) => (
                      <AnchoredStage anchor={pattern.anchor} move={move} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                        <div
                          className={styles.compositeContainer}
                          style={{
                            width: bodyW * SCALE,
                            height: bodyH * SCALE,
                            transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          <PositionedSpriteSlice id={pattern.bottom} dx={pattern.bottomDx} dy={pattern.bottomDy} bodyW={bodyW} bodyH={bodyH} zIndex={0} feetHighlight={WAIST_TO_FEET_IDS.has(pattern.bottom)} />
                          <PositionedSpriteSlice id={pattern.top} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                        </div>
                      </AnchoredStage>
                    )}
                  />
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Frozen Walk 2 — SEQ 76/77, static 3-tile composition.
            Uses walk frame 5 tiles (BF5/BB5 body + RF5/LF5/RB5/LB5 hands).
            Same behind/body/front structure as walk but frozen on one pose. */}
        <SpriteSheetSection title="Frozen Walk 2 (76, 77)">
          <SpriteSheetTableGuard />
          <SpriteSheetSectionRow>
            {GUARD_ASSEMBLY.map((pattern) => {
              const bodyCell = SPRITE_MAP[pattern.body];
              if (!bodyCell) return null;

              const bodyW = bodyCell.w;
              const bodyH = bodyCell.h;
              const hand0Z = pattern.behind.id.startsWith('R') ? 0 : 2;
              const hand1Z = pattern.front.id.startsWith('R') ? 0 : 2;

              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSlice id={pattern.behind.id} reversed={pattern.reversed} />
                  <SpriteSlice id={pattern.body} reversed={pattern.reversed} />
                  <SpriteSlice id={pattern.front.id} reversed={pattern.reversed} />
                  <AnchoredStage anchor={pattern.anchor} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                    <div
                      className={styles.compositeContainer}
                      style={{
                        width: bodyW * SCALE,
                        height: bodyH * SCALE,
                        transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                      }}
                    >
                      <PositionedSpriteSlice id={pattern.behind.id} dx={pattern.behind.dx} dy={pattern.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={hand0Z} handHighlight={HAND_SPRITE_IDS.has(pattern.behind.id)} />
                      <PositionedSpriteSlice id={pattern.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                      <PositionedSpriteSlice id={pattern.front.id} dx={pattern.front.dx} dy={pattern.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={hand1Z} handHighlight={HAND_SPRITE_IDS.has(pattern.front.id)} />
                    </div>
                  </AnchoredStage>
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        <SpriteSheetSection title="Idle (1-5)">
          <SpriteSheetTableIdle />
          <div className={styles.frameGroup}>
            {IDLE_ASSEMBLY.map((entry) => (
              <SpriteSlice key={entry.step} id={entry.id} reversed={entry.reversed} />
            ))}
          </div>
          {/* NOTE(jimmylee)
              Idles at their anchors: P3/P5 sit on the origin column, the 3/4 views 1px beside it,
              mirrored for steps 5-7 (SHP F4-F6). */}
          <div className={styles.frameGroup}>
            {IDLE_ASSEMBLY.map((entry) => (
              <AnchoredTile key={entry.step} id={entry.id} anchor={entry.anchor} reversed={entry.reversed} />
            ))}
          </div>
        </SpriteSheetSection>

        <SpriteSheetSection title="Jump (204, 42, 52 / 205, 43, 53)">
          <SpriteSheetTableJump />
          <SpriteSheetSectionRow>
            {JUMP_ASSEMBLY.map((pattern) => (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSheetSectionRow>
                  {pattern.frames.map((f, i) => (
                    <div key={i}>
                      {f.behind ? <SpriteSlice id={f.behind.id} reversed={pattern.reversed} /> : null}
                      <SpriteSlice id={f.body} reversed={pattern.reversed} />
                      {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                    </div>
                  ))}
                </SpriteSheetSectionRow>
                {(() => {
                  const renderJumpFrame = (f) => {
                    const bodyCell = SPRITE_MAP[f.body];
                    if (!bodyCell) return null;

                    const bodyW = bodyCell.w;
                    const bodyH = bodyCell.h;

                    return (
                      <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                        <div
                          className={styles.compositeContainer}
                          style={{
                            width: bodyW * SCALE,
                            height: bodyH * SCALE,
                            transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          {f.behind ? <PositionedSpriteSlice id={f.behind.id} dx={f.behind.dx} dy={f.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.behind.id)} /> : null}
                          <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                          {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                        </div>
                      </AnchoredStage>
                    );
                  };

                  return (
                    <>
                      <AnimationFrames frames={pattern.frames} renderFrame={renderJumpFrame} />
                      <AnimatedSequence delays={JUMP_DELAYS} frames={pattern.frames} renderFrame={renderJumpFrame} />
                    </>
                  );
                })()}
              </SpriteSheetSection>
            ))}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        <SpriteSheetSection title="Critical (32, 33)">
          <SpriteSheetTableKneel />
          <SpriteSheetSectionRow>
            {KNEEL_ASSEMBLY.map((pattern) => (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSlice id={pattern.id} reversed={pattern.reversed} />
                <AnchoredTile id={pattern.id} anchor={pattern.anchor} reversed={pattern.reversed} />
              </SpriteSheetSection>
            ))}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        <SpriteSheetSection title="Singing (64, 65)">
          <SpriteSheetTableMagicCharge />
          <SpriteSheetSectionRow>
            {CAST_ASSEMBLY.map((pattern) => (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSheetSectionRow>
                  {pattern.frames.map((f, i) => (
                    <div key={i}>
                      <SpriteSlice id={f.body} reversed={f.reversed} />
                      <SpriteSlice id={f.overlay} reversed={f.reversed} />
                    </div>
                  ))}
                </SpriteSheetSectionRow>
                {(() => {
                  const renderCastFrame = (f) => {
                    const bodyCell = SPRITE_MAP[f.body];
                    if (!bodyCell) return null;

                    const bodyW = bodyCell.w;
                    const bodyH = bodyCell.h;

                    return (
                      <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                        <div
                          className={styles.compositeContainer}
                          style={{
                            width: bodyW * SCALE,
                            height: bodyH * SCALE,
                            transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          {/* NOTE(jimmylee)
                              SR17/SR18 legs strip renders behind the CH body (SHP F35-F38 tile order). */}
                          <PositionedSpriteSlice id={f.overlay} dx={f.overlayDx || 0} dy={f.overlayDy || 0} bodyW={bodyW} bodyH={bodyH} zIndex={0} feetHighlight={WAIST_TO_FEET_IDS.has(f.overlay)} />
                          <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                        </div>
                      </AnchoredStage>
                    );
                  };

                  return (
                    <>
                      <AnimationFrames frames={pattern.frames} renderFrame={renderCastFrame} />
                      <AnimatedSequence frames={pattern.frames} interval={CAST_FRAME_INTERVAL} renderFrame={renderCastFrame} />
                    </>
                  );
                })()}
              </SpriteSheetSection>
            ))}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Bow High — SEQ 140/141, 9 frames, 867ms total, looping.
            All frames are 4-tile full-body compositions (farBehind + body + head + front).
            Uniform body height (32x32 AF/AB torso tiles), placed at their SHP anchors on the stage.
            Head sprites (TF1/TB1) positioned via TORSO_HEAD_MAP offsets. */}
        <SpriteSheetSection title="Bow High (140, 141)">
          <SpriteSheetTablePunch />
          <SpriteSheetSectionRow>
            {PUNCH_ASSEMBLY.map((pattern) => {
              const displayDelays = PUNCH_DELAYS;
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderPunchFrame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;


                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={3} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderPunchFrame} />
                        <AnimatedSequence delays={displayDelays} frames={pattern.frames} renderFrame={renderPunchFrame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Bow Mid — SEQ 142/143, 8 frames, 833ms total, looping.
            Skips F120/F169 windup transition — goes directly from ready to extend.
            Same 4-tile full-body structure as Lv1. 4 unique SHP frames per facing. */}
        <SpriteSheetSection title="Bow Mid (142, 143)">
          <SpriteSheetTablePunchLv2 />
          <SpriteSheetSectionRow>
            {PUNCH_LV2_ASSEMBLY.map((pattern) => {
              const displayDelays = PUNCH_LV2_DELAYS;
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderPunchLv2Frame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;


                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={3} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderPunchLv2Frame} />
                        <AnimatedSequence delays={displayDelays} frames={pattern.frames} renderFrame={renderPunchLv2Frame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Bow Low — SEQ 144/145, 8 frames, 833ms total, looping.
            Skips F120+F121 / F169+F170 — instant strike from ready to retract.
            Same 4-tile full-body structure as Lv1. 3 unique SHP frames per facing. */}
        <SpriteSheetSection title="Bow Low (144, 145)">
          <SpriteSheetTablePunchLv3 />
          <SpriteSheetSectionRow>
            {PUNCH_LV3_ASSEMBLY.map((pattern) => {
              const displayDelays = PUNCH_LV3_DELAYS;
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderPunchLv3Frame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;


                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={3} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderPunchLv3Frame} />
                        <AnimatedSequence delays={displayDelays} frames={pattern.frames} renderFrame={renderPunchLv3Frame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Quick Throw — SEQ 48/49, 6 frames, 400ms, non-looping (the last frame's 2 ticks come from
            SEQ 206/207: 48/49 hold it). The overhead frame rises 2px.
            Variable body heights (P2/BF3=40px, KO3/SR19=32px, HR1=16px). Each body sits at its
            SHP anchor on the stage, so the HR1 recoil frames land 5px below the stance
            center exactly as TYPE1.SHP draws them. */}
        <SpriteSheetSection title="Quick Throw (48, 49)">
          <SpriteSheetTableQuickThrow />
          <SpriteSheetSectionRow>
            {QUICK_THROW_ASSEMBLY.map((pattern) => {
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.behind ? <SpriteSlice id={f.behind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.over ? <SpriteSlice id={f.over.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderQuickThrowFrame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;

                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.behind ? <PositionedSpriteSlice id={f.behind.id} dx={f.behind.dx} dy={f.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.behind.id)} feetHighlight={WAIST_TO_FEET_IDS.has(f.behind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.over ? <PositionedSpriteSlice id={f.over.id} dx={f.over.dx} dy={f.over.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} feetHighlight={WAIST_TO_FEET_IDS.has(f.over.id)} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={f.head || f.over ? 3 : 2} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} feetHighlight={WAIST_TO_FEET_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderQuickThrowFrame} />
                        <AnimatedSequence delays={QUICK_THROW_DELAYS} frames={pattern.frames} renderFrame={renderQuickThrowFrame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Bounced to Death — SEQ 82/83, 3 unique compositions replayed 13 times (FATAL_ITEM_IMPACT_TIMELINE).
            Reaction animation: standing reach → kneeling with overlay → KO pose, while the MoveUnitDU /
            MoveUp2 / MoveDown2 opcodes hop the unit 12px up and bounce it as it lands. Ends on a held KO.
            Variable body heights (HR1/HR2=16px, KO3/KO4=32px, KO1/KO2=32px in 40x32 tile).
            Bodies sit at their SHP anchors on the stage (KO1/KO2 lie 12px below the stance center).
            F72 front has OV2 (8x8) overlay; F73 back has NO overlay (front/back asymmetry). */}
        <SpriteSheetSection title="Bounced to Death (82, 83)">
          <SpriteSheetTableFatalItemImpact />
          <SpriteSheetSectionRow>
            {FATAL_ITEM_IMPACT_ASSEMBLY.map((pattern) => {
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.behind ? <SpriteSlice id={f.behind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderFatalItemImpactFrame = (f, move) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;

                      return (
                        <AnchoredStage anchor={f.anchor} move={move} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.behind ? <PositionedSpriteSlice id={f.behind.id} dx={f.behind.dx} dy={f.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} feetHighlight={WAIST_TO_FEET_IDS.has(f.behind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={f.head ? 3 : 2} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={(f) => renderFatalItemImpactFrame(f, null)} />
                        <AnimatedSequence delays={FATAL_ITEM_IMPACT_DELAYS_SEQ} frames={FATAL_ITEM_IMPACT_TIMELINE} renderFrame={(e) => renderFatalItemImpactFrame(pattern.frames[e.frame], e.move)} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Revived — SEQ 84/85, 3-frame non-looping, ~367ms total.
            Reverse of Bounced to Death: kneeling with overlay → standing reach → walk neutral.
            Variable body heights (KO3/KO4=32px, HR1/HR2=16px, BF3/BB3=40px).
            Bodies sit at their SHP anchors on the stage, same as Quick Throw.
            Terminal frame is walk neutral (F11/F16) — reuses same tiles as Float. */}
        <SpriteSheetSection title="Revived (84, 85)">
          <SpriteSheetTableItemDrop />
          <SpriteSheetSectionRow>
            {ITEM_DROP_ASSEMBLY.map((pattern) => {
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.behind ? <SpriteSlice id={f.behind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderItemDropFrame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;

                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.behind ? <PositionedSpriteSlice id={f.behind.id} dx={f.behind.dx} dy={f.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.behind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={f.head ? 3 : 2} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderItemDropFrame} />
                        <AnimatedSequence delays={ITEM_DROP_DELAYS} frames={pattern.frames} renderFrame={renderItemDropFrame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(@jimmylee)
            Float — SEQ 12/13 (animation 0x12/0x13, the hover idle of a floating unit), one 3-tile
            composition (F70/F71, walk frame 3 tiles: BF3/BB3 body + RF3/LF3/RB3/LB3 hands) redrawn 8
            times on the walk timing while MoveUp1/MoveDown1 lift the whole unit 2px off the ground and
            back (FLOAT_MOVES). Loops. */}
        <SpriteSheetSection title="Float (12, 13)">
          <SpriteSheetTableFloat />
          <SpriteSheetSectionRow>
            {FLOAT_ASSEMBLY.map((pattern) => {
              const bodyCell = SPRITE_MAP[pattern.body];
              if (!bodyCell) return null;

              const bodyW = bodyCell.w;
              const bodyH = bodyCell.h;
              const hand0Z = pattern.behind.id.startsWith('R') ? 0 : 2;
              const hand1Z = pattern.front.id.startsWith('R') ? 0 : 2;

              const renderFloatFrame = (move) => (
                <AnchoredStage anchor={pattern.anchor} move={move} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                  <div
                    className={styles.compositeContainer}
                    style={{
                      width: bodyW * SCALE,
                      height: bodyH * SCALE,
                      transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                    }}
                  >
                    <PositionedSpriteSlice id={pattern.behind.id} dx={pattern.behind.dx} dy={pattern.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={hand0Z} handHighlight={HAND_SPRITE_IDS.has(pattern.behind.id)} />
                    <PositionedSpriteSlice id={pattern.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                    <PositionedSpriteSlice id={pattern.front.id} dx={pattern.front.dx} dy={pattern.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={hand1Z} handHighlight={HAND_SPRITE_IDS.has(pattern.front.id)} />
                  </div>
                </AnchoredStage>
              );

              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSlice id={pattern.behind.id} reversed={pattern.reversed} />
                  <SpriteSlice id={pattern.body} reversed={pattern.reversed} />
                  <SpriteSlice id={pattern.front.id} reversed={pattern.reversed} />
                  <AnimatedSequence delays={FLOAT_DELAYS} frames={FLOAT_MOVES} renderFrame={renderFloatFrame} />
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Unarmed High — SEQ 96/97, 9 frames, 667ms total, looping.
            Wind-up → neutral return → light thrust (F94-F96/F143-F145) → impact hold (14 ticks) → recoil.
            Same 4-tile full-body structure as Bow (farBehind + body + head + front).
            5 unique SHP frames per facing. */}
        <SpriteSheetSection title="Unarmed High (96, 97)">
          <SpriteSheetTableStab />
          <SpriteSheetSectionRow>
            {STAB_ASSEMBLY.map((pattern) => {
              const displayDelays = STAB_DELAYS;
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderStabFrame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;


                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={3} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderStabFrame} />
                        <AnimatedSequence delays={displayDelays} frames={pattern.frames} renderFrame={renderStabFrame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Unarmed Mid — SEQ 98/99, 9 frames, 667ms total, looping.
            Same windup as Lv1 but uses deeper thrust frames (F97-F99/F146-F148).
            Same 4-tile full-body structure. 5 unique SHP frames per facing. */}
        <SpriteSheetSection title="Unarmed Mid (98, 99)">
          <SpriteSheetTableStabLv2 />
          <SpriteSheetSectionRow>
            {STAB_LV2_ASSEMBLY.map((pattern) => (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSheetSectionRow>
                  {pattern.frames.map((f, i) => (
                    <div key={i}>
                      {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                      <SpriteSlice id={f.body} reversed={pattern.reversed} />
                      {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                      {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                    </div>
                  ))}
                </SpriteSheetSectionRow>
                {(() => {
                  const renderStabLv2Frame = (f) => {
                    const bodyCell = SPRITE_MAP[f.body];
                    if (!bodyCell) return null;

                    const bodyW = bodyCell.w;
                    const bodyH = bodyCell.h;

                    return (
                      <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                        <div
                          className={styles.compositeContainer}
                          style={{
                            width: bodyW * SCALE,
                            height: bodyH * SCALE,
                            transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} /> : null}
                          <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                          {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                          {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={3} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                        </div>
                      </AnchoredStage>
                    );
                  };

                  return (
                    <>
                      <AnimationFrames frames={pattern.frames} renderFrame={renderStabLv2Frame} />
                      <AnimatedSequence delays={STAB_LV2_DELAYS} frames={pattern.frames} renderFrame={renderStabLv2Frame} />
                    </>
                  );
                })()}
              </SpriteSheetSection>
            ))}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Unarmed Low — SEQ 100/101, 9 frames, 667ms total, looping.
            Skips neutral return — goes from windup lean directly to extended stance.
            Uses deepest thrust frames (F100-F102/F149-F151). 6 unique SHP frames per facing. */}
        <SpriteSheetSection title="Unarmed Low (100, 101)">
          <SpriteSheetTableStabLv3 />
          <SpriteSheetSectionRow>
            {STAB_LV3_ASSEMBLY.map((pattern) => (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSheetSectionRow>
                  {pattern.frames.map((f, i) => (
                    <div key={i}>
                      {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                      <SpriteSlice id={f.body} reversed={pattern.reversed} />
                      {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                      {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                    </div>
                  ))}
                </SpriteSheetSectionRow>
                {(() => {
                  const renderStabLv3Frame = (f) => {
                    const bodyCell = SPRITE_MAP[f.body];
                    if (!bodyCell) return null;

                    const bodyW = bodyCell.w;
                    const bodyH = bodyCell.h;

                    return (
                      <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                        <div
                          className={styles.compositeContainer}
                          style={{
                            width: bodyW * SCALE,
                            height: bodyH * SCALE,
                            transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} /> : null}
                          <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                          {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                          {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={3} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} /> : null}
                        </div>
                      </AnchoredStage>
                    );
                  };

                  return (
                    <>
                      <AnimationFrames frames={pattern.frames} renderFrame={renderStabLv3Frame} />
                      <AnimatedSequence delays={STAB_LV3_DELAYS} frames={pattern.frames} renderFrame={renderStabLv3Frame} />
                    </>
                  );
                })()}
              </SpriteSheetSection>
            ))}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        {/* NOTE(jimmylee)
            Dragoon Jump 3, the Throw Stone cinematic — SEQ 208/209, 12 frames, ~633ms total.
            Longest standalone throw animation. Variable body heights (40/16/32px).
            Bodies sit at their SHP anchors on the stage, same as Quick Throw.

            New tile layer types beyond behind/body/front:
            - farBehind: back leg tile (z:0, behind body)
            - over: torso or aura tile (z:2, in front of body)
            Frames use either behind OR farBehind (mutually exclusive at z:0).
            4-tile full-body frames: farBehind(leg) + body(arm) + over(torso) + front(leg).
            4-tile aura frames: behind(arm) + body(SR) + over(AU) + front(arm).
            The F31/F33 aura (AU1/AU2 at dy:+17) reaches 1px below the stance ground line. */}
        <SpriteSheetSection title="Throw Stone (208, 209)">
          <SpriteSheetTableThrowStone />
          <SpriteSheetSectionRow>
            {THROW_STONE_ASSEMBLY.map((pattern) => {
              return (
                <SpriteSheetSection title={pattern.name} key={pattern.name}>
                  <SpriteSheetSectionRow>
                    {pattern.frames.map((f, i) => (
                      <div key={i}>
                        {f.farBehind ? <SpriteSlice id={f.farBehind.id} reversed={pattern.reversed} /> : null}
                        {f.behind ? <SpriteSlice id={f.behind.id} reversed={pattern.reversed} /> : null}
                        <SpriteSlice id={f.body} reversed={pattern.reversed} />
                        {f.head ? <SpriteSlice id={f.head.id} reversed={pattern.reversed} /> : null}
                        {f.over ? <SpriteSlice id={f.over.id} reversed={pattern.reversed} /> : null}
                        {f.front ? <SpriteSlice id={f.front.id} reversed={pattern.reversed} /> : null}
                      </div>
                    ))}
                  </SpriteSheetSectionRow>
                  {(() => {
                    const renderThrowStoneFrame = (f) => {
                      const bodyCell = SPRITE_MAP[f.body];
                      if (!bodyCell) return null;

                      const bodyW = bodyCell.w;
                      const bodyH = bodyCell.h;

                      return (
                        <AnchoredStage anchor={f.anchor} move={f.move ?? null} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                          <div
                            className={styles.compositeContainer}
                            style={{
                              width: bodyW * SCALE,
                              height: bodyH * SCALE,
                              transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                            }}
                          >
                            {f.farBehind ? <PositionedSpriteSlice id={f.farBehind.id} dx={f.farBehind.dx} dy={f.farBehind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.farBehind.id)} feetHighlight={WAIST_TO_FEET_IDS.has(f.farBehind.id)} /> : null}
                            {f.behind ? <PositionedSpriteSlice id={f.behind.id} dx={f.behind.dx} dy={f.behind.dy} bodyW={bodyW} bodyH={bodyH} zIndex={0} handHighlight={HAND_SPRITE_IDS.has(f.behind.id)} feetHighlight={WAIST_TO_FEET_IDS.has(f.behind.id)} /> : null}
                            <PositionedSpriteSlice id={f.body} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                            {f.head ? <PositionedSpriteSlice id={f.head.id} dx={f.head.dx} dy={f.head.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} headHighlight={true} /> : null}
                            {f.over ? <PositionedSpriteSlice id={f.over.id} dx={f.over.dx} dy={f.over.dy} bodyW={bodyW} bodyH={bodyH} zIndex={2} feetHighlight={WAIST_TO_FEET_IDS.has(f.over.id)} /> : null}
                            {f.front ? <PositionedSpriteSlice id={f.front.id} dx={f.front.dx} dy={f.front.dy} bodyW={bodyW} bodyH={bodyH} zIndex={f.head || f.over ? 3 : 2} handHighlight={HAND_SPRITE_IDS.has(f.front.id)} feetHighlight={WAIST_TO_FEET_IDS.has(f.front.id)} /> : null}
                          </div>
                        </AnchoredStage>
                      );
                    };

                    return (
                      <>
                        <AnimationFrames frames={pattern.frames} renderFrame={renderThrowStoneFrame} />
                        <AnimatedSequence delays={pattern.seq === 'SEQ 208' ? THROW_STONE_DELAYS_FWD : THROW_STONE_DELAYS_BCK} frames={pattern.frames} renderFrame={renderThrowStoneFrame} />
                      </>
                    );
                  })()}
                </SpriteSheetSection>
              );
            })}
          </SpriteSheetSectionRow>
        </SpriteSheetSection>

        <SpriteSheetSection title="Walk (6, 7)">
          <SpriteSheetTableWalk />
          {WALK_ASSEMBLY.map((pattern, patternIdx) => {
            const b = pattern.body;
            const h = pattern.hands;
            const bodyPingPong = [b[2], b[1], b[0], b[1], b[2], b[3], b[4], b[3]];
            const handsPingPong = [h[2], h[1], h[0], h[1], h[2], h[3], h[4], h[3]];
            const displayBody = bodyPingPong;
            const displayHands = handsPingPong;
            const displayDelays = WALK_DELAYS;

            return (
              <SpriteSheetSection title={pattern.name} key={pattern.name}>
                <SpriteSheetSectionRow>
                  {displayBody.map((frame, i) => (
                    <SpriteSlice key={i} id={frame.id} reversed={frame.reversed} />
                  ))}
                </SpriteSheetSectionRow>

                <SpriteSheetSectionRow>
                  {displayHands.map((pair, i) => (
                    <div key={i}>
                      <SpriteSlice id={pair[0].id} reversed={pair[0].reversed} />
                      <SpriteSlice id={pair[1].id} reversed={pair[1].reversed} />
                    </div>
                  ))}
                </SpriteSheetSectionRow>

                {(() => {
                  const walkFrames = displayBody.map((b, i) => ({ body: b, hands: displayHands[i] }));
                  const renderWalkFrame = (f) => {
                    const bodyCell = SPRITE_MAP[f.body.id];
                    if (!bodyCell) return null;

                    const bodyW = bodyCell.w;
                    const bodyH = bodyCell.h;
                    const hand0Z = f.hands[0].id.startsWith('R') ? 0 : 2;
                    const hand1Z = f.hands[1].id.startsWith('R') ? 0 : 2;

                    return (
                      <AnchoredStage anchor={f.body.anchor} reversed={pattern.reversed} bodyW={bodyW} bodyH={bodyH}>
                        <div
                          className={styles.compositeContainer}
                          style={{
                            width: bodyW * SCALE,
                            height: bodyH * SCALE,
                            transform: pattern.reversed ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          <PositionedSpriteSlice id={f.hands[0].id} dx={f.hands[0].dx || 0} dy={f.hands[0].dy || 0} bodyW={bodyW} bodyH={bodyH} zIndex={hand0Z} handHighlight={HAND_SPRITE_IDS.has(f.hands[0].id)} />
                          <PositionedSpriteSlice id={f.body.id} dx={0} dy={0} bodyW={bodyW} bodyH={bodyH} zIndex={1} />
                          <PositionedSpriteSlice id={f.hands[1].id} dx={f.hands[1].dx || 0} dy={f.hands[1].dy || 0} bodyW={bodyW} bodyH={bodyH} zIndex={hand1Z} handHighlight={HAND_SPRITE_IDS.has(f.hands[1].id)} />
                        </div>
                      </AnchoredStage>
                    );
                  };

                  return (
                    <>
                      <AnimationFrames frames={walkFrames} renderFrame={renderWalkFrame} />
                      <AnimatedSequence delays={displayDelays} frames={walkFrames} renderFrame={renderWalkFrame} />
                    </>
                  );
                })()}
              </SpriteSheetSection>
            );
          })}
        </SpriteSheetSection>

        {/* NOTE(@jimmylee)
            Sequence modes (SEQUENCE_MODES) — every other TYPE1 animation, in SEQ order. */}
        {SEQUENCE_MODES.map(({ mode, section, pair, loop, water }) => (
          <SequenceModeSection key={mode} title={section} pair={pair} loop={loop} water={water} />
        ))}
      </NumberedSections>
    </>
  );
}

export default SpriteTestPage;
