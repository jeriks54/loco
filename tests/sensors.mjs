import assert from 'node:assert/strict';
import { chapter3 } from '../src/levels/chapter3.js';
import { createLevelState, isWallAhead } from '../src/game/state.js';
import { createExecutor } from '../src/game/executor.js';
import { execute, shortestSequence, loop, withClock } from './helpers.mjs';
import { sensorSolutions, sensorMinimums } from './chapter3-solutions.mjs';

const report = chapter3.map((level, i) => {
  assert.equal(level.sensor, 'frontWall');
  const shortest = shortestSequence(level);
  assert.equal(shortest.length, sensorMinimums[i]);
  assert.ok(shortest.length > level.memory);
  assert.equal(execute(level, shortest).outcome, 'goal');
  const solution = sensorSolutions[i];
  assert.equal(solution.length, level.par);
  assert.ok(solution.length <= level.memory);
  assert.ok(solution.every(e => level.blocks.includes(typeof e === 'string' ? e : e.id)));
  const result = execute(level, solution);
  assert.equal(result.outcome, 'goal');
  assert.ok(level.grid.length <= 9 && level.grid[0].length <= 16);
  return { level: level.id, minimum: shortest.length, memory: level.memory, ticks: result.ticks };
});
const fixture = { id: 'sensor-check', sensor: 'frontWall', startDir: 'E', memory: 20,
  blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'loopUntil', 'end'],
  grid: ['#######', '#S...G#', '#H....#', '#######'] };
const state = createLevelState(fixture);
for (const [dir, expected] of [['N', true], ['E', false], ['S', false], ['W', true]]) {
  state.robot.dir = dir; assert.equal(isWallAhead(state), expected, dir);
}
for (const [grid, dir, expected] of [[['SG'], 'W', true], [['SG'], 'E', false], [['SHG'], 'E', false]]) {
  assert.equal(isWallAhead(createLevelState({ ...fixture, grid, startDir: dir })), expected);
}
assert.equal(createLevelState({ ...fixture, sensor: undefined }).sensor, null);
const blocked = execute({ ...fixture, startDir: 'N' }, ['loopUntil', 'move', 'end', 'turnRight']);
assert.equal(blocked.outcome, 'finished');
assert.deepEqual(blocked.events.filter(e => e.type === 'step').map(e => e.payload), [0, 3]);
assert.deepEqual(blocked.state.robot, { x: 1, y: 1, dir: 'E' });
// Turning within a sensed loop changes its next reading; no implicit movement.
const turned = execute(fixture, ['loopUntil', 'turnLeft', 'end']);
assert.equal(turned.outcome, 'finished'); assert.equal(turned.ticks, 4);
assert.equal(execute(fixture, ['loopUntil', 'end']).outcome, 'runaway');
assert.equal(execute({ ...fixture, startDir: 'N' }, ['loopUntil', 'end']).ticks, 1);
for (const program of [['loopUntil', 'move'], ['end'], ['loopUntil', loop(2), 'end']]) {
  const result = execute(fixture, program);
  assert.equal(result.outcome, 'syntax'); assert.equal(result.ticks, 0);
}
const unequipped = execute({ ...fixture, sensor: undefined }, ['move', 'loopUntil', 'move', 'end']);
assert.equal(unequipped.outcome, 'syntax'); assert.equal(unequipped.ticks, 0);
assert.deepEqual(unequipped.state.robot, { x: 1, y: 1, dir: 'E' });
const outerCount = execute(fixture, [loop(2), 'loopUntil', 'turnLeft', 'end', 'turnRight', 'end']);
assert.equal(outerCount.outcome, 'finished'); assert.equal(outerCount.state.robot.dir, 'E');
const outerSense = execute(fixture, ['loopUntil', loop(1), 'turnLeft', 'end', 'end']);
assert.equal(outerSense.outcome, 'finished'); assert.equal(outerSense.state.robot.dir, 'N');
for (const level of chapter3.slice(2)) assert.equal(execute(level,
  level.id === 'ch3-03' ? ['loopUntil', 'move', 'end'] : ['loopUntil', 'move', 'end', 'turnRight', 'loopUntil', 'move', 'end']).outcome, 'fell');
for (const [count, outcome] of [[3, 'finished'], [5, 'fell']]) {
  const wrong = structuredClone(sensorSolutions[3]); wrong[4].count = count;
  assert.equal(execute(chapter3[3], wrong).outcome, outcome);
}
withClock(clock => {
  const live = createLevelState(chapter3[1]);
  const program = structuredClone(sensorSolutions[1]);
  const executor = createExecutor({ state: live, program });
  executor.start(); clock.next(); executor.stop(); clock.drain();
  executor.start(); clock.drain(); assert.deepEqual({ x: live.robot.x, y: live.robot.y }, live.goal);
  executor.reset(); assert.deepEqual(live.robot, live.start);
});
console.table(report);
console.log('PASS: four sensor levels, directional wall detection, invisible holes, mixed nesting, zero-entry, equipment refusal and runaway.');
