import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { levels } from '../src/levels/index.js';
import { createLevelState, tileAt, isBlocked, isSafeToEnter } from '../src/game/state.js';
import { createExecutor } from '../src/game/executor.js';
import { execute, shortestSequence, loop, withClock } from './helpers.mjs';
import { holeBoard, holeTrap } from './tile-fixtures.mjs';

// Full serialized registry recorded from main 6a67e86 before M5 edits.
assert.equal(createHash('sha256').update(JSON.stringify(levels)).digest('hex'),
  '2e901f16950b57b687a71348ef931afb7227a060b9d90cbffdfc13d522cd518e', 'M5 must preserve all 15 level definitions');
const state = createLevelState(holeBoard);
assert.equal(state.tiles.length, state.cols * state.rows);
assert.notEqual(state.start, state.robot);
assert.deepEqual(state.start, { x: 1, y: 1, dir: 'E' });
for (const [x, y, type, blocked, safe] of [
  [0, 0, 'wall', true, false], [1, 1, 'start', false, true],
  [2, 1, 'floor', false, true], [3, 1, 'hole', false, false],
  [6, 1, 'goal', false, true], [-1, 1, null, true, false],
  [16, 1, null, true, false], [1, -1, null, true, false], [1, 4, null, true, false],
]) {
  assert.equal(tileAt(state, x, y), type);
  assert.equal(isBlocked(state, x, y), blocked);
  assert.equal(isSafeToEnter(state, x, y), safe);
  if (type !== null) assert.equal(state.walls.has(y * state.cols + x), type === 'wall');
}
for (const grid of [[], ['S.G', '..'], ['S?G'], ['SAG'], ['SSG'], ['SGG'], ['..G'], ['S..']]) {
  assert.throws(() => createLevelState({ ...holeBoard, grid }), /empty grid|length|unknown tile|multiple|missing/);
}
const fall = execute(holeBoard, ['move', 'move', 'turnRight']);
assert.deepEqual(fall.events, [
  { type: 'step', payload: 0 },
  { type: 'moved', payload: { from: { x: 1, y: 1 }, to: { x: 2, y: 1 }, dir: 'E' } },
  { type: 'step', payload: 1 },
  { type: 'moved', payload: { from: { x: 2, y: 1 }, to: { x: 3, y: 1 }, dir: 'E' } },
  { type: 'fell', payload: { at: { x: 3, y: 1 }, dir: 'E' } },
]);
assert.deepEqual(fall.state.robot, { x: 3, y: 1, dir: 'E' });
assert.deepEqual(fall.state.start, { x: 1, y: 1, dir: 'E' });
const nested = execute(holeBoard, [loop(2), loop(2), 'move', 'end', 'end', 'turnRight']);
assert.equal(nested.outcome, 'fell');
assert.deepEqual(nested.events.filter(e => e.type === 'step').map(e => e.payload), [0, 1, 2, 3, 1, 2]);
const wall = execute(holeBoard, ['turnLeft', 'move']);
assert.equal(wall.outcome, 'crashed');
assert.deepEqual(wall.state.robot, { x: 1, y: 1, dir: 'N' });
assert.equal(execute({ ...holeBoard, grid: ['SG'], startDir: 'W' }, ['move']).outcome, 'crashed');
assert.equal(shortestSequence(holeTrap), null, 'a fatal route is not a winning path');
const detour = shortestSequence(holeBoard);
assert.equal(detour.length, 10);
assert.equal(execute(holeBoard, detour).outcome, 'goal');

withClock(clock => {
  const live = createLevelState(holeBoard);
  const original = createExecutor({ state: live, program: ['move', 'move'] });
  original.start(); clock.drain(); assert.equal(live.robot.x, 3);
  // Actual application constructs a fresh executor after each failure.
  const next = createExecutor({ state: live, program: ['turnRight', 'move'] });
  next.start(); assert.deepEqual(live.robot, { x: 1, y: 1, dir: 'S' });
  next.stop(); clock.drain(); assert.equal(clock.pending.size, 0);
  next.start(); clock.drain(); assert.deepEqual(live.robot, { x: 1, y: 2, dir: 'S' });
  next.reset(); assert.deepEqual(live.robot, live.start);
  original.start(); clock.drain(); original.reset(); assert.deepEqual(live.robot, live.start);
});
console.log('PASS: all 15 level definitions preserved; tile semantics, real fall events, safe BFS, nested fall and fresh-executor restart.');
