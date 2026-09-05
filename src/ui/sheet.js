/* ============================================================
   LoCo — mobile bottom sheet (M4 brief §"src/ui/sheet.js";
   design.md §8.1)
   Two detents, held as classes on #sheet: `is-collapsed` and
   `is-expanded`, exactly one of them present at all times. CSS
   owns both heights and the transition; JS owns which detent is
   live, the mid-drag inline height, and the chevron's
   `aria-expanded`.

   The drag surface is the grip and nothing else. Palette chips
   inside the sheet body already run their own Pointer-Events drag
   with pointer capture (editor.js), so no handler here may sit on
   an ancestor the two gestures share — #sheet, #sheet-body and
   .panel-section stay handler-free.
   ============================================================ */

// Same mechanism main.js uses; kept local so the sheet never imports main.
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TAP_THRESHOLD_PX = 8; // below this a release is a tap on the grip, not a drag
const SETTLE_MS = 240;      // mirrors the CSS height transition (~220ms) plus slack

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function createSheet({ root, grip, chevron, body, onDetentChange }) {
  // The markup ships collapsed and CSS owns the collapsed-body hiding, so JS
  // only reads the initial detent; `body` stays part of the signature to match
  // the fixed DOM contract.
  let expanded = root.classList.contains('is-expanded');
  let drag = null;      // live gesture state, null while idle
  let settleTimer = 0;

  chevron.setAttribute('aria-expanded', String(expanded));

  function setDetent(next) {
    if (drag) endDrag(); // a programmatic detent change wins over a live gesture
    if (next === expanded) return;
    expanded = next;
    // Class and aria move together — the chevron must never lie about the detent.
    root.classList.toggle('is-expanded', expanded);
    root.classList.toggle('is-collapsed', !expanded);
    chevron.setAttribute('aria-expanded', String(expanded));
    scheduleSettle();
  }

  function scheduleSettle() {
    if (!onDetentChange) return;
    window.clearTimeout(settleTimer);
    // A timer rather than `transitionend`: listening on #sheet would put a
    // sheet-owned handler on the one element the drag contract keeps free of
    // them, and it would also fire for the body's visibility transition.
    settleTimer = window.setTimeout(() => {
      settleTimer = 0;
      onDetentChange(expanded);
    }, REDUCED_MOTION ? 0 : SETTLE_MS);
  }

  /**
   * CSS owns the detent heights (56px + safe-area inset, min(70svh, 70vh)), so
   * measure them instead of duplicating those values here: flip to the other
   * detent under `.is-dragging`, where the transition is suppressed, read the
   * height and flip back. Everything runs inside one task, so the flip never
   * paints. Leaves `.is-dragging` on the root for the caller.
   */
  function measureDetents() {
    const from = root.getBoundingClientRect().height;
    root.classList.add('is-dragging');
    root.classList.toggle('is-expanded', !expanded);
    root.classList.toggle('is-collapsed', expanded);
    const other = root.getBoundingClientRect().height;
    root.classList.toggle('is-expanded', expanded);
    root.classList.toggle('is-collapsed', !expanded);
    return { from, low: Math.min(from, other), high: Math.max(from, other) };
  }

  function onDown(e) {
    if (drag) return; // one pointer at a time
    // The chevron is the keyboard/AT path and owns its click; dragging from it
    // would toggle twice (once as a tap, once as a click) and cancel itself out.
    if (e.target.closest('.sheet-chevron')) return;
    e.preventDefault();

    const { from, low, high } = measureDetents();
    if (high <= low) {
      // Nothing to slide — the sheet is not rendered above the breakpoint.
      root.classList.remove('is-dragging');
      return;
    }

    drag = { pointerId: e.pointerId, startY: e.clientY, startHeight: from, low, high, height: from, moved: 0 };
    root.style.height = `${from}px`; // inline height exists only mid-drag, so CSS needs no !important

    grip.addEventListener('pointermove', onMove);
    grip.addEventListener('pointerup', onUp);
    grip.addEventListener('pointercancel', onCancel);
    grip.setPointerCapture(e.pointerId);
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientY - drag.startY));
    drag.height = clamp(drag.startHeight + (drag.startY - e.clientY), drag.low, drag.high); // up grows the sheet
    root.style.height = `${drag.height}px`;
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { moved, height, low, high } = drag;
    endDrag();
    if (moved < TAP_THRESHOLD_PX) {
      toggle();
      return;
    }
    setDetent(height >= (low + high) / 2); // nearest detent; the mid-point keeps a half-drag decisive
  }

  function onCancel(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    endDrag(); // a cancelled gesture falls back to the detent it started from
  }

  function endDrag() {
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onUp);
    grip.removeEventListener('pointercancel', onCancel);
    root.style.height = '';
    root.classList.remove('is-dragging');
    drag = null;
  }

  grip.addEventListener('pointerdown', onDown);
  chevron.addEventListener('click', () => toggle());

  function collapse() {
    setDetent(false);
  }

  function expand() {
    setDetent(true);
  }

  function toggle() {
    setDetent(!expanded);
  }

  return { collapse, expand, toggle, isExpanded: () => expanded };
}
