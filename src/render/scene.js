import { isWallAhead } from '../game/state.js';
import { WORKSHOP, drawWorkshopRobot } from './workshop-art.js';

const MIN_TILE = 14;
const MAX_TILE = 64;
const TILE_DESKTOP = 48;
const MOVE_MS = 220;
const TURN_MS = 160;
const CRASH_MS = 340;
const GOAL_MS = 750;
const FALL_MS = 180;
const DIR_ANGLE = { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI };
const VECTORS = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

function framePad(t) { return t >= 24 ? Math.round(t * .5) : 0; }
function tileThatFits(availW, availH, cols, rows) {
  let t = Math.max(MIN_TILE, Math.min(MAX_TILE, Math.floor(Math.min(availW / cols, availH / rows))));
  while (t > MIN_TILE) {
    const inset = framePad(t) * 2;
    if (cols * t + inset <= availW && rows * t + inset <= availH) break;
    t -= 1;
  }
  return t;
}
function easeOutCubic(t) { return 1 - (1 - t) ** 3; }
function angleDelta(a, b) { return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; }
function rounded(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function markerCorner(ctx, x, y, sx, sy, size, light = false) {
  ctx.beginPath();
  ctx.moveTo(x, y + sy * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + sx * size, y);
  if (light) { ctx.save(); ctx.strokeStyle = '#e7e6cb'; ctx.lineWidth += 1.8; ctx.stroke(); ctx.restore(); }
  ctx.stroke();
}

export function createScene({ canvas, onSensorChange = () => {} }) {
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;
  const panel = wrap.parentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  const C = { bg: token('--bg') || WORKSHOP.stage };
  let state = null;
  let tile = TILE_DESKTOP;
  let dpr = 1;
  let fitted = null;
  const robot = { x: 0, y: 0, dir: 'E' };
  const settled = { x: 0, y: 0, dir: 'E' };
  let angle = 0;
  let anim = null;
  let pendingFall = null;
  let fall = null;
  let robotHidden = false;
  const fx = { crash: -1, goal: -1 };
  let frameId = null;
  let lastSensor = null;

  function sensorEquipped() { return Boolean(state && state.sensor === 'frontWall'); }
  function sensorBlockedAt(x, y, dir) {
    if (!state || !VECTORS[dir]) return false;
    return isWallAhead({ ...state, robot: { x, y, dir } });
  }
  function currentPhase() {
    if (robotHidden || fall || pendingFall) return 'unavailable';
    if (anim) return anim.kind === 'move' ? 'moving' : 'turning';
    return 'ready';
  }
  function emitSensor(phase = currentPhase()) {
    const equipped = sensorEquipped();
    const snapshot = { equipped, blocked: phase === 'ready' ? (equipped ? sensorBlockedAt(settled.x, settled.y, settled.dir) : false) : null, phase };
    if (lastSensor && lastSensor.equipped === snapshot.equipped && lastSensor.blocked === snapshot.blocked && lastSensor.phase === snapshot.phase) return;
    lastSensor = snapshot;
    onSensorChange(snapshot);
  }

  function fit() {
    if (!state) return;
    const cs = getComputedStyle(panel);
    const availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return;
    const nextTile = tileThatFits(availW, availH, state.cols, state.rows);
    const nextDpr = window.devicePixelRatio || 1;
    if (fitted && fitted.tile === nextTile && fitted.dpr === nextDpr && fitted.cols === state.cols && fitted.rows === state.rows) return;
    fitted = { tile: nextTile, dpr: nextDpr, cols: state.cols, rows: state.rows };
    tile = nextTile; dpr = nextDpr;
    const pad = framePad(tile); const width = state.cols * tile + pad * 2; const height = state.rows * tile + pad * 2;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function loopActive(now) { return Boolean(anim || pendingFall || fall || (fx.crash >= 0 && now - fx.crash < CRASH_MS) || (fx.goal >= 0 && now - fx.goal < GOAL_MS)); }
  function ensureLoop() { if (frameId === null) frameId = requestAnimationFrame(frame); }
  function frame(now) { frameId = null; draw(now); if (loopActive(now)) frameId = requestAnimationFrame(frame); }
  function invalidate() { ensureLoop(); }
  function tileCenter(x, y) { const pad = framePad(tile); return { cx: pad + (x + .5) * tile, cy: pad + (y + .5) * tile }; }
  function tileTypeAt(x, y) {
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return null;
    return state.tiles?.[y * state.cols + x] || 'floor';
  }

  function drawFrame() {
    const pad = framePad(tile); const gridW = state.cols * tile; const gridH = state.rows * tile;
    const width = gridW + pad * 2; const height = gridH + pad * 2;
    ctx.fillStyle = WORKSHOP.stage; ctx.fillRect(0, 0, width, height);
    if (!pad) return;
    rounded(ctx, .5, .5, width - 1, height - 1, Math.min(11, pad * .35), WORKSHOP.frameRim);
    rounded(ctx, 3, 3, width - 6, height - 6, Math.min(9, pad * .30), WORKSHOP.frame);
    rounded(ctx, pad - 3, pad - 3, gridW + 6, gridH + 6, 2, WORKSHOP.frameInner);
  }
  function drawHole(px, py) {
    const t = tile;
    rounded(ctx, px + t * .10, py + t * .10, t * .80, t * .80, t * .065, WORKSHOP.holeRim);
    rounded(ctx, px + t * .145, py + t * .165, t * .71, t * .70, t * .035, WORKSHOP.hole);
    ctx.fillStyle = '#020a0829'; ctx.fillRect(px + t * .18, py + t * .17, t * .64, t * .16);
    ctx.strokeStyle = '#d4c4a5'; ctx.lineWidth = Math.max(1, t * .022); ctx.beginPath(); ctx.moveTo(px + t * .12, py + t * .91); ctx.lineTo(px + t * .87, py + t * .91); ctx.stroke();
  }
  function drawGoal(px, py) {
    const t = tile;
    rounded(ctx, px + t * .10, py + t * .10, t * .80, t * .80, t * .07, WORKSHOP.goalFill);
    ctx.strokeStyle = WORKSHOP.goal; ctx.lineWidth = Math.max(1, t * .035); ctx.beginPath(); ctx.arc(px + t * .5, py + t * .40, t * .19, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = WORKSHOP.goal; ctx.beginPath(); ctx.arc(px + t * .5, py + t * .40, t * .065, 0, Math.PI * 2); ctx.fill();
    if (t >= 25) { ctx.font = `700 ${t * .145}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', px + t * .5, py + t * .77); }
  }
  function drawStart(px, py) {
    const cx = px + tile * .5;
    const cy = py + tile * .5;
    ctx.strokeStyle = WORKSHOP.grid;
    ctx.lineWidth = Math.max(1, tile * .035);
    ctx.beginPath();
    ctx.arc(cx, cy, tile * .32, 0, Math.PI * 2);
    ctx.stroke();
    if (tile >= 18) {
      ctx.fillStyle = WORKSHOP.ink;
      ctx.font = `700 ${tile * .3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', cx, cy + tile * .01);
    } else {
      // Keep a simple, recognizable S at the smallest board sizes.
      ctx.strokeStyle = WORKSHOP.ink;
      ctx.lineWidth = Math.max(1, tile * .11);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + tile * .63, py + tile * .35);
      ctx.bezierCurveTo(px + tile * .45, py + tile * .25, px + tile * .35, py + tile * .38, px + tile * .5, py + tile * .5);
      ctx.bezierCurveTo(px + tile * .65, py + tile * .62, px + tile * .55, py + tile * .75, px + tile * .37, py + tile * .65);
      ctx.stroke();
    }
  }
  function drawBoard() {
    const pad = framePad(tile); const get = (x, y) => tileTypeAt(x, y) === 'wall' ? '#' : '.';
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        const px = pad + x * tile;
        const py = pad + y * tile;
        const type = tileTypeAt(x, y);
        ctx.fillStyle = type === 'wall' ? WORKSHOP.wall : WORKSHOP.floor;
        ctx.fillRect(px, py, tile + .2, tile + .2);
        if (type !== 'wall') {
          ctx.strokeStyle = WORKSHOP.grid;
          ctx.lineWidth = .6;
          ctx.strokeRect(px + .3, py + .3, tile - .6, tile - .6);
          if (type !== 'hole') {
            ctx.fillStyle = '#28302418';
            const shadow = tile * .075;
            if (get(x, y - 1) === '#') ctx.fillRect(px, py, tile, shadow);
            if (get(x - 1, y) === '#') ctx.fillRect(px, py, shadow, tile);
            if (get(x, y + 1) === '#') ctx.fillRect(px, py + tile - shadow, tile, shadow * .6);
            if (get(x + 1, y) === '#') ctx.fillRect(px + tile - shadow, py, shadow * .6, tile);
          }
          if (type === 'hole') drawHole(px, py);
          if (type === 'goal') drawGoal(px, py);
          if (type === 'start') drawStart(px, py);
        }
      }
    }
    ctx.save();
    ctx.beginPath();
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        if (tileTypeAt(x, y) === 'wall') ctx.rect(pad + x * tile, pad + y * tile, tile, tile);
      }
    }
    ctx.clip();
    ctx.strokeStyle = '#d9ad7816';
    ctx.lineWidth = .7;
    const width = state.cols * tile;
    for (let j = 0; j < state.rows * 7; j += 1) {
      const yy = pad + j * tile / 7;
      ctx.beginPath();
      ctx.moveTo(pad, yy);
      ctx.bezierCurveTo(
        pad + 2.9 * tile,
        yy + tile * .10 * Math.sin(j),
        pad + 8 * tile,
        yy - tile * .11,
        pad + width,
        yy + tile * .05,
      );
      ctx.stroke();
    }
    ctx.restore();
    for (let y = 0; y < state.rows; y += 1) {
      for (let x = 0; x < state.cols; x += 1) {
        if (tileTypeAt(x, y) !== 'wall') continue;
        const px = pad + x * tile;
        const py = pad + y * tile;
        const edge = Math.max(1, tile * .035);
        ctx.fillStyle = WORKSHOP.wallEdge;
        if (get(x, y - 1) !== '#') ctx.fillRect(px, py, tile, edge);
        if (get(x - 1, y) !== '#') ctx.fillRect(px, py, edge, tile);
        ctx.fillStyle = WORKSHOP.wallShade;
        if (get(x + 1, y) !== '#') ctx.fillRect(px + tile - edge, py, edge, tile);
        if (get(x, y + 1) !== '#') ctx.fillRect(px, py + tile - edge, tile, edge);
      }
    }
  }

  function drawTarget() {
    if (!sensorEquipped() || anim || pendingFall || fall || robotHidden) return;
    const [dx, dy] = VECTORS[settled.dir] || [0, 0];
    const tx = settled.x + dx;
    const ty = settled.y + dy;
    const pad = framePad(tile);
    const blocked = sensorBlockedAt(settled.x, settled.y, settled.dir);
    ctx.strokeStyle = WORKSHOP.sensor;
    ctx.lineWidth = Math.max(1.2, tile * .038);
    ctx.lineCap = 'square';
    if (tx >= 0 && ty >= 0 && tx < state.cols && ty < state.rows) {
      const px = pad + tx * tile;
      const py = pad + ty * tile;
      ctx.fillStyle = WORKSHOP.targetFill;
      ctx.fillRect(px + tile * .08, py + tile * .08, tile * .84, tile * .84);
      const inset = .1;
      const len = .18;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const xx = px + tile * (sx === 1 ? inset : 1 - inset);
        const yy = py + tile * (sy === 1 ? inset : 1 - inset);
        markerCorner(ctx, xx, yy, sx, sy, tile * len, true);
        markerCorner(ctx, xx, yy, sx, sy, tile * len);
      }
      if (blocked) rounded(ctx, px + tile * .41, py + tile * .41, tile * .18, tile * .18, tile * .02, WORKSHOP.sensor);
      return;
    }
    const { cx, cy } = tileCenter(settled.x, settled.y);
    const px = cx - tile / 2;
    const py = cy - tile / 2;
    if (settled.dir === 'E' || settled.dir === 'W') {
      const edgeX = settled.dir === 'E' ? px + tile - tile * .1 : px + tile * .1;
      const sx = settled.dir === 'E' ? -1 : 1;
      markerCorner(ctx, edgeX, py + tile * .1, sx, 1, tile * .18, true);
      markerCorner(ctx, edgeX, py + tile * .9, sx, -1, tile * .18, true);
    } else {
      const edgeY = settled.dir === 'S' ? py + tile - tile * .1 : py + tile * .1;
      const sy = settled.dir === 'S' ? -1 : 1;
      markerCorner(ctx, px + tile * .1, edgeY, 1, sy, tile * .18, true);
      markerCorner(ctx, px + tile * .9, edgeY, -1, sy, tile * .18, true);
    }
  }
  function robotPixel(now) {
    const pad = framePad(tile);
    if (anim?.kind === 'move' && !reducedMotion) { const t = Math.min(1, (now - anim.t0) / anim.dur); const k = easeOutCubic(t); return { cx: pad + (anim.from.x + (anim.to.x - anim.from.x) * k + .5) * tile, cy: pad + (anim.from.y + (anim.to.y - anim.from.y) * k + .5) * tile }; }
    return tileCenter(robot.x, robot.y);
  }
  function robotAngle(now) { if (anim?.kind === 'turn' && !reducedMotion) { const t = Math.min(1, (now - anim.t0) / anim.dur); return anim.from + angleDelta(anim.from, anim.to) * easeOutCubic(t); } return angle; }
  function drawRobot(now) {
    if (robotHidden) return null; const p = robotPixel(now); let alpha = 1; let scale = 1;
    if (fall) { const t = Math.min(1, (now - fall.t0) / fall.dur); const k = easeOutCubic(t); alpha = 1 - k; scale = 1 - .75 * k; }
    drawWorkshopRobot(ctx, { cx: p.cx, cy: p.cy, size: tile, angle: robotAngle(now), equipped: sensorEquipped(), alpha, scale }); return p;
  }
  function advance(now) {
    if (anim && now - anim.t0 >= anim.dur) {
      if (anim.kind === 'turn') { angle = anim.to; settled.dir = robot.dir; } else { settled.x = anim.to.x; settled.y = anim.to.y; settled.dir = robot.dir; }
      anim = null;
      emitSensor();
    }
    if (!anim && pendingFall) { pendingFall = null; if (reducedMotion) { fall = null; robotHidden = true; emitSensor('unavailable'); } else { fall = { t0: now, dur: FALL_MS }; emitSensor('unavailable'); } }
    if (fall && now - fall.t0 >= fall.dur) { fall = null; robotHidden = true; emitSensor('unavailable'); }
    if (fx.crash >= 0 && now - fx.crash >= CRASH_MS) fx.crash = -1; if (fx.goal >= 0 && now - fx.goal >= GOAL_MS) fx.goal = -1;
  }
  function draw(now) {
    if (!state) return; advance(now); const pad = framePad(tile); const width = state.cols * tile + pad * 2; const height = state.rows * tile + pad * 2;
    ctx.save(); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, width, height);
    if (fx.crash >= 0 && !reducedMotion) { const p = (now - fx.crash) / CRASH_MS; if (p < 1) { const amp = 5 * (1 - p); ctx.translate((Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp); } }
    drawFrame(); drawBoard(); drawTarget(); const p = drawRobot(now);
    if (fx.crash >= 0 && p) { const t = (now - fx.crash) / CRASH_MS; if (t < 1) { ctx.save(); ctx.globalAlpha = .5 * (1 - t); ctx.fillStyle = WORKSHOP.sensor; ctx.beginPath(); ctx.arc(p.cx, p.cy, tile * (.35 + .35 * t), 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    if (fx.goal >= 0 && !reducedMotion) { const t = (now - fx.goal) / GOAL_MS; if (t < 1) { const g = tileCenter(state.goal.x, state.goal.y); ctx.save(); ctx.globalAlpha = .9 * (1 - t); ctx.strokeStyle = WORKSHOP.goal; ctx.lineWidth = 3 * (1 - t) + 1; ctx.beginPath(); ctx.arc(g.cx, g.cy, tile * (.3 + 1.1 * easeOutCubic(t)), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
    ctx.restore();
  }

  let fontsReady = false;
  const fontsPromise = document.fonts?.ready || Promise.resolve();
  fontsPromise.then(() => { fontsReady = true; if (state) { fit(); draw(performance.now()); } });
  function refresh() { if (!fontsReady) return; fit(); draw(performance.now()); }
  new ResizeObserver(refresh).observe(panel);

  return {
    render(newState) {
      state = newState; robot.x = state.robot.x; robot.y = state.robot.y; robot.dir = state.robot.dir; settled.x = robot.x; settled.y = robot.y; settled.dir = robot.dir; angle = DIR_ANGLE[robot.dir]; anim = null; pendingFall = null; fall = null; robotHidden = false; fx.crash = -1; fx.goal = -1; fitted = null; emitSensor('ready'); refresh();
    },
    handleEvent(type, payload) {
      if (!state) return; const now = performance.now();
      if (type === 'moved') {
        const from = { ...payload.from }; robot.x = payload.to.x; robot.y = payload.to.y; anim = reducedMotion ? null : { kind: 'move', from, to: payload.to, t0: now, dur: MOVE_MS };
        if (reducedMotion) { settled.x = robot.x; settled.y = robot.y; settled.dir = robot.dir; emitSensor('ready'); } else emitSensor('moving'); invalidate();
      } else if (type === 'turned') {
        const from = angle; robot.dir = payload; angle = DIR_ANGLE[payload]; anim = reducedMotion ? null : { kind: 'turn', from, to: angle, t0: now, dur: TURN_MS };
        if (reducedMotion) { settled.dir = robot.dir; emitSensor('ready'); } else emitSensor('turning'); invalidate();
      } else if (type === 'crashed') { if (!reducedMotion) fx.crash = now; invalidate();
      } else if (type === 'goal') { if (!reducedMotion) fx.goal = now; invalidate();
      } else if (type === 'fell') {
        robot.dir = payload.dir; pendingFall = { at: payload.at, dir: payload.dir }; emitSensor('unavailable');
        if (reducedMotion) { anim = null; pendingFall = null; fall = null; robotHidden = true; }
        invalidate();
      }
    },
  };
}
