# LoCo — Level Design

Curriculum, concept progression, and level plan. Status: **DRAFT for joint review** (nothing here is locked until jonas signs off). Feeds the M2 brief; level grids are finalized at implementation and verified by simulation.

## 1. Purpose

Requirements §7 left two things to level design: the exact level count and the difficulty curve per chapter. This doc defines both, plus the mechanics the next chapters need (loops first — the memory budget is what forces players to *discover* them, per requirements §1).

## 2. Curriculum map

| Chapter | Concept | New blocks | Status |
|---|---|---|---|
| 1 — Sequence | Programs run top to bottom; turns are relative | `move`, `turn left`, `turn right` | Shipped (7 levels, ch1-01..07) |
| 2 — Loops | Repetition as compression; when to count, when to sense | `repeat n`, `while front clear`, `end` | **This doc** |
| 3 — Decisions | Conditionals + sensors | `if`/`if-else`, sensor conditions | Later (requirements §5, Update 3) |
| 4 — Mastery | Everything combined + memory upgrades as collectibles | — | Later |

Re-scope note: design.md §8 planned M2 as "10–15 levels, move/turn only" with loops in M3. Since chapter 1 already has its full difficulty arc (7 levels), the proposal here folds loops into the next milestone instead of padding chapter 1 — see decision D1.

**Pending rework (decided 2026-09-05, deferred — not built).** `repeat` is to be renamed `loop`, and `while front clear` is to leave chapter 2 entirely: chapter 2 becomes the *counted-loops* chapter, and the sensing half returns in chapter 3 as `loop until <condition>` backed by a robot sensor. Tracked in issue **#16** (rename + chapter-2 rework, including ch2-05/ch2-06 which become unsolvable without `while`) and **#17** (chapter-3 conditions). §3.1 and the Part B levels below describe what is **shipped today** — do not design new chapter-2 content around `while front clear` without reading those two issues first.

## 3. Loop mechanics (proposal)

### 3.1 Blocks

- `repeat n` … `end` — counted loop. Body = the lines between `repeat n` and its matching `end`. Nesting allowed (each `end` closes the nearest open loop).
- `while front clear` … `end` — conditional loop. "Front clear" = the tile ahead is inside the maze and not a wall. (More conditions arrive with Update 3 sensors.)
- Both loops halt the whole run the moment the robot reaches the goal — a win interrupts any loop.

Why counted *and* conditional: they teach different instincts. `repeat n` = "I know how many"; `while front clear` = "I know when to stop". Chapter 2 teaches them in that order, then mixes them.

### 3.2 Setting `n` without typing

One `repeat` block in the palette; once placed, the block shows the number with small **+ / −** steppers (default 2, max 99). No keyboard needed. (Decision D3.)

### 3.3 Executor behavior

- Programs are still flat lists of lines; at run start the executor validates balance (every `repeat`/`while` has a matching `end`). Unbalanced → run refused with a terminal-voice message (`syntax error: unmatched end`), program preserved.
- The program pointer keeps working unchanged: `step` events fire for every executed line, so body lines re-highlight on each iteration and the `repeat`/`while`/`end` lines light up as they're passed.
- **Runaway guard:** a step cap (proposed: 200 ticks) ends an infinite loop with a friendly message instead of spinning forever (`robot got dizzy — run stopped`).

### 3.4 Editor

Palette unlocks stay per-level via the existing `blocks` array (new ids: `repeat`, `whileFrontClear`, `end`). Nothing else about drag & drop changes.

## 4. Chapter 2 level plan — "Loops" (9 levels)

Design rules for the chapter:

- **R1:** every level's memory is *smaller* than the shortest loop-free solution — brute force is impossible by construction.
- **R2:** par = intended loop solution size; memory = par (exact fit), except the first level of each half gets +1 slack.
- **R3:** grids may grow beyond M1's 9×7 cap where a level needs length — that's the point of loops (decision D4). Renderer already letterboxes.

### Part A — `repeat n` (the compression moment)

| # | id / name | Concept | Shape | Linear min → par / memory |
|---|---|---|---|---|
| 1 | ch2-01 **The Long Haul** | First `repeat`: one straight corridor, 14 moves, 3 slots — brute force visibly impossible | ~16×3 corridor | 14 → 3 / 3 |
| 2 | ch2-02 **Staircase** | Multi-command body: `repeat 4 { move, turnRight, move, turnLeft }` | diagonal stairs | 16 → 6 / 6 |
| 3 | ch2-03 **Square Dance** | Loop *plus* tail code: three sides of a square by loop, last side by hand | square island | 14 → 7 / 7 |
| 4 | ch2-04 **The Stairwell** | Nested loops: `repeat 3 { repeat 3 { move }, turnRight }` — box path, goal at the closing corner | 5×5 box ring | 12 → 6 / 6 |

### Part B — `while front clear` (looping on the world)

| # | id / name | Concept | Shape | Linear min → par / memory |
|---|---|---|---|---|
| 5 | ch2-05 **Cruise Control** | First `while`: long corridor, goal right before the end wall — win interrupts the loop | ~12×3 corridor | 10 → 3 / 4 |
| 6 | ch2-06 **Two Halls** | Two `while` segments joined by a fixed turn | L-bend, long arms | 12 → 7 / 7 |
| 7 | ch2-07 **Mind the Junction** | Choosing the right loop: `while` would overshoot a T-junction, so the approach is counted (`repeat`), the exit is sensed (`while`) | T-junction | 11 → 8 / 8 |
| 8 | ch2-08 **Home Stretch** | Capstone, mixed: `while` corridor → `repeat` square lap → `while` corridor | compound | 20+ → 10 / 10 |
| 9 | ch2-09 *(spare slot)* | Optional extra if play-test pacing wants one more beat | — | — |

(Counts are tunable — if play-testing shows one level redundant, drop it; target for v0.1 stays ~15 levels total.)

### Level-intent sketches (final grids built at implementation)

```
The Long Haul (16×3)             Cruise Control (12×3)
##################               ##############
#S.............G##  repeat 14    #S.........G##  while front clear
##################   { move }    ##############   { move }
```

```
The Stairwell (nested)           Square Dance
######                           #######
#S...#   repeat 3 {              #S....#   repeat 3 { move x3,
#...##     repeat 3 { move }     #....##     turnRight }
#..G.#     turnRight             #..G..#   then move x2 to G
######   }                       #######
```

## 5. Difficulty & memory curve policy

- Chapter 1 (shipped): shapes ramp, memory shrinks 8 → 5, then the exact-fit ramp 5 → 12 proves "sequence alone gets expensive".
- Chapter 2: memory *resets small* (3–4) and grows to ~10 — the constraint is now "express it compactly", not "write it all out".
- Slack policy: +1 slot on the first level of each new concept (soft onboarding), exact fit after.
- Later chapters: difficulty via maze ambiguity (forks, sensors needed) + mixed concepts, not just longer programs.

## 6. Milestone scope this implies (for the M2 brief)

1. Executor: loop parsing/validation, step events per executed line, runaway guard.
2. Editor/palette: `repeat` block with +/− steppers, `while` + `end` blocks.
3. Nine chapter-2 levels (grids verified by simulation before commit, as with PR #10).
4. Persistence (`localStorage['loco.progress.v1']`) + level-select completion marks — carried over from the original M2 plan.
5. Level-select polish for 16 levels (chapter grouping).

## 7. Decisions needed (jonas)

| # | Question | Recommendation |
|---|---|---|
| D1 | Fold loops into the next milestone instead of more move/turn levels? (changes design.md §8 table) | **Yes** — chapter 1's arc is complete |
| D2 | Teach `repeat n` first, then `while front clear`? (requirements §3.3 only names `while`) | **Yes**, in one "Loops" chapter |
| D3 | `repeat` count via +/− steppers on the placed block? | **Yes** (no typing) |
| D4 | Allow grids up to ~16×9 from chapter 2 on? | **Yes** |
| D5 | Pull **program-as-lines** (issue #9) into this milestone? Loops read best as numbered mono lines (`04   move` indented inside `03 repeat 4`) — big identity payoff, but adds editor rework to the milestone | **Yes, but your call** — defensible either way |
| D6 | Runaway guard at 200 ticks with friendly message? | **Yes** |
| D7 | Chapter 2 = 8–9 levels, v0.1 total ≈ 15–16? | **Yes** |

## 8. Risks / watch-items

- `while` + fully visible mazes: "sensing" feels less magical when you can just count the tiles — mitigate by making while-level corridors long enough that counting is a chore, and by levels like Mind the Junction where the *choice* of loop is the puzzle.
- Nested loops + flat drag & drop: indentation hints (visual nesting) may be needed for readability — connects directly to D5.
- 12-slot programs already stretched the M1 editor layout; lines-mode (D5) must stay comfortable at ~10–12 lines.
