/* ============================================================
   LoCo — chapter 4: decisions
   The front-wall sensor is reused for explicit if/else branching.
   Chapter 4 keeps the sensor vocabulary deliberately small: a
   condition is always wallSensor = blocked.
   ============================================================ */

const movement = ['move', 'turnLeft', 'turnRight'];

export const chapter4 = [
  {
    id: 'ch4-01', name: 'The Hairpin', startDir: 'E', sensor: 'frontWall',
    memory: 6, par: 6, blocks: ['move', 'turnRight', 'loop', 'if', 'end'],
    grid: [
      '##########',
      '#S......##',
      '#######.##',
      '#G......##',
      '##########',
    ],
  },
  {
    id: 'ch4-02', name: 'The Courtyard', startDir: 'E', sensor: 'frontWall',
    memory: 7, par: 7, blocks: [...movement, 'loop', 'if', 'else', 'end'],
    grid: [
      '#########',
      '#S.....##',
      '######.##',
      '###..#.##',
      '###.G#.##',
      '###.##.##',
      '###....##',
      '#########',
    ],
  },
  {
    id: 'ch4-03', name: 'Switchback', startDir: 'E', sensor: 'frontWall',
    memory: 8, par: 8, blocks: [...movement, 'loop', 'if', 'else', 'end'],
    grid: [
      '##########',
      '##.#######',
      '#G..######',
      '##...#####',
      '###...#.##',
      '####....##',
      '#####..S.#',
      '##########',
    ],
  },
  {
    id: 'ch4-04', name: 'The Relay', startDir: 'E', sensor: 'frontWall',
    memory: 10, par: 10, blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'if', 'else', 'end'],
    grid: [
      '###############',
      '###H###########',
      '#S....###.....#',
      '###H#.###.###.#',
      '#####.###.###.#',
      '#####.###.###.#',
      '#####.....###G#',
      '#####.#########',
      '###############',
    ],
  },
  {
    id: 'ch4-05', name: 'Signal Garden', startDir: 'E', sensor: 'frontWall',
    memory: 10, par: 10,
    blocks: [...movement, 'loop', 'loopUntil', 'if', 'else', 'end'],
    grid: [
      '#############',
      '#S....#######',
      '###H#.#######',
      '####H.##H####',
      '#####......##',
      '#########H.##',
      '######.....##',
      '######.....G#',
      '#############',
    ],
  },
];
