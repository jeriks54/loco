import assert from 'node:assert/strict';
import { chapter3 } from '../src/levels/chapter3.js';
import { execute, loop } from './helpers.mjs';
import { findCountedSolution, evaluateCountedProgram, MAX_TICKS, LOOP_MIN, LOOP_MAX } from './counted-search.mjs';
import { MAX_TICKS as realMax, LOOP_MIN as realMin, LOOP_MAX as realMaxCount } from '../src/game/executor.js';

assert.deepEqual([MAX_TICKS, LOOP_MIN, LOOP_MAX], [realMax, realMin, realMaxCount]);
const spiral = chapter3.find(l => l.id === 'ch3-05');
const box = { ...spiral, id: 'proof-box', grid: ['########', '#S.....#', '#......#', '#.....G#', '########'] };
const hole = { ...spiral, id: 'proof-hole', grid: ['#######', '#S.H.G#', '#.....#', '#######'] };
function crosscheck(level, program) {
  const real = execute(level, program);
  const model = evaluateCountedProgram(level, program);
  assert.deepEqual(model, { outcome: real.outcome, ticks: real.ticks, pose: real.state.robot }, JSON.stringify(program));
}
const cases = [[], ['end'], ['move', loop(2)], ['move'], ['turnLeft', 'move'],
  [loop(99), 'move', 'end'], [loop(99), 'end'],
  [loop(99), loop(99), 'turnRight', 'end', 'end'],
  [loop(2), 'move', 'turnRight', 'move', 'end'],
  [loop(2), loop(3), 'move', 'end', 'turnLeft', 'end']];
for (const level of [spiral, box, hole]) for (const program of cases) crosscheck(level, program);
// Deterministic diverse balanced programs: independent generation from the
// exhaustive flat-template generator, with nested/empty/repeated bodies.
let seed = 92713;
const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
function sample(budget) {
  const program = [];
  while (budget > 0) {
    if (budget >= 2 && random(3) === 0) {
      const bodySize = random(budget - 1);
      program.push(loop(1 + random(99)), ...sample(bodySize), 'end');
      budget -= bodySize + 2;
    } else { program.push(['move', 'turnLeft', 'turnRight'][random(3)]); budget--; }
  }
  return program;
}
for (let i = 0; i < 1200; i++) crosscheck([spiral, box, hole][i % 3], sample(1 + random(9)));

// Positive control: the search must actually find a short counted-loop win.
const corridor = { ...spiral, id: 'proof-corridor', memory: 3, grid: ['########', '#S....G#', '########'] };
const positive = findCountedSolution(corridor);
assert.ok(positive.solution);
assert.equal(execute(corridor, positive.solution).outcome, 'goal');

// An independent combinatorial count checks that enumeration covered every
// balanced template with >=1 move and every 1..99 assignment, not a subset.
const choose = (n, k) => { let result = 1; for (let i = 1; i <= k; i++) result = result * (n - k + i) / i; return result; };
let expected = 0;
for (let n = 1; n <= spiral.memory; n++) for (let k = 0; 2 * k < n; k++) {
  const primitives = n - 2 * k;
  const catalan = choose(2 * k, k) / (k + 1);
  expected += catalan * choose(n, 2 * k) * (3 ** primitives - 2 ** primitives) * 99 ** k;
}
assert.equal(expected, 1687728);
const result = findCountedSolution(spiral);
assert.equal(result.solution, null, 'a counted-only shortcut invalidates the level');
assert.equal(result.exhaustive, true);
assert.equal(result.checked, expected, 'incomplete counted-only search');
console.log(`PASS: no counted-only win among ${result.checked.toLocaleString('en-US')} programs of 1–6 lines; 1,230 evaluator/real-executor crosschecks and positive control passed.`);
