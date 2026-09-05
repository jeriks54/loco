/* ============================================================
   LoCo — HUD: run controls + result overlay (brief §6)
   Run/Reset, speed group x1/2 x1 x2, and the terminal result
   overlay in the board panel. Copy is terminal boot voice
   (design.md §11). Next level only appears after reaching the
   goal (and never on the last level). M2 adds the two loop-era
   outcomes: refused (unbalanced) runs and the runaway guard.
   M4 duplicates Run/Reset/memory count into the mobile sheet's
   peek bar, so each of the three is resolved as a set of elements
   and kept in sync.
   ============================================================ */

const RESULT_COPY = {
  crashed: '> CRASHED — robot met a wall.',
  finished: '> FELL SHORT — robot stopped before the exit.',
  goal: '> LEVEL COMPLETE.',
  syntax: '> SYNTAX ERROR — every loop needs its matching end.',
  runaway: '> DIZZY — robot got dizzy, run stopped.',
};

const pad2 = (n) => String(n).padStart(2, '0');

export function createHud({ onRun, onReset, onRetry, onNext, onSpeed }) {
  const runBtns = document.querySelectorAll('[data-role="run"]');
  const resetBtns = document.querySelectorAll('[data-role="reset"]');
  const memoryCountEls = document.querySelectorAll('[data-role="memory-count"]');
  const retryBtn = document.getElementById('btn-retry');
  const nextBtn = document.getElementById('btn-next');
  const overlayEl = document.getElementById('result-overlay');
  const resultText = document.getElementById('result-text');
  const speedEl = document.getElementById('speed');
  const levelNameEl = document.getElementById('level-name');
  const progressEl = document.getElementById('level-progress');

  let running = false;
  let programLen = 0;
  let memoryLimit = null;

  function updateRunButton() {
    for (const btn of runBtns) btn.disabled = running || programLen === 0;
  }

  function updateMemoryCount() {
    // main.js loads the editor before setLevel, so the first onChange lands
    // here without a limit yet — setLevel rewrites the counts once it knows it.
    if (memoryLimit === null) return;
    for (const el of memoryCountEls) el.textContent = `${programLen} / ${memoryLimit}`;
  }

  for (const btn of runBtns) {
    btn.addEventListener('click', () => {
      if (!btn.disabled) onRun();
    });
  }
  // Reset is never disabled: it is the only way to abort a run in flight.
  for (const btn of resetBtns) btn.addEventListener('click', () => onReset());
  retryBtn.addEventListener('click', () => onRetry());
  nextBtn.addEventListener('click', () => onNext());

  speedEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-speed]');
    if (!btn) return;
    for (const b of speedEl.querySelectorAll('button')) {
      b.classList.toggle('active', b === btn);
    }
    onSpeed(parseFloat(btn.dataset.speed, 10));
  });

  return {
    /** Disabled while running OR when the program is empty. */
    setRunning(flag) {
      running = flag;
      updateRunButton();
    },

    setProgramLength(len) {
      programLen = len;
      updateRunButton();
      updateMemoryCount();
    },

    setLevel(level, index, total) {
      levelNameEl.textContent = level.name;
      progressEl.textContent = `${pad2(index + 1)}/${pad2(total)} · MEM ${level.memory}`;
      memoryLimit = level.memory;
      updateMemoryCount();
    },

    setSpeedButtons(speed) {
      for (const b of speedEl.querySelectorAll('button')) {
        b.classList.toggle('active', parseFloat(b.dataset.speed, 10) === speed);
      }
    },

    showResult(type, { hasNext }) {
      resultText.textContent = RESULT_COPY[type];
      nextBtn.classList.toggle('hidden', !(type === 'goal' && hasNext));
      overlayEl.classList.remove('hidden');
    },

    hideOverlay() {
      overlayEl.classList.add('hidden');
    },
  };
}
