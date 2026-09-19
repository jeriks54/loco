/* ============================================================
   LoCo — command palette (design.md §5, brief §5; M2 brief)
   Renders the level's unlocked blocks as chips: mono label +
   glyph. Pure rendering; drag handling lives in editor.js.
   Counted-loop blocks (loop / end) render
   as mono code-token chips in the same chip shape.
   ============================================================ */

export const BLOCK_DEFS = {
  move: { label: 'move', glyph: '↑' },
  turnLeft: { label: 'turn left', glyph: '↰' },
  turnRight: { label: 'turn right', glyph: '↱' },
  loop: { label: 'loop', glyph: '↻' },
  loopUntil: { label: 'loop until', glyph: '↻' },
  if: { label: 'if', glyph: '?' },
  else: { label: 'else', glyph: ':' },
  end: { label: 'end', glyph: '■' },
};

/** Operands used by the editable loop-until expression. */
export const CONDITION_DEFS = {
  wallSensor: { label: 'wall sensor', slot: 'sensor', glyph: '◉' },
  blocked: { label: 'blocked', slot: 'value', glyph: '=' },
};

/** Inner markup shared by palette chips and the drag ghost. */
export function chipHTML(blockId) {
  const def = BLOCK_DEFS[blockId];
  if (!def) throw new Error(`unknown block '${blockId}'`);
  return `<span class="chip-label">${def.label}</span><span class="chip-glyph">${def.glyph}</span>`;
}

function conditionChipHTML(conditionId) {
  const def = CONDITION_DEFS[conditionId];
  return `<span class="chip-label">${def.label}</span><span class="chip-glyph">${def.glyph}</span>`;
}

export function renderPalette(container, blocks, sensor) {
  container.innerHTML = '';
  for (const id of blocks) {
    const chip = document.createElement('div');
    chip.className = 'block-chip';
    chip.dataset.block = id;
    chip.setAttribute('role', 'button');
    chip.setAttribute('aria-label', `${BLOCK_DEFS[id].label} block — drag into robot memory`);
    chip.innerHTML = chipHTML(id);
    container.appendChild(chip);
  }

  // Conditions are operands for the loop-until line, never independent
  // memory entries. They are unlocked only with the matching equipment.
  if ((blocks.includes('loopUntil') || blocks.includes('if')) && sensor === 'frontWall') {
    for (const id of Object.keys(CONDITION_DEFS)) {
      const def = CONDITION_DEFS[id];
      const chip = document.createElement('div');
      chip.className = 'block-chip condition-chip';
      chip.dataset.condition = id;
      chip.dataset.slot = def.slot;
      chip.setAttribute('role', 'button');
      chip.setAttribute('aria-label', `${def.label} operand — place in a ${def.slot} slot`);
      chip.innerHTML = conditionChipHTML(id);
      container.appendChild(chip);
    }
  }
}
