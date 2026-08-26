/* ============================================================
   LoCo — chapter 2 levels: loops (M2, issue #12)
   Format per design.md §3. Every level verified against the
   real executor (src/game/executor.js) before hand-off.

   ch2-01  straight corridor, first repeat — 3 blocks, memory 3 (exact)
   ch2-02  diagonal stairs, multi-cmd body — 6 blocks, memory 6 (exact)
   ch2-03  island square, loop + tail      — 7 blocks, memory 7 (exact)
   ch2-04  box ring, nested loops          — 6 blocks, memory 6 (exact)
   ch2-05  long corridor, first while      — 3 blocks, memory 4 (+1 slack)
   ch2-06  U-shape, two whiles + one turn  — 7 blocks, memory 7 (exact)
   ch2-07  T-junction, counted + sensed    — 8 blocks, memory 8 (exact)
   ch2-08  compound capstone               — 10 blocks, memory 10 (exact)

   Rule R1: every memory is smaller than the shortest loop-free
   solution using the level's own blocks (brute force impossible
   by construction).
   Grid legend: '#' wall, '.' floor, 'S' start, 'G' goal.
   Grids may exceed M1's 9x7 cap where length is the point (R3).
   ============================================================ */

export const chapter2 = [
  {
    id: 'ch2-01',
    name: 'The Long Haul',
    grid: [
      '################',
      '#S............G#',
      '################',
    ],
    startDir: 'E',
    memory: 3,
    blocks: ['move', 'repeat', 'end'],
    par: 3, // repeat 13 { move } end — 13 straight moves to the far end (a 16-wide grid caps a straight corridor at 13); loop-free minimum is 13
  },
  {
    id: 'ch2-02',
    name: 'Staircase',
    grid: [
      '#######',
      '#S.####',
      '##..###',
      '###..##',
      '####..#',
      '#####G#',
      '#######',
    ],
    startDir: 'E',
    memory: 6,
    blocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'end'],
    par: 6, // repeat 4 { move, turnRight, move, turnLeft } end — 4 stair steps; loop-free minimum is 15
  },
  {
    id: 'ch2-03',
    name: 'Square Dance',
    grid: [
      '######',
      '#S...#',
      '####.#',
      '#G##.#',
      '#....#',
      '######',
    ],
    startDir: 'E',
    memory: 7,
    blocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'end'],
    par: 7, // repeat 3 { move, move, move, turnRight } end, move — three sides of the island square by loop, last side ends at G; loop-free minimum is 12
  },
  {
    id: 'ch2-04',
    name: 'The Stairwell',
    grid: [
      '#########',
      '#S......#',
      '#.#####.#',
      '#.#####.#',
      '#.#####.#',
      '#.#####.#',
      '#.#####.#',
      '#G......#',
      '#########',
    ],
    startDir: 'E',
    memory: 6,
    blocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'end'],
    par: 6, // repeat 3 { repeat 6 { move } end, turnRight } end — nested loops around the box ring, goal at the closing corner; loop-free minimum is 7
  },
  {
    id: 'ch2-05',
    name: 'Cruise Control',
    grid: [
      '##############',
      '#S..........G#',
      '##############',
    ],
    startDir: 'E',
    memory: 4,
    blocks: ['move', 'whileFrontClear', 'end'],
    par: 3, // whileFrontClear { move } end — goal sits immediately before the corridor's end wall, so the win interrupts the loop; loop-free minimum is 11
  },
  {
    id: 'ch2-06',
    name: 'Two Halls',
    grid: [
      '##############',
      '#S...........#',
      '############.#',
      '############.#',
      '############.#',
      '############.#',
      '############.#',
      '############G#',
      '##############',
    ],
    startDir: 'E',
    memory: 7,
    blocks: ['move', 'turnLeft', 'turnRight', 'whileFrontClear', 'end'],
    par: 7, // whileFrontClear { move } end, turnRight, whileFrontClear { move } end — two long halls joined by one turn; loop-free minimum is 18
  },
  {
    id: 'ch2-07',
    name: 'Mind the Junction',
    grid: [
      '############',
      '########G###',
      '########.###',
      '########.###',
      '########.###',
      '#S.........#',
      '############',
    ],
    startDir: 'N',
    memory: 8,
    blocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'whileFrontClear', 'end'],
    par: 8, // turnRight, repeat 7 { move } end, turnLeft, whileFrontClear { move } end — counted approach to the T-junction, sensed exit up to G; a while-based approach overshoots into the dead-end arm to the right
  },
  {
    id: 'ch2-08',
    name: 'Home Stretch',
    grid: [
      '################',
      '##############G#',
      '##############.#',
      '##############.#',
      '##############.#',
      '##############.#',
      '##############.#',
      '#S.............#',
      '################',
    ],
    startDir: 'E',
    memory: 10,
    blocks: ['move', 'turnLeft', 'turnRight', 'repeat', 'whileFrontClear', 'end'],
    par: 10, // whileFrontClear { move } end, turnLeft, repeat 2 { move } end, whileFrontClear { move } end — while hall, counted descent, while home stretch; loop-free minimum is 20
  },
];
