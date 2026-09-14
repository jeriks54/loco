import { isWallAhead } from '../game/state.js';

/* ============================================================
   LoCo — canvas scene renderer (design.md §2, §6, §11, §12)
   Board art direction A, "tabletop flat-shape": oiled-walnut
   plank floor under oxide-clay brick walls with lit top faces,
   an in-canvas frame, and wall shadows on adjacent floor.
   Legibility is carried by height, not texture. The robot is a
   brass body on treads with a mint visor on the facing side
   (#8 base sprite) — the chevron is gone. Mint stays the only
   saturated hue on the board; flat shapes only, no gradients,
   no noise, no image assets.
   Level of detail: plank seams + brick mortar at tile >= 24,
   vertical plank joints at tile >= 32, 'S' / 'EXIT' glyphs at
   tile >= 18. Below that: shape only.
   Tiles are letterboxed responsively; moves tween within one
   tick, turns rotate, crash = shake + accent flash, goal =
   pulse ring. prefers-reduced-motion: instant steps, no
   shake/pulse. Chrome colours come from the CSS design tokens;
   the board palette is pinned in design.md §12.
   ============================================================ */

const MIN_TILE = 14;
const MAX_TILE = 64;
const TILE_DESKTOP = 48; // target when the panel has room (brief §4)

const MOVE_MS = 220;   // < slowest tick (300 ms at x2), so tweens finish in time
const TURN_MS = 160;
const CRASH_MS = 340;
const GOAL_MS = 750;
const FALL_MS = 180;

const DIR_ANGLE = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI };

/* Board palette — design.md §12 is the contract, docs/reference/
   m22-board-directions.html (treatment A) is the visual oracle.
   The console chrome keeps using the CSS design tokens below. */
const B = {
  frame: '#241B14',
  frameShade: 'rgba(0,0,0,.45)',
  floor: '#342B22',
  seam: '#272019',
  wall: '#5B4534',
  wallLit: '#7E6047',
  wallDark: '#37281C',
  mortar: '#40301F',
  wallEdge: '#1F1710',
  castShadow: 'rgba(0,0,0,.38)',
  holeVoid: '#0B0806',
  holeRim: '#241B14',
  holeInner: '#000000',
  start: '#8A7867',
  body: '#B08D57',
  bodyEdge: '#6E5636',
  tread: '#241B14',
};

/** In-canvas frame inset. Measured 2026-09-14: a 280px viewport leaves the
    board panel 226px of usable width, so a 16-wide level at MIN_TILE has 2px
    of headroom — any inset there clips ch2-01 / ch2-08 behind the page's
    overflow-x: hidden, silently. The frame therefore exists only from tile 24
    up; below that the board is edge-to-edge, exactly as before direction A.
    MIN_TILE stays 14. */
function framePad(t) {
  return t >= 24 ? Math.round(t * 0.5) : 0;
}

/** Largest tile whose grid *and* frame still fit the panel. The pad is derived
    from the tile it belongs to, so settle the pair by walking down from the
    pad-free estimate: cols*tile + 2*pad must never exceed the available box. */
function tileThatFits(availW, availH, cols, rows) {
  let t = Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(Math.min(availW / cols, availH / rows))));
  while (t > MIN_TILE) {
    const inset = framePad(t) * 2;
    if (cols * t + inset <= availW && rows * t + inset <= availH) break;
    t -= 1;
  }
  return t;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/** Shortest signed arc from angle a to b (turns are always +-90 deg). */
function angleDelta(a, b) {
  return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function createScene({ canvas }) {
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;       // .canvas-wrap
  const panel = wrap.parentElement;        // .board-panel
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Design tokens (styles/main.css is the source of truth) — chrome + FX only.
  // The board itself uses the pinned palette in B (design.md §12).
  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  const C = {
    bg: token('--bg'),
    accent: token('--accent'),
    accentGlow: token('--accent-glow'),
  };
  const MONO = token('--font-mono');

  let state = null;
  let tile = TILE_DESKTOP;
  let dpr = 1;
  let fitted = null;      // geometry the backing store was last sized for

  // Robot pose kept in grid space; drawing converts to pixels each frame,
  // so a mid-animation resize stays correct.
  const robot = { x: 0, y: 0, dir: 'E' };
  let angle = 0;          // rendered facing (radians)
  let anim = null;        // {kind:'move'|'turn', ...}
  let pendingFall = null; // terminal fall queued behind the move tween
  let fall = null;        // {t0, dur}; robot shrinks/fades at the destination
  let robotHidden = false;
  const fx = { crash: -1, goal: -1 }; // start timestamps, -1 = inactive
  let frameId = null;

  /* ---------- sizing ---------- */

  function fit() {
    if (!state) return;
    const cs = getComputedStyle(panel);
    const availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return; // hidden screen — retry on resize
    const nextTile = tileThatFits(availW, availH, state.cols, state.rows);
    const nextDpr = window.devicePixelRatio || 1;
    // Mobile fires resize on address-bar show/hide and rotation; assigning the
    // backing store reallocates it and blanks the canvas, so only pay that
    // when the geometry actually moved.
    if (fitted
      && fitted.tile === nextTile && fitted.dpr === nextDpr
      && fitted.cols === state.cols && fitted.rows === state.rows) return;
    fitted = { tile: nextTile, dpr: nextDpr, cols: state.cols, rows: state.rows };
    tile = nextTile;
    dpr = nextDpr;
    // The backing store carries the grid *plus* the in-canvas frame.
    const pad = framePad(tile);
    const w = state.cols * tile + pad * 2;
    const h = state.rows * tile + pad * 2;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- animation plumbing ---------- */

  function loopActive(now) {
    if (anim) return true;
    if (pendingFall || fall) return true;
    if (fx.crash >= 0 && now - fx.crash < CRASH_MS) return true;
    if (fx.goal >= 0 && now - fx.goal < GOAL_MS) return true;
    return false;
  }

  function ensureLoop() {
    if (frameId === null) frameId = requestAnimationFrame(frame);
  }

  function frame(now) {
    frameId = null;
    draw(now);
    if (loopActive(now)) frameId = requestAnimationFrame(frame);
  }

  function invalidate() {
    ensureLoop();
  }

  /* ---------- drawing ---------- */

  function tileCenter(x, y) {
    const pad = framePad(tile);
    return { cx: pad + (x + 0.5) * tile, cy: pad + (y + 0.5) * tile };
  }

  /** Tile semantics come from the parsed state, never from grid characters.
      Out of bounds is null, so the frame edge casts nothing. */
  function tileTypeAt(x, y) {
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return null;
    const index = y * state.cols + x;
    if (state.walls.has(index)) return 'wall';
    return state.tiles?.[index]
      || (x === state.goal.x && y === state.goal.y ? 'goal' : 'floor');
  }

  /* ---------- board materials (direction A, flat shapes only) ---------- */

  function drawFrame() {
    const pad = framePad(tile);
    const w = state.cols * tile + pad * 2;
    const h = state.rows * tile + pad * 2;
    ctx.fillStyle = B.frame;
    ctx.fillRect(0, 0, w, h);
    // Inner shadow: a 2px band around the grid rect; the tiles paint over the
    // rest of it, so only the ring hugging the maze survives.
    ctx.fillStyle = B.frameShade;
    ctx.fillRect(pad - 2, pad - 2, state.cols * tile + 4, state.rows * tile + 4);
  }

  function drawFloor(px, py, row) {
    ctx.fillStyle = B.floor;
    ctx.fillRect(px, py, tile, tile);
    if (tile >= 24) {                       // plank seams only when they can read
      ctx.fillStyle = B.seam;
      ctx.fillRect(px, py + tile - 1, tile, 1);
      // Staggered vertical joints need the extra pixels to stay legible.
      if (tile >= 32) ctx.fillRect(px + ((row % 2) ? tile * 0.5 : tile * 0.25), py, 1, tile);
    }
  }

  function drawWall(px, py) {
    ctx.fillStyle = B.wall;
    ctx.fillRect(px, py, tile, tile);
    ctx.fillStyle = B.wallLit;                                   // lit top face
    ctx.fillRect(px, py, tile, Math.max(2, tile * 0.16));
    ctx.fillStyle = B.wallDark;                                  // dark bottom face
    const foot = Math.max(2, tile * 0.14);
    ctx.fillRect(px, py + tile - foot, tile, foot);
    if (tile >= 24) {                     // two brick courses + staggered mortar
      ctx.fillStyle = B.mortar;
      ctx.fillRect(px, py + tile / 2, tile, 1);
      ctx.fillRect(px + tile * 0.5, py, 1, tile / 2);
      ctx.fillRect(px + tile * 0.25, py + tile / 2, 1, tile / 2);
      ctx.fillRect(px + tile * 0.75, py + tile / 2, 1, tile / 2);
    }
    ctx.strokeStyle = B.wallEdge;                                // wall mass off the floor
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);
  }

  function drawHole(px, py) {
    // A hole is absence: a void with a double rim, never lit, never a surface.
    const rim = Math.max(2, tile * 0.12);
    ctx.fillStyle = B.holeVoid;
    ctx.fillRect(px, py, tile, tile);
    ctx.strokeStyle = B.holeRim;
    ctx.lineWidth = rim;
    ctx.strokeRect(px + rim / 2, py + rim / 2, tile - rim, tile - rim);
    ctx.strokeStyle = B.holeInner;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + tile * 0.22, py + tile * 0.22, tile * 0.56, tile * 0.56);
  }

  function drawStart(px, py) {
    // The outline draws at every size; the glyph needs tile >= 18 to read.
    ctx.strokeStyle = B.start;
    ctx.lineWidth = Math.max(1, tile * 0.08);
    ctx.strokeRect(px + tile * 0.2, py + tile * 0.2, tile * 0.6, tile * 0.6);
    if (tile >= 18) {
      ctx.fillStyle = B.start;
      ctx.font = `${Math.round(tile * 0.42)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', px + tile / 2, py + tile / 2 + 1);
    }
  }

  function drawBoard() {
    const pad = framePad(tile);
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const px = pad + x * tile;
        const py = pad + y * tile;
        const type = tileTypeAt(x, y);
        if (type === 'wall') {
          drawWall(px, py);
        } else if (type === 'hole') {
          drawHole(px, py);
        } else {
          drawFloor(px, py, y);
          if (type === 'start') drawStart(px, py);
          // The goal tile keeps its floor; drawExitBadge() paints the mark.
        }
      }
    }
  }

  function drawExitBadge() {
    const pad = framePad(tile);
    const px = pad + state.goal.x * tile;
    const py = pad + state.goal.y * tile;
    const t = tile;
    ctx.save();
    if (t >= 18) {
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = Math.max(1, t * 0.08);
      ctx.strokeRect(px + t * 0.16, py + t * 0.26, t * 0.68, t * 0.48);
      ctx.fillStyle = C.accent;
      ctx.font = `${Math.round(t * 0.26)}px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EXIT', px + t / 2, py + t / 2 + 1);
    } else {
      // LOD: the badge text cannot read, so keep a solid mint mark.
      ctx.fillStyle = C.accent;
      ctx.fillRect(px + t * 0.28, py + t * 0.28, t * 0.44, t * 0.44);
      ctx.fillStyle = C.bg;
      ctx.fillRect(px + t * 0.44, py + t * 0.44, t * 0.12, t * 0.12);
    }
    ctx.restore();
  }

  /** Every wall casts onto each orthogonally adjacent non-wall tile. This is
      what carries maze legibility once material detail is dropped, so it is
      not optional (design.md §12). A hole neither casts nor receives — it is
      absence. Runs after the markers and before the robot, and is edge-only,
      so it never covers the sprite. */
  function drawWallShadows() {
    const pad = framePad(tile);
    const s = Math.max(1, tile * 0.14);
    ctx.fillStyle = B.castShadow;
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const type = tileTypeAt(x, y);
        if (type === 'wall' || type === 'hole') continue;
        const px = pad + x * tile;
        const py = pad + y * tile;
        if (tileTypeAt(x, y - 1) === 'wall') ctx.fillRect(px, py, tile, s);
        if (tileTypeAt(x - 1, y) === 'wall') ctx.fillRect(px, py, s, tile);
        if (tileTypeAt(x, y + 1) === 'wall') ctx.fillRect(px, py + tile - s, tile, s);
        if (tileTypeAt(x + 1, y) === 'wall') ctx.fillRect(px + tile - s, py, s, tile);
      }
    }
  }

  function robotPixel(now) {
    const pad = framePad(tile);
    if (anim && anim.kind === 'move' && !reducedMotion) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const k = easeOutCubic(t);
      return {
        cx: pad + (anim.from.x + (anim.to.x - anim.from.x) * k + 0.5) * tile,
        cy: pad + (anim.from.y + (anim.to.y - anim.from.y) * k + 0.5) * tile,
        done: t >= 1,
      };
    }
    return { ...tileCenter(robot.x, robot.y), done: true };
  }

  function robotAngle(now) {
    if (anim && anim.kind === 'turn' && !reducedMotion) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      return anim.from + angleDelta(anim.from, anim.to) * easeOutCubic(t);
    }
    return angle;
  }

  function drawRobot(now) {
    if (robotHidden) return null;
    const p = robotPixel(now);
    const a = robotAngle(now);
    let alpha = 1;
    let scale = 1;
    if (fall) {
      const t = Math.min(1, (now - fall.t0) / fall.dur);
      const k = easeOutCubic(t);
      alpha = 1 - k;
      scale = 1 - 0.75 * k;
    }

    // Brass toy on treads (#8 base sprite), inset 18% of the tile. Drawn in
    // local space facing +x, so the existing angle / DIR_ANGLE rotation carries
    // the visor around on turns and the move/turn tweens and fall shrink/fade
    // apply to the whole sprite exactly as they did to the chevron.
    const body = tile - tile * 0.18 * 2;
    const half = body / 2;

    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(a);
    ctx.globalAlpha *= alpha;
    ctx.scale(scale, scale);

    ctx.fillStyle = B.tread;                                   // treads, bottom ~22%
    ctx.fillRect(-half, -half + body * 0.78, body, body * 0.22);
    ctx.fillStyle = B.body;
    ctx.fillRect(-half, -half, body, body * 0.8);
    ctx.strokeStyle = B.bodyEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(-half + 0.5, -half + 0.5, body - 1, body * 0.8 - 1);

    ctx.shadowColor = C.accent;                                  // visor on the facing side
    ctx.shadowBlur = tile * 0.35;
    ctx.fillStyle = C.accent;
    ctx.fillRect(-half + body * 0.58, -half + body * 0.24, body * 0.28, body * 0.24);
    ctx.shadowBlur = 0;

    // The front wall sensor is part of the robot sprite so it follows the
    // same local rotation, movement tween and fall fade/shrink as the body.
    // Position is unchanged from the chevron era: tile * 0.396, clear of the
    // body edge at tile * 0.32.
    if (state.sensor === 'frontWall') {
      const sensorSize = tile * 0.12;
      const sensorX = half + tile * 0.076;
      const sensorBlocked = isWallAhead(state);
      ctx.shadowColor = C.accentGlow;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = Math.max(1, tile * 0.045);
      if (sensorBlocked) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(sensorX - sensorSize / 2, -sensorSize / 2, sensorSize, sensorSize);
      }
      ctx.strokeRect(sensorX - sensorSize / 2, -sensorSize / 2, sensorSize, sensorSize);
    }
    ctx.restore();
    return p;
  }

  function draw(now) {
    if (!state) return;
    const pad = framePad(tile);
    const width = state.cols * tile + pad * 2;
    const height = state.rows * tile + pad * 2;

    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, width, height);

    // crash shake (skipped under reduced motion)
    if (fx.crash >= 0 && !reducedMotion) {
      const p = (now - fx.crash) / CRASH_MS;
      if (p < 1) {
        const amp = 5 * (1 - p);
        ctx.translate((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp);
      }
    }

    // The frame is part of the board, so it shakes with it.
    drawFrame();
    drawBoard();
    drawExitBadge();
    drawWallShadows();   // after the markers, before the robot; never on a hole
    const p = drawRobot(now);

    // crash accent flash over the robot tile
    if (fx.crash >= 0 && p) {
      const t = (now - fx.crash) / CRASH_MS;
      if (t < 1) {
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - t);
        ctx.fillStyle = C.accent;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, tile * (0.35 + 0.35 * t), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // goal pulse ring
    if (fx.goal >= 0 && !reducedMotion) {
      const t = (now - fx.goal) / GOAL_MS;
      if (t < 1) {
        const g = tileCenter(state.goal.x, state.goal.y);
        ctx.save();
        ctx.globalAlpha = 0.9 * (1 - t);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, tile * (0.3 + 1.1 * easeOutCubic(t)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();

    // retire finished animations
    if (anim) {
      const t = (now - anim.t0) / anim.dur;
      if (t >= 1) {
        if (anim.kind === 'turn') angle = anim.to;
        anim = null;
      }
    }
    if (!anim && pendingFall) {
      if (reducedMotion) {
        pendingFall = null;
        fall = null;
        robotHidden = true;
      } else {
        fall = { t0: now, dur: FALL_MS };
        pendingFall = null;
      }
    }
    if (fall && now - fall.t0 >= fall.dur) {
      fall = null;
      robotHidden = true;
    }
    if (fx.crash >= 0 && now - fx.crash >= CRASH_MS) fx.crash = -1;
    if (fx.goal >= 0 && now - fx.goal >= GOAL_MS) fx.goal = -1;
  }

  /* ---------- fonts ---------- */
  // Wait for JetBrains Mono before drawing glyphs; re-draw once ready.

  let fontsReady = false;
  const fontsPromise = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsPromise.then(() => {
    fontsReady = true;
    if (state) {
      fit();
      draw(performance.now());
    }
  });

  function refresh() {
    if (!fontsReady) return; // first draw waits for the fonts
    fit();
    draw(performance.now());
  }

  new ResizeObserver(() => {
    refresh(); // redraw on resize
  }).observe(panel);

  /* ---------- public API ---------- */

  return {
    /** Full redraw from state (level load, reset, retry). */
    render(newState) {
      state = newState;
      robot.x = state.robot.x;
      robot.y = state.robot.y;
      robot.dir = state.robot.dir;
      angle = DIR_ANGLE[robot.dir];
      anim = null;
      pendingFall = null;
      fall = null;
      robotHidden = false;
      fx.crash = -1;
      fx.goal = -1;
      refresh();
    },

    /** Executor events drive the animation. */
    handleEvent(type, payload) {
      if (!state) return;
      const now = performance.now();
      if (type === 'moved') {
        robot.x = payload.to.x;
        robot.y = payload.to.y;
        anim = reducedMotion
          ? null
          : { kind: 'move', from: payload.from, to: payload.to, t0: now, dur: MOVE_MS };
        invalidate();
      } else if (type === 'turned') {
        const from = angle;
        robot.dir = payload;
        angle = DIR_ANGLE[payload];
        anim = reducedMotion ? null : { kind: 'turn', from, to: angle, t0: now, dur: TURN_MS };
        invalidate();
      } else if (type === 'crashed') {
        if (!reducedMotion) fx.crash = now;
        invalidate();
      } else if (type === 'goal') {
        if (!reducedMotion) fx.goal = now;
        invalidate();
      } else if (type === 'fell') {
        robot.dir = payload.dir;
        if (reducedMotion) {
          anim = null;
          pendingFall = null;
          fall = null;
          robotHidden = true;
        } else {
          pendingFall = { at: payload.at, dir: payload.dir };
        }
        invalidate();
      }
      // 'step' and 'finished' have no scene business
    },
  };
}
