/* ============================================================
   LoCo — chapter 1 levels (M1 placeholder pack, issues #1-#5)
   Format per design.md §3. All three are verified solvable by
   construction with move / turnLeft / turnRight only:

   ch1-01  straight corridor        — 4 moves, memory 8 (slack)
   ch1-02  one bend, both turns     — 6 blocks, memory 6 (exact)
   ch1-03  zigzag w/ 4-block shortcut — 4-5 blocks, memory 5 (tight)

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
];
