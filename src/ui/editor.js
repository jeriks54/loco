/* ============================================================
   LoCo — program editor, lines mode (design.md §5; M2 brief)
   "Program as lines": the program renders as numbered mono
   lines (01, 02, …), one per memory slot, with loop bodies
   indented per nesting depth so structure reads like code.
   Empty slots render as dim placeholder lines.

   Pointer-Events drag & drop (no HTML5 DnD): pointerdown on a
   palette chip spawns a floating ghost; drop inserts a line at
   the drop position. Over-capacity drops are rejected with a
   flash. Click a placed line to remove it. The `loop` line
   carries small +/− count steppers (1..99, no typing) that are
   inert while a run is in progress. The executing line is
   highlighted on `step` events (the program pointer).
   ============================================================ */

import { renderPalette, BLOCK_DEFS, CONDITION_DEFS } from './palette.js';
import { LOOP_MIN, LOOP_MAX } from '../game/executor.js';

const DRAG_THRESHOLD_PX = 5;   // below this a pointerup counts as a click (append)
const REJECT_FLASH_MS = 420;

const pad2 = (n) => String(n).padStart(2, '0');

/** Entry token id ('loop' for { id:'loop', count }). */
function entryId(entry) {
  return typeof entry === 'string' ? entry : entry.id;
}

export function createEditor({ paletteEl, programEl, countEl, onChange }) {
  let memory = 0;
  let program = [];
  let running = false;
  let lineEls = [];
  let selectedSlot = null;
  let activeDrag = null;

  const messageEl = document.createElement('div');
  messageEl.className = 'editor-message';
  messageEl.setAttribute('aria-live', 'polite');
  messageEl.setAttribute('role', 'status');
  if (programEl.parentElement) programEl.parentElement.insertBefore(messageEl, programEl.nextSibling);

  function setMessage(message) {
    messageEl.textContent = message;
  }

  function clearSelection() {
    selectedSlot = null;
    for (const slot of programEl.querySelectorAll('.condition-slot')) slot.classList.remove('selected');
  }

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
      if (id === 'loop' || id === 'loopUntil') depth += 1;
    }
    return { depths, trailing: depth };
  }

  /** Terminal-voice token markup for one line (lowercase). */
  function codeHTML(entry, lineIndex = 0) {
    if (typeof entry === 'string') {
      return `<span class="line-token${entry === 'end' ? ' kw' : ''}">${BLOCK_DEFS[entry].label}</span>`;
    }
    if (entry.id === 'loopUntil') {
      const slotHTML = (slot) => {
        const conditionId = entry[slot];
        const def = conditionId ? CONDITION_DEFS[conditionId] : null;
        const selected = selectedSlot && selectedSlot.index === lineIndex && selectedSlot.slot === slot;
        const lineNumber = lineIndex + 1;
        const slotLabel = def ? def.label : slot;
        const selectedClass = selected ? ' selected' : '';
        const aria = `${slot} slot on line ${lineNumber}: ${def ? def.label : 'empty'}`;
        const clear = def
          ? `<button type="button" class="condition-clear" data-clear-slot="${slot}" aria-label="Clear ${slot} slot on line ${lineNumber}">×</button>`
          : '';
        return `<span class="condition-slot-wrap"><button type="button" class="condition-slot${selectedClass}" data-slot="${slot}" aria-label="${aria}">${slotLabel}</button>${clear}</span>`;
      };
      return (
        `<span class="line-token kw">${BLOCK_DEFS.loopUntil.label}</span>` +
        ` <span class="condition-expression">` +
        slotHTML('sensor') +
        ` <span class="condition-comparison" aria-label="equals">=</span> ` +
        slotHTML('value') +
        `</span>`
      );
    }
    // loop: keyword + count with steppers
    return (
      `<span class="line-token kw">${BLOCK_DEFS.loop.label}</span>` +
      `<span class="stepper">` +
      `<button type="button" class="step-btn" data-step="-1" aria-label="decrease loop count"` +
      `${entry.count <= LOOP_MIN ? ' disabled' : ''}>−</button>` +
      `<span class="loop-count">${entry.count}</span>` +
      `<button type="button" class="step-btn" data-step="1" aria-label="increase loop count"` +
      `${entry.count >= LOOP_MAX ? ' disabled' : ''}>+</button>` +
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
          `<span class="line-code${entryId(program[i]) === 'loopUntil' ? ' condition-code' : ''}">${codeHTML(program[i], i)}</span>`;
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
    clearSelection();
    if (program.length >= memory) {
      rejectFlash();
      return false;
    }
    const at = Math.max(0, Math.min(index, program.length));
    const entry = blockId === 'loop'
      ? { id: 'loop', count: 2 }
      : blockId === 'loopUntil'
        ? { id: 'loopUntil', sensor: null, value: null }
        : blockId;
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

  /* ---------- loop count steppers ---------- */

  function adjustLoop(index, delta) {
    const entry = program[index];
    if (!entry || entry.id !== 'loop') return;
    const count = Math.min(LOOP_MAX, Math.max(LOOP_MIN, entry.count + delta));
    if (count === entry.count) return;
    entry.count = count;
    clearSelection();
    renderLines(); // re-render keeps number + disabled steppers in sync
  }

  function firstCompatibleSlot(slot) {
    for (let index = 0; index < program.length; index += 1) {
      const entry = program[index];
      if (entry && entry.id === 'loopUntil' && !entry[slot]) return { index, slot };
    }
    return null;
  }

  function placeOperand(conditionId, slotOverride = null) {
    if (running) return false;
    const def = CONDITION_DEFS[conditionId];
    if (!def) return false;
    let target = slotOverride;
    if (slotOverride) {
      if (slotOverride.slot !== def.slot) {
        setMessage(`Choose a ${def.slot} slot for ${def.label}.`);
        return false;
      }
    } else if (selectedSlot) {
      target = selectedSlot;
      if (target.slot !== def.slot) {
        setMessage(`Choose a ${def.slot} slot for ${def.label}.`);
        return false;
      }
    }
    if (!target) target = firstCompatibleSlot(def.slot);
    const entry = target && program[target.index];
    if (!target || !entry || entry.id !== 'loopUntil') {
      clearSelection();
      setMessage(`Choose a ${def.slot} slot for ${def.label}.`);
      return false;
    }
    entry[def.slot] = conditionId;
    clearSelection();
    renderLines();
    notify();
    setMessage('');
    return true;
  }

  function clearOperand(index, slot) {
    if (running) return;
    const entry = program[index];
    if (!entry || entry.id !== 'loopUntil' || !Object.prototype.hasOwnProperty.call(entry, slot)) return;
    entry[slot] = null;
    clearSelection();
    renderLines();
    notify();
    setMessage('');
  }

  function setSelectedSlot(index, slot) {
    if (running) return;
    const entry = program[index];
    if (!entry || entry.id !== 'loopUntil' || !CONDITION_DEFS[slot === 'sensor' ? 'wallSensor' : 'blocked']) return;
    selectedSlot = { index, slot };
    renderLines();
    setMessage(`Selected ${slot} slot on line ${index + 1}.`);
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
    for (const line of lineEls) {
      line.classList.remove('drop-hint');
      for (const slot of line.querySelectorAll('.condition-slot')) {
        slot.classList.remove('drop-target', 'drop-reject');
      }
    }
  }

  function slotAt(clientX, clientY, eventTarget = null) {
    const direct = eventTarget && eventTarget.closest && eventTarget.closest('.condition-slot');
    if (direct && programEl.contains(direct)) return direct;
    const pointed = document.elementFromPoint && document.elementFromPoint(clientX, clientY);
    const candidate = pointed && pointed.closest && pointed.closest('.condition-slot');
    if (candidate && programEl.contains(candidate)) return candidate;
    for (const slot of programEl.querySelectorAll('.condition-slot')) {
      const rect = slot.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) return slot;
    }
    return null;
  }

  function updateHints(clientX, clientY, source, eventTarget = null) {
    clearHints();
    if (running) return;
    const targetSlot = slotAt(clientX, clientY, eventTarget);
    if (targetSlot) {
      const compatible = source.kind === 'condition' && targetSlot.dataset.slot === source.slot;
      targetSlot.classList.add(compatible ? 'drop-target' : 'drop-reject');
      return;
    }
    if (source.kind === 'condition') return;
    if (program.length >= memory) return;
    const index = dropIndexAt(clientX, clientY);
    if (index === null) return;
    programEl.classList.add('drop-ready');
    const hint = lineEls[Math.min(index, lineEls.length - 1)];
    if (hint) hint.classList.add('drop-hint');
  }

  function cancelDrag() {
    if (activeDrag) activeDrag.cancel();
  }

  function startDrag(chip, source, downEvent) {
    cancelDrag();
    downEvent.preventDefault();

    const dragToken = Symbol('drag');

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
      updateHints(e.clientX, e.clientY, source, e.target);
    };

    const finish = (e) => {
      if (!activeDrag || activeDrag.token !== dragToken) return;
      chip.removeEventListener('pointermove', onMove);
      chip.removeEventListener('pointerup', onUp);
      chip.removeEventListener('pointercancel', onCancel);
      clearHints();
      ghost.remove();
      activeDrag = null;
      if (e.type === 'pointercancel') return;
      if (running) return;
      const targetSlot = slotAt(e.clientX, e.clientY, e.target);
      if (source.kind === 'condition') {
        if (targetSlot) {
          const target = { index: Number(targetSlot.closest('.line').dataset.index), slot: targetSlot.dataset.slot };
          if (target.slot !== source.slot) {
            setMessage(`Choose a ${source.slot} slot for ${source.label}.`);
            return;
          }
          placeOperand(source.id, target);
        } else if (!moved) {
          placeOperand(source.id);
        } else {
          setMessage(`Drop ${source.label} on a ${source.slot} slot.`);
        }
        return;
      }
      if (targetSlot) {
        setMessage('Commands cannot be placed in condition slots.');
        return;
      }
      const index = dropIndexAt(e.clientX, e.clientY);
      if (index !== null) {
        insertOrReject(source.id, index);
      } else if (!moved) {
        insertOrReject(source.id, program.length); // plain click on a chip = append
      }
    };
    const onUp = (e) => finish(e);
    const onCancel = (e) => finish(e);

    chip.addEventListener('pointermove', onMove);
    chip.addEventListener('pointerup', onUp);
    chip.addEventListener('pointercancel', onCancel);
    chip.setPointerCapture(downEvent.pointerId);
    activeDrag = {
      token: dragToken,
      cancel() {
        finish({ type: 'pointercancel', clientX: 0, clientY: 0, target: chip });
      },
    };
  }

  paletteEl.addEventListener('pointerdown', (e) => {
    if (running) return;
    const chip = e.target.closest('.block-chip');
    if (!chip || !paletteEl.contains(chip)) return;
    if (chip.dataset.condition) {
      const def = CONDITION_DEFS[chip.dataset.condition];
      startDrag(chip, { kind: 'condition', id: chip.dataset.condition, slot: def.slot, label: def.label }, e);
    } else {
      startDrag(chip, { kind: 'command', id: chip.dataset.block }, e);
    }
  });

  // click a placed line -> remove it (stepper clicks adjust the count instead)
  programEl.addEventListener('click', (e) => {
    if (running) return;
    const line = e.target.closest('.line.filled');
    if (!line || !programEl.contains(line)) return;
    const index = Number(line.dataset.index);
    const stepBtn = e.target.closest('.step-btn');
    if (stepBtn) {
      adjustLoop(index, Number(stepBtn.dataset.step));
      return;
    }
    const slot = e.target.closest('.condition-slot');
    if (slot) {
      setSelectedSlot(index, slot.dataset.slot);
      return;
    }
    const clear = e.target.closest('[data-clear-slot]');
    if (clear) {
      clearOperand(index, clear.dataset.clearSlot);
      return;
    }
    if (e.target.closest('.condition-comparison')) return;
    if (e.target.closest('.condition-expression')) return;
    program.splice(index, 1);
    clearSelection();
    renderLines();
    notify();
  });

  /* ---------- public API ---------- */

  return {
    loadLevel(level) {
      cancelDrag();
      clearSelection();
      memory = level.memory;
      program = [];
      setMessage('');
      renderPalette(paletteEl, level.blocks, level.sensor);
      renderLines();
      this.clearHighlight();
      programEl.classList.remove('locked');
      paletteEl.classList.remove('locked');
      notify();
    },

    getProgram() {
      // Copies every object field so later editor edits cannot leak into a run.
      return program.map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry.id === 'loopUntil') {
          return { id: 'loopUntil', sensor: entry.sensor ?? null, value: entry.value ?? null };
        }
        return { id: entry.id, count: entry.count };
      });
    },

    clearProgram() {
      cancelDrag();
      clearSelection();
      program = [];
      renderLines();
      notify();
      setMessage('');
    },

    /** While running: no dragging, no removing, no steppers. */
    setRunning(flag) {
      if (flag) {
        cancelDrag();
        clearSelection();
      }
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
