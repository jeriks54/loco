import assert from 'node:assert/strict';
import { chapter4 } from '../src/levels/chapter4.js';
import { createExecutor } from '../src/game/executor.js';
import { createLevelState } from '../src/game/state.js';
import { decisionSolutions, ifWall } from './chapter4-solutions.mjs';
import { exactBranchFree } from './chapter4-proof.mjs';
import { execute, loop, withClock } from './helpers.mjs';

const untilWall = () => ({ id: 'loopUntil', sensor: 'wallSensor', value: 'blocked' });

assert.equal(new Set(chapter4.map(level => level.grid.join('\n'))).size, 5,
  'Chapter 4 levels must not reuse the same map');

for (let i = 0; i < chapter4.length; i += 1) {
  const level = chapter4[i];
  const solution = decisionSolutions[i];
  assert.equal(level.sensor, 'frontWall');
  assert.equal(solution.length, level.par, `${level.id}: intended par`);
  assert.ok(solution.length <= level.memory, `${level.id}: memory`);
  assert.ok(solution.every(entry => level.blocks.includes(typeof entry === 'string' ? entry : entry.id)), level.id);
  assert.equal(execute(level, solution).outcome, 'goal', level.id);
}

// The first four palettes are counted-only branch exercises. The independent
// function evaluator exhaustively enumerates every valid counted-loop AST up to
// each memory cap and proves that omitting if/else cannot reach the goal.
for (const level of chapter4.slice(0, 4)) {
  const proof = exactBranchFree(level);
  assert.equal(proof.wins, false, `${level.id}: branch-free program fits memory`);
}

// Level 24 used to accept this six-line follower. Keep the old shortcut as a
// regression fixture so a future map edit cannot accidentally make The Relay
// as easy as the previous spiral.
const oldLevel24Shortcut = [
  { id: 'loop', count: 99 }, ifWall(), 'turnRight', 'end', 'move', 'end',
];
assert.notEqual(execute(chapter4[3], oldLevel24Shortcut).outcome, 'goal',
  'ch4-04: old six-line shortcut must not solve The Relay');
assert.equal(decisionSolutions[3].length, 10, 'ch4-04: intended solution uses the full budget');

const trueFixture = {
  id: 'if-true', sensor: 'frontWall', startDir: 'E', memory: 12,
  blocks: ['move', 'turnLeft', 'turnRight', 'if', 'else', 'end'],
  grid: ['#####', '#S###', '#G###', '#####'],
};
const falseFixture = {
  id: 'if-false', sensor: 'frontWall', startDir: 'E', memory: 12,
  blocks: ['move', 'turnLeft', 'turnRight', 'if', 'else', 'end'],
  grid: ['#####', '#G###', '#S..#', '#####'],
};

const trueBranch = execute(trueFixture, [ifWall(), 'turnRight', 'else', 'turnLeft', 'end', 'move']);
assert.equal(trueBranch.outcome, 'goal');
assert.deepEqual(trueBranch.events.filter(e => e.type === 'step').map(e => e.payload), [0, 1, 2, 5]);

const falseBranch = execute(falseFixture, [ifWall(), 'turnRight', 'else', 'turnLeft', 'end', 'move']);
assert.equal(falseBranch.outcome, 'goal');
assert.deepEqual(falseBranch.events.filter(e => e.type === 'step').map(e => e.payload), [0, 2, 3, 4, 5]);

const falseNoElse = execute({ ...falseFixture, id: 'if-no-else', grid: ['#####', '#...#', '#S.G#', '#####'] }, [ifWall(), 'turnLeft', 'end', 'move', 'move']);
assert.equal(falseNoElse.outcome, 'goal');
assert.deepEqual(falseNoElse.events.filter(e => e.type === 'step').map(e => e.payload), [0, 3, 4]);

for (const program of [
  ['else'],
  [ifWall(), 'else', 'else', 'end'],
  [ifWall(), loop(2), 'else', 'end', 'end'],
]) {
  const result = execute(trueFixture, program);
  assert.equal(result.outcome, 'syntax');
  assert.equal(result.ticks, 0);
  assert.equal(result.events.at(-1).payload.reason, 'structure');
}

const emptyBranches = execute(trueFixture, [ifWall(), 'else', 'end']);
assert.equal(emptyBranches.outcome, 'finished');
assert.equal(emptyBranches.ticks, 2);

for (const entry of [{ id: 'if' }, { id: 'if', sensor: 'blocked', value: 'wallSensor' }]) {
  const result = execute(trueFixture, [entry, 'turnRight', 'end']);
  assert.equal(result.outcome, 'syntax');
  assert.equal(result.ticks, 0);
  assert.equal(result.events.at(-1).payload.reason, 'condition');
}

const unequipped = execute({ ...trueFixture, sensor: undefined }, [ifWall(), 'turnRight', 'end']);
assert.equal(unequipped.outcome, 'syntax');
assert.equal(unequipped.ticks, 0);
assert.equal(unequipped.events.at(-1).payload.reason, 'sensor');

withClock(clock => {
  const state = createLevelState(trueFixture);
  const condition = ifWall();
  const executor = createExecutor({ state, program: [condition, 'turnRight', 'end', 'move'] });
  condition.sensor = null;
  condition.value = null;
  executor.start();
  clock.drain();
  assert.equal(state.robot.y, 2, 'condition snapshot must isolate editor mutations');
});

const nested = execute(trueFixture, [ifWall(), loop(1), 'turnRight', 'end', 'else', 'move', 'end']);
assert.equal(nested.outcome, 'finished');
assert.equal(nested.state.robot.dir, 'S');

// The capstone intentionally exercises both counted and sensed loops inside a
// conditional. Keep this assertion separate from the level table so a future
// level-data edit cannot silently remove the mixed-control-flow contract.
assert.ok(decisionSolutions[4].some(entry => typeof entry !== 'string' && entry.id === 'loopUntil'));
const capstoneTrace = execute(chapter4[4], decisionSolutions[4]).events
  .filter(event => event.type === 'step').map(event => event.payload);
assert.ok(capstoneTrace.includes(5), 'capstone reaches the true turn arm');
assert.ok(capstoneTrace.includes(7), 'capstone reaches the false turn arm');

console.log('PASS: Chapter 4 solutions, if/else control flow, nesting, validation, snapshots and sensor gating.');
