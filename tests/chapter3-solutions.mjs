import { loop } from './helpers.mjs';
export const sensorSolutions = [
  ['loopUntil', 'move', 'end'],
  ['loopUntil', 'move', 'end', 'turnRight', 'loopUntil', 'move', 'end'],
  [loop(7), 'move', 'end', 'turnLeft', 'loopUntil', 'move', 'end'],
  ['loopUntil', 'move', 'end', 'turnRight', loop(4), 'move', 'end', 'turnRight', 'loopUntil', 'move', 'end'],
];
export const sensorMinimums = [9, 17, 10, 16];
