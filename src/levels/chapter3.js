// Chapter 3 — one automatic front wall sensor. Holes are not detected.
// Contracts and teaching limits: docs/briefs/m6-front-wall-sensor.md.
const movement = ['move', 'turnLeft', 'turnRight'];
const mixed = [...movement, 'loop', 'loopUntil', 'end'];
export const chapter3 = [
  {
    id: 'ch3-01', name: 'Cruise Control', startDir: 'E', sensor: 'frontWall',
    memory: 4, par: 3, blocks: ['move', 'loopUntil', 'end'],
    grid: ['############', '#S........G#', '############'],
  },
  {
    id: 'ch3-02', name: 'Two Halls', startDir: 'E', sensor: 'frontWall',
    memory: 7, par: 7, blocks: [...movement, 'loopUntil', 'end'],
    grid: ['##############', '#S...........#', '############.#', '############.#',
      '############.#', '############.#', '############G#', '##############'],
  },
  {
    id: 'ch3-03', name: 'Mind the Gap', startDir: 'E', sensor: 'frontWall',
    memory: 8, par: 7, blocks: [...mixed],
    grid: ['################', '########G#######', '########.#######',
      '#S............H#', '################'],
  },
  {
    id: 'ch3-04', name: 'Safe Passage', startDir: 'E', sensor: 'frontWall',
    memory: 11, par: 11, blocks: [...mixed],
    grid: ['#############', '#S.....######', '######.######', '######.######',
      '######.######', '#G.....######', '######H######', '#############'],
  },
];
