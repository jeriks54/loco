/*
 * Branch-free necessity proof for Chapter 4.
 *
 * This is an independent relational over-approximation, not an executor
 * import. R[n] contains every pose transition that any valid branch-free
 * program of n source lines could make. Loop bodies are deliberately allowed
 * to choose a different transition on each repetition, which is a larger
 * language than the real one. Therefore a missing start -> goal relation is a
 * proof that the real branch-free language cannot win within the budget.
 */

import assert from 'node:assert/strict';

const DIRS = 'NESW';
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function relationKey(from, to, size) {
  return from * size + to;
}

function unpack(key, size) {
  return [Math.floor(key / size), key % size];
}

function makeModel(level) {
  const poses = [];
  const byPose = new Map();
  let start = null;
  let goal = null;
  for (let y = 0; y < level.grid.length; y += 1) {
    for (let x = 0; x < level.grid[y].length; x += 1) {
      const tile = level.grid[y][x];
      if (tile === 'S') start = { x, y, dir: level.startDir };
      if (tile === 'G') goal = { x, y };
      if (tile === '.' || tile === 'S') {
        for (const dir of DIRS) {
          const id = poses.length;
          poses.push({ x, y, dir });
          byPose.set(`${x},${y},${dir}`, id);
        }
      }
    }
  }
  assert.ok(start && goal, `${level.id}: proof needs S and G`);
  const goalId = poses.length;
  const stateCount = goalId + 1;
  const startId = byPose.get(`${start.x},${start.y},${start.dir}`);
  const tileAt = (x, y) => y < 0 || y >= level.grid.length || x < 0
    || x >= level.grid[y].length ? '#' : level.grid[y][x];
  const blockedAhead = state => {
    const pose = poses[state];
    return tileAt(pose.x + DX[DIRS.indexOf(pose.dir)], pose.y + DY[DIRS.indexOf(pose.dir)]) === '#';
  };
  const turn = (state, delta) => {
    const pose = poses[state];
    const dir = DIRS[(DIRS.indexOf(pose.dir) + delta + 4) % 4];
    return byPose.get(`${pose.x},${pose.y},${dir}`);
  };
  const move = state => {
    const pose = poses[state];
    const dir = DIRS.indexOf(pose.dir);
    const x = pose.x + DX[dir];
    const y = pose.y + DY[dir];
    const tile = tileAt(x, y);
    if (tile === 'G') return goalId;
    if (tile !== '.' && tile !== 'S') return null;
    return byPose.get(`${x},${y},${pose.dir}`);
  };
  return { poses, stateCount, goalId, startId, blockedAhead, turn, move };
}

function compose(left, right, size) {
  const rightOut = Array.from({ length: size }, () => []);
  for (const key of right) {
    const [from, to] = unpack(key, size);
    rightOut[from].push(to);
  }
  const result = new Set();
  for (const key of left) {
    const [from, middle] = unpack(key, size);
    if (middle === size - 1) result.add(relationKey(from, middle, size));
    else for (const to of rightOut[middle]) result.add(relationKey(from, to, size));
  }
  return result;
}

function counted(body, model) {
  const { stateCount, goalId } = model;
  const size = stateCount;
  const result = new Set();
  const bodyOut = Array.from({ length: size }, () => []);
  for (const key of body) {
    const [from, to] = unpack(key, size);
    bodyOut[from].push(to);
  }
  let frontier = new Set(body);
  for (let repetition = 1; repetition <= 99; repetition += 1) {
    for (const key of frontier) result.add(key);
    const next = new Set();
    for (const key of frontier) {
      const [from, middle] = unpack(key, size);
      if (middle === goalId) {
        next.add(relationKey(from, middle, size));
        continue;
      }
      for (const to of bodyOut[middle]) next.add(relationKey(from, to, size));
    }
    frontier = next;
  }
  return result;
}

function sensed(body, model) {
  const { stateCount, goalId, blockedAhead } = model;
  const size = stateCount;
  const result = new Set();
  const bodyOut = Array.from({ length: size }, () => []);
  for (const key of body) {
    const [from, to] = unpack(key, size);
    bodyOut[from].push(to);
  }
  for (let start = 0; start < goalId; start += 1) {
    if (blockedAhead(start)) {
      result.add(relationKey(start, start, size));
      continue;
    }
    const queue = [start];
    const seen = new Set(queue);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const to of bodyOut[current]) {
        if (to === goalId) {
          result.add(relationKey(start, goalId, size));
        } else if (blockedAhead(to)) {
          result.add(relationKey(start, to, size));
        } else if (!seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
  }
  return result;
}

function branchFreeRelations(level) {
  const model = makeModel(level);
  const { stateCount, goalId, startId, turn, move } = model;
  const size = stateCount;
  const allowed = new Set(level.blocks.filter(id => id !== 'if' && id !== 'else'));
  const relations = Array.from({ length: level.memory + 1 }, () => new Set());
  relations[0] = new Set(Array.from({ length: goalId }, (_, state) => relationKey(state, state, size)));
  const addPrimitive = (id) => {
    if (!allowed.has(id)) return;
    const relation = new Set();
    for (let state = 0; state < goalId; state += 1) {
      const next = id === 'move' ? move(state)
        : id === 'turnLeft' ? turn(state, -1)
          : turn(state, 1);
      if (next !== null && next !== undefined) relation.add(relationKey(state, next, size));
    }
    return relation;
  };
  for (let lines = 1; lines <= level.memory; lines += 1) {
    for (const id of ['move', 'turnLeft', 'turnRight']) {
      const primitive = addPrimitive(id);
      if (primitive && lines === 1) for (const key of primitive) relations[lines].add(key);
    }
    if (lines >= 2 && allowed.has('loop')) {
      for (const key of counted(relations[lines - 2], model)) relations[lines].add(key);
    }
    if (lines >= 2 && allowed.has('loopUntil')) {
      for (const key of sensed(relations[lines - 2], model)) relations[lines].add(key);
    }
    for (let left = 1; left < lines; left += 1) {
      for (const key of compose(relations[left], relations[lines - left], size)) relations[lines].add(key);
    }
  }
  return { model, relations, wins: relations.some(relation => relation.has(relationKey(startId, goalId, size))) };
}

export function proveBranchRequired(level) {
  return branchFreeRelations(level);
}

function exactBranchFree(level) {
  const model = makeModel(level);
  const { goalId, startId, blockedAhead, move, turn } = model;
  const DEAD = goalId + 1;
  const identity = Array.from({ length: goalId }, (_, state) => state);
  const keyOf = fn => fn.join(',');
  const composeFn = (first, second) => first.map(value => value >= goalId ? value : second[value]);
  const primitive = id => Array.from({ length: goalId }, (_, state) => {
    const next = id === 'move' ? move(state)
      : id === 'turnLeft' ? turn(state, -1)
        : turn(state, 1);
    return next === null || next === undefined ? DEAD : next;
  });
  const add = (map, fn) => map.set(keyOf(fn), fn);
  const relations = Array.from({ length: level.memory + 1 }, () => new Map());
  add(relations[0], identity);
  const allowed = new Set(level.blocks.filter(id => id !== 'if' && id !== 'else'));

  for (let lines = 1; lines <= level.memory; lines += 1) {
    if (lines === 1) for (const id of ['move', 'turnLeft', 'turnRight']) {
      if (allowed.has(id)) add(relations[lines], primitive(id));
    }
    if (lines >= 2) {
      if (allowed.has('loop')) for (const body of relations[lines - 2].values()) {
        let value = identity;
        for (let count = 1; count <= 99; count += 1) {
          value = composeFn(value, body);
          add(relations[lines], value);
        }
      }
      if (allowed.has('loopUntil')) for (const body of relations[lines - 2].values()) {
        const value = Array.from({ length: goalId }, (_, initial) => {
          let current = initial;
          const seen = new Set();
          for (let tick = 0; tick <= 200; tick += 1) {
            if (current >= goalId) return current;
            if (blockedAhead(current)) return current;
            if (seen.has(current)) return DEAD;
            seen.add(current);
            current = body[current];
          }
          return DEAD;
        });
        add(relations[lines], value);
      }
    }
    for (let left = 1; left < lines; left += 1) {
      for (const first of relations[left].values()) for (const second of relations[lines - left].values()) {
        add(relations[lines], composeFn(first, second));
      }
    }
  }
  return {
    wins: relations.some(map => [...map.values()].some(fn => fn[startId] === goalId)),
    counts: relations.map(map => map.size),
  };
}

export { exactBranchFree };

export function findExactBranchFreeWitness(level) {
  const model = makeModel(level);
  const { goalId, startId, blockedAhead, move, turn } = model;
  const DEAD = goalId + 1;
  const identity = Array.from({ length: goalId }, (_, state) => state);
  const composeFn = (first, second) => first.map(value => value >= goalId ? value : second[value]);
  const primitive = id => Array.from({ length: goalId }, (_, state) => {
    const next = id === 'move' ? move(state)
      : id === 'turnLeft' ? turn(state, -1)
        : turn(state, 1);
    return next === null || next === undefined ? DEAD : next;
  });
  const keyOf = fn => fn.join(',');
  const relations = Array.from({ length: level.memory + 1 }, () => new Map());
  const add = (lines, fn, code) => {
    const key = keyOf(fn);
    if (!relations[lines].has(key)) relations[lines].set(key, { fn, code });
  };
  add(0, identity, 'empty');
  const allowed = new Set(level.blocks.filter(id => id !== 'if' && id !== 'else'));
  for (let lines = 1; lines <= level.memory; lines += 1) {
    if (lines === 1) for (const id of ['move', 'turnLeft', 'turnRight']) {
      if (allowed.has(id)) add(lines, primitive(id), id);
    }
    if (lines >= 2) {
      if (allowed.has('loop')) for (const body of relations[lines - 2].values()) {
        let value = identity;
        for (let count = 1; count <= 99; count += 1) {
          value = composeFn(value, body.fn);
          add(lines, value, `loop ${count} { ${body.code} } end`);
        }
      }
      if (allowed.has('loopUntil')) for (const body of relations[lines - 2].values()) {
        const value = Array.from({ length: goalId }, (_, initial) => {
          let current = initial;
          const seen = new Set();
          for (let tick = 0; tick <= 200; tick += 1) {
            if (current >= goalId || blockedAhead(current)) return current;
            if (seen.has(current)) return DEAD;
            seen.add(current);
            current = body.fn[current];
          }
          return DEAD;
        });
        add(lines, value, `loop until { ${body.code} } end`);
      }
    }
    for (let left = 1; left < lines; left += 1) {
      for (const first of relations[left].values()) for (const second of relations[lines - left].values()) {
        add(lines, composeFn(first.fn, second.fn), `${first.code}; ${second.code}`);
      }
    }
  }
  for (const entries of relations) for (const entry of entries.values()) {
    if (entry.fn[startId] === goalId) return entry.code;
  }
  return null;
}
