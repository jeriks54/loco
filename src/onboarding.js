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

export const chapterIntros = {
  ch2: {
    title: 'Chapter 2 — Loops',
    copy: 'A loop repeats the commands between loop and end. Set its count to travel farther while using fewer memory lines.',
  },
  ch3: {
    title: 'Chapter 3 — Sensing',
    copy: 'The front wall sensor checks the next tile. Build loop until [wall sensor] = [blocked] to keep going until it sees a wall. It does not stop the robot for you, and holes are not walls.',
  },
  ch4: {
    title: 'Chapter 4 — Decisions',
    copy: 'If runs commands when its condition is true. Else runs the other path. Fill both condition slots, then close the choice with end.',
  },
};

const STORAGE_KEY = 'loco.onboarding.v1';

export function loadSeenChapters(completed = new Set()) {
  let seen = new Set();
  try {
    const parsed = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.seen)) {
      seen = new Set(parsed.seen.filter((id) => Object.hasOwn(chapterIntros, id)));
    }
  } catch {
    // Storage may be missing, corrupt or unavailable.
  }
  for (const id of completed) {
    const prefix = String(id).split('-')[0];
    if (Object.hasOwn(chapterIntros, prefix)) seen.add(prefix);
  }
  return seen;
}

export function markChapterSeen(seen, prefix) {
  if (!Object.hasOwn(chapterIntros, prefix)) return seen;
  const next = new Set(seen);
  next.add(prefix);
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ seen: [...next] }));
  } catch {
    // Keep the current session usable if storage cannot be written.
  }
  return next;
}
