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
  // Inspect the rail sideways, descend at its marker, and count four bays.
  // The exit is a separate ascent; continuing the bay pattern falls.
  [
    'turnLeft', { id: 'loop', count: 4 },
    untilWall(), 'turnRight', 'move', 'turnLeft', 'end',
    'turnRight', 'turnRight', untilWall(), 'move', 'end',
    'turnLeft', 'move', 'move', 'turnLeft', 'end',
    untilWall(), 'move', 'end',
  ],
  // Two pairs of junctions: a wall means turn now; an open tile means advance
  // once before turning. A connector separates pairs, then the exit breaks the pattern.
  [
    'turnLeft', { id: 'loop', count: 2 }, { id: 'loop', count: 2 },
    untilWall(), 'turnRight', 'move', 'turnLeft', 'end', 'turnRight',
    ifWall(), 'turnRight', 'else', 'move', 'turnRight', 'end',
    untilWall(), 'move', 'end', 'turnLeft', 'move', 'move', 'turnLeft', 'end',
    'turnRight', 'move', 'turnLeft', 'end', untilWall(), 'move', 'end',
  ],
];
