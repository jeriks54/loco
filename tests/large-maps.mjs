import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { levels } from '../src/levels/index.js';
import { decisionSolutions, ifWall } from './chapter4-solutions.mjs';
import { execute, shortestSequence, loop, untilWall } from './helpers.mjs';
import { createCamera, boardPadding } from '../src/render/camera.js';

assert.equal(createHash('sha256').update(JSON.stringify(levels.slice(0, 25))).digest('hex'),
  'cc9bdd7a8cade584c8cd608953ce04749959804265fe7b4d279de43450ecaa0c', 'previous 25 levels stay intact');
for (const [i, level] of levels.slice(25).entries()) {
  const solution = decisionSolutions[i + 5];
  const result = execute(level, solution);
  assert.equal(result.outcome, 'goal');
  assert.equal(result.ticks, [165, 163][i], 'solution must fit the unmodified 200-tick guard');
  assert.equal(solution.length, level.memory);
  const shortest = shortestSequence(level);
  assert.equal(shortest.length, [49, 47][i]);
  assert.equal(execute(level, shortest).outcome, 'goal', 'independent safe route');
  const steps = result.events.filter(e => e.type === 'step').map(e => e.payload);
  if (i === 1) {
    assert.ok(steps.includes(10), 'turn-now junction is used');
    assert.ok(steps.includes(12), 'advance-first junction is used');
  }
  // Distances really vary: the reusable sensor loops must inspect the world.
  function spans(moveIndex, afterIndex) {
    let count = 0; const distances = [];
    for (const step of steps) {
      if (step === moveIndex) count++;
      if (step === afterIndex) { distances.push(count); count = 0; }
    }
    return distances;
  }
  assert.deepEqual(spans(i ? 5 : 4, i ? 8 : 7), i ? [2, 4, 1, 3] : [3, 2, 5, 4]);
  assert.deepEqual(spans(i ? 16 : 10, i ? 18 : 12), i ? [3, 2, 4, 3] : [2, 4, 3, 5]);
  // Prior chapter programs and generic one-direction followers are insufficient.
  for (const candidate of [...decisionSolutions.slice(0, 5),
    [loop(99), untilWall(), 'move', 'end', 'turnRight', 'end'],
    [loop(99), untilWall(), 'move', 'end', 'turnLeft', 'end']]) {
    assert.notEqual(execute(level, candidate).outcome, 'goal', `${level.id}: shortcut`);
  }
}
const wide = levels[25], intended = decisionSolutions[5];
for (const count of [3, 5]) {
  const wrong = structuredClone(intended); wrong[1].count = count;
  assert.notEqual(execute(wide, wrong).outcome, 'goal', `wrong junction count ${count}`);
}
const tall = levels[26], grouped = decisionSolutions[6];
for (const index of [1, 2]) for (const count of [1, 3, 99]) {
  const wrong = structuredClone(grouped); wrong[index].count = count;
  assert.notEqual(execute(tall, wrong).outcome, 'goal', 'both grouping counts matter');
}
for (const arm of [['turnRight'], ['move', 'turnRight']]) {
  assert.notEqual(execute(tall, [...grouped.slice(0, 9), ...arm, ...grouped.slice(15)]).outcome, 'goal',
    'always taking one junction action must fail');
}
assert.notEqual(execute(tall, ['turnLeft', loop(4), ...grouped.slice(3, 23), ...grouped.slice(27)]).outcome,
  'goal', 'flattening the pairs and omitting their connectors must fail');
// Exact user-submitted ten-line solution (8 crossings, each six moves).
const userShortcut = [loop(8), loop(6), 'move', 'end', 'turnRight', ifWall(),
  'turnLeft', 'turnLeft', 'end', 'end'];
for (const level of [wide, tall]) assert.notEqual(execute(level, userShortcut).outcome, 'goal');
const formerSolutions = [
  [loop(13), ifWall(), 'turnRight', 'else', loop(3), 'move', 'move', 'end', 'turnLeft', 'end', 'end',
    'turnLeft', 'turnLeft', untilWall(), 'move', 'end'],
  [loop(99), untilWall(), 'move', 'end', 'turnRight', ifWall(), 'turnLeft', 'turnLeft', 'end', 'move', 'move', 'end'],
];
for (const level of [wide, tall]) for (const solution of formerSolutions) {
  assert.notEqual(execute(level, solution).outcome, 'goal', 'previous capstone solution must fail');
}

// Search compact follower families, including all legal fixed travel distances,
// both turn preferences, and sensed travel. This is targeted adversarial testing,
// NOT exhaustive enumeration of every program within either memory budget.
const followers = [];
for (const turn of ['turnLeft', 'turnRight']) for (const other of ['turnLeft', 'turnRight']) {
  for (const travel of [[untilWall(), 'move', 'end'],
    ...Array.from({ length: 99 }, (_, n) => [loop(n + 1), 'move', 'end'])]) {
    followers.push([loop(99), ...travel, turn, ifWall(), other, other, 'end', 'end']);
    followers.push([loop(99), turn, ifWall(), other, 'else', ...travel, 'end', 'end']);
    followers.push([loop(99), ...travel, turn, 'end']);
  }
  for (const bridge of [[], ['move'], ['move', 'move']]) {
    followers.push([loop(99), turn, ifWall(), other, 'else', untilWall(), 'move', 'end', other, ...bridge, 'end', 'end']);
    followers.push([loop(99), turn, ifWall(), other, 'end', ifWall(), other, 'end', 'move', 'end']);
  }
}
assert.equal(followers.length, 1224);
for (const level of [wide, tall]) for (const candidate of followers) {
  assert.notEqual(execute(level, candidate).outcome, 'goal', `${level.id}: compact follower shortcut`);
}
// Replacing either scanning or descending with a fixed count must not work.
for (const [level, solution, indices] of [[wide, intended, [2, 9]], [tall, grouped, [3, 15]]]) {
  for (const index of indices) for (let count = 1; count <= 99; count++) {
    const changed = structuredClone(solution); changed[index] = loop(count);
    assert.notEqual(execute(level, changed).outcome, 'goal', `${level.id}: fixed count replaces sensing`);
  }
}

// Camera invariants across narrow/tall/wide viewports and maps, without a DOM.
for (const [width, height] of [[232, 128], [320, 180], [780, 140], [760, 540]]) {
  for (const level of levels) {
    const camera = createCamera(), v = camera.view;
    camera.resize(width, height, level.grid[0].length, level.grid.length, true);
    assert.ok(camera.world().width <= width && camera.world().height <= height);
    camera.zoom(1e6); assert.equal(v.tile, 64);
    for (const sign of [-1, 1]) {
      camera.pan(sign * 1e6, sign * 1e6);
      const size = camera.world();
      if (size.width > width) assert.ok(v.x <= 0 && v.x >= width - size.width);
      if (size.height > height) assert.ok(v.y <= 0 && v.y >= height - size.height);
    }
    v.following = true;
    const startY = level.grid.findIndex(row => row.includes('S'));
    const startX = level.grid[startY].indexOf('S');
    const px = boardPadding(v.tile) + (startX + .5) * v.tile;
    const py = boardPadding(v.tile) + (startY + .5) * v.tile;
    camera.track(px, py);
    assert.ok(px + v.x >= 0 && px + v.x <= width);
    assert.ok(py + v.y >= 0 && py + v.y <= height);
    camera.fit(); assert.equal(v.tile, v.fitTile);
    camera.zoom(.001); assert.equal(v.tile, v.fitTile);
  }
}
console.log('PASS: two large capstones, preserved campaign, independent routes, shortcut/wrong-count checks and camera bounds.');
