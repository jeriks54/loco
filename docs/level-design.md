# LoCo — Level Design

Curriculum, concept progression, and level plan. Status: **DRAFT for joint review** (nothing here is locked until jonas signs off). §3–§7 fed the M2 brief and describe what shipped; **§9–§10 are the chapter 3–5 proposal feeding the M3 brief** (decisions D8–D12). Level grids are finalized at implementation and verified by simulation.

## 1. Purpose

Requirements §7 left two things to level design: the exact level count and the difficulty curve per chapter. This doc defines both, plus the mechanics the next chapters need (loops first — the memory budget is what forces players to *discover* them, per requirements §1).

## 2. Curriculum map

| Chapter | Concept | New blocks | Status |
|---|---|---|---|
| 1 — Sequence | Programs run top to bottom; turns are relative | `move`, `turn left`, `turn right` | Shipped (7 levels, ch1-01..07) |
| 2 — Loops | Repetition as compression; when to count, when to sense | `repeat n`, `while front clear`, `end` | Shipped (8 levels, ch2-01..08) — **rework pending, #16**: becomes counted-loops only (`loop n`, `end`) |
| 3 — Sensing | Conditional loops on the world; the robot reads a sensor; **holes** as the first hazard tile | `loop until <direction> <predicate>` | Planned — #17 + #19 (4 levels designed, §10) |
| 4 — Decisions | Branching on the same conditions | `if` (+ `else`?) | Planned — #18 |
| 5 — Mastery | Everything combined, **ladders + `climb`**, memory upgrades as collectibles | `climb` | Later — #19 |

Re-ordered 2026-09-05 (jonas): sensing was chapter 3 *and* chapter 4 was Mastery in the original map, with `if` bundled into "Decisions" alongside sensors. Split — chapter 3 now introduces the condition/sensor vocabulary inside a loop, chapter 4 reuses that same vocabulary for branching, and Mastery moves to chapter 5. Rationale: a wrong condition in `loop until` fails loudly (robot drives into a wall), so it is the cheaper place to learn the vocabulary that `if` then depends on.

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
| D8 | Ladders: automatic on step-on, or an explicit `climb` command? | **Decided 2026-09-05: explicit `climb`** — ladder tiles walkable, ladders deferred to chapter 5. Keeps `move` = one tile forward and makes the ladder memory pressure rather than a maze gimmick |
| D9 | Condition fields: one flat list, or direction + predicate? | **Decided 2026-09-05: two fields** — 3 directions × 4 predicates = 12 conditions from two steppers, and with ladders deferred nothing needs a non-directional special case |
| D10 | Chapter 3 scope: sensing only, sensing + holes, or sensing + holes + ladders? | **Decided 2026-09-05: sensing + holes** — one new tile and one new idea per chapter |
| D11 | Directions global, predicates gated per level by a new `predicates` array? | **Decided 2026-09-05: yes** — otherwise `is a hole` is on offer before any hole exists, which is noise and a spoiler |
| D12 | Holes always fatal, or sometimes recoverable? | **Decided 2026-09-05: always fatal** — one fail verb keeps the outcome legible; a recoverable hole needs a new state, message and FX for little teaching value |
| D13 | Chapter 3 uses only the `front` direction; `left`/`right` arrive with `if` in chapter 4? | **Decided 2026-09-05: yes** — without branching there is no clean way to *act* on a side reading. Chapter 4 therefore adds a block but no new UI. See §9.6 |
| D14 | Chapter 3 ships at 4 levels rather than the 6 originally sketched? | **Decided 2026-09-05: yes** — beats 5 and 6 both need a fork, and a fork needs `left`/`right`, which D13 defers. They move to chapter 4. See §10 |

## 8. Risks / watch-items

- `while` + fully visible mazes: "sensing" feels less magical when you can just count the tiles — mitigate by making while-level corridors long enough that counting is a chore, and by levels like Mind the Junction where the *choice* of loop is the puzzle. **Sharper form, found while designing §10:** `loop n { move } end` is three lines for *any* straight distance, so in a fully visible maze sensing can never be *forced* by the memory budget — only taught. Both ch3-03 and ch3-04 are solvable by counting at the same line cost as sensing. Holes change the argument rather than the arithmetic: a miscount into a hole is fatal, so sensing becomes the **robust** choice instead of the **shorter** one. Chapter 3 should sell sensing on safety, not compression.
- Nested loops + flat drag & drop: indentation hints (visual nesting) may be needed for readability — connects directly to D5.
- 12-slot programs already stretched the M1 editor layout; lines-mode (D5) must stay comfortable at ~10–12 lines.

Chapter 3–5 watch-items (added 2026-09-05):

- **Two-field condition lines vs mobile width** (§9.4): ~33 mono characters against ~300px of usable sheet width at a 360px viewport. Depends on #15 landing first — verify against the real expanded sheet before locking the copy.
- **Three-valued sensing will read as a bug until it is taught.** `front is blocked` returning false at a hole looks like the game is wrong. §10 beat 3 exists purely to demonstrate it.
- **`is clear` must mean *safe to enter* everywhere** — executor, sensor and copy. Define it once in #19 and never let a level author assume it means merely "not a wall".
- **Verification tooling gap:** the reachability search must treat holes as impassable *for solvability* while the executor treats them as fatal *on entry*. Conflating the two ships a level that is only solvable by dying.
- **Predicate gating vs experimentation:** gating keeps onboarding clean but means players never discover condition combinations on their own. Accept for now; revisit if it starts to feel hand-holdy.

## 9. Chapter 3–5 mechanics (proposal — D8–D12)

### 9.1 Tile types (#19)

The grid vocabulary is four characters today and `state.js` **throws** on anything else. Extend it:

| char | tile | enterable | effect on entry | sensor reads |
|---|---|---|---|---|
| `#` | wall | no | `move` into it = crash | `is blocked` |
| `.` | floor | yes | none | `is clear` |
| `S` | start | yes | none | `is clear` |
| `G` | goal | yes | win, halts the run | `is goal`, and also `is clear` |
| `H` | **hole** (ch3) | yes | **new terminal outcome `fell`** | `is a hole` — and **not** `is blocked`, **not** `is clear` |
| *TBC* | ladder (ch5, deferred) | yes | none until `climb` | open — needs a non-directional reading (`on a ladder`), so a `here` direction or a special case |

**Three-valued sensing is deliberate.** With a hole ahead, `front is blocked` is false *and* `front is clear` is false, because `is clear` means safe to enter, not merely enterable. So `loop until front is blocked` drives the robot straight into a hole — that is the lesson, and it fails loudly. Chapter 3 must contain a level demonstrating exactly this (§10 beat 3).

Semantics are the contract; representation is #19's call. Keep `isBlocked()` meaning "cannot enter" (walls + out of bounds) and add a separate entry-effect step, so a hole is entered and *then* fatal. `fell` joins `crashed` / `finished` / `goal` / `syntax` / `runaway` as a terminal outcome with its own terminal-voice copy in `hud.js` (proposed: `> FELL — robot dropped into a hole.`) and its own FX, distinct from the wall-crash shake. Ladder pairing stays open with #19; holes need none.

### 9.2 Condition model (#17, #18)

Two fields on the block (D9):

- **Direction** — `front` / `left` / `right`, relative to the robot's facing. Global: all three always available.
- **Predicate** — `is blocked` / `is clear` / `is a hole` / `is goal`. **Gated per level** by a new `predicates` array parallel to the existing `blocks` array (D11).

Evaluated against the tile one step in the given direction; out of bounds counts as `is blocked`.

- **`loop until <direction> <predicate>` … `end`** — the body repeats *until* the condition becomes true. Checked on entry and re-checked after each iteration. `until` keeps its literal sense (#17): the corridor level is `loop until front is blocked`, which reproduces the old `while front clear` behaviour with inverted spelling.
- **`if <direction> <predicate>` … `end`** (chapter 4) — the **same** field pair and the same evaluation, consumed by a branching block. That is the concrete answer to "design the condition layer once": one mechanism, two control blocks. `else` remains open (#18).
- `whileFrontClear` does not carry over — deleted with #16, not aliased.
- The existing 200-tick runaway guard covers a non-terminating `loop until` unchanged.

### 9.3 `climb` (chapter 5, deferred)

Per D8, ladders are **not** automatic: a ladder tile is walkable and safe to stand on, and `climb` is a command that costs a memory slot and transports the robot to the paired tile.

Open, to settle with #19 before chapter 5: pairing representation; whether `climb` preserves facing; whether it consumes a tick and fires a `step` event (the program pointer depends on `step`); what happens when `climb` runs off a ladder (lean: a terminal fail in the same voice as `syntax`/`runaway`, not a silent no-op); whether chained ladders can loop.

### 9.4 Editor and lines mode

- A condition line renders as `loop until` plus two steppers — `03  loop until [front] [is blocked]` — body indented, closed by `end`. `lineDepths()` in `editor.js` already indents after a loop opener and dedents on `end`; `loop until` and `if` join `repeat` in that rule.
- Steppers reuse the `repeat` count idiom (± buttons, no typing), two per condition line.
- **Width is the known risk:** ~33 mono characters ≈ 260px at 0.78rem against ~300px usable at a 360px viewport (#15). It fits flat, but nested bodies indent further. Mitigations in order: drop the `is` (`loop until front blocked`), then cap mobile indentation at 2ch per depth. Verify against #15's expanded sheet before locking copy.
- Balance validation (§3.3) extends to `loop until` and `if`: every opener needs a matching `end`.

### 9.5 Level format additions

- `predicates: [...]` — which predicates the stepper offers (D11). Optional; the 15 shipped levels are unaffected because they have no condition blocks at all.
- `H` in `grid` strings for holes. `state.js` must keep accepting grids with no `H`.
- `blocks` gains `loopUntil` (ch3) and `if` (ch4); `end` already exists.

### 9.6 Chapter 3 uses `front` only

Chapter 3 gates predicates (D11) but every level senses `front`. `left` and `right` exist in the UI from day one via D9's two-field design, yet no chapter-3 level gives a reason to use them: **without branching there is no clean way to act on a side reading.** `loop until left is clear` is a construct that only makes sense once `if` exists.

So chapter 4 is where the direction stepper wakes up. That is a deliberate benefit of choosing two fields: the direction control is already on screen and already understood when it starts to matter, so chapter 4 adds a new block but **no new UI**. The cost is a stepper that only ever reads `front` for one chapter — accepted, and the reason D13 exists.

## 10. Chapter 3 level plan — "Sensing"

Rules inherited from §4: **R1** memory smaller than the loop-free minimum; **R2** par = intended solution, memory = par except the first level of each half gets +1; **R3** grids ≤ 16×9.

### Part A — `loop until` on walls

| # | id / name | Concept | blocks | predicates | grid | loop-free min → par / memory |
|---|---|---|---|---|---|---|
| 1 | ch3-01 **Cruise Control** | First `loop until`: long corridor, goal immediately before the end wall so the win interrupts the loop. The old ch2-05 reborn with honest spelling | move, loopUntil, end | isBlocked | 12×3 | 9 → 3 / 4 |
| 2 | ch3-02 **Two Halls** | Two sensed segments joined by one turn | + turnLeft, turnRight | isBlocked | 14×8 | 17 → 7 / 7 |

### Part B — holes

| # | id / name | Concept | blocks | predicates | grid | loop-free min → par / memory |
|---|---|---|---|---|---|---|
| 3 | ch3-03 **Mind the Gap** | **The trap (§10 beat 3, the level §9.1 requires).** The goal is up a side branch and the corridor continues into a hole. `loop until front is blocked` walks the robot in, because a hole is not a wall. The intended solution *counts* the approach (`loop 7`) and senses only the branch | move, turns, loop, loopUntil, end | isBlocked | 16×5 | 10 → 7 / 8 |
| 4 | ch3-04 **Safe Passage** | First `is a hole` sensing: `loop until front is a hole` stops exactly at the turn, where a counted approach would have to be precise to the tile | move, turns, loopUntil, end | isBlocked, isHole | 16×6 | 13 → 7 / 7 |

```
ch3-01 Cruise Control (12x3)      ch3-03 Mind the Gap (16x5)
############                      ################
#S........G#                      ########G#######
############                      ########.#######
                                  #S............H#
ch3-02 Two Halls (14x8)           ################
##############
#S...........#                    ch3-04 Safe Passage (16x6)
############.#                    ################
############.#                    #S.........H...#
############.#                    ##########.#####
############.#                    ##########.#####
############G#                    ##########G#####
##############                    ################
```

**ch3-03 depends on #16** — it uses `loop`, the renamed `repeat`. Chapter 3 cannot ship before the rename lands.

### Verification status (2026-09-05)

All four grids verified with a throwaway node harness, deleted afterwards, checking: rectangular rows, solid wall border, exactly one `S` and one `G`, no characters outside the §9.1 vocabulary, the 16×9 cap, the **loop-free minimum** by BFS over `(x, y, dir)` counting moves *and* turns with holes impassable, each **intended solution** reaching the goal, and the **trap** outcome. Results: R1 holds on all four, all four intended solutions reach the goal, and the naive `loop until front is blocked` program returns `fell` on ch3-03 and ch3-04 exactly as designed — beat 3 is proven to fire.

Two honesty notes. The first harness run caught a real design bug: ch3-04 originally placed the hole on the only descent column, making the goal unreachable. The second note matters more: **the harness simulated the §9 proposal, not the shipped executor.** Holes and `loop until` do not exist in the code yet, so this validates the design, not the game. All four levels must be re-verified against the real executor once #19 and #17 land, and per the M2 review gate that re-verification is not optional and self-reports are not accepted.

### Chapter length: 4 levels (D14)

Chapter 3 ships at **four levels**, not the six originally sketched. Beats 5 and 6 — a mixed level where the *choice* between counted and sensed is the puzzle, and a capstone combining holes and walls — both want a fork, and a fork needs `left`/`right`, which §9.6 defers to chapter 4. Designing them anyway would mean working around our own constraint, so **both beats move to chapter 4**, where the direction field is live and `if` can make the choice meaningful. Chapter 4's plan (not yet written) should pick them up.

Memory across the chapter: 4 → 7 → 8 → 7. The bump at ch3-03 is R2's +1 slack for the first level of the hole half, not a curve — same pattern chapter 2 uses.
