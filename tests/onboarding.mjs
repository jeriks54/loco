import assert from 'node:assert/strict';
import { levels } from '../src/levels/index.js';
import { tutorialLevel } from '../src/onboarding.js';
import { execute, shortestSequence } from './helpers.mjs';

assert.equal(levels.length, 25);
assert.equal(levels.some(level => level.id === tutorialLevel.id), false);
const route = ['move', 'turnRight', 'move', 'turnLeft', 'move'];
assert.deepEqual(shortestSequence(tutorialLevel), route);
assert.ok(route.length < tutorialLevel.memory);
assert.equal(execute(tutorialLevel, route).outcome, 'goal');
assert.equal(execute(tutorialLevel, ['move', 'move']).outcome, 'crashed');
assert.equal(execute(tutorialLevel, ['move']).outcome, 'finished');
console.log('PASS: tutorial maze is separate, solvable in five lines, and has real crash/unfinished outcomes.');
