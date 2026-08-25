/* ============================================================
   LoCo — screen switching (brief §7)
   Toggles the existing title / levels / game sections.
   Title "Start Game" goes to level select (its old boot-log
   joke wiring is replaced for that button only); the level
   list shows chapter 1 with name + memory budget.
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

/** Level-select list: name + memory budget, mono styling. */
export function renderLevelList(container, levels, onSelect) {
  container.innerHTML = '';
  levels.forEach((level, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'level-item';
    item.innerHTML =
      `<span class="level-id">${pad2(index + 1)}</span>` +
      `<span class="level-item-name">${level.name}</span>` +
      `<span class="level-mem">MEM ${level.memory}</span>`;
    item.addEventListener('click', () => onSelect(index));
    container.appendChild(item);
  });
}
