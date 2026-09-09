import { loop, untilWall } from './helpers.mjs';
export const sensorSolutions = [
  [untilWall(), 'move', 'end'],
  [untilWall(), 'move', 'end', 'turnRight', untilWall(), 'move', 'end'],
  [loop(7), 'move', 'end', 'turnLeft', untilWall(), 'move', 'end'],
  [untilWall(), 'move', 'end', 'turnRight', loop(4), 'move', 'end', 'turnRight', untilWall(), 'move', 'end'],
];
export const sensorMinimums = [9, 17, 10, 16];
