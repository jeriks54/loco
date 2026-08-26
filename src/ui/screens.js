/* ============================================================
   LoCo — screen switching (brief §7)
   Toggles the existing title / levels / game sections.
   Title "Start Game" goes to level select (its old boot-log
   joke wiring is replaced for that button only); the level
   list groups levels under mono chapter headers (terminal
   voice) and marks completed levels with an accent check
   (M2 task C). Click-to-play behavior is unchanged.
   ============================================================ */

const SCREEN_IDS = {
  title: 'screen-title',
  levels: 'screen-levels',
  game: 'screen-game',
};

/**
 * @param {{onLeaveGame?:()=>void}} opts onLeaveGame fires when the
 *   player navigates away from the game screen (stop a live run).
 */
export function createScreens({ onLeaveGame = () => {} } = {}) {
  const els = {};
  for (const [name, id] of Object.entries(SCREEN_IDS)) {
    els[name] = document.getElementById(id);
  }

  function showScreen(name) {
    for (const [key, el] of Object.entries(els)) {
      el.classList.toggle('hidden', key !== name);
    }
  }

  // Title -> levels (replaces the placeholder joke for this button only)
  document.getElementById('btn-play').addEventListener('click', () => showScreen('levels'));

  // Levels -> title
  document.getElementById('btn-title').addEventListener('click', () => showScreen('title'));

  // Game -> levels (no confirm needed)
  document.getElementById('btn-back').addEventListener('click', () => {
    onLeaveGame();
    showScreen('levels');
  });

  return { showScreen };
}

const pad2 = (n) => String(n).padStart(2, '0');

/* Chapter headers, terminal voice (M2 task C). The chapter is
   derived from the level id prefix (ch1…, ch2…); prefixes not in
   the map get a generic header. */
const CHAPTER_HEADERS = {
  ch1: 'CHAPTER 1 — SEQUENCE',
  ch2: 'CHAPTER 2 — LOOPS',
};
const GENERIC_CHAPTER_HEADER = 'CHAPTER ? — UNEXPLORED';

const chapterPrefix = (levelId) => String(levelId).split('-')[0];

/**
 * Level-select list: chapter headers + name + memory budget, mono
 * styling, accent check on completed levels. Click-to-play unchanged.
 * @param {HTMLElement} container
 * @param {Array<object>} levels ordered level registry
 * @param {(index:number)=>void} onSelect
 * @param {Set<string>|string[]} [completed] completed level ids
 */
export function renderLevelList(container, levels, onSelect, completed = new Set()) {
  const done = completed instanceof Set ? completed : new Set(completed ?? []);
  container.innerHTML = '';
  let lastPrefix = null;
  levels.forEach((level, index) => {
    const prefix = chapterPrefix(level.id);
    if (prefix !== lastPrefix) {
      const header = document.createElement('h3');
      header.className = 'chapter-header';
      header.textContent = CHAPTER_HEADERS[prefix] || GENERIC_CHAPTER_HEADER;
      container.appendChild(header);
      lastPrefix = prefix;
    }
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'level-item';
    if (done.has(level.id)) item.classList.add('is-complete');
    item.innerHTML =
      `<span class="level-id">${pad2(index + 1)}</span>` +
      `<span class="level-item-name">${level.name}</span>` +
      `<span class="level-mem">MEM ${level.memory}</span>` +
      (done.has(level.id) ? '<span class="level-done" aria-label="completed">✓</span>' : '');
    item.addEventListener('click', () => onSelect(index));
    container.appendChild(item);
  });
}
