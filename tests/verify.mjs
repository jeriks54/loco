import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { levels } from '../src/levels/index.js';
import { BLOCK_DEFS } from '../src/ui/palette.js';
import { createLevelState } from '../src/game/state.js';
import { createExecutor, LOOP_MIN, LOOP_MAX, MAX_TICKS } from '../src/game/executor.js';
import { execute, shortestSequence, loop, withClock } from './helpers.mjs';
import { solutions, loopFreeMinimums } from './chapter2-solutions.mjs';
import './tiles.mjs';
import './sensors.mjs';
import './spiral-proof.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const chapter1 = levels.filter(l => l.id.startsWith('ch1-'));
const chapter2 = levels.filter(l => l.id.startsWith('ch2-'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const geometry = ({ id, grid, startDir, memory, par }) => ({ id, grid, startDir, memory, par });
// Filled with baseline hashes from main before level-data integration.
const preserved = JSON.parse(readFileSync(new URL('./preserved-levels.json', import.meta.url)));
assert.equal(hash(chapter1), preserved.chapter1, 'chapter 1 changed');
assert.equal(hash(chapter2.slice(0, 4).map(geometry)), preserved.chapter2partA, 'Part A geometry/budgets changed');

const sourceFiles = readdirSync('src', { recursive: true }).filter(f => f.endsWith('.js'));
for (const file of sourceFiles) {
  const path = `src/${file}`;
  const checked = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (checked.error) throw checked.error;
  assert.equal(checked.status, 0, checked.stderr);
  assert.doesNotMatch(readFileSync(path, 'utf8'), /\brepeat\b|whileFrontClear|REPEAT_MIN|REPEAT_MAX/, path);
}
assert.deepEqual(Object.keys(BLOCK_DEFS).sort(), ['end', 'loop', 'loopUntil', 'move', 'turnLeft', 'turnRight']);
assert.equal(levels.length, 20);
assert.equal(new Set(levels.map(l => l.id)).size, 20);
assert.deepEqual(levels.map(l => l.id), [...Array.from({ length: 7 }, (_, i) => `ch1-0${i + 1}`), ...Array.from({ length: 8 }, (_, i) => `ch2-0${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `ch3-0${i + 1}`)]);
assert.equal(hash(levels.slice(0, 19)), 'b9badb3ed831e316064198452975f154a564d08c516356b8199a8f5dc47cd0ca', 'capstone must preserve previous 19 levels');

for (const level of levels) {
  createLevelState(level);
  assert.ok(['N', 'E', 'S', 'W'].includes(level.startDir));
  assert.ok(Number.isInteger(level.memory) && level.memory > 0);
  assert.ok(level.blocks.every(b => Object.hasOwn(BLOCK_DEFS, b)));
  const shortest = shortestSequence(level);
  assert.ok(shortest, `${level.id}: unreachable goal`);
  assert.equal(execute(level, shortest).outcome, 'goal', `${level.id}: BFS/real executor disagree`);
  if (level.id.startsWith('ch1-')) assert.ok(shortest.length <= level.memory, level.id);
}

const report = [];
chapter2.forEach((level, i) => {
  const program = solutions[i];
  assert.ok(level.grid.length <= 9 && level.grid[0].length <= 16);
  assert.ok(level.grid[0].split('').every(t => t === '#'));
  assert.ok(level.grid.at(-1).split('').every(t => t === '#'));
  assert.ok(level.grid.every(row => row[0] === '#' && row.at(-1) === '#'));
  assert.equal(program.length, level.par, `${level.id}: intended par`);
  assert.ok(program.length <= level.memory, `${level.id}: memory`);
  for (const entry of program) {
    assert.ok(level.blocks.includes(typeof entry === 'string' ? entry : entry.id), level.id);
    if (typeof entry !== 'string') assert.ok(Number.isInteger(entry.count) && entry.count >= 1 && entry.count <= 99);
  }
  const minimum = shortestSequence(level).length;
  assert.equal(minimum, loopFreeMinimums[i], `${level.id}: independent linear minimum`);
  assert.ok(minimum > level.memory, `${level.id}: sequence bypasses loop lesson`);
  const result = execute(level, program);
  assert.equal(result.outcome, 'goal', level.id);
  report.push({ level: level.id, name: level.name, linear: minimum, par: level.par, memory: level.memory, ticks: result.ticks });
});

// Wrong loop scope must fail before the mismatching tail; early goal completion
// must still be allowed when a larger count encounters the exit inside its body.
const changedCount = (program, index, count) => {
  const changed = structuredClone(program); changed[index].count = count; return changed;
};
assert.equal(execute(chapter2[4], changedCount(solutions[4], 0, 1)).outcome, 'finished');
assert.equal(execute(chapter2[4], changedCount(solutions[4], 0, 4)).outcome, 'goal');
assert.equal(execute(chapter2[5], changedCount(solutions[5], 0, 4)).outcome, 'crashed');
assert.equal(execute(chapter2[6], changedCount(solutions[6], 0, 1)).outcome, 'finished');
assert.equal(execute(chapter2[7], changedCount(solutions[7], 0, 1)).outcome, 'finished');
assert.equal(execute(chapter2[7], changedCount(solutions[7], 1, 3)).outcome, 'crashed');

const corridor = { id: 'executor-check', grid: ['#########', '#S.....G#', '#########'], startDir: 'E', memory: 20, blocks: Object.keys(BLOCK_DEFS) };
assert.equal(LOOP_MIN, 1); assert.equal(LOOP_MAX, 99);
for (const count of [undefined, NaN, Infinity]) {
  const result = execute(corridor, [loop(count), 'move', 'end']);
  assert.equal(result.state.robot.x, 3, 'invalid/missing count defaults to 2');
}
for (const count of [0, -4, 1.9]) assert.equal(execute(corridor, [loop(count), 'move', 'end']).state.robot.x, 2);
assert.equal(execute(corridor, [loop(2), loop(2), 'move', 'end', 'end']).state.robot.x, 5);
const steps = execute(corridor, [loop(2), 'move', 'end']).events.filter(e => e.type === 'step').map(e => e.payload);
assert.deepEqual(steps, [0, 1, 2, 0, 1, 2, 0]);
for (const program of [['end'], ['move', loop(2), 'move'], [loop(2), loop(3), 'end']]) {
  const result = execute(corridor, program);
  assert.equal(result.outcome, 'syntax'); assert.equal(result.ticks, 0); assert.equal(result.state.robot.x, 1);
}
for (const entry of ['repeat', { id: 'repeat', count: 2 }, 'whileFrontClear']) {
  assert.throws(() => createExecutor({ state: createLevelState(corridor), program: [entry] }), /unknown block/);
}
assert.equal(execute(corridor, [loop(99), 'move', 'end']).outcome, 'goal');
const runaway = execute(corridor, [loop(99), loop(99), 'turnRight', 'end', 'end']);
assert.equal(runaway.outcome, 'runaway'); assert.equal(runaway.ticks, MAX_TICKS);
assert.equal(execute(corridor, ['turnLeft', 'move']).outcome, 'crashed');

withClock(clock => {
  const state = createLevelState(corridor), program = [loop(2), 'move', 'end'];
  const executor = createExecutor({ state, program });
  program[0].count = 5;
  executor.start(2);
  assert.equal([...clock.pending.values()][0].delay, 300);
  executor.setSpeed(0.5);
  assert.equal([...clock.pending.values()][0].delay, 1200);
  clock.drain(); assert.equal(state.robot.x, 3, 'snapshot must isolate later edits');
  executor.start(); clock.drain(); assert.equal(state.robot.x, 3, 'same executor reruns from its start');
  executor.reset(); assert.equal(state.robot.x, 1);
  executor.start(); executor.stop(); clock.drain(); assert.equal(state.robot.x, 1); assert.equal(clock.pending.size, 0);
});

// A clamp check that finishes below the guard: 99 empty iterations = 199 ticks.
const capped = execute(corridor, [loop(1000), 'end']);
assert.equal(capped.outcome, 'finished'); assert.equal(capped.ticks, 199);
console.table(report);
console.log(`PASS: ${sourceFiles.length} module syntax checks; 20 level paths; 8 counted + 5 sensor solution checks; executor regression checks.`);
