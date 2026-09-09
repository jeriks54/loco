/*
 * Exhaustive, counted-loop-only search model.
 *
 * This file intentionally reads level.grid directly and has its own small
 * interpreter.  It does not import state.js or executor.js, so a proof from
 * this search is independent of the production movement tables and runtime.
 *
 * A candidate is a balanced flat program made from move, turnLeft,
 * turnRight, loop, and end.  Every counted-loop value 1..99 is tried.  Flat
 * templates containing no move are skipped: they cannot leave the start tile
 * (and therefore cannot reach a distinct goal).  skippedNoMove records those
 * templates so the omission is explicit in the returned proof counts.
 */

const MAX_TICKS = 200;
const LOOP_MIN = 1;
const LOOP_MAX = 99;
const PRIMITIVES = ['move', 'turnLeft', 'turnRight'];
const DIRS = 'NESW';
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function idOf(entry) {
  return typeof entry === 'string' ? entry : entry?.id;
}

function poseFromGrid(level) {
  let start = null;
  let goal = null;
  for (let y = 0; y < level.grid.length; y += 1) {
    const row = level.grid[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === 'S') start = { x, y, dir: level.startDir };
      if (row[x] === 'G') goal = { x, y };
    }
  }
  if (!start || !goal) throw new Error(`${level.id ?? 'level'} needs S and G`);
  const dir = DIRS.indexOf(start.dir);
  if (dir < 0) throw new Error(`unknown start direction '${start.dir}'`);
  start.dir = dir;
  return { start, goal };
}

function balance(program) {
  const stack = [];
  const endOf = new Map();
  for (let i = 0; i < program.length; i += 1) {
    const id = idOf(program[i]);
    if (id === 'loop') stack.push(i);
    else if (id === 'end') {
      if (stack.length === 0) return null;
      endOf.set(stack.pop(), i);
    } else if (!PRIMITIVES.includes(id)) return null;
  }
  if (stack.length) return null;
  return endOf;
}

/** Evaluate one balanced counted program against the grid model. */
export function evaluateCounted(level, program, { maxTicks = MAX_TICKS } = {}) {
  const { start, goal } = poseFromGrid(level);
  const endOf = balance(program);
  const pose = { ...start };
  if (!endOf) return { outcome: 'syntax', ticks: 0, pose: { x: pose.x, y: pose.y, dir: DIRS[pose.dir] } };

  const frames = [];
  let ip = 0;
  let ticks = 0;
  const blocked = (x, y) => y < 0 || y >= level.grid.length
    || x < 0 || x >= level.grid[y].length || level.grid[y][x] === '#';
  const result = outcome => ({ outcome, ticks, pose: { x: pose.x, y: pose.y, dir: DIRS[pose.dir] } });

  while (true) {
    if (ticks >= maxTicks) return result('runaway');
    if (ip >= program.length) return result('finished');
    ticks += 1;
    const id = idOf(program[ip]);
    const top = frames.at(-1);

    if (id === 'move') {
      const nx = pose.x + DX[pose.dir];
      const ny = pose.y + DY[pose.dir];
      if (blocked(nx, ny)) return result('crashed');
      pose.x = nx;
      pose.y = ny;
      if (level.grid[ny][nx] === 'H') return result('fell');
      if (pose.x === goal.x && pose.y === goal.y) return result('goal');
      ip += 1;
    } else if (id === 'turnLeft') {
      pose.dir = (pose.dir + 3) % 4;
      ip += 1;
    } else if (id === 'turnRight') {
      pose.dir = (pose.dir + 1) % 4;
      ip += 1;
    } else if (id === 'loop') {
      if (top?.head === ip) {
        top.remaining -= 1;
        if (top.remaining > 0) ip = top.bodyStart;
        else { frames.pop(); ip = endOf.get(ip) + 1; }
      } else {
        let count = Math.floor(Number(program[ip].count));
        if (!Number.isFinite(count)) count = 2;
        count = Math.min(LOOP_MAX, Math.max(LOOP_MIN, count));
        frames.push({ head: ip, bodyStart: ip + 1, remaining: count });
        ip += 1;
      }
    } else if (id === 'end') {
      ip = top ? top.head : ip + 1;
    } else {
      return result('syntax');
    }
  }
}

function templatesOfLength(length) {
  const templates = [];
  const visit = (template, depth) => {
    if (template.length === length) {
      if (depth === 0) templates.push(template);
      return;
    }
    for (const primitive of PRIMITIVES) visit([...template, primitive], depth);
    // A loop always needs its matching end, so reserve one remaining slot.
    if (template.length + 2 <= length) visit([...template, 'loop'], depth + 1);
    if (depth > 0) visit([...template, 'end'], depth - 1);
  };
  visit([], 0);
  return templates;
}

function countedPrograms(template, visit) {
  const indexes = template.flatMap((id, i) => id === 'loop' ? [i] : []);
  const program = [...template];
  const assign = (n) => {
    if (n === indexes.length) { visit(program); return; }
    const index = indexes[n];
    for (let count = LOOP_MIN; count <= LOOP_MAX; count += 1) {
      program[index] = { id: 'loop', count };
      assign(n + 1);
    }
  };
  assign(0);
}

/**
 * Exhaustively search all balanced counted-loop programs up to maxLines.
 * The first found solution is returned in program order (shortest templates
 * first).  If solution is null, checked covers every counted candidate that
 * could move, which is the no-solution proof count.
 */
export function findCountedSolution(level, { maxLines = level.memory } = {}) {
  const limit = Math.max(0, Math.floor(Number(maxLines)));
  let checked = 0;
  let templates = 0;
  let skippedNoMove = 0;
  let solution = null;
  let result = null;

  for (let length = 0; length <= limit && !solution; length += 1) {
    for (const template of templatesOfLength(length)) {
      templates += 1;
      if (!template.includes('move')) {
        skippedNoMove += 1;
        continue;
      }
      countedPrograms(template, program => {
        if (solution) return;
        checked += 1;
        const evaluated = evaluateCounted(level, program);
        if (evaluated.outcome === 'goal') {
          solution = program.map(entry => typeof entry === 'string' ? entry : { ...entry });
          result = evaluated;
        }
      });
      if (solution) break;
    }
  }

  return {
    solution,
    checked,
    templates,
    skippedNoMove,
    maxLines: limit,
    exhaustive: solution === null,
    ...(result ? { outcome: result.outcome, ticks: result.ticks, pose: result.pose } : {}),
  };
}

export const evaluateCountedProgram = evaluateCounted;
export { MAX_TICKS, LOOP_MIN, LOOP_MAX };
