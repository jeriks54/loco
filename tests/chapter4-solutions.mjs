export const ifWall = () => ({ id: 'if', sensor: 'wallSensor', value: 'blocked' });
export const untilWall = () => ({ id: 'loopUntil', sensor: 'wallSensor', value: 'blocked' });

export const decisionSolutions = [
  [
    { id: 'loop', count: 99 }, ifWall(), 'turnRight', 'end', 'move', 'end',
  ],
  [
    { id: 'loop', count: 99 }, ifWall(), 'turnRight', 'else', 'move', 'end', 'end',
  ],
  [
    { id: 'loop', count: 12 }, ifWall(), 'turnRight', 'else', 'turnLeft', 'end', 'move', 'end',
  ],
  [
    { id: 'loop', count: 12 }, ifWall(), 'turnRight', 'else',
    { id: 'loop', count: 4 }, 'move', 'end',
    'turnLeft', 'end', 'end',
  ],
  [
    { id: 'loop', count: 30 }, ifWall(), 'turnRight', 'else',
    untilWall(), 'move', 'end', 'turnLeft', 'end', 'end',
  ],
];
