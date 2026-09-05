# M4 Brief — Mobile bottom sheet

Implements `docs/design.md` §8.1 (decisions agreed with jonas 2026-09-05). Issue: #15 (label `M4`).

**Team rules:** vanilla HTML/CSS/JS, zero dependencies, zero build step. Visual voice per design.md §11 (JetBrains Mono for terminal elements, mint accent via the existing CSS custom properties, honor `prefers-reduced-motion`). **Agents never run git** — the team manager reviews and commits every delivery.

This is **one cohesive task, one agent**. Scope is layout + one new UI module; no game logic, no level data, no executor semantics.

## Goal

Under a width breakpoint the game screen becomes **board on top, program panel as a bottom sheet**. Desktop must remain **pixel-identical** — the sheet is additive, never a rewrite of the existing two-column layout.

## Shared contracts

- **Breakpoint:** `@media (max-width: 900px)`. Width only — no orientation query, no `pointer: coarse`. Above 900px nothing changes.
- **Sheet model:** the sheet is a **floating overlay**, not a push. `position: absolute` inside `#screen-game` — never `fixed`, because the breakpoint also catches narrow desktop windows, where `fixed` would escape the app frame. The board panel reserves only the *collapsed* peek height via `padding-bottom`, so `fit()` sizes the maze against the unobstructed area and **the board keeps one stable size across both detents**. Expanding, collapsing and dragging must not change the board's dimensions. Do not implement pan/zoom.
- **Translucency:** the expanded sheet body is slightly see-through so the maze stays legible behind the program lines (jonas' call, 2026-09-05). Surface colour at roughly **0.85 alpha** plus `backdrop-filter: blur(8px)` behind an `@supports` query, with a **solid** fallback where unsupported. The mono program lines and the memory count must hold **WCAG AA contrast against the worst case behind them** — a lit wall tile and the glowing EXIT badge. If that cannot be met at 0.85, raise the opacity; do not lighten the text. Keep the **grip and peek bar solid**: they are the control surface, and tap targets should not sit over a moving maze.
- **Detents:** exactly two.
  - *collapsed* — grip + peek bar only, `calc(56px + env(safe-area-inset-bottom))`.
  - *expanded* — `min(70svh, …)` with the body scrolling internally. Use `svh` with a `vh` fallback declared before it.
- **Sheet state is not persisted.** Collapse on every level load, so the board is visible when a level opens.
- **Detent changes animate** (transform/height transition) **except** under `prefers-reduced-motion: reduce`, where they snap.

## DOM structure

Add one new element to `index.html` inside the existing `<aside class="side-panel">`, and one new class hook on the aside:

```
<aside class="side-panel sheet">
  <div class="sheet-grip">                      ← drag surface + chevron button
    <button class="sheet-chevron" aria-expanded="false" aria-controls="sheet-body">
  </div>
  <div class="sheet-peek">                      ← NEW: Run, Reset, memory count
  <div class="sheet-body" id="sheet-body">      ← the three existing .panel-section wrappers
    Commands / Robot memory / Controls
  </div>
</aside>
```

- `.sheet-grip`, `.sheet-peek`, `.sheet-body` and the `.sheet` class are **inert above the breakpoint**: `display: none` for grip and peek, and `.sheet-body` behaves exactly as the current `.side-panel` flex column does today. The three existing `.panel-section` elements keep their current order and styling.
- **The peek bar duplicates Run, Reset and the memory count.** This is deliberate: it is the only way to keep them reachable while collapsed without moving the desktop DOM. Mark them with data hooks (`data-role="run"`, `data-role="reset"`, `data-role="memory-count"`) and give the *existing* desktop controls the same hooks.
- **Inside the expanded sheet on mobile, the `.controls` section hides its own Run and Reset** (they are already in the peek bar, which stays visible above the body) and keeps only the ×½ / ×1 / ×2 speed group.

## `src/ui/hud.js` — controls become sets

`hud.js` currently resolves `btn-run`, `btn-reset` and `memory-count` once each. Change it to resolve **all** elements carrying each `data-role` and keep them in sync:

- `updateRunButton()` applies `disabled` to every run control (still `running || programLen === 0`).
- `setProgramLength()` writes the `N / M` text to every memory-count element.
- Reset stays **always enabled** — it is the only way to abort a run (`executor.stop()` has no user-facing control; see issue #5's closing note). Wire every reset element to the existing `onReset`.
- Speed group wiring is unchanged (one instance, inside the body).
- Public API of `createHud` must not change shape — `main.js` keeps calling it the same way.

## `src/ui/sheet.js` — new module

Export `createSheet({ root, grip, chevron, body, onDetentChange })` returning `{ collapse(), expand(), toggle(), isExpanded() }`.

- **Drag lives on the grip only.** Attach `pointerdown` to `.sheet-grip` and nothing else. The sheet root, the body and the panel sections must never receive drag handlers.
- Grip uses `touch-action: none` and `setPointerCapture`, mirroring the existing chip-drag idiom in `editor.js`.
- Track vertical delta; clamp between the two detent heights; on `pointerup` snap to the **nearest** detent. If total movement is under 8px, treat it as a tap and toggle.
- The chevron button toggles on click and is the keyboard/AT path: `aria-expanded` and `aria-controls` stay in sync with the real detent.
- **Gesture arbitration is the main risk in this milestone.** Palette chips already use Pointer Events with `touch-action: none` plus pointer capture, and drops are hit-tested against the program list's bounding rect (`editor.js`'s `dropIndexAt`). A chip drag must never move the sheet, and a sheet drag must never start a chip drag. Verify by inspection that no listener is attached to a common ancestor of both.
- Fire `onDetentChange` after a settle so `main.js` can let the board re-fit.

## `src/main.js` — wiring

- Create the sheet after the other UI modules; pass the aside/grip/chevron/body elements.
- **Auto-collapse on run:** `run()` collapses the sheet before `executor.start(speed)`.
- **Collapse on level load:** `loadLevel()` collapses before `screens.showScreen('game')` and `scene.render(state)`, preserving the existing "show first so the panel has a size to fit into" ordering.
- Navigating away from the game screen keeps calling `stopRun()` via `onLeaveGame` — unchanged.

## `src/render/scene.js` — tile floor + refit guard

Two changes, both small:

1. **`MIN_TILE` 28 → 18.** Rationale: at 28px, **every level 11 cells wide or more** overflows a ~307px usable panel width on a 390px phone — ch2-01 (16), ch2-05 (14), ch2-06 (14), ch2-07 (12) and ch2-08 (16), five of the fifteen levels — and `body { overflow-x: hidden }` silently clips the result. A 16-wide grid needs 448px of canvas at 28px tiles; at 18px it needs 288px and fits. 18px is a floor that only ever binds on narrow screens — desktop panels are wide enough that `fit()` picks a larger tile regardless, so desktop is unaffected. The overlay model helps on the height axis too: the board is sized against full height minus a 56px peek bar rather than minus a 70svh sheet, so the height term stops binding on tall levels.
2. **Early-return from `fit()` when nothing changed.** Cache the last computed `tile`, `dpr`, `cols` and `rows`; if all four match, return before touching `canvas.width` / `canvas.height`. With the overlay model the board no longer resizes on detent changes, so this is a safety net rather than the primary defence — but it is still required: mobile browsers fire resize on address-bar show/hide and on rotation, and every one of those events would otherwise reallocate the canvas backing store and force a full redraw.

## `styles/main.css` — layout

Under the breakpoint:

- `#screen-game` becomes a fixed-height app frame **and the sheet's positioning context**: `position: relative`, `height: 100svh` (with `100vh` fallback), `overflow: hidden`, and reduced padding/gap (the current `clamp(20px, 6vw, 56px)` eats too much of a 390px viewport).
- `.game-layout` becomes one column with a single row: `grid-template-columns: minmax(0, 1fr)`, `grid-template-rows: minmax(0, 1fr)`. The board panel is the only grid item; the sheet is absolutely positioned over it, not a grid sibling.
- **`.board-panel` gets `padding-bottom: calc(56px + env(safe-area-inset-bottom))`.** This is the mechanism that makes the board size detent-independent — `fit()` measures the panel's content box, so reserving only the collapsed peek height means the maze is sized once and never rescales. Verify it rather than assuming it.
- The sheet is `position: absolute; left: 0; right: 0; bottom: 0`, height driven by the detent. `.sheet-body` scrolls (`overflow-y: auto`, `overscroll-behavior: contain`) and carries `env(safe-area-inset-bottom)` padding when expanded.
- **z-index order — get this right or a chip disappears mid-drag.** `.drag-ghost` is already `z-index: 1000` in `main.css`; the sheet must sit **below** it, and the result-overlay card above the sheet. Suggested: sheet `40`, result card `60`, ghost untouched at `1000`.
- **Result overlay:** `.result-overlay` is `position: absolute; inset: 0` inside `.canvas-wrap`. On a 16×9 level at an 18px tile the canvas is only 288×162 — the terminal copy plus Retry/Next will not fit. Under the breakpoint, make it cover the **app frame** instead: set `.canvas-wrap { position: static }` so the overlay's containing block becomes `#screen-game` (already `position: relative`), leaving `inset: 0` to span the frame, and let the existing flex centering place the card. Same backdrop colour, `max-width` constrained, stack the buttons if needed. Pure CSS; do not move it in the DOM, and do not use `position: fixed` — it must stay inside the app frame in narrow desktop windows, same rule as the sheet.
- `.screen-header` must survive 360px: keep the existing ellipsis truncation on the level name and check the `01/15 · MEM 8` progress string does not force a wrap.

## Out of scope

Robot sprite (#8), tile types and board art (#19), all loop/`if` work (#16, #17, #18), level-select and title-screen redesign, pan/pinch-zoom, landscape-specific tuning beyond what the breakpoint already gives, persistence of sheet state. No new dependencies. No test frameworks.

## DOM contract (fixed — build to this exactly)

Pinned so the markup, `hud.js` and `sheet.js` cannot drift apart. Ids and classes are normative.

```html
<aside class="side-panel sheet" id="sheet">
  <div class="sheet-grip" id="sheet-grip">
    <button type="button" class="sheet-chevron" id="sheet-chevron"
            aria-expanded="false" aria-controls="sheet-body"
            aria-label="Toggle the program panel">▲</button>
  </div>

  <div class="sheet-peek" id="sheet-peek">
    <button type="button" class="btn btn-primary"   id="btn-run-peek"   data-role="run">▶ Run</button>
    <button type="button" class="btn btn-secondary" id="btn-reset-peek" data-role="reset">Reset</button>
    <span class="memory-count" id="memory-count-peek" data-role="memory-count"></span>
  </div>

  <div class="sheet-body" id="sheet-body">
    <!-- the three existing .panel-section divs, unchanged and in their current order -->
  </div>
</aside>
```

- The **existing** controls keep their ids and gain the same roles: `#btn-run` → `data-role="run"`, `#btn-reset` → `data-role="reset"`, `#memory-count` → `data-role="memory-count"`.
- `hud.js` resolves **`document.querySelectorAll('[data-role="…"]')`** for each of the three roles and keeps every match in sync. It must not rely on the old single ids for those three.
- `.sheet-grip`, `.sheet-peek` and the `.sheet` class are `display: none` above the breakpoint. `.sheet-body` above the breakpoint behaves exactly as today's `.side-panel` flex column — same order, same gap, same section styling.
- The chevron is a single `▲` glyph, rotated 180° by CSS when `[aria-expanded="true"]` (transition suppressed under `prefers-reduced-motion`). Do not swap the character in JS.
- `.controls` keeps only the speed group under the breakpoint: its own `[data-role="run"]` and `[data-role="reset"]` become `display: none` there, since the peek bar carries them.
- Drag listeners attach to `#sheet-grip` only — never to `#sheet`, `#sheet-body` or any `.panel-section`.

## Acceptance checklist

**Desktop (must be a no-op):**
1. Above 900px the game screen is unchanged — grip and peek not rendered, side panel order and styling identical, two Run/Reset controls never both visible.
2. All 15 levels play exactly as before; no console errors.

**Mobile / narrow:**
3. At 390×844 and 360×640, the board is fully visible with the sheet collapsed — **no horizontal clipping on any level**, including the widest (ch2-01 and ch2-08 at 16 cells) and the four others that overflowed at the old 28px floor.
4. **The board's pixel size is identical in both detents** — expanding or collapsing does not rescale the maze.
5. Grip drag slides the sheet and snaps to the nearest detent; a tap on the grip toggles; the chevron toggles and its `aria-expanded` tracks reality.
6. A palette chip drag never moves the sheet; a sheet drag never spawns a drag ghost.
7. Collapsed peek shows Run, Reset and the live memory count; Run disables when the program is empty or a run is in flight, on **both** the peek and the in-body instance.
8. Pressing Run collapses the sheet so nothing obscures the maze, and the board does not change size.
9. Reset aborts a run in flight from the collapsed peek bar.
10. Opening a level starts collapsed.
11. Result overlay is readable and its buttons reachable on a 16-wide level at the 18px tile floor.
12. `prefers-reduced-motion: reduce` — detent changes snap, no transition.
13. Expanded body scrolls without rubber-banding the page; `env(safe-area-inset-bottom)` respected on a notched device.
14. Dragging the sheet produces no canvas flicker or resize (the `fit()` guard plus the reserved padding).
15. The maze is legible **through** the expanded sheet body, and the program lines hold contrast over a lit wall tile and the EXIT badge. Where `backdrop-filter` is unsupported, the surface falls back solid and the text stays readable.
16. A chip dragged from the palette renders **above** the sheet for the entire drag.

## Manager's independent verification (not the agent's job)

Per the M2 review-gate lesson, self-reported verification is not accepted. Before this is committed the team manager will independently:

- Recompute `fit()` for **all 15 levels** at 390×844, 360×640 and 414×896 with the real level data and the new `MIN_TILE`, proving `cols × tile` never exceeds the usable panel width **and** `rows × tile` never exceeds the usable height (viewport − header − the reserved peek height) — a throwaway node script, deleted afterwards.
- Prove the board is **detent-independent**: read the committed code for any path that recomputes tile size on a detent change. There must be none.
- Check the z-index stack in the committed CSS: `.drag-ghost` (1000) > result card > sheet.
- Verify the translucency against the **worst case**, not the average: the mono line colour seen through the chosen alpha over an accent-lit wall tile and the EXIT badge glow. If the final alpha differs from 0.85, the reason must be stated in the delivery report.
- Read the sheet module for listener scope: no drag handler on any ancestor shared with the palette or program list.
- Diff the desktop cascade to confirm nothing above 900px changed.

Then: PR on `feat/m4-mobile-sheet` with the Vercel preview URL, and jonas play-tests **on a real phone** against checklist items 3–16.

## Definition of done

Checklist passes, manager verification passes, committed on `feat/m4-mobile-sheet`, PR opened with the preview link and the checklist handed to jonas. Merge only on his explicit go-ahead.
