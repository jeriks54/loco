import assert from 'node:assert/strict';
import { createLevelState } from '../src/game/state.js';
import { createExecutor, MAX_TICKS } from '../src/game/executor.js';

export const loop = (count) => ({ id: 'loop', count });
export const terminals = new Set(['goal', 'crashed', 'finished', 'syntax', 'runaway']);

// Replace pacing, not the interpreter. All callbacks still come from the real
// executor. Tests using this helper run synchronously in one Node process.
export function withClock(check) {
  const originalSet = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const pending = new Map();
  let id = 0;
  globalThis.setTimeout = (fn, delay) => {
    pending.set(++id, { fn, delay });
    return id;
  };
  globalThis.clearTimeout = (key) => pending.delete(key);
  const clock = {
    pending,
    next() {
      const entry = pending.entries().next().value;
      if (!entry) return false;
      pending.delete(entry[0]);
      entry[1].fn();
      return true;
    },
    drain() {
      let calls = 0;
      while (this.next()) assert.ok(++calls <= MAX_TICKS + 2, 'executor failed to halt');
    },
  };
  try { return check(clock); }
  finally {
    globalThis.setTimeout = originalSet;
    globalThis.clearTimeout = originalClear;
  }
}

export function execute(level, program) {
  return withClock((clock) => {
    const state = createLevelState(level);
    const events = [];
    const executor = createExecutor({ state, program, onEvent: (type, payload) => events.push({ type, payload }) });
    executor.start();
    clock.drain();
    assert.equal(executor.isRunning(), false);
    assert.equal(events.filter(e => terminals.has(e.type)).length, 1);
    return { state, events, outcome: events.at(-1).type, ticks: events.filter(e => e.type === 'step').length };
  });
}

// Independent model: read grid characters directly, not state.js/isBlocked or
// executor movement tables. BFS counts turns as well as forward moves and only
// offers primitive commands actually in the level's palette.
export function shortestSequence(level) {
  const directions = 'NESW';
  const dx = [0, 1, 0, -1], dy = [-1, 0, 1, 0];
  let start;
  level.grid.forEach((row, y) => { const x = row.indexOf('S'); if (x >= 0) start = [x, y, directions.indexOf(level.startDir)]; });
  assert.ok(start && start[2] >= 0);
  const queue = [{ pose: start, program: [] }];
  const seen = new Set([start.join(',')]);
  for (let i = 0; i < queue.length; i++) {
    const { pose: [x, y, d], program } = queue[i];
    if (level.grid[y][x] === 'G') return program;
    for (const command of level.blocks.filter(b => ['move', 'turnLeft', 'turnRight'].includes(b))) {
      const next = command === 'move' ? [x + dx[d], y + dy[d], d]
        : [x, y, (d + (command === 'turnRight' ? 1 : 3)) % 4];
      const tile = level.grid[next[1]]?.[next[0]];
      if (!tile || tile === '#' || seen.has(next.join(','))) continue;
      seen.add(next.join(','));
      queue.push({ pose: next, program: [...program, command] });
    }
  }
  return null;
}
