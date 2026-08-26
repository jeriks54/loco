/* ============================================================
   LoCo — program editor, lines mode (design.md §5; M2 brief)
   "Program as lines": the program renders as numbered mono
   lines (01, 02, …), one per memory slot, with loop bodies
   indented per nesting depth so structure reads like code.
   Empty slots render as dim placeholder lines.

   Pointer-Events drag & drop (no HTML5 DnD): pointerdown on a
   palette chip spawns a floating ghost; drop inserts a line at
   the drop position. Over-capacity drops are rejected with a
   flash. Click a placed line to remove it. The `repeat` line
   carries small +/− count steppers (1..99, no typing) that are
   inert while a run is in progress. The executing line is
   highlighted on `step` events (the program pointer).
   ============================================================ */

import { renderPalette, BLOCK_DEFS } from './palette.js';
import { REPEAT_MIN, REPEAT_MAX } from '../game/executor.js';

const DRAG_THRESHOLD_PX = 5;   // below this a pointerup counts as a click (append)
const REJECT_FLASH_MS = 420;

const pad2 = (n) => String(n).padStart(2, '0');

/** Entry token id ('repeat' for { id:'repeat', count }). */
function entryId(entry) {
  return typeof entry === 'string' ? entry : entry.id;
}

export function createEditor({ paletteEl, programEl, countEl, onChange }) {
  let memory = 0;
  let program = [];
  let running = false;
  let lineEls = [];

  const notify = () => {
    if (onChange) onChange(program.length);
  };

  /* ---------- rendering ---------- */

  /** Indent depth per line (each 'end' dedents first); placeholders
      keep the trailing depth so an unclosed loop stays visible. */
  function lineDepths() {
    const depths = [];
    let depth = 0;
    for (const entry of program) {
      const id = entryId(entry);
      if (id === 'end') depth = Math.max(0, depth - 1);
      depths.push(depth);
      if (id === 'repeat' || id === 'whileFrontClear') depth += 1;
    }
    return { depths, trailing: depth };
  }

  /** Terminal-voice token markup for one line (lowercase). */
  function codeHTML(entry) {
    if (typeof entry === 'string') {
      const kw = entry === 'whileFrontClear' || entry === 'end' ? ' kw' : '';
      return `<span class="line-token${kw}">${BLOCK_DEFS[entry].label}</span>`;
    }
    // repeat: keyword + count with steppers
    return (
      `<span class="line-token kw">${BLOCK_DEFS.repeat.label}</span>` +
      `<span class="stepper">` +
      `<button type="button" class="step-btn" data-step="-1" aria-label="decrease repeat count"` +
      `${entry.count <= REPEAT_MIN ? ' disabled' : ''}>−</button>` +
      `<span class="repeat-count">${entry.count}</span>` +
      `<button type="button" class="step-btn" data-step="1" aria-label="increase repeat count"` +
      `${entry.count >= REPEAT_MAX ? ' disabled' : ''}>+</button>` +
      `</span>`
    );
  }

  function renderLines() {
    programEl.innerHTML = '';
    lineEls = [];
    const { depths, trailing } = lineDepths();
    for (let i = 0; i < memory; i += 1) {
      const line = document.createElement('div');
      if (i < program.length) {
        line.className = 'line filled';
        line.dataset.index = String(i);
        line.style.setProperty('--indent', String(depths[i]));
        line.innerHTML =
          `<span class="line-no">${pad2(i + 1)}</span>` +
          `<span class="line-code">${codeHTML(program[i])}</span>`;
      } else {
        line.className = 'line empty';
        line.style.setProperty('--indent', String(trailing));
        line.innerHTML =
          `<span class="line-no">${pad2(i + 1)}</span>` +
          `<span class="line-code"><span class="line-token placeholder">··</span></span>`;
      }
      programEl.appendChild(line);
      lineEls.push(line);
    }
    countEl.textContent = `${program.length} / ${memory}`;
  }

  /* ---------- capacity guard (the data-level enforcement) ---------- */

  function insertOrReject(blockId, index) {
    if (program.length >= memory) {
      rejectFlash();
      return false;
    }
    const at = Math.max(0, Math.min(index, program.length));
    const entry = blockId === 'repeat' ? { id: 'repeat', count: 2 } : blockId;
    program.splice(at, 0, entry);
    renderLines();
    lineEls[at].classList.add('pop');
    notify();
    return true;
  }

  let rejectTimer = null;
  function rejectFlash() {
    programEl.classList.remove('reject');
    void programEl.offsetWidth; // restart the animation
    programEl.classList.add('reject');
    clearTimeout(rejectTimer);
    rejectTimer = setTimeout(() => programEl.classList.remove('reject'), REJECT_FLASH_MS);
  }

  /* ---------- repeat count steppers ---------- */

  function adjustRepeat(index, delta) {
    const entry = program[index];
    if (!entry || entry.id !== 'repeat') return;
    const count = Math.min(REPEAT_MAX, Math.max(REPEAT_MIN, entry.count + delta));
    if (count === entry.count) return;
    entry.count = count;
    renderLines(); // re-render keeps number + disabled steppers in sync
  }

  /* ---------- drag & drop (Pointer Events) ---------- */

  function dropIndexAt(clientX, clientY) {
    const rect = programEl.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    if (lineEls.length > 0) {
      const first = lineEls[0].getBoundingClientRect();
      if (clientY < first.top) return 0; // above the first line
    }
    for (let i = 0; i < lineEls.length; i += 1) {
      const r = lineEls[i].getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) {
        return clientY > r.top + r.height / 2 ? i + 1 : i;
      }
    }
    return program.length; // inside the box, below the last line -> append
  }

  function clearHints() {
    programEl.classList.remove('drop-ready');
    for (const line of lineEls) line.classList.remove('drop-hint');
  }

  function updateHints(clientX, clientY) {
    clearHints();
    if (running || program.length >= memory) return;
    const index = dropIndexAt(clientX, clientY);
    if (index === null) return;
    programEl.classList.add('drop-ready');
    const hint = lineEls[Math.min(index, lineEls.length - 1)];
    if (hint) hint.classList.add('drop-hint');
  }

  function startDrag(chip, blockId, downEvent) {
    downEvent.preventDefault();

    const ghost = document.createElement('div');
    ghost.className = 'block-chip drag-ghost';
    ghost.innerHTML = chip.innerHTML;
    document.body.appendChild(ghost);

    const moveGhost = (e) => {
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    };
    moveGhost(downEvent);

    let moved = false;
    const startX = downEvent.clientX;
    const startY = downEvent.clientY;

    const onMove = (e) => {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_THRESHOLD_PX) moved = true;
      moveGhost(e);
      updateHints(e.clientX, e.clientY);
    };

    const finish = (e) => {
      chip.removeEventListener('pointermove', onMove);
      chip.removeEventListener('pointerup', onUp);
      chip.removeEventListener('pointercancel', onCancel);
      clearHints();
      ghost.remove();
      if (e.type === 'pointercancel') return;
      const index = dropIndexAt(e.clientX, e.clientY);
      if (index !== null) {
        insertOrReject(blockId, index);
      } else if (!moved) {
        insertOrReject(blockId, program.length); // plain click on a chip = append
      }
    };
    const onUp = (e) => finish(e);
    const onCancel = (e) => finish(e);

    chip.addEventListener('pointermove', onMove);
    chip.addEventListener('pointerup', onUp);
    chip.addEventListener('pointercancel', onCancel);
    chip.setPointerCapture(downEvent.pointerId);
  }

  paletteEl.addEventListener('pointerdown', (e) => {
    if (running) return;
    const chip = e.target.closest('.block-chip');
    if (!chip || !paletteEl.contains(chip)) return;
    startDrag(chip, chip.dataset.block, e);
  });

  // click a placed line -> remove it (stepper clicks adjust the count instead)
  programEl.addEventListener('click', (e) => {
    if (running) return;
    const line = e.target.closest('.line.filled');
    if (!line || !programEl.contains(line)) return;
    const index = Number(line.dataset.index);
    const stepBtn = e.target.closest('.step-btn');
    if (stepBtn) {
      adjustRepeat(index, Number(stepBtn.dataset.step));
      return;
    }
    program.splice(index, 1);
    renderLines();
    notify();
  });

  /* ---------- public API ---------- */

  return {
    loadLevel(level) {
      memory = level.memory;
      program = [];
      renderPalette(paletteEl, level.blocks);
      renderLines();
      this.clearHighlight();
      programEl.classList.remove('locked');
      paletteEl.classList.remove('locked');
      notify();
    },

    getProgram() {
      // copies repeat entries too, so later stepper edits don't leak
      // into a snapshot the executor is still running
      return program.map((entry) => (typeof entry === 'string' ? entry : { id: entry.id, count: entry.count }));
    },

    clearProgram() {
      program = [];
      renderLines();
      notify();
    },

    /** While running: no dragging, no removing, no steppers. */
    setRunning(flag) {
      running = flag;
      paletteEl.classList.toggle('locked', flag);
      programEl.classList.toggle('locked', flag);
    },

    /** Program pointer: highlight the executing line. */
    highlight(index) {
      this.clearHighlight();
      if (lineEls[index]) lineEls[index].classList.add('current');
    },

    clearHighlight() {
      for (const line of lineEls) line.classList.remove('current');
    },
  };
}
