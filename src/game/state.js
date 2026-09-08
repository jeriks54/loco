/* ============================================================
   LoCo — level state (design.md §2, §3)
   Pure + DOM-free: importable from Node for testing.
   createLevelState(level) parses the grid strings into a plain
   state object the executor mutates and the renderer draws.
   ============================================================ */

/**
 * Parse a level definition (design.md §3) into runtime state.
 * @param {{id:string, name:string, grid:string[], startDir:string, memory:number}} level
 * @returns {{cols:number, rows:number, tiles:string[], walls:Set<number>, start:{x:number,y:number,dir:string}, robot:{x:number,y:number,dir:string}, goal:{x:number,y:number}, memory:number, level:object}}
 */
export function createLevelState(level) {
  const rows = level.grid.length;
  if (rows === 0) throw new Error(`level ${level.id}: empty grid`);
  const cols = level.grid[0].length;

  const tiles = [];
  const walls = new Set();
  let start = null;
  let goal = null;

  level.grid.forEach((row, y) => {
    if (row.length !== cols) {
      throw new Error(`level ${level.id}: row ${y} length ${row.length} != ${cols}`);
    }
    for (let x = 0; x < cols; x += 1) {
      const ch = row[x];
      const index = y * cols + x;
      if (ch === '#') {
        tiles.push('wall');
        walls.add(index);
      } else if (ch === 'S') {
        if (start) throw new Error(`level ${level.id}: multiple starts`);
        start = { x, y, dir: level.startDir };
        tiles.push('start');
      } else if (ch === 'G') {
        if (goal) throw new Error(`level ${level.id}: multiple goals`);
        goal = { x, y };
        tiles.push('goal');
      } else if (ch === 'H') {
        tiles.push('hole');
      } else if (ch !== '.') {
        throw new Error(`level ${level.id}: unknown tile '${ch}' at ${x},${y}`);
      } else {
        tiles.push('floor');
      }
    }
  });

  if (!start) throw new Error(`level ${level.id}: missing start 'S'`);
  if (!goal) throw new Error(`level ${level.id}: missing goal 'G'`);

  return {
    cols,
    rows,
    tiles,
    walls,
    start,
    robot: { ...start },
    goal,
    memory: level.memory,
    level,
  };
}

/** Return the tile type at (x, y), or null outside the grid. */
export function tileAt(state, x, y) {
  if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return null;
  return state.tiles[y * state.cols + x];
}

/** True when (x, y) is a wall or outside the grid. */
export function isBlocked(state, x, y) {
  return x < 0 || y < 0 || x >= state.cols || y >= state.rows || state.walls.has(y * state.cols + x);
}

/** True only for floor, start and goal tiles. */
export function isSafeToEnter(state, x, y) {
  const tile = tileAt(state, x, y);
  return tile === 'floor' || tile === 'start' || tile === 'goal';
}
