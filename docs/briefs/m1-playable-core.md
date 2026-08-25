# Brief — M1 playable core

**Date:** 2026-08-25 · **Milestone:** M1 (issues #1–#5) · **Branch:** `feat/m1-playable-core`

## Context

LoCo is a browser game: the player programs a robot with drag-and-drop command blocks to escape grid mazes; the robot's limited memory is the core puzzle constraint. M1 makes the game **playable end-to-end on desktop** with 3 placeholder levels. The welcome/title screen already exists and is approved — do not restyle it.

**Required reading before writing code:**
- `docs/requirements.md` — §3 gameplay model, §3.5 fail states, §3.7 layout (desktop-first, maze left / editor right)
- `docs/design.md` — §1 stack (vanilla, no build), §2 architecture & data flow, §3 level format, §4 execution model, §5 editor, §6 rendering, §11 visual language (locked)
- `index.html`, `styles/main.css`, `src/main.js` — existing shell, tokens, welcome wiring

## Scope

**In:** everything needed to play 3 levels end-to-end: level registry, state, executor, canvas renderer, drag & drop editor, HUD, screen wiring, game-screen styling.
**Out:** persistence, scoring/par, loops/conditionals, mobile layout, sound, level-select progress badges. No frameworks, no dependencies, no build step.

## Deliverables

### 1. Levels — `src/levels/chapter1.js`, `src/levels/index.js`

- 3 levels in the exact format of design §3 (`id`, `name`, `grid` strings, `startDir`, `memory`, `blocks`, optional `par`).
- ids `ch1-01`…`ch1-03`; difficulty ramps via maze shape **and** tighter memory (e.g. 8 → 6 → 5 slots); grids stay small (≤ 9×7).
- Every level must be solvable using only `move` / `turnLeft` / `turnRight` within its memory budget. Verify by construction (solve each on paper).
- `index.js` exports the ordered registry.

### 2. State — `src/game/state.js`

- `createLevelState(level)` → plain object: parsed grid (walls/floor), robot `{x, y, dir}`, goal `{x, y}`, `memory`.
- Pure, DOM-free (must be importable from Node for testing).

### 3. Executor — `src/game/executor.js`

- `createExecutor({ state, program, onEvent })`; methods `start(speed)`, `stop()`, `reset()`.
- Tick machine per design §4: one block per tick; base tick 600 ms; speed ×½ → 1200 ms, ×2 → 300 ms; `start` may be called again after `stop`/terminal event to re-run (reset first).
- Events emitted via `onEvent(type, payload)`: `step` (block index), `moved` ({from, to, dir}), `turned` (new dir), `crashed` ({at, dir}), `goal`, `finished` (program ended short of goal).
- Rules: `move` into wall/out-of-bounds → `crashed`, halt; robot on goal tile after a move → `goal`, halt; program exhausted otherwise → `finished`.
- Pure logic, DOM-free, deterministic.

### 4. Renderer — `src/render/scene.js`

- Canvas 2D, ASCII identity per design §11: floor tiles faint `·`, walls `#` in muted color, goal tile drawn as a small bordered `EXIT` badge (echo of the welcome-screen teaser), robot as an accent-colored facing chevron/arrow with soft glow (`shadowBlur`).
- Tile size ~48 px desktop; canvas sized to grid, letterboxed responsively via CSS; redraw on resize.
- Animate: moves tween between tiles within one tick; turns rotate the chevron; crash → brief shake + accent flash; goal → pulse ring.
- Wait for `document.fonts.ready` before first draw so JetBrains Mono glyphs render correctly.
- `prefers-reduced-motion`: skip shake/tween (instant steps).
- Exposes `render(state)` + `handleEvent(type, payload)` so the executor's events drive animation.

### 5. Editor — `src/ui/palette.js` + `src/ui/editor.js`

- Palette shows the level's unlocked blocks as chips: mono label + glyph (`move ↑`, `turn left ↰`, `turn right ↱`).
- Drag & drop via **Pointer Events** (design §5), not HTML5 DnD: pointerdown on a chip spawns a floating ghost; drop on the program inserts at position; blocks are copies (reusable); program renders exactly `memory` slots; drops beyond capacity are rejected with a brief visual reject flash.
- Click a placed block to remove it; "Clear program" empties it.
- **Program pointer:** on `step` events, highlight the executing block (accent outline/glow); clear highlight on terminal events.
- Editing is always allowed except while running (disable drag during a run; re-enable after).

### 6. HUD — `src/ui/hud.js`

- Run (disabled while running or when program empty), Reset, speed group ×½/×1/×2 (existing markup ids in `#screen-game`).
- Result overlay on terminal events, terminal boot voice (design §11), e.g.:
  - crashed: `> CRASHED — robot met a wall.`
  - finished: `> FELL SHORT — robot stopped before the exit.`
  - goal: `> LEVEL COMPLETE.`
- Overlay actions: Retry (hides overlay, resets robot, **program preserved**), Next level (hidden on last level; loads next from registry).

### 7. Screens — `src/ui/screens.js`

- `showScreen('title' | 'levels' | 'game')` toggling the existing sections.
- Title "Start Game" → levels (replace its current placeholder joke wiring for that button only).
- Levels screen: list chapter-1 levels (name + memory budget, mono styling); click → load level into game screen; "← Title" back.
- Game screen: "← Levels" back (no confirm needed).

### 8. Boot — `src/main.js`

- Wire screens, registry, and the game screen's state/executor/scene/editor/hud into one flow. Keep the welcome-screen ticker/blink wiring intact.

### 9. Game-screen styling — additions to `styles/main.css`

- Use existing tokens only; extend, don't fork.
- `.game-layout`: CSS grid, board left and dominant, side panel right (~340 px); panels on `--surface` with `--border`, radius like existing components.
- Block chips, program slots (empty = dashed border), palette, speed group, overlay: mono text, sans where §11 says sans (overlay headings may be sans), mint accent for active/pointer states.
- Desktop-first (requirements §3.7). No horizontal scroll at 1280×800.

## Self-check before hand-off (report results)

1. **Logic harness (Node, throwaway, do not commit):** import state+executor, run a solving program per level, assert event order ends with `goal`; assert a wall-running program emits `crashed`; assert over-full drops are impossible at the data level.
2. Loads with zero console errors; title → levels → game → play → overlay → retry/next all work.
3. Memory limit enforced in UI; drag & drop with mouse works; click-to-remove works; Clear works.
4. Program pointer highlights the executing block during runs; speed buttons change pace; Reset restores the robot and clears highlight.
5. Crash / fell-short / goal overlays show correct copy; Retry preserves the program.
6. Layout: maze left dominant, editor right; identity consistent with welcome screen (§11).
7. Reduced motion: instant steps, no shake.

## Working rules

- Do **not** run git commands; hand off the working tree for review.
- Do not touch `docs/`, `.gitignore`, `.vercel/`, or the welcome-screen markup/styles beyond what §7–§9 require.
- No dependencies, no build step.
