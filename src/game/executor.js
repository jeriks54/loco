/* ============================================================
   LoCo — program executor (design.md §2, §4)
   Pure tick machine, DOM-free (Node-importable for tests).
   One block per tick; base tick 600 ms scaled by speed
   (x1/2 -> 1200 ms, x1 -> 600 ms, x2 -> 300 ms).

   Events via onEvent(type, payload):
     step     index of the block about to execute
     moved    { from:{x,y}, to:{x,y}, dir }
     turned   newDir ('N'|'E'|'S'|'W')
     crashed  { at:{x,y}, dir }   robot tile at impact
     goal     { at:{x,y} }        (terminal)
     finished {}                  program ended short of goal (terminal)

   start(speed) always re-runs from a clean slate (it resets
   robot pose + program pointer first), so it can be called
   again after stop() or a terminal event.
   ============================================================ */

import { isBlocked } from './state.js';

export const BASE_TICK_MS = 600;

const DIR_VECTORS = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};
const TURN_LEFT = { N: 'W', W: 'S', S: 'E', E: 'N' };
const TURN_RIGHT = { N: 'E', E: 'S', S: 'W', W: 'N' };

/**
 * @param {{state:object, program:string[], onEvent?:(type:string, payload:any)=>void, baseTickMs?:number}} opts
 *   baseTickMs is a test seam (defaults to BASE_TICK_MS); it never
 *   changes the event sequence, only pacing.
 */
export function createExecutor({ state, program, onEvent, baseTickMs = BASE_TICK_MS }) {
  const blocks = [...program]; // snapshot — later edits don't leak in
  const startPose = { ...state.robot };

  let index = 0;
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

  function tick() {
    if (!running) return;

    if (index >= blocks.length) {
      halt();
      emit('finished', {});
      return;
    }

    emit('step', index);
    const block = blocks[index];
    index += 1;

    if (block === 'move') {
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
    } else if (block === 'turnLeft') {
      state.robot.dir = TURN_LEFT[state.robot.dir];
      emit('turned', state.robot.dir);
    } else if (block === 'turnRight') {
      state.robot.dir = TURN_RIGHT[state.robot.dir];
      emit('turned', state.robot.dir);
    } else {
      throw new Error(`unknown block '${block}'`);
    }

    timer = setTimeout(tick, intervalMs());
  }

  return {
    /** Run (or re-run) the program from the start. */
    start(newSpeed = speed) {
      halt();
      index = 0;
      speed = newSpeed;
      restorePose(); // re-run always starts clean ("reset first")
      running = true;
      tick(); // first block executes immediately, then the timer paces the rest
    },

    /** Stop executing; robot stays wherever it is. */
    stop() {
      halt();
    },

    /** Stop and put the robot back at the start tile. */
    reset() {
      halt();
      index = 0;
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
