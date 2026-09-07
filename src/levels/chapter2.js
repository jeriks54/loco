/* ============================================================
   LoCo — chapter 2 levels: counted loops (M3, issue #16)
   Format per design.md §3; level contracts in level-design.md §4.
   Real-executor and independent reachability checks: tests/verify.mjs.

   ch2-01  straight corridor, first loop   — 3 blocks, memory 3 (exact)
   ch2-02  diagonal stairs, multi-cmd body — 6 blocks, memory 6 (exact)
   ch2-03  island square, loop + tail      — 7 blocks, memory 7 (exact)
   ch2-04  box ring, explore nesting      — 6 blocks, memory 6 (exact)
   ch2-05  wider steps, recognise body    — 7 blocks, memory 8 (+1 slack)
   ch2-06  matching steps, different tail — 10 blocks, memory 10 (exact)
   ch2-07  U-route, unequal nested runs   — 10 blocks, memory 10 (exact)
   ch2-08  wide steps, nested compression — 9 blocks, memory 9 (exact)

   Rule R1: every memory is smaller than the shortest loop-free
   solution using the level's own blocks (brute force impossible
   by construction). Par is the intended solution size, not a
   claim of global optimality or that nesting is always necessary.
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
    blocks: ['move', 'loop', 'end'],
    par: 3, // loop 13 { move } end — 13 straight moves to the far end (a 16-wide grid caps a straight corridor at 13); loop-free minimum is 13
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
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 6, // loop 4 { move, turnRight, move, turnLeft } end — 4 stair steps; loop-free minimum is 15
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
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 7, // loop 3 { move, move, move, turnRight } end, move — three sides of the island square by loop, last side ends at G; loop-free minimum is 13
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
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 6, // loop 3 { loop 6 { move } end, turnRight } end — intended ring route; loop-free minimum is 7
    // A direct turnRight, loop 6 { move } end also wins in 4 lines; nesting is not forced.
  },
  {
    id: 'ch2-05',
    name: 'Double Step',
    grid: [
      '#########',
      '#S..#####',
      '###...###',
      '#####...#',
      '#######G#',
      '#########',
    ],
    startDir: 'E',
    memory: 8,
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 7, // loop 3 { move, move, turnRight, move, turnLeft } end — three E2/S1 steps; loop-free minimum is 14
    // Goal interrupts the final turn; counts above 3 can also win. Recognise the body, not a unique count.
  },
  {
    id: 'ch2-06',
    name: 'Beyond the Pattern',
    grid: [
      '############',
      '#S..########',
      '###...######',
      '#####...####',
      '#######...G#',
      '############',
    ],
    startDir: 'E',
    memory: 10,
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 10, // loop 3 { move, move, turnRight, move, turnLeft } end, move, move, move — loop-free minimum is 18
    // The E3 tail stays outside the E2/S1 motif: count 4 crashes. A separate loop 3 tail also fits.
  },
  {
    id: 'ch2-07',
    name: 'The Return Trip',
    grid: [
      '############',
      '#S.........#',
      '##########.#',
      '##########.#',
      '##########.#',
      '##########.#',
      '#G.........#',
      '############',
    ],
    startDir: 'E',
    memory: 10,
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 10, // loop 2 { loop 9 { move } end, turnRight, loop 5 { move } end, turnRight } end — loop-free minimum is 25
    // Route E9/S5/W9: the goal interrupts the second horizontal run. Three separate distance loops cost 11 lines.
  },
  {
    id: 'ch2-08',
    name: 'Giant Steps',
    grid: [
      '################',
      '#S....##########',
      '#####.##########',
      '#####.....######',
      '#########.######',
      '#########.....##',
      '#############.##',
      '#############G##',
      '################',
    ],
    startDir: 'E',
    memory: 9,
    blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'],
    par: 9, // loop 3 { loop 4 { move } end, turnRight, move, move, turnLeft } end — three E4/S2 steps; loop-free minimum is 23
    // Expanding the inner loop makes this intended program 10 lines, one over memory; no global optimum claimed.
  },
];
