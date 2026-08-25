/* ============================================================
   LoCo — level state (design.md §2, §3)
   Pure + DOM-free: importable from Node for testing.
   createLevelState(level) parses the grid strings into a plain
   state object the executor mutates and the renderer draws.
   ============================================================ */

/**
 * Parse a level definition (design.md §3) into runtime state.
 * @param {{id:string, name:string, grid:string[], startDir:string, memory:number}} level
 * @returns {{cols:number, rows:number, walls:Set<number>, robot:{x:number,y:number,dir:string}, goal:{x:number,y:number}, memory:number, level:object}}
 */
export function createLevelState(level) {
  const rows = level.grid.length;
  if (rows === 0) throw new Error(`level ${level.id}: empty grid`);
  const cols = level.grid[0].length;

  const walls = new Set();
  let robot = null;
  let goal = null;

  level.grid.forEach((row, y) => {
    if (row.length !== cols) {
      throw new Error(`level ${level.id}: row ${y} length ${row.length} != ${cols}`);
    }
    for (let x = 0; x < cols; x += 1) {
      const ch = row[x];
      if (ch === '#') {
        walls.add(y * cols + x);
      } else if (ch === 'S') {
        if (robot) throw new Error(`level ${level.id}: multiple starts`);
        robot = { x, y, dir: level.startDir };
      } else if (ch === 'G') {
        if (goal) throw new Error(`level ${level.id}: multiple goals`);
        goal = { x, y };
      } else if (ch !== '.') {
        throw new Error(`level ${level.id}: unknown tile '${ch}' at ${x},${y}`);
      }
    }
  });

  if (!robot) throw new Error(`level ${level.id}: missing start 'S'`);
  if (!goal) throw new Error(`level ${level.id}: missing goal 'G'`);

  return { cols, rows, walls, robot, goal, memory: level.memory, level };
}

/** True when (x, y) is a wall or outside the grid. */
export function isBlocked(state, x, y) {
  return x < 0 || y < 0 || x >= state.cols || y >= state.rows || state.walls.has(y * state.cols + x);
}
