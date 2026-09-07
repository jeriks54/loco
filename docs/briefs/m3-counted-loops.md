# M3 brief — Counted loops (#16)

Jonas approved the combined rename and chapter-2 redesign on 2026-09-06.
Branch: `feat/m3-counted-loops`. Deliver a reviewed PR and Vercel preview for
play-testing; production merge still waits for Jonas' explicit approval.

## Purpose and scope

Chapter 2 teaches counted repetition. Rename `repeat` to `loop` throughout the
runtime and replace ch2-05..08 with counted-loop exercises. Chapter 3 will introduce
sensing separately. Keep all seven chapter-1 levels and the first four chapter-2
grids, directions, memories and pars unchanged. Keep 15 level IDs, in the same order.

The new second-half level contracts were recorded in `docs/level-design.md` §4
before the level-data task started. Intended solutions must run in the real executor,
fit the palette and memory, and beat the shortest loop-free program. Par describes
the intended solution, not a claim of global optimality among every loop program.

## Runtime contract

- Simple entries remain `move`, `turnLeft`, `turnRight`, `end` strings.
- Counted entries are `{ id: 'loop', count }`; default 2, integer 1..99.
- Export `LOOP_MIN = 1` and `LOOP_MAX = 99` from the executor.
- Remove `repeat` and `whileFrontClear` runtime support, including their palette
  definitions and conditional-loop execution branch. No compatibility aliases:
  programs are not persisted.
- Preserve nested counted-loop semantics, balance validation, per-line `step`
  events, immediate victory on entering the goal, speed controls and 200-tick guard.
- Editor count steppers, drag/tap-to-add, removal, memory limit and running lock
  keep their behaviour. Rename `.repeat-count` to `.loop-count` in markup and CSS;
  accessibility labels say "loop count".
- No new dependencies, build system, scoring, sensors, tiles or layout changes.
- Preserve stored completion IDs, including the redesigned levels. Existing
  completions remain visible; players can replay any level from the level list.
- The independently discovered re-run and unavailable-storage bugs are separate
  work; this milestone does not change their wiring.

## Delegation and ownership

Agents do not run git. The manager reviews every diff and runs verification.

1. Executor task: `src/game/executor.js` only.
2. Editor task: `src/ui/editor.js`, `src/ui/palette.js`; one matching CSS selector
   and its comment in `styles/main.css`. Do not alter any layout or style values.
3. Level-data task: `src/levels/chapter2.js` only, from the verified §4 contracts.
4. Manager: design, current documentation, retained independent checks, browser
   integration review, commits and PR. Historical M1/M2/M4 briefs stay historical.

## Verification and acceptance

Keep dependency-free Node checks under `tests/` so future level work can rerun them.

- Parse all levels; check unique IDs, grid shape and valid palettes.
- Run every chapter-1 shortest palette-restricted solution and all eight chapter-2
  intended solutions against the actual executor.
- Independently BFS over `(x, y, facing)` with only each level's move/turn palette.
  Every chapter-2 loop-free minimum must exceed its memory. This proves a loop is
  necessary; it does not prove a particular nesting structure is necessary.
- Check representative wrong counts / loop scopes for the redesigned levels.
- Check nested loops, zero movement on syntax errors, count bounds/default,
  early victory, snapshot isolation, reset/restart and the runaway guard.
- Browser: palette says `loop`; counts default to 2 and steppers work; loop lines
  indent, highlights advance, editing locks during execution, solutions win.
- Desktop and narrow/mobile sheet still display and operate correctly, especially
  the capstone's program length and the widest board. No console errors.
- Search runtime code for obsolete block identifiers. Leave CSS's unrelated
  `background-repeat` untouched.

PR includes the measured results and a short human play-test checklist. The preview
is the place to judge whether each repeated pattern is discoverable and the second
half feels like a progression rather than four counting drills.

## Review results — 2026-09-07

- Manager reviewed the executor, editor/palette, level and documentation deliveries.
  Runtime change scope is the rename, conditional-loop removal and four replacement
  levels. CSS changes only the count selector and its comment.
- `node tests/verify.mjs` passes: 13 module syntax checks, all 15 independent paths,
  eight intended loop solutions within palette/memory, and executor regression checks.
- BFS corrected the old Square Dance linear-minimum comment from 12 to 13;
  its grid and budget are unchanged. Part A and chapter 1 match baseline hashes.
- `node tests/browser.mjs` passes in headless Chrome: all eight loop levels through
  desktop 1280px and touch 390px editor-to-win flows, drag insertion, click removal,
  count steppers, indentation, capacity, running lock/highlight, retry preservation
  and completion marks. The 16-wide capstone fits at 280/320/360/390/900/901/1280px.
- Manager inspected desktop/mobile capstone screenshots. Browser checks use offline
  fallback fonts, reduced motion and accelerated tick timers. Real device animation,
  downloaded-font appearance and puzzle enjoyment remain the human play-test gate.

### Preview play-test

1. Replay Double Step and Beyond the Pattern: does the changed tail make the loop
   boundary discoverable without reading the solution?
2. Try The Return Trip and Giant Steps: are nested loops understandable, and do the
   10- and 9-line budgets feel fair? Which level feels too repetitive or too abrupt?
3. On your phone, tap/drag blocks, adjust counts, Run, Reset mid-run and Retry.
   Confirm that the sheet and program remain comfortable to use.
4. Reopen the level list: previous completion marks should remain, and the four new
   names should appear at the same chapter positions.
