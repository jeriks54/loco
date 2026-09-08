# LoCo — Level Design

Curriculum, concept progression, and level plan. Chapter 2’s counted-loop redesign (§3–§6) was play-tested and merged in PR #21 on 2026-09-07 (#16). Sections 9–10 describe future chapters with recorded decisions D8–D14. The #19 infrastructure brief, `briefs/m5-tile-types.md`, was approved for implementation on 2026-09-07; new chapter implementation remains deferred. Historical M2 intent is preserved in its brief.

## 1. Purpose

Requirements §7 left two things to level design: the exact level count and the difficulty curve per chapter. This doc defines both, plus the mechanics the next chapters need (loops first — the memory budget is what forces players to *discover* them, per requirements §1).

## 2. Curriculum map

| Chapter | Concept | New blocks | Status |
|---|---|---|---|
| 1 — Sequence | Programs run top to bottom; turns are relative | `move`, `turn left`, `turn right` | Shipped (7 levels, ch1-01..07) |
| 2 — Loops | Counted repetition as compression | `loop n`, `end` | Shipped (8 levels; #16, PR #21) |
| 3 — Sensing | Conditional loops on the world; the robot reads a sensor; **holes** as the first hazard tile | `loop until <direction> <predicate>` | Planned — #17 + #19 (4 levels designed, §10) |
| 4 — Decisions | Branching on the same conditions | `if` (+ `else`?) | Planned — #18 |
| 5 — Mastery | Everything combined, **ladders + `climb`**, memory upgrades as collectibles | `climb` | Later — #19 |

Re-ordered 2026-09-05 (jonas): sensing was chapter 3 *and* chapter 4 was Mastery in the original map, with `if` bundled into "Decisions" alongside sensors. Split — chapter 3 now introduces the condition/sensor vocabulary inside a loop, chapter 4 reuses that same vocabulary for branching, and Mastery moves to chapter 5. Rationale: a wrong condition in `loop until` fails loudly (robot drives into a wall), so it is the cheaper place to learn the vocabulary that `if` then depends on.

M2 originally introduced counted and sensed loops together. Revision #16 separates them: chapter 2 teaches counting and chapter 3 teaches sensing. The rename and Part B redesign ship together.

## 3. Counted-loop mechanics

- `loop n` … `end` repeats its body n times; loops may nest.
- Counts use ± steppers, default 2, range 1..99; no typing.
- The goal halts the whole program immediately, including inside a loop.
- Flat programs carry strings for simple commands and `{ id: 'loop', count }` for loops.
- Balance is checked before running. Unmatched ends/openers refuse the run without movement.
- Every executed control/body line emits a step event; 200 ticks trigger the runaway outcome.
- The editor renders numbered lines, indents bodies and offers commands per level palette.
- `repeat` and `whileFrontClear` are removed without aliases. No programs are saved,
  so the rename needs no migration. Completion IDs remain unchanged.

## 4. Chapter 2 — counted loops (8 levels; #16)

The combined rename and redesign was approved for implementation on 2026-09-06.
Part A keeps its shipped grids and budgets. Part B replaces all four old sensing
exercises. All level IDs remain stable, including stored completion marks.

Rules: R1 — every loop-free shortest program exceeds memory; R2 — intended par
fits memory, with one spare line at the start of Part B; R3 — each grid fits 16×9.
Every intended solution uses its level's palette. Par is an intended solution size,
not a proof of the shortest possible counted-loop program. Retained verification:
`node tests/verify.mjs` (real executor plus independent palette-restricted BFS).

| id / name | Teaching objective | Grid | Loop-free min → par / memory |
|---|---|---|---|
| ch2-01 The Long Haul | Compress a straight distance | 16×3 | 13 → 3 / 3 |
| ch2-02 Staircase | Repeat a multi-command body | 7×7 | 15 → 6 / 6 |
| ch2-03 Square Dance | A repeated route plus a final move | 6×6 | 13 → 7 / 7 |
| ch2-04 The Stairwell | Explore nested loops around a ring | 9×9 | 7 → 6 / 6 |
| ch2-05 Double Step | Recognise a wider repeated step | 9×6 | 14 → 7 / 8 |
| ch2-06 Beyond the Pattern | End repetition before a mismatching tail | 12×6 | 18 → 10 / 10 |
| ch2-07 The Return Trip | Compose unequal distances inside a repeated turn pattern | 12×8 | 25 → 10 / 10 |
| ch2-08 Giant Steps | Compress a long run inside a repeated movement pattern | 16×9 | 23 → 9 / 9 |

All four replacements start E and offer move, turnLeft, turnRight, loop and end.
Their exact grids and programs are the implementation contract below. M = move,
R = turnRight, L = turnLeft; braces stand for a loop body closed by one end line.

### ch2-05 — Double Step

`loop 3 { M, M, R, M, L } end` — 7 lines, memory 8.

```text
#########
#S..#####
###...###
#####...#
#######G#
#########
```

Three E2/S1 steps. The exit interrupts the final iteration before its last turn.
A count of 1 falls short; counts above 3 can still win. Recognising the body is the
lesson; a unique count is not required. One spare line eases the start of Part B.

### ch2-06 — Beyond the Pattern

`loop 3 { M, M, R, M, L } end; M; M; M` — 10 lines, memory 10.

```text
############
#S..########
###...######
#####...####
#######...G#
############
```

The first three steps match Double Step, but the final eastward tail is three moves.
Keeping it outside the loop matters: increasing the outer count to 4 turns south
before reaching the exit and crashes. A separate loop 3 for the tail is equally
short and valid. The similar opening is intentional so the changed ending stands out.

### ch2-07 — The Return Trip

`loop 2 { loop 9 { M } end; R; loop 5 { M } end; R } end` — 10 lines, memory 10.

```text
############
#S.........#
##########.#
##########.#
##########.#
##########.#
#G.........#
############
```

The U-shaped route is E9/S5/W9. Three separate distance loops and two turns cost
11 lines. Reusing the two-distance pattern fits in 10; the goal interrupts the
second horizontal run. An outer count of 1 falls short. This is nested composition
and early victory, not a claim that arbitrary alternative solutions are impossible.

### ch2-08 — Giant Steps

`loop 3 { loop 4 { M } end; R; M; M; L } end` — 9 lines, memory 9.

```text
################
#S....##########
#####.##########
#####.....######
#########.######
#########.....##
#############.##
#############G##
################
```

Three E4/S2 steps. Replacing the inner loop with four move lines makes this intended
program 10 lines, one too many; nested compression fits. An outer count of 1 falls
short; a horizontal count of 3 crashes at the first turn. This proves the intended
compression works, not that every possible winning program must be nested.

### Verification and teaching limits

On 2026-09-06 the manager ran all four proposed grids against the renamed real
executor: goals at 19, 25, 75 and 55 ticks respectively. Independent BFS gave
14, 18, 25 and 23 as the loop-free minima, all above memory. These checks are
retained and repeated after level-data integration, rather than trusting a report.

The unchanged ch2-04 ring permits a direct southward route: one right turn plus
loop 6 / move / end wins in four lines. Its intended nested solution remains valid,
but this level does not force nesting. No existing Part A geometry is changed in #16.
Play-test Part B for discoverability, pacing and whether the repeated stair shape
still feels varied enough around the U-shaped third exercise.

## 5. Difficulty & memory curve policy

- Chapter 1 (shipped): shapes ramp, memory shrinks 8 → 5, then the exact-fit ramp 5 → 12 proves "sequence alone gets expensive".
- Chapter 2: memory starts at 3, grows through Part A, and reaches 10 in Part B before the 9-line capstone — the constraint is expressing the route compactly.
- Slack policy: the current chapter-2 revision gives +1 at ch2-05; other budgets equal intended par. Future chapters may add slack when introducing a new concept.
- Later chapters: difficulty via maze ambiguity (forks, sensors needed) + mixed concepts, not just longer programs.

## 6. Shipped #16 scope and approved #19 work

PR #21 renamed runtime/editor vocabulary, redesigned ch2-05..08 and retained
independent Node verification plus desktop/mobile checks. See `briefs/m3-counted-loops.md`.
Next, #19 prepares tile lookup, fatal-hole handling and start/hole rendering while
preserving these 15 levels. Its approved contract is `briefs/m5-tile-types.md`.
New chapter-3 puzzles and sensor blocks remain #17; ladders remain chapter 5.

## 7. Decision record (jonas)

| # | Question | Decision / historical outcome |
|---|---|---|
| D1 | Fold loops into the next milestone instead of more move/turn levels? (changes design.md §8 table) | **Yes** — chapter 1's arc is complete |
| D2 | Teach counted then sensed loops together? | M2 did; superseded by #16: counted in chapter 2, sensed in chapter 3 |
| D3 | Count via +/− steppers on the placed block? | **Yes** (no typing); historical `repeat` is now `loop` |
| D4 | Allow grids up to ~16×9 from chapter 2 on? | **Yes** |
| D5 | Pull **program-as-lines** (issue #9) into M2? | Shipped: numbered lines and indented loop bodies; retained with `loop` vocabulary |
| D6 | Runaway guard at 200 ticks with friendly message? | **Yes** |
| D7 | Chapter 2 = 8–9 levels, v0.1 total ≈ 15–16? | Shipped at 8 chapter-2 levels, 15 total; #16 preserves these IDs |
| D8 | Ladders: automatic on step-on, or an explicit `climb` command? | **Decided 2026-09-05: explicit `climb`** — ladder tiles walkable, ladders deferred to chapter 5. Keeps `move` = one tile forward and makes the ladder memory pressure rather than a maze gimmick |
| D9 | Condition fields: one flat list, or direction + predicate? | **Decided 2026-09-05: two fields** — 3 directions × 4 predicates = 12 conditions from two steppers, and with ladders deferred nothing needs a non-directional special case |
| D10 | Chapter 3 scope: sensing only, sensing + holes, or sensing + holes + ladders? | **Decided 2026-09-05: sensing + holes** — one new tile and one new idea per chapter |
| D11 | Directions global, predicates gated per level by a new `predicates` array? | **Decided 2026-09-05: yes** — otherwise `is a hole` is on offer before any hole exists, which is noise and a spoiler |
| D12 | Holes always fatal, or sometimes recoverable? | **Decided 2026-09-05: always fatal** — one fail verb keeps the outcome legible; a recoverable hole needs a new state, message and FX for little teaching value |
| D13 | Chapter 3 uses only the `front` direction; `left`/`right` arrive with `if` in chapter 4? | **Decided 2026-09-05: yes** — without branching there is no clean way to *act* on a side reading. Chapter 4 therefore adds a block but no new UI. See §9.6 |
| D14 | Chapter 3 ships at 4 levels rather than the 6 originally sketched? | **Decided 2026-09-05: yes** — beats 5 and 6 both need a fork, and a fork needs `left`/`right`, which D13 defers. They move to chapter 4. See §10 |

## 8. Risks / watch-items

- Future sensing in visible mazes: where counted loops are offered, `loop n { move } end` costs three lines for any straight distance. Sensing should be taught as robust stopping, not automatically as a shorter program. The proposed ch3-04 palette excludes counted loops; ch3-03 offers both kinds. Recheck each lesson against its actual palette when chapter 3 is implemented.
- Nested loops: retain the shipped indentation and check that long nested lines remain readable.
- 12-slot programs already stretched the M1 editor layout; lines-mode (D5) must stay comfortable at ~10–12 lines.

Chapter 3–5 watch-items (added 2026-09-05):

- **Two-field condition lines vs mobile width** (§9.4): ~33 mono characters against ~300px of usable sheet width at a 360px viewport. M4 is shipped; verify against its expanded sheet before locking the copy.
- **Three-valued sensing will read as a bug until it is taught.** `front is blocked` returning false at a hole looks like the game is wrong. §10 beat 3 exists purely to demonstrate it.
- **`is clear` must mean *safe to enter* everywhere** — executor, sensor and copy. Define it once in #19 and never let a level author assume it means merely "not a wall".
- **Verification tooling gap:** the reachability search must treat holes as impassable *for solvability* while the executor treats them as fatal *on entry*. Conflating the two ships a level that is only solvable by dying.
- **Predicate gating vs experimentation:** gating keeps onboarding clean but means players never discover condition combinations on their own. Accept for now; revisit if it starts to feel hand-holdy.

## 9. Chapter 3–5 mechanics (proposal — D8–D12)

### 9.1 Tile types (#19)

The merged baseline uses four grid characters. The approved M5 branch adds `H`
while still rejecting unknown characters; new chapter-3 levels remain deferred:

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

- A condition line renders as `loop until` plus two steppers — `03  loop until [front] [is blocked]` — body indented, closed by `end`. `lineDepths()` in `editor.js` indents after `loop` and dedents on `end`; `loop until` and `if` will join that rule.
- Steppers reuse the `loop` count idiom (± buttons, no typing), two per condition line.
- **Width is the known risk:** ~33 mono characters ≈ 260px at 0.78rem against ~300px usable at a 360px viewport (#15). It fits flat, but nested bodies indent further. Mitigations in order: drop the `is` (`loop until front blocked`), then cap mobile indentation at 2ch per depth. Verify against #15's expanded sheet before locking copy.
- Balance validation (§3) extends to `loop until` and `if`: every opener needs a matching `end`.

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

**ch3-03's #16 dependency is satisfied** by PR #21's renamed `loop`. Chapter 3 still depends on #19 tile support and #17 sensor implementation.

### Verification status (2026-09-05)

All four grids verified with a throwaway node harness, deleted afterwards, checking: rectangular rows, solid wall border, exactly one `S` and one `G`, no characters outside the §9.1 vocabulary, the 16×9 cap, the **loop-free minimum** by BFS over `(x, y, dir)` counting moves *and* turns with holes impassable, each **intended solution** reaching the goal, and the **trap** outcome. Results: R1 holds on all four, all four intended solutions reach the goal, and the naive `loop until front is blocked` program returns `fell` on ch3-03 and ch3-04 exactly as designed — beat 3 is proven to fire.

Two honesty notes. The first harness run caught a real design bug: ch3-04 originally placed the hole on the only descent column, making the goal unreachable. The second note matters more: **the harness simulated the §9 proposal, not the shipped executor.** Holes and `loop until` do not exist in the code yet, so this validates the design, not the game. All four levels must be re-verified against the real executor once #19 and #17 land, and per the M2 review gate that re-verification is not optional and self-reports are not accepted.

### Chapter length: 4 levels (D14)

Chapter 3 ships at **four levels**, not the six originally sketched. Beats 5 and 6 — a mixed level where the *choice* between counted and sensed is the puzzle, and a capstone combining holes and walls — both want a fork, and a fork needs `left`/`right`, which §9.6 defers to chapter 4. Designing them anyway would mean working around our own constraint, so **both beats move to chapter 4**, where the direction field is live and `if` can make the choice meaningful. Chapter 4's plan (not yet written) should pick them up.

Memory across the chapter: 4 → 7 → 8 → 7. The bump at ch3-03 is R2's +1 slack for the first level of the hole half, not a curve — same pattern chapter 2 uses.
