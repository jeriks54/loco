/* ============================================================
   LoCo — canvas scene renderer (design.md §2, §6, §11)
   ASCII identity: floor '.', walls '#', goal as a small
   bordered EXIT badge (echo of the welcome-screen teaser),
   robot as an accent chevron with soft glow. Tiles are letter-
   boxed responsively; moves tween within one tick, turns
   rotate, crash = shake + accent flash, goal = pulse ring.
   prefers-reduced-motion: instant steps, no shake/pulse.
   Colors come straight from the CSS design tokens.
   ============================================================ */

const MIN_TILE = 18;
const MAX_TILE = 64;
const TILE_DESKTOP = 48; // target when the panel has room (brief §4)

const MOVE_MS = 220;   // < slowest tick (300 ms at x2), so tweens finish in time
const TURN_MS = 160;
const CRASH_MS = 340;
const GOAL_MS = 750;

const DIR_ANGLE = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI };

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

  // Design tokens (styles/main.css is the source of truth)
  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  const C = {
    bg: token('--bg'),
    surface2: token('--surface-2'),
    border: token('--border'),
    text: token('--text'),
    muted: token('--muted'),
    accent: token('--accent'),
    accentSoft: token('--accent-soft'),
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
  const fx = { crash: -1, goal: -1 }; // start timestamps, -1 = inactive
  let frameId = null;

  /* ---------- sizing ---------- */

  function fit() {
    if (!state) return;
    const cs = getComputedStyle(panel);
    const availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return; // hidden screen — retry on resize
    const nextTile = Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(Math.min(availW / state.cols, availH / state.rows))));
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
    const w = state.cols * tile;
    const h = state.rows * tile;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- animation plumbing ---------- */

  function loopActive(now) {
    if (anim) return true;
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
    return { cx: (x + 0.5) * tile, cy: (y + 0.5) * tile };
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  function drawBoard() {
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const px = x * tile;
        const py = y * tile;
        const isWall = state.walls.has(y * state.cols + x);
        const isGoal = x === state.goal.x && y === state.goal.y;

        if (isWall) {
          ctx.fillStyle = C.surface2;
          ctx.fillRect(px, py, tile, tile);
          ctx.strokeStyle = C.border;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);
          ctx.fillStyle = C.muted;
          ctx.font = `${Math.round(tile * 0.58)}px ${MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('#', px + tile / 2, py + tile / 2 + tile * 0.03);
        } else {
          if (!isGoal) {
            // faint floor dot
            ctx.fillStyle = C.muted;
            ctx.globalAlpha = 0.35;
            ctx.font = `${Math.round(tile * 0.5)}px ${MONO}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('·', px + tile / 2, py + tile / 2);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
  }

  function drawExitBadge() {
    const { cx, cy } = tileCenter(state.goal.x, state.goal.y);
    const w = tile * 0.8;
    const h = tile * 0.42;
    ctx.save();
    ctx.shadowColor = C.accentGlow;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    roundedRect(cx - w / 2, cy - h / 2, w, h, 3);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = C.accent;
    ctx.font = `700 ${Math.max(8, Math.round(tile * 0.21))}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', cx, cy + tile * 0.01);
    ctx.restore();
  }

  function robotPixel(now) {
    if (anim && anim.kind === 'move' && !reducedMotion) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const k = easeOutCubic(t);
      return {
        cx: (anim.from.x + (anim.to.x - anim.from.x) * k + 0.5) * tile,
        cy: (anim.from.y + (anim.to.y - anim.from.y) * k + 0.5) * tile,
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
    const p = robotPixel(now);
    const a = robotAngle(now);
    const r = tile * 0.3;

    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(a);
    ctx.shadowColor = C.accentGlow;
    ctx.shadowBlur = 16;
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.moveTo(r * 1.15, 0);          // tip
    ctx.lineTo(-r * 0.85, -r * 0.8);  // rear upper
    ctx.lineTo(-r * 0.3, 0);          // notch
    ctx.lineTo(-r * 0.85, r * 0.8);   // rear lower
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return p;
  }

  function draw(now) {
    if (!state) return;
    const width = state.cols * tile;
    const height = state.rows * tile;

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

    drawBoard();
    drawExitBadge();
    const p = drawRobot(now);

    // crash accent flash over the robot tile
    if (fx.crash >= 0) {
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
      }
      // 'step' and 'finished' have no scene business
    },
  };
}
