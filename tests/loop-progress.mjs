import assert from 'node:assert/strict';
import { createExecutor } from '../src/game/executor.js';
import { createLevelState } from '../src/game/state.js';
import { execute, loop, untilWall, withClock } from './helpers.mjs';

const corridor = {
  id: 'loop-progress', grid: ['#########', '#S.....G#', '#########'],
  startDir: 'E', memory: 20, sensor: 'frontWall',
  blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'loopUntil', 'if', 'else', 'end'],
};
const frame = (index, remaining, total) => ({ index, remaining, total });
const snapshots = result => result.events.filter(event => event.type === 'loopProgress').map(event => event.payload);

// Independently specified nested progress: inner loops restart at their full
// count, disappear on exit, and never change their enclosing loop's counter.
const nested = execute(corridor, [loop(2), loop(3), 'turnRight', 'end', 'end']);
assert.equal(nested.outcome, 'finished');
assert.deepEqual(snapshots(nested), [
  [frame(0, 2, 2)],
  [frame(0, 2, 2), frame(1, 3, 3)],
  [frame(0, 2, 2), frame(1, 2, 3)],
  [frame(0, 2, 2), frame(1, 1, 3)],
  [frame(0, 2, 2)],
  [frame(0, 1, 2)],
  [frame(0, 1, 2), frame(1, 3, 3)],
  [frame(0, 1, 2), frame(1, 2, 3)],
  [frame(0, 1, 2), frame(1, 1, 3)],
  [frame(0, 1, 2)],
  [],
]);

const ifWall = { id: 'if', sensor: 'wallSensor', value: 'blocked' };
const skipped = execute(corridor, [ifWall, loop(3), 'turnRight', 'end', 'end', loop(1), 'turnRight', 'end']);
assert.deepEqual(snapshots(skipped), [[frame(5, 1, 1)], []], 'unvisited branch must not show progress');

const sensed = execute(corridor, [untilWall(), loop(1), 'move', 'end', 'end']);
assert.equal(sensed.outcome, 'goal');
assert.ok(snapshots(sensed).flat().every(item => item.index === 1), 'sensed loop has no countdown');
const blocked = execute({ ...corridor, startDir: 'N' }, [loop(2), untilWall(), 'move', 'end', 'end']);
assert.deepEqual(snapshots(blocked), [[frame(0, 2, 2)], [frame(0, 1, 2)], []]);

// Every terminal outcome clears counters before reporting its result, including
// goal completion before the counted loop finishes.
for (const [grid, program, expected] of [
  [['#####', '#S.G#', '#####'], [loop(99), 'move', 'end'], 'goal'],
  [['#####', '#S#G#', '#####'], [loop(2), 'move', 'end'], 'crashed'],
  [['#####', '#SHG#', '#####'], [loop(2), 'move', 'end'], 'fell'],
  [corridor.grid, [loop(99), loop(99), 'turnRight', 'end', 'end'], 'runaway'],
]) {
  const result = execute({ ...corridor, grid }, program);
  assert.equal(result.outcome, expected);
  assert.deepEqual(snapshots(result).at(-1), [], `${expected}: stale progress`);
  assert.equal(result.events.at(-2).type, 'loopProgress', `${expected}: clear before terminal`);
}
assert.deepEqual(snapshots(execute(corridor, [loop(2), 'move'])), [], 'syntax refusal must not activate a loop');

for (const [count, expected] of [[1, 1], [99, 99], [1000, 99], [0, 1], [undefined, 2]]) {
  const result = execute(corridor, [loop(count), 'end']);
  assert.deepEqual(snapshots(result)[0], [frame(0, expected, expected)]);
  assert.deepEqual(snapshots(result).at(-1), []);
}

withClock(clock => {
  const program = [loop(3), 'move', 'end'];
  const original = structuredClone(program);
  const state = createLevelState(corridor);
  const progress = [];
  const executor = createExecutor({ state, program, onEvent(type, payload) {
    if (type === 'loopProgress') progress.push(payload);
  } });
  executor.start();
  assert.deepEqual(progress.at(-1), [frame(0, 3, 3)]);
  clock.next();
  executor.setSpeed(2);
  assert.equal([...clock.pending.values()][0].delay, 300);
  executor.stop();
  assert.deepEqual(progress.at(-1), []);
  assert.equal(clock.pending.size, 0);
  executor.start();
  assert.deepEqual(progress.at(-1), [frame(0, 3, 3)], 'stop/rerun starts full');
  clock.next();
  executor.reset();
  assert.deepEqual(progress.at(-1), []);
  assert.equal(state.robot.x, 1);
  executor.start();
  assert.deepEqual(progress.at(-1), [frame(0, 3, 3)], 'reset/rerun starts full');
  clock.drain();
  assert.equal(state.robot.x, 4);
  assert.deepEqual(program, original, 'runtime progress changed authored code');
  assert.deepEqual(progress[0], [frame(0, 3, 3)], 'later ticks changed an earlier snapshot');
});

// A consumer cannot mutate executor frames through an event snapshot.
withClock(clock => {
  const state = createLevelState(corridor);
  const executor = createExecutor({ state, program: [loop(2), 'move', 'end'], onEvent(type, payload) {
    if (type === 'loopProgress' && payload.length) payload[0].remaining = 99;
  } });
  executor.start();
  clock.drain();
  assert.equal(state.robot.x, 3);
});

console.log('PASS: live loop progress, nested/sensed/conditional scope, terminal cleanup, stop/reset/rerun, snapshot isolation.');
