# M7 / Chapter 4 — Conditional branching

Status: shipped in PR #27 on 2026-09-19 as commit `8614ff1`; product version `v0.4`.

## Goal

Teach players to inspect the already-known front-wall sensor and choose between
two movement paths. Chapter 4 adds control flow, not equipment: every level uses
`sensor: 'frontWall'` and the only valid condition is
`wall sensor = blocked`.

The implementation appends five IDs (`ch4-01` through `ch4-05`) to the registry.
The existing 20 IDs, completion marks and `loco.progress.v1` shape remain intact;
programs are not persisted, so no migration is needed.

## Fixed level contract

The maps, palettes, starts and budgets below are implementation data, not examples.
They must stay synchronized with `src/levels/chapter4.js`,
`tests/chapter4-solutions.mjs` and §11 of `docs/level-design.md`.

| ID | Name | Start | Memory / par | Palette |
|---|---|---:|---:|---|
| ch4-01 | The Hairpin | E | 6 / 6 | move, turnRight, loop, if, end |
| ch4-02 | The Courtyard | E | 7 / 7 | move, turnLeft, turnRight, loop, if, else, end |
| ch4-03 | Switchback | E | 8 / 8 | move, turnLeft, turnRight, loop, if, else, end |
| ch4-04 | The Relay | E | 10 / 10 | move, turnLeft, turnRight, loop, if, else, end |
| ch4-05 | Signal Garden | E | 10 / 10 | move, turnLeft, turnRight, loop, loopUntil, if, else, end |

Every level has a distinct fixed route. The first map is a readable hairpin;
the next maps add an inward courtyard, alternating switchbacks, a repeated relay
of crossings, and finally a hazard-lined garden combining both loop types.

### ch4-01 — The Hairpin (10×5)

```text
##########
#S......##
#######.##
#G......##
##########
```

### ch4-02 — The Courtyard (9×8)

```text
#########
#S.....##
######.##
###..#.##
###.G#.##
###.##.##
###....##
#########
```

### ch4-03 — Switchback (10×8)

```text
##########
##.#######
#G..######
##...#####
###...#.##
####....##
#####..S.#
##########
```

### ch4-04 — The Relay (15×9)

```text
###############
###H###########
#S....###.....#
###H#.###.###.#
#####.###.###.#
#####.###.###.#
#####.....###G#
#####.#########
###############
```

### ch4-05 — Signal Garden (13×9)

```text
#############
#S....#######
###H#.#######
####H.##H####
#####......##
#########H.##
######.....##
######.....G#
#############
```

Independent intended programs are kept outside the level module:

```text
01: loop 99; if wall=blocked; turn right; end; move; end
02: loop 99; if wall=blocked; turn right; else; move; end; end
03: loop 12; if wall=blocked; turn right; else; turn left; end; move; end
04: loop 12; if wall=blocked; turn right; else; loop 4; move; end;
    turn left; end; end
05: loop 30; if wall=blocked; turn right; else; loop until wall=blocked;
    move; end; turn left; end; end
```

The first level demonstrates entering a true branch at a hairpin. The second
demonstrates a false branch and the first explicit `else` in a compact courtyard.
The third alternates both turn arms across a counted switchback. The fourth is
The Relay: six crossings repeat the same decision, with a counted four-step
movement loop nested in the false arm and an immediate turn in the true arm.
The fifth combines counted branching, a sensed corridor traversal and
undetectable holes in a hazard-lined garden.

Levels 01–04 have no branch-free winning program within their memory budgets;
`tests/decisions.mjs` runs the independent proof for those four maps. The Signal
Garden is a stronger visual capstone candidate, but it remains blocked from the
release gate until its mixed-loop branch-necessity proof also passes.
The verification suite therefore permits exactly the non-branching blocks in the
level palette, evaluates them independently, and cross-checks sampled candidates
against the real executor. A positive intended solution is not sufficient proof.

## Runtime contract

Program entries are:

```js
{ id: 'if', sensor: null, value: null }
'else'
'end'
```

After both typed slots are filled, an `if` entry has the same completed shape as a
sensed loop:

```js
{ id: 'if', sensor: 'wallSensor', value: 'blocked' }
```

Before movement, the structural analyzer validates the complete program. It returns
matching `end` positions and `else` positions and rejects unmatched `end`, an
`else` outside the nearest open `if`, duplicate `else`, or any unclosed block.
Loops and conditionals may nest in either direction. Empty branches are valid.

At runtime, `if` evaluates the front wall once. True enters its body; false jumps
to `else` or past the matching `end`. A true branch reaching `else` skips the
alternate body and continues after `end`; a false branch visits `else` and falls
through. `end` closes the nearest open `if`, `loop` or `loopUntil`.

Every visited line emits the ordinary `step` event and consumes a tick, including
`if`, `else` and `end`. Skipped lines emit no events. Condition validation happens
before the first tick and uses `syntax` with `reason: 'condition'`; invalid
structure uses `reason: 'structure'`. Missing front-wall equipment retains the
existing `reason: 'sensor'`. Crash, fall, goal, reset, snapshot and runaway
behavior remain unchanged.

## Editor contract

- `if` and `else` are palette blocks; `end` remains the shared closing block.
- A level exposing `if` or `loopUntil` shows the existing `wall sensor` and
  `blocked` operand chips.
- An `if` renders as `if [wall sensor] = [blocked]` with the existing typed slots.
- `else` is aligned with its matching `if`; both bodies indent one level.
- Add, delete, tap-to-add, drag/drop, clear, snapshot and lock behavior apply to
  `if` exactly as to `loopUntil` and other program entries.
- The current pointer highlight and mobile wrapping remain usable at 280, 320 and
  390px; desktop checks cover 900 and 901px around the sheet breakpoint.

## Acceptance

Node checks must cover all five intended paths, budgets, palette restrictions,
condition snapshots, operand rejection, true/false branches, skipped branch step
events, nested if/loop structures, invalid nesting, and independent branch-free
necessity proofs. Existing Chapter 1–3, tile, sensor, spiral and regression checks
remain required.

Browser checks must cover desktop and touch palette visibility, typed operands,
dragging and tapping `if`/`else`/`end`, indentation and numbering, incomplete
conditions, invalid nesting feedback, nested programs, capacity/lock behavior,
pointer highlighting, run/reset/retry/completion, and the five requested widths.

Release acceptance was completed for PR #27: the retained Node suite passed, the
Chapter 4 browser coverage is recorded in `tests/chapter4-browser.mjs`, the Vercel
preview received visual review, and Jonas approved the play-test. The product
version is now `v0.4`.
