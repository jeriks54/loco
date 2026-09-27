// Optional onboarding data stays outside the campaign level registry.
export const tutorialLevel = {
  id: 'tutorial-01',
  name: 'Practice maze',
  grid: ['#####', '#S.##', '##.G#', '#####'],
  startDir: 'E',
  memory: 6,
  blocks: ['move', 'turnLeft', 'turnRight'],
  par: 5,
};

export const chapterExamples = {
  ch2: {
    id: 'example-ch2', name: 'Loop example',
    description: 'The robot starts at the left of a straight corridor. EXIT is three tiles east.',
    grid: ['######', '#S..G#', '######'],
    startDir: 'E', memory: 3, blocks: ['move', 'loop', 'end'], par: 3,
  },
  ch3: {
    id: 'example-ch3', name: 'Sensor example',
    description: 'The robot starts at the left of a corridor. A wall lies beyond two open tiles, and EXIT is one tile south of the end.',
    grid: ['######', '#S..##', '###G##', '######'],
    startDir: 'E', sensor: 'frontWall', memory: 5,
    blocks: ['move', 'turnRight', 'loopUntil', 'end'], par: 5,
  },
  ch4: {
    id: 'example-ch4', name: 'Decision example',
    description: 'The robot starts facing an open tile, followed by a wall. EXIT is south of the open tile.',
    grid: ['#####', '#S.##', '##G##', '#####'],
    startDir: 'E', sensor: 'frontWall', memory: 8,
    blocks: ['move', 'turnRight', 'loop', 'if', 'else', 'end'], par: 8,
  },
};

const STORAGE_KEY = 'loco.onboarding.v1';

export function loadSeenChapters(completed = new Set()) {
  let seen = new Set();
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.seen)) {
      seen = new Set(parsed.seen.filter((id) => Object.hasOwn(chapterExamples, id)));
    }
  } catch {
    // Storage may be missing, corrupt or unavailable.
  }
  for (const id of completed) {
    const prefix = String(id).split('-')[0];
    if (Object.hasOwn(chapterExamples, prefix)) seen.add(prefix);
  }
  return seen;
}

export function markChapterSeen(seen, prefix) {
  if (!Object.hasOwn(chapterExamples, prefix)) return seen;
  const next = new Set(seen);
  next.add(prefix);
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ seen: [...next] }));
  } catch {
    // Keep the current session usable if storage cannot be written.
  }
  return next;
}
