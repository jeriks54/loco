# M6 — Chapter 3: front wall sensor (#17)

Jonas approved the short plan and requested implementation on 2026-09-08.
Branch: `feat/m6-front-wall-sensor`, based on merged M5 `2d4bd42` (PR #23).

## Intent and boundary

Sensors will eventually be equipment players obtain and position on the robot.
Wall, hole, distance and terrain sensors are candidate types. Buying sensors with
level rewards versus receiving them as chapter rewards remains undecided. Do not
implement an economy, inventory, mounting UI or progression gates in M6.

Automatically fit one front wall sensor whenever a Chapter 3 level loads. Earlier
chapters have no sensor. No hole sensor, directional selector or predicate selector
is offered. This supersedes the older D9/D11/D13 condition-control proposal.

## Shared contract

- Chapter 3 levels carry `sensor: 'frontWall'`; parsed state carries
  `sensor: level.sensor ?? null`. Existing levels remain unchanged.
- `state.js` exports `isWallAhead(state)`: read the adjacent tile in robot-facing
  direction through `isBlocked`. Walls and outside-grid space return true; floor,
  start, goal and holes return false. This is detection, not automatic braking.
- Program token is the plain string `loopUntil`; palette/editor label is exactly
  `loop until wall ahead`. It costs one line, opens indentation and pairs with
  the nearest `end`. No editable fields. Counted `loop` still uses its count object.
- Executor evaluates `isWallAhead` on each visit to a `loopUntil` header, before
  entering its body. True skips the body and matching end; false enters the body.
  An end jumps back to its matching opener. Counted and sensed loops can nest in
  either order. Every executed header/end/body line emits one `step` and costs
  one tick; preserve the 200-tick guard and immediate goal/fall/crash termination.
- A `loopUntil` program without `frontWall` equipment is refused before movement
  with `syntax {at: index}`; keep existing balanced-loop validation. Empty sensed
  loops stop immediately if blocked, otherwise hit the runaway guard.
- Chapter 3 adds four IDs after the existing 15: `ch3-01..04`, header
  `CHAPTER 3 — SENSING`. Preserve old level data and stored progress. No inventory
  persistence is needed; equipment is supplied by each level.

## Sensor presentation

Draw a small outlined square at the chevron's forward tip, in the robot's local
rotated coordinate system. Use existing mint colour; hollow when no wall is ahead,
filled when detected. Fit within the tile and make the cue shape-based. It follows
the robot's movement, turns and fall fading; no marker in chapters 1–2.

Below the board heading, show a short persistent explanation only with the sensor:
`Front wall sensor fitted. Detects the next tile ahead; holes are not walls.`
Use existing human-copy styling, wrap on phones, and reserve its height when
fitting the canvas. No modal, tutorial button or once-only onboarding storage.
The loop line may wrap its words at narrow widths; never truncate its condition.
Do not add steppers or compress the wording into unexplained abbreviations.

## Level contracts

All start facing E. U = `loopUntil`, M = `move`, R/L = turns. Braces below are
closed by one `end`. Part A offers M/U/end, with turns added in level 2. Part B
offers M, both turns, counted loop, U and end. All carry `sensor: 'frontWall'`.

### ch3-01 — Cruise Control (12×3, memory 4, par 3)

```
############
#S........G#
############
```

`U { M } end`. First contact with sensed repetition; goal interrupts the loop.

### ch3-02 — Two Halls (14×8, memory 7, par 7)

```
##############
#S...........#
############.#
############.#
############.#
############.#
############G#
##############
```

`U { M } end; R; U { M } end`. First loop must stop at the wall before turning;
turning changes which adjacent tile the front sensor reads.

### ch3-03 — Mind the Gap (16×5, memory 8, par 7)

```
################
########G#######
########.#######
#S............H#
################
```

`loop 7 { M } end; L; U { M } end`. Count to the branch rather than treating a
hole as a stopping wall. A naive `U { M } end` falls into the far-end hole.

### ch3-04 — Safe Passage (13×8, memory 11, par 11)

```
#############
#S.....######
######.######
######.######
######.######
#G.....######
######H######
#############
```

`U { M } end; R; loop 4 { M } end; R; U { M } end`.
Sense the first wall, count the approach to the turn before the hole, then sense
along the final corridor. Replacing the middle counted loop with U falls; a count
of 3 turns toward a wall and stops short, while 5 falls. Unlike the old proposal,
no hole predicate is offered.

Par records an intended solution, not a global optimum. Part A excludes counted
loops so sensor use is necessary within memory. Part B deliberately allows counted
alternatives: the lesson is choosing a stopping rule that is safe, not forcing
every winning program to contain a sensor. Independent loop-free minima must be
greater than memory; verify the four grids and intended programs before acceptance.

## Delegation and acceptance

Use GPT-5.6-Luna, high reasoning, for tightly scoped coding agents. No agent git.
Logic agent owns state/executor; editor agent owns palette/editor; renderer agent
owns scene. Manager owns registry/new levels, sensor explanation, shared CSS,
independent tests, documentation and full review. No concurrent edits to those files.

- Real executor: true-on-entry, recheck after moves and turns, both nesting orders,
  holes invisible, boundary sensed, missing equipment refused, unbalanced programs,
  empty loops/runaway, restart/reset and terminal event order.
- Independent BFS counts moves and turns, excludes holes, obeys each palette.
  Verify all four intended solutions and wrong-count/naive-sensing outcomes.
- Retain all prior executor, 15-level and hole tests; scope the old full-registry
  hash to the first 15 levels and explicitly verify the four appended IDs.
- Browser: all four levels editor-to-goal on desktop and phone, full loop label,
  tap/drag insertion, indentation, lock/highlight, memory cap, Retry/Reset, saved
  completion. Check sensor absent in earlier chapters, marker rotates and changes
  hollow/filled state, holes do not light it, and reduced motion works.
- Check 280/320/390px and 900/901px boundaries with the wrapped explanation.
  Run includes real-animation checks, with fallback-font limitations disclosed.
- Provide a local play-test, then commit/push/PR when authorized; no automatic merge.

## Review results — 2026-09-08

- Manager reviewed all three Luna-high deliveries (logic, editor, rendering) and
  integrated the level pack, automatic equipment explanation, registry and tests.
- `node tests/verify.mjs` passes: 14 module syntax checks, all 19 independent level
  paths, eight counted-loop and four sensed-loop intended solutions, original
  15-level data hash, tile/fall and mixed-loop regression checks.
- Chapter 3 intended programs win in 26/49/28/45 ticks. Independent loop-free
  minima are 9/17/10/16, exceeding memory 4/7/8/11. Negative tests confirm both
  naive hole approaches fall. Safe Passage count 3 stops short because the final
  sensed loop sees a wall immediately; count 5 falls.
- `node tests/sensors-browser.mjs` passes four desktop and four touch flows,
  condition labels without controls, layout at 280/320/390/900/901px, completion
  marks, sensor equipment gating, rotation and hollow/filled wall readings. A hole
  below the test robot leaves its south-facing cue hollow.
- Retained Chapter 2 browser checks pass all eight desktop/touch solutions. Tile
  browser checks pass real-paced desktop/mobile falls, reduced motion, resize,
  repeated Run, Reset, Retry and goal-only progress. No browser errors reported.
- Manager inspected desktop, phone and 280px screenshots. Full condition wording
  remains readable; mobile program scrolls inside the expanded sheet as before.
  The sensor explanation wraps above the board without clipping its width.
- Chapter 3 automated flows accelerate executor ticks and use fallback fonts;
  they do not establish real-phone feel or puzzle enjoyment. Normal-speed manual
  preview: `node tests/tile-server.mjs --game`, http://127.0.0.1:4175.

### Human play-test

1. Cruise Control / Two Halls: is automatic wall equipment understandable, and
   does stopping before a turn explain how the front sensor follows facing?
2. Mind the Gap / Safe Passage: is it clear why a wall sensor misses a hole and
   when counted movement is needed? Are the memory budgets fair?
3. Check full command wording, sensor cue, Run/Reset/Retry and program scrolling.

Jonas authorized committing and publishing the M6 branch/PR for Vercel play-testing
on 2026-09-08. The preview contains all 19 levels; production merge remains pending.
