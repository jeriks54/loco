import { loop } from './helpers.mjs';

// Explicit solutions reviewed with the level design; not read from level comments.
export const solutions = [
  [loop(13), 'move', 'end'],
  [loop(4), 'move', 'turnRight', 'move', 'turnLeft', 'end'],
  [loop(3), 'move', 'move', 'move', 'turnRight', 'end', 'move'],
  [loop(3), loop(6), 'move', 'end', 'turnRight', 'end'],
  [loop(3), 'move', 'move', 'turnRight', 'move', 'turnLeft', 'end'],
  [loop(3), 'move', 'move', 'turnRight', 'move', 'turnLeft', 'end', 'move', 'move', 'move'],
  [loop(2), loop(9), 'move', 'end', 'turnRight', loop(5), 'move', 'end', 'turnRight', 'end'],
  [loop(3), loop(4), 'move', 'end', 'turnRight', 'move', 'move', 'turnLeft', 'end'],
];

export const loopFreeMinimums = [13, 15, 13, 7, 14, 18, 25, 23];
