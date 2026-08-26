/* ============================================================
   LoCo — program executor (design.md §2, §4; M2 loops brief)
   Pure tick machine, DOM-free (Node-importable for tests).
   One program line per tick; base tick 600 ms scaled by speed
   (x1/2 -> 1200 ms, x1 -> 600 ms, x2 -> 300 ms).

   Program entries: plain strings for simple blocks,
   { id: 'repeat', count } for repeat (count 1..99, default 2).

   Loops: 'repeat' / 'whileFrontClear' open a loop, 'end'
   closes the nearest open one. Balance is validated BEFORE
   running — an unbalanced program is refused with a terminal
   'syntax' event; the robot never moves and the program is
   preserved. The runaway guard halts any run after MAX_TICKS
   executed lines (terminal 'runaway'). Reaching the goal wins
   immediately, even mid-loop.

   Events via onEvent(type, payload):
     step     index of the program line about to execute —
              fires for EVERY executed line, including control
              lines (repeat / whileFrontClear / end) and
              revisits on each loop iteration
     moved    { from:{x,y}, to:{x,y}, dir }
     turned   newDir ('N'|'E'|'S'|'W')
     crashed  { at:{x,y}, dir }   robot tile at impact
     goal     { at:{x,y} }        (terminal)
     finished {}                  program ended short of goal (terminal)
     syntax   { at:number }       (terminal) unbalanced loops/ends
     runaway  { ticks:number }    (terminal) tick cap reached

   Machine shape: instruction pointer `ip` into the flat line
   list + a loop-frame stack. 'end' jumps back to its loop
   head; the head line decides whether to enter the body again
   or exit past the matching 'end'.

   start(speed) always re-runs from a clean slate (it resets
   robot pose + program pointer first), so it can be called
   again after stop() or a terminal event.
   ============================================================ */

import { isBlocked } from './state.js';

export const BASE_TICK_MS = 600;

/** Runaway guard: at most this many lines may execute in one run (M2 brief). */
export const MAX_TICKS = 200;

/** Repeat-count bounds (shared contract; the editor steppers use the same). */
export const REPEAT_MIN = 1;
export const REPEAT_MAX = 99;

const DIR_VECTORS = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};
const TURN_LEFT = { N: 'W', W: 'S', S: 'E', E: 'N' };
const TURN_RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' };

const SIMPLE_KINDS = new Set(['move', 'turnLeft', 'turnRight', 'whileFrontClear', 'end']);

/** Entry token id ('repeat' for { id:'repeat', count }). */
function entryId(entry) {
  return typeof entry === 'string' ? entry : entry && entry.id;
}

/** Snapshot + normalize program entries into line objects. */
function normalizeLines(program) {
  return program.map((entry) => {
    const id = entryId(entry);
    if (id === 'repeat') {
      let count = Math.floor(Number(entry.count));
      if (!Number.isFinite(count)) count = 2; // shared-contract default
      count = Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, count));
      return { kind: 'repeat', count };
    }
    if (SIMPLE_KINDS.has(id)) return { kind: id };
    throw new Error(`unknown block '${id}'`);
  });
}

/**
 * Balance validation + loop table. Each 'end' closes the
 * nearest open loop. Returns { ok:true, endOf } where endOf
 * maps a loop head line to its matching 'end' line, or
 * { ok:false, at } with 'at' the offending line (the unmatched
 * 'end', or the outermost loop left unclosed).
 */
function analyzeLoops(lines) {
  const stack = [];
  const endOf = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const kind = lines[i].kind;
    if (kind === 'repeat' || kind === 'whileFrontClear') {
      stack.push(i);
    } else if (kind === 'end') {
      if (stack.length === 0) return { ok: false, at: i };
      endOf.set(stack.pop(), i);
    }
  }
  if (stack.length > 0) return { ok: false, at: stack[0] };
  return { ok: true, endOf };
}

/**
 * @param {{state:object, program:Array, onEvent?:(type:string, payload:any)=>void, baseTickMs?:number}} opts
 *   baseTickMs is a test seam (defaults to BASE_TICK_MS); it never
 *   changes the event sequence, only pacing.
 */
export function createExecutor({ state, program, onEvent, baseTickMs = BASE_TICK_MS }) {
  const lines = normalizeLines(program); // snapshot — later edits don't leak in
  const balance = analyzeLoops(lines);
  const startPose = { ...state.robot };

  let ip = 0;
  let ticks = 0;
  let frames = [];
  let speed = 1;
  let timer = null;
  let running = false;

  const emit = (type, payload) => {
    if (onEvent) onEvent(type, payload);
  };

  const intervalMs = () => baseTickMs / speed;

  function halt() {
    running = false;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function restorePose() {
    state.robot.x = startPose.x;
    state.robot.y = startPose.y;
    state.robot.dir = startPose.dir;
  }

  /** 'while front clear': the tile one step ahead is in bounds and not a wall. */
  function frontClear() {
    const v = DIR_VECTORS[state.robot.dir];
    return !isBlocked(state, state.robot.x + v.x, state.robot.y + v.y);
  }

  function tick() {
    if (!running) return;

    if (ticks >= MAX_TICKS) {
      halt();
      emit('runaway', { ticks });
      return;
    }

    if (ip >= lines.length) {
      halt();
      emit('finished', {});
      return;
    }

    emit('step', ip);
    ticks += 1;

    const line = lines[ip];
    const top = frames[frames.length - 1];

    if (line.kind === 'move') {
      const v = DIR_VECTORS[state.robot.dir];
      const nx = state.robot.x + v.x;
      const ny = state.robot.y + v.y;
      if (isBlocked(state, nx, ny)) {
        halt();
        emit('crashed', { at: { x: state.robot.x, y: state.robot.y }, dir: state.robot.dir });
        return;
      }
      const from = { x: state.robot.x, y: state.robot.y };
      state.robot.x = nx;
      state.robot.y = ny;
      emit('moved', { from, to: { x: nx, y: ny }, dir: state.robot.dir });
      if (nx === state.goal.x && ny === state.goal.y) {
        halt();
        emit('goal', { at: { x: nx, y: ny } });
        return;
      }
      ip += 1;
    } else if (line.kind === 'turnLeft') {
      state.robot.dir = TURN_LEFT[state.robot.dir];
      emit('turned', state.robot.dir);
      ip += 1;
    } else if (line.kind === 'turnRight') {
      state.robot.dir = TURN_RIGHT[state.robot.dir];
      emit('turned', state.robot.dir);
      ip += 1;
    } else if (line.kind === 'repeat') {
      if (top && top.head === ip) {
        // revisit: one more iteration completed — again or exit?
        top.remaining -= 1;
        if (top.remaining > 0) {
          ip = top.bodyStart;
        } else {
          frames.pop();
          ip = balance.endOf.get(ip) + 1; // past the matching 'end'
        }
      } else {
        frames.push({ kind: 'repeat', head: ip, remaining: line.count, bodyStart: ip + 1 });
        ip += 1;
      }
    } else if (line.kind === 'whileFrontClear') {
      // checked on entry and re-checked after each iteration (on revisit)
      if (frontClear()) {
        if (!top || top.head !== ip) {
          frames.push({ kind: 'while', head: ip, bodyStart: ip + 1 });
        }
        ip += 1;
      } else {
        if (top && top.head === ip) frames.pop(); // exiting after iterations
        ip = balance.endOf.get(ip) + 1; // skip the body and its 'end'
      }
    } else {
      // 'end' — validation guarantees its loop frame is on top
      const frame = frames[frames.length - 1];
      ip = frame ? frame.head : ip + 1;
    }

    timer = setTimeout(tick, intervalMs());
  }

  return {
    /** Run (or re-run) the program from the start. */
    start(newSpeed = speed) {
      halt();
      ip = 0;
      ticks = 0;
      frames = [];
      speed = newSpeed;
      restorePose(); // re-run always starts clean ("reset first")
      if (!balance.ok) {
        // run refused — robot untouched, program preserved (M2 brief)
        emit('syntax', { at: balance.at });
        return;
      }
      running = true;
      tick(); // first line executes immediately, then the timer paces the rest
    },

    /** Stop executing; robot stays wherever it is. */
    stop() {
      halt();
    },

    /** Stop and put the robot back at the start tile. */
    reset() {
      halt();
      ip = 0;
      ticks = 0;
      frames = [];
      restorePose();
    },

    /** Live speed change (takes effect from the next scheduled tick). */
    setSpeed(newSpeed) {
      speed = newSpeed;
      if (running && timer !== null) {
        clearTimeout(timer);
        timer = setTimeout(tick, intervalMs());
      }
    },

    isRunning() {
      return running;
    },
  };
}
