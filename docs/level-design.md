# LoCo — Level Design

Curriculum, concept progression, and level plan. Counted Chapter 2 shipped in PR #21;
tile infrastructure shipped in PR #23. Sections 9–10 record Jonas' revised sensor
direction of 2026-09-08 and the M6 Chapter 3 implementation. Earlier decisions
remain historical where superseded explicitly by §9.

## 1. Purpose

Requirements §7 left two things to level design: the exact level count and the difficulty curve per chapter. This doc defines both, plus the mechanics the next chapters need (loops first — the memory budget is what forces players to *discover* them, per requirements §1).

## 2. Curriculum map

| Chapter | Concept | New blocks | Status |
|---|---|---|---|
| 1 — Sequence | Programs run top to bottom; turns are relative | `move`, `turn left`, `turn right` | Shipped (7 levels, ch1-01..07) |
| 2 — Loops | Counted repetition as compression | `loop n`, `end` | Shipped (8 levels; #16, PR #21) |
| 3 — Sensing | Automatic front wall sensor; visible holes remain undetected hazards | `loop until [sensor] = [value]` | M6 implementation — #17 (5 levels, §10); tile support shipped #19 |
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

- **Condition lines vs mobile width:** M6 uses two operand drop slots; verify both remain readable and operable in the expanded sheet down to 280px, including nesting.
- **Three-valued sensing will read as a bug until it is taught.** `front is blocked` returning false at a hole looks like the game is wrong. §10 beat 3 exists purely to demonstrate it.
- **`is clear` must mean *safe to enter* everywhere** — executor, sensor and copy. Define it once in #19 and never let a level author assume it means merely "not a wall".
- **Verification tooling gap:** the reachability search must treat holes as impassable *for solvability* while the executor treats them as fatal *on entry*. Conflating the two ships a level that is only solvable by dying.
- **Equipment versus experimentation:** M6 fits one sensor automatically. Later acquisition and placement should be designed with the reward system, not exposed as unused selectors now.

## 9. Sensor equipment direction — agreed 2026-09-08

This replaces the earlier two-field condition proposal. Sensors are future robot
equipment: players will eventually select their mounting location and acquire
wall, hole, distance and terrain sensors. Buying with earned rewards versus
chapter-completion rewards remains undecided; no economy or equipment UI ships now.

Chapter 3 automatically fits one front wall sensor. It reads only the next tile
in the robot's facing direction; turns rotate the sensor. Wall and out-of-bounds
read true; holes, floor, start and goal read false. It does not stop a move by
itself. The player constructs `loop until [wall sensor] = [blocked]` / `end`,
checked before each iteration. The two typed slots begin empty and accept dragged
or tapped operands. Missing operands refuse execution; the header still costs
one memory line. No mounting selector and no hole sensor in Chapter 3.
See `briefs/m6-condition-slots.md` for the post-preview correction.

This supersedes D9, D11 and D13's earlier UI decisions. D8 (explicit climb later),
D10 (sensing plus holes) and D12 (fatal holes) remain. D14's four-level limit was
superseded on 2026-09-09 by Jonas' request for a fifth level requiring sensed loops
even when counted loops are available.
Chapter 4's `if` should consume sensor readings, but additional equipment and its
controls will be designed separately rather than promised for that chapter now.

Tiles and fatal entry shipped in PR #23. `isBlocked` remains wall/outside;
`isSafeToEnter` remains floor/start/goal. This safety helper is not exposed as a
second sensor: a wall sensor cannot detect a hole or guarantee safe movement.

## 10. Chapter 3 — Sensing (M6)

Exact grids, palettes, programs and integration contracts:
[`briefs/m6-front-wall-sensor.md`](briefs/m6-front-wall-sensor.md).

| Level | Lesson | Grid | Loop-free minimum | Par / memory |
|---|---|---|---|---|
| ch3-01 Cruise Control | First sensed repetition; goal interrupts | 12×3 | 9 | 3 / 4 |
| ch3-02 Two Halls | Stop at a wall, turn, sense in a new direction | 14×8 | 17 | 7 / 7 |
| ch3-03 Mind the Gap | Count to a branch; wall sensing misses holes | 16×5 | 10 | 7 / 8 |
| ch3-04 Safe Passage | Sense, count before a hole, turn, sense again | 13×8 | 16 | 11 / 11 |
| ch3-05 The Uneven Spiral | Reuse sensed travel over seven unequal corridor lengths | 16×9 | 58 | 6 / 6 |

Safe Passage replaces the old hole-sensing proposal. Its middle counted segment
has four moves; three turns toward a wall and stops short, five falls. Using wall sensing for that
segment also falls. The first two levels exclude counted loops; the last two
allow counted alternatives deliberately. Par is not a global optimality claim.

The Uneven Spiral adds the stronger requirement requested after play-testing:
its six-line winning program nests sensed movement inside a counted outer loop.
No counted-only program of at most six lines may win. The exhaustive proof contract
is in `briefs/m6-uneven-spiral.md`; unlike primitive BFS, it covers nesting, all
counts 1–99, both turn directions and the real tick/goal-interruption rules.

Verification lives in `tests/sensors.mjs`: real-executor intended/negative cases
and independent BFS over position/facing, excluding holes and respecting each
palette. The pre-implementation 2026-09-05 simulation is historical, not evidence
for the new level pack. New results are recorded in the M6 brief after execution.
