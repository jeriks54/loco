// Check pacing independently of the UI's stop mapping and scene durations.
import assert from 'node:assert/strict';
import { createLevelState } from '../src/game/state.js';
import { createExecutor } from '../src/game/executor.js';
import { withClock, loop, untilWall, terminals } from './helpers.mjs';

const corridor = {
  id: 'speed-test', grid: ['########', '#S....G#', '########'],
  startDir: 'E', sensor: 'frontWall', memory: 12,
};
const cases = [
  [corridor, [loop(99), 'move', 'end'], 'goal'],
  [corridor, [loop(2), loop(2), 'turnRight', 'end', 'end'], 'finished'],
  [corridor, [loop(99), loop(99), 'turnRight', 'end', 'end'], 'runaway'],
  [corridor, [untilWall(), 'move', 'end'], 'goal'],
  [{ ...corridor, startDir: 'N' }, [untilWall(), 'move', 'end', 'turnRight', 'move'], 'finished'],
  [{ ...corridor, startDir: 'N' }, [
    { id: 'if', sensor: 'wallSensor', value: 'blocked' }, 'turnRight',
    'else', 'move', 'end', loop(99), 'move', 'end',
  ], 'goal'],
  [corridor, [
    { id: 'if', sensor: 'wallSensor', value: 'blocked' }, 'turnLeft',
    'else', loop(99), 'move', 'end', 'end',
  ], 'goal'],
  [corridor, ['turnRight', 'turnLeft', 'move', 'turnLeft', 'turnRight', 'move'], 'finished'],
  [corridor, ['turnLeft', 'move'], 'crashed'],
  [{ ...corridor, grid: ['#####', '#SHG#', '#####'] }, ['move'], 'fell'],
  [corridor, [loop(2), 'move'], 'syntax'],
];

function run(level, program, speed) {
  return withClock(clock => {
    const state = createLevelState(level), events = [];
    const executor = createExecutor({ state, program, onEvent: (type, payload) => {
      events.push({ type, payload: structuredClone(payload) });
    } });
    executor.start(speed);
    let elapsed = 0;
    while (clock.pending.size) {
      assert.equal(clock.pending.size, 1, 'only one executor timeout');
      const delay = [...clock.pending.values()][0].delay;
      assert.equal(delay, 600 / speed);
      elapsed += delay;
      clock.next();
    }
    assert.equal(executor.isRunning(), false);
    assert.equal(events.filter(e => terminals.has(e.type)).length, 1);
    return { events, robot: { ...state.robot }, elapsed };
  });
}

for (const [level, program, expected] of cases) {
  const baseline = run(level, program, 1);
  assert.equal(baseline.events.at(-1).type, expected);
  for (const speed of [0.5, 1, 2, 4, 8]) {
    const result = run(level, program, speed);
    assert.deepEqual(result.events, baseline.events, `${expected} event trace at ${speed}×`);
    assert.deepEqual(result.robot, baseline.robot, `${expected} final pose at ${speed}×`);
    assert.equal(result.elapsed, baseline.elapsed / speed, `${expected} pacing at ${speed}×`);
  }
}

withClock(clock => {
  const state = createLevelState(corridor), events = [];
  const executor = createExecutor({ state, program: [loop(99), 'move', 'end'],
    onEvent: (type, payload) => events.push({ type, payload: structuredClone(payload) }) });
  executor.start(0.5);
  clock.next(); // Inside the loop, after one move.
  for (const speed of [8, 0.5, 4, 1, 2]) {
    const before = structuredClone(events), robot = { ...state.robot };
    executor.setSpeed(speed);
    assert.deepEqual(events, before, 'speed must not advance or reset execution');
    assert.deepEqual(state.robot, robot);
    assert.equal(clock.pending.size, 1, 'live change replaces the timer');
    assert.equal([...clock.pending.values()][0].delay, 600 / speed);
  }
  executor.stop();
  assert.equal(clock.pending.size, 0);
  executor.start(8);
  clock.next();
  executor.reset();
  assert.equal(clock.pending.size, 0);
  assert.equal(state.robot.x, 1);
  executor.start(4);
  clock.drain();
  assert.equal(events.at(-1).type, 'goal');
  assert.equal(state.robot.x, 6);
});

console.log('PASS: five speed stops, pacing, preserved traces/poses, all outcomes, live changes, stop/reset/rerun.');
