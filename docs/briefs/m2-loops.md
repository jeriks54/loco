# M2 Brief — Loops (v0.1)

Implements `docs/level-design.md` (approved 2026-08-26). Issues: #11 (task A), #12 (task B), #13 (task C).

**Team rules (all tasks):** vanilla HTML/CSS/JS, zero dependencies, zero build step. Desktop-first, mouse input. Visual voice per design.md §11 (JetBrains Mono for terminal elements, mint accent via existing CSS custom properties, honor `prefers-reduced-motion`). **Agents never run git** — the team manager reviews and commits every delivery.

## Shared contracts

- **Block ids:** `'move'`, `'turnLeft'`, `'turnRight'`, `'repeat'`, `'whileFrontClear'`, `'end'`.
- **Program entries:** plain strings for simple blocks; `{ id: 'repeat', count }` for repeat. `count` integer, 1..99, default 2. `whileFrontClear` and `end` are plain strings.
- **Semantics:**
  - Loop body = the entries between the loop line and its matching `end`; nesting allowed — each `end` closes the nearest open loop.
  - `whileFrontClear`: the tile one step ahead in the facing direction is in bounds and not `#`. Checked on entry and re-checked after each iteration.
  - Reaching the goal halts the run immediately (win), even mid-loop. `move` into a wall / out of bounds = crash (unchanged).
  - **Validation before running:** unmatched `end`, unclosed loop, or `end` with no open loop → refuse the run; show a terminal-voice message (proposed: `syntax error: unmatched end`); program preserved.
  - **Runaway guard:** 200 executed ticks → halt with a terminal-voice message (proposed: `robot got dizzy — run stopped`); counts as a failed run (retry, program preserved).
- **Levels:** the level's `blocks` array lists the palette ids available (existing mechanism). Chapter-2 part A levels offer `['move', 'turnLeft', 'turnRight', 'repeat', 'end']`; part B levels add `'whileFrontClear'`.

## Task A — loop mechanics + lines-mode editor (issue #11)

**Owned files:** `src/game/executor.js`, `src/ui/editor.js`, `src/ui/palette.js`, `src/ui/hud.js`, `styles/main.css`; minimal wiring changes in `src/main.js` / `src/game/state.js` only where required.

Executor:
- Validate balance first, then run the tick machine with an instruction pointer + loop-frame stack.
- `step` events fire for **every executed line index**, including control lines (`repeat` / `whileFrontClear` / `end`) and revisits on each iteration — the program pointer must keep working unchanged.
- New terminal outcomes for invalid-program and runaway; existing `crashed` / `goal` / finished behavior unchanged.

Editor — **program-as-lines** (resolves the program-as-lines half of issue #9):
- The program renders as **numbered mono lines** (`01`, `02`, …) in JetBrains Mono; one line per memory slot. Empty slots render as dim placeholder lines.
- Lines inside loops are indented (per nesting depth) so structure reads like code.
- The executing line is highlighted (mint accent), driven by `step` events.
- Tokens render lowercase, terminal voice: `move`, `turn left`, `turn right`, `repeat 4`, `while front clear`, `end`.
- The `repeat` line shows its count with small **+ / − steppers** (1..99) — no typing. Steppers inert while a run is in progress.
- Drag & drop stays Pointer-Events based: dragging from the palette inserts a line at the drop position; over-capacity drops rejected; click a placed line to remove it; Clear button preserved. Editing locked while running (keep the existing policy).
- Must stay comfortable at 12+ lines (chapter-1 finale) — no fixed heights that clip.

Palette: add `repeat`, `while front clear`, `end` as mono code-token chips, styled consistently with existing blocks.

HUD: wire the two new result messages (wording above or better, same voice).

**Acceptance checklist A:**
1. Balanced loop programs execute correctly (counted + while, nested).
2. `step` highlight visits body lines on every iteration and the control lines.
3. Unbalanced program → refused with message, program preserved.
4. Infinite `while` → dizzy-stop at 200 ticks, program preserved.
5. Goal reached mid-loop wins immediately.
6. Repeat count editable via steppers 1..99; changes reflected on next run.
7. Lines render numbered + indented; no clipping at 12 lines; reduced-motion respected.
8. No console errors; existing chapter-1 levels still play identically.

## Task B — chapter-2 level pack (issue #12)

**Owned files:** `src/levels/chapter2.js` (new), `src/levels/index.js` (append chapter).

Build the eight levels from `level-design.md` §4. Grids are finalized here; **verify every level by simulation before hand-off** (throwaway node script using the shared-contract semantics; delete the script afterwards). Grids ≤ 16×9, wall-bordered, exactly one `S`/`G`, `startDir` sensible. Follow `chapter1.js` file conventions (header banner with per-level table, `par` comments describing the solution).

| id | name | concept | blocks | par / memory | verification criteria |
|---|---|---|---|---|---|
| ch2-01 | The Long Haul | first `repeat` | move, repeat, end | 3 / 3 | straight corridor ≥ 14 moves; linear min ≥ 14; solution `repeat 14, move, end` (adjust to actual length) |
| ch2-02 | Staircase | multi-command body | + turnLeft, turnRight | 6 / 6 | ≥ 4 stair steps; solution `repeat 4 { move, turnRight, move, turnLeft }`; linear min ≥ 16 |
| ch2-03 | Square Dance | loop + tail code | + turns | 7 / 7 | square ring; 3 sides by `repeat`, last side by flat moves; linear min ≥ 14 |
| ch2-04 | The Stairwell | nested loops | + turns | 6 / 6 | solution `repeat 3 { repeat 3 { move }, turnRight }`; goal at closing corner; linear min ≥ 12 |
| ch2-05 | Cruise Control | first `while` | move, whileFrontClear, end | 3 / 4 | corridor ≥ 10 long; goal immediately before the end wall so the win interrupts the loop; must NOT be solvable without the loop in ≤ 4 blocks |
| ch2-06 | Two Halls | two sensed segments + fixed turn | + turnLeft, turnRight | 7 / 7 | two `while` runs joined by one turn; both arms long; linear min ≥ 12 |
| ch2-07 | Mind the Junction | choosing the right loop | all six blocks | 8 / 8 | T-junction: intended solution = counted approach (`repeat`) + sensed exit (`while`); **simulate and show that a while-based approach fails** (overshoots into a dead end / falls short) |
| ch2-08 | Home Stretch | capstone, mixed | all six blocks | 10 / 10 | `while` corridor → `repeat` lap or counted section → `while` corridor; linear min ≥ 20 |

Additionally for every level: no loop-free solution fits in the memory budget (rule R1); `par` equals the intended solution's length; solution uses only the level's offered blocks.

**Report:** per level — final grid, solution program, simulation result, plus the ch2-07 trap demonstration.

## Task C — persistence + level-select polish (issue #13)

**Owned files:** `src/persist.js` (new), `src/ui/screens.js`, minimal `src/main.js` wiring, `styles/main.css` as needed.

- `localStorage['loco.progress.v1'] = { completed: ['ch1-01', ...] }` (design.md §7). Save on goal; tolerate missing/corrupt storage silently.
- Level list gains **chapter grouping** (mono chapter headers, terminal voice, e.g. `CHAPTER 1 — SEQUENCE` / `CHAPTER 2 — LOOPS`) and a completion mark per level (accent `✓` or equivalent), preserving click-to-play.
- No other behavior changes. Starts after task A lands (both may touch `main.js`).

## Out of scope

`if` / sensors, memory upgrades, sound, mobile layout, scoring. No new dependencies. No test frameworks (verify via simulation scripts + review).

## Definition of done (milestone)

A + B + C reviewed and committed on `feat/m2-loops`; checklists pass; PR with Vercel preview + acceptance checklist handed to jonas for play-test.
