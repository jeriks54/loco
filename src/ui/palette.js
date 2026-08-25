/* ============================================================
   LoCo — command palette (design.md §5, brief §5)
   Renders the level's unlocked blocks as chips: mono label +
   glyph. Pure rendering; drag handling lives in editor.js.
   ============================================================ */

export const BLOCK_DEFS = {
  move: { label: 'move', glyph: '↑' },
  turnLeft: { label: 'turn left', glyph: '↰' },
  turnRight: { label: 'turn right', glyph: '↱' },
};

/** Inner markup shared by palette chips and filled program slots. */
export function chipHTML(blockId) {
  const def = BLOCK_DEFS[blockId];
  if (!def) throw new Error(`unknown block '${blockId}'`);
  return `<span class="chip-label">${def.label}</span><span class="chip-glyph">${def.glyph}</span>`;
}

export function renderPalette(container, blocks) {
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
}
