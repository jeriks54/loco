import assert from 'node:assert/strict';
import { levels } from '../src/levels/index.js';
import { tutorialLevel, chapterExamples } from '../src/onboarding.js';
import { execute, shortestSequence } from './helpers.mjs';

assert.equal(levels.length, 25);
assert.equal(levels.some(level => level.id === tutorialLevel.id), false);
const route = ['move', 'turnRight', 'move', 'turnLeft', 'move'];
assert.deepEqual(shortestSequence(tutorialLevel), route);
assert.ok(route.length < tutorialLevel.memory);
assert.equal(execute(tutorialLevel, route).outcome, 'goal');
assert.equal(execute(tutorialLevel, ['move', 'move']).outcome, 'crashed');
assert.equal(execute(tutorialLevel, ['move']).outcome, 'finished');
const examples = {
  ch2: [{ id: 'loop', count: 3 }, 'move', 'end'],
  ch3: [{ id: 'loopUntil', sensor: 'wallSensor', value: 'blocked' }, 'move', 'end', 'turnRight', 'move'],
  ch4: [{ id: 'loop', count: 2 }, { id: 'if', sensor: 'wallSensor', value: 'blocked' }, 'turnRight', 'else', 'move', 'end', 'end', 'move'],
};
for (const [prefix, example] of Object.entries(chapterExamples)) {
  assert.equal(levels.some(level => level.id === example.id), false, `${prefix} example entered campaign`);
  assert.equal(examples[prefix].length, example.memory);
  assert.equal(execute(example, examples[prefix]).outcome, 'goal', `${prefix} example route failed`);
}
console.log('PASS: tutorial and three chapter examples stay outside campaign and win under the real executor.');
