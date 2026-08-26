/* ============================================================
   LoCo — chapter 1 levels (M1 placeholder pack, issues #1-#5)
   Format per design.md §3. All seven are verified solvable by
   construction with move / turnLeft / turnRight only:

   ch1-01  straight corridor        — 4 moves, memory 8 (slack)
   ch1-02  one bend, both turns     — 6 blocks, memory 6 (exact)
   ch1-03  zigzag w/ 4-block shortcut — 4-5 blocks, memory 5 (tight)
   ch1-04  T-junction w/ dead-end decoy — 5 blocks, memory 5 (exact)
   ch1-05  two-bend switchback          — 8 blocks, memory 8 (exact)
   ch1-06  loop around center island    — 10 blocks, memory 10 (exact)
   ch1-07  3-row serpentine finale      — 12 blocks, memory 12 (exact)

   Grid legend: '#' wall, '.' floor, 'S' start, 'G' goal.
   Grids stay <= 9x7; difficulty ramps via shape AND memory.
   ============================================================ */

export const chapter1 = [
  {
    id: 'ch1-01',
    name: 'Corridor',
    grid: [
      '#######',
      '#S...G#',
      '#######',
    ],
    startDir: 'E',
    memory: 8,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 4, // move x4
  },
  {
    id: 'ch1-02',
    name: 'The Bend',
    grid: [
      '#####',
      '#S..#',
      '##.##',
      '#G..#',
      '#####',
    ],
    startDir: 'E',
    memory: 6,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 6, // move, turnRight, move, move, turnRight, move
  },
  {
    id: 'ch1-03',
    name: 'Zigzag',
    grid: [
      '#######',
      '###.###',
      '##.G###',
      '#S..###',
      '#######',
    ],
    startDir: 'E',
    memory: 5,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 4, // move, move, turnLeft, move (shortcut up the right side)
  },
  {
    id: 'ch1-04',
    name: 'The Fork',
    grid: [
      '#######',
      '###.###',
      '#S..###',
      '###.###',
      '###G###',
    ],
    startDir: 'E',
    memory: 5,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 5, // move x2, turnRight, move x2 (turnLeft at the junction is a dead end)
  },
  {
    id: 'ch1-05',
    name: 'Switchback',
    grid: [
      '#######',
      '#S..###',
      '###.###',
      '#G..###',
      '#######',
    ],
    startDir: 'E',
    memory: 8,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 8, // move x2, turnRight, move x2, turnRight, move x2
  },
  {
    id: 'ch1-06',
    name: 'Around the Block',
    grid: [
      '######',
      '#S...#',
      '#.##.#',
      '#G...#',
      '######',
    ],
    startDir: 'E',
    memory: 10,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 10, // move x3, turnRight, move x2, turnRight, move x3
  },
  {
    id: 'ch1-07',
    name: 'The Snake',
    grid: [
      '#######',
      '#S....#',
      '#####.#',
      '#G....#',
      '#######',
    ],
    startDir: 'E',
    memory: 12,
    blocks: ['move', 'turnLeft', 'turnRight'],
    par: 12, // move x4, turnRight, move x2, turnRight, move x4
  },
];
