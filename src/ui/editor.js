/* ============================================================
   LoCo — program editor (design.md §5, brief §5)
   Pointer-Events drag & drop (no HTML5 DnD): pointerdown on a
   palette chip spawns a floating ghost; drop inserts a copy at
   position in the program. The program renders exactly `memory`
   slots; drops beyond capacity are rejected with a flash.
   Click a placed block to remove it. The executing block is
   highlighted on `step` events (the program pointer).
   ============================================================ */

import { renderPalette, chipHTML } from './palette.js';

const DRAG_THRESHOLD_PX = 5;   // below this a pointerup counts as a click (append)
const REJECT_FLASH_MS = 420;

export function createEditor({ paletteEl, programEl, countEl, onChange }) {
  let memory = 0;
  let program = [];
  let running = false;
  let slotEls = [];

  const notify = () => {
    if (onChange) onChange(program.length);
  };

  /* ---------- rendering ---------- */

  function renderSlots() {
    programEl.innerHTML = '';
    slotEls = [];
    for (let i = 0; i < memory; i += 1) {
      const slot = document.createElement('div');
      if (i < program.length) {
        slot.className = 'slot filled';
        slot.dataset.index = String(i);
        slot.innerHTML = chipHTML(program[i]);
      } else {
        slot.className = 'slot empty';
      }
      programEl.appendChild(slot);
      slotEls.push(slot);
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
    program.splice(at, 0, blockId);
    renderSlots();
    slotEls[at].classList.add('pop');
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

  /* ---------- drag & drop (Pointer Events) ---------- */

  function dropIndexAt(clientX, clientY) {
    const rect = programEl.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }
    for (let i = 0; i < slotEls.length; i += 1) {
      const r = slotEls[i].getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return clientX > r.left + r.width / 2 ? i + 1 : i;
      }
    }
    return program.length; // inside the box, between slots -> append
  }

  function clearHints() {
    programEl.classList.remove('drop-ready');
    for (const slot of slotEls) slot.classList.remove('drop-hint');
  }

  function updateHints(clientX, clientY) {
    clearHints();
    if (running || program.length >= memory) return;
    const index = dropIndexAt(clientX, clientY);
    if (index === null) return;
    programEl.classList.add('drop-ready');
    const hint = slotEls[Math.min(index, slotEls.length - 1)];
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

  // click a placed block -> remove it
  programEl.addEventListener('click', (e) => {
    if (running) return;
    const slot = e.target.closest('.slot.filled');
    if (!slot) return;
    program.splice(Number(slot.dataset.index), 1);
    renderSlots();
    notify();
  });

  /* ---------- public API ---------- */

  return {
    loadLevel(level) {
      memory = level.memory;
      program = [];
      renderPalette(paletteEl, level.blocks);
      renderSlots();
      this.clearHighlight();
      programEl.classList.remove('locked');
      paletteEl.classList.remove('locked');
      notify();
    },

    getProgram() {
      return [...program];
    },

    clearProgram() {
      program = [];
      renderSlots();
      notify();
    },

    /** While running: no dragging, no removing. */
    setRunning(flag) {
      running = flag;
      paletteEl.classList.toggle('locked', flag);
      programEl.classList.toggle('locked', flag);
    },

    /** Program pointer: highlight the executing block. */
    highlight(index) {
      this.clearHighlight();
      if (slotEls[index]) slotEls[index].classList.add('current');
    },

    clearHighlight() {
      for (const slot of slotEls) slot.classList.remove('current');
    },
  };
}
