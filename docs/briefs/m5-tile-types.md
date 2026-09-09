# M5 brief — Tile types, start marker and holes (#19)

Status: **approved for implementation by Jonas**, 2026-09-07, after reading this
proposal. Jonas also requested a separate roadmap item for broader game graphics
improvements. Branch: `feat/m5-tile-types`, from `6a67e86`.
M5 is the implementation milestone number; it does not mean curriculum chapter 5.

## Purpose and release scope

Make the robot's starting point visible after it moves, and give the board a tile
model that can distinguish walls from fatal holes. This prepares Chapter 3's
sensors without redesigning the world model again during #17.

- Add tile lookup and stable start coordinates; preserve the existing wall API.
- Support `H` holes, terminal fall behaviour, result copy and fall feedback.
- Draw a persistent start marker and a distinct hole within the existing ASCII style.
- Preserve all 15 registered levels, their grids, palettes, memories, IDs and progress.
  Holes appear in test fixtures for this milestone; Chapter 3 introduces them in
  player puzzles. The visible change in existing levels is the start marker.
- Ladders, pairing, `climb`, sensors, new commands and new chapters are deferred.
  #19 remains partially open for its ladder work after this first slice lands.

## Recorded decisions and proposed interface

The fatal-hole and sensing semantics already come from `level-design.md` §9 and
decisions D8–D14. The following representation and names are proposed here so the
two implementation agents can work on separate files against one contract.

`state.js` exports `tileAt(state, x, y)`, `isBlocked(state, x, y)` and
`isSafeToEnter(state, x, y)`. Parsed state adds:

- `tiles`: row-major array of the type strings below, indexed by `y * cols + x`.
- `start`: `{ x, y, dir }`, a separate initial-pose object that movement never mutates.
- Existing `walls`, `robot`, `goal`, dimensions, memory and level references remain.
  `walls` is populated from the same parse for compatibility; tiles are static.

| Grid character | `tileAt` result | Blocked | Safe to enter | Entry outcome |
|---|---|---|---|---|
| `#` | `wall` | yes | no | crash before entry |
| `.` | `floor` | no | yes | continue |
| `S` | `start` | no | yes | continue |
| `G` | `goal` | no | yes | goal, halt |
| `H` | `hole` | no | no | enter, fall, halt |
| Outside grid | `null` | yes | no | crash before entry |

Unknown characters still fail parsing. Rectangular-grid and exactly-one-start/goal
checks remain. No ladder placeholders are accepted. `isSafeToEnter` is positive
classification of floor/start/goal, not the negation of `isBlocked`. Future #17
consumes these helpers; no direction or predicate editor is added now.

## Execution and application contract

For a move into a hole, event order is exactly:

1. `step` for the move line (one existing execution tick).
2. Update `state.robot` to the hole coordinates.
3. `moved { from, to, dir }` with the existing payload shape.
4. Halt and emit terminal `fell { at: { x, y }, dir }` at the hole.

No later line executes and no extra tick is charged for the fall. Nested loops
halt immediately. Wall and out-of-bounds collisions still leave the robot on its
previous tile. Goal behaviour, loop semantics, speeds and 200-tick guard remain.

`main.js` includes `fell` in terminal handling: unlock editor/Run, clear highlight,
show the result, award no completion. `hud.js` adds
`> FELL — robot dropped into a hole.` Retry preserves the program and restores
the robot; Reset also clears fall visuals. Next remains goal-only.

Existing `run()` creates a new executor at the current pose, so repeating Run
without Retry can currently continue from a failed position. For this milestone,
executor start/reset use the new `state.start` pose, ensuring re-running after a
fall begins on the start tile. Verify this through the actual Run button as well
as Retry. This is a deliberate small correction to the previously deferred re-run
bug, needed to avoid creating an executor whose starting position is a hole.
Before starting the timer, `main.js` resets the new executor and calls
`scene.render(state)` so the renderer also returns to the start and clears hidden
fall state. Then it locks the controls and starts execution as usual. Resetting
only the model would leave a stale or invisible robot until its next move.

## Proposed appearance

Keep the graphite palette, mint accent, mono glyphs and current board geometry.
Use canvas primitives and existing CSS tokens; no image assets or dependencies.

- **Start:** a muted outlined square with an `S` in its centre. Draw under the robot
  and retain after departure. It reads differently from both a floor dot and EXIT;
  it has no glow and does not compete with the active robot.
- **Hole:** a dark inset square with a clearly visible double rim and no floor dot.
  Its open centre distinguishes it from the filled `#` wall. Use shape, not colour
  alone, and keep it recognisable at the existing 14px minimum tile size.
- **Fall:** finish the existing movement into the hole, then shrink/fade the robot
  over about 180ms. Keep it hidden until reset/retry/re-run. Do not use wall-crash
  shake. `moved` and `fell` arrive together, so queue the fall after the move tween
  rather than replacing the movement immediately. Result feedback stays immediate.
- **Reduced motion:** snap to the destination and hide the robot immediately;
  the hole and text communicate the result without animation.
- `scene.render(state)` cancels any pending fall and restores normal robot drawing.
  Resize during movement/fall must keep coordinates aligned with the tile grid.

Keep existing wall/floor/EXIT art, robot chevron, sheet layout and sizing constants.
The first visual review checks a board containing all five types at desktop and
phone sizes. If the outlined start and hole rim are too similar at 14px, revise
their geometry before accepting the renderer.

## Delegation after approval

Both coding agents use **gpt-5.6-luna**, **high** reasoning, as Jonas requested.
Give each a fresh, concise task with this contract and only its relevant files.
No git commands, extra agents, broad exploration or unrelated changes.

| Owner | Files | Delivery |
|---|---|---|
| Game-logic agent | `src/game/state.js`, `src/game/executor.js` | Tile parse/helpers, stable start, fall event and restart semantics |
| Rendering agent | `src/render/scene.js` | Start/hole drawing and fall animation against the pinned state/event contract |
| Manager | `src/main.js`, `src/ui/hud.js`, mobile result pointer rules in `styles/main.css`, tests and docs | Terminal integration, independent checks, review, commits and PR when authorized |

Update grid-legend comments in the level modules as a manager documentation touch;
do not modify level data. The manager reads every diff and verifies actual behaviour
instead of accepting agent self-reports. Send narrow corrections to the same agent.

Integration finding: the existing mobile result overlay intercepted Run/Reset
taps. Its backdrop now passes pointer events through while Retry/Next remain
interactive. This supports the approved repeated-Run behaviour without changing
overlay appearance, positioning or the sheet's layout.

## Verification and acceptance

- Retain the existing Node verification of all 15 levels and eight intended counted
  solutions. Record a full-level-data baseline before edits so all 15 remain identical.
- Check every type and boundary against the table, including unknown-character and
  malformed-grid rejection. Start metadata must remain unchanged after movement.
- Real executor fixtures: direct fall, hole inside nested loops, no post-fall steps,
  exactly one terminal event, robot at hole, unchanged wall collision and goal win.
- Verify Reset, Retry, repeated Run and stopping/restarting cannot leave the robot
  hidden or restart on a hole; check no completion is saved for a fall.
- Extend the independent BFS to exclude `H` from safe routes while continuing to
  read grid characters directly. An `S H G` corridor has no winning path; a fixture
  with a safe detour must solve in the real executor. Do not use production safety
  helpers in the independent search.
- Browser fixtures load through the test server, not the production level registry.
  Exercise a hole through the actual application Run/Retry/Reset flow, result copy,
  editing lock and completion storage; preserve existing browser checks.
- Inspect screenshots at desktop and narrow widths (280/320/390px), plus 900/901px
  breakpoint behaviour. Check start after departure, hole/wall distinction, EXIT
  visibility, and reset state. Exercise normal motion and reduced motion; screenshots
  alone cannot verify the fall event sequence or timing.

## Preview play-test after implementation

1. On an existing level, move away: is the start marker clear and unobtrusive?
2. On a test-server fixture with a hole, does falling read differently from crashing?
3. Retry, Reset and Run again: is the robot visible at the start and the program kept?
4. On a phone, can you distinguish floor, wall, start, hole and exit at a glance?

The PR preview exposes the unchanged 15-level registry. For hole play-testing,
provide a separate test-server fixture link/session; do not add a hidden production
level or development switch. Report this limitation with the preview handoff.

## Manager review — 2026-09-07

- Both scoped coding tasks used `gpt-5.6-luna` with high reasoning. Manager reviewed
  their full diffs and integrated the application/HUD and mobile pointer fix.
- `node tests/verify.mjs` passed: full 15-level baseline unchanged; tile safety,
  malformed grids, exact fall events, nested-loop termination, safe detour BFS and
  fresh-executor restart; all previous module/executor/level checks retained.
- `node tests/tiles-browser.mjs` passed with actual tick/animation pacing: desktop
  normal motion, phone normal motion and phone reduced motion; fall ordering and
  visibility, resize during fall, fresh Run, Reset, Retry, preserved program and
  goal-only saved completion.
- Retained `node tests/browser.mjs` passed all eight chapter-2 editor-to-goal flows
  on desktop and touch. No runtime/browser errors were reported.
- Manager inspected unobscured board screenshots at desktop, 390px and 280px. Start,
  open hole, filled wall and floor remain distinguishable. The existing EXIT badge
  is very small at the 14px tile floor; broader graphics refinement is recorded in
  #22 rather than changing the approved existing art here.
- Test-server workshop is available through `node tests/tile-server.mjs` at
  `http://127.0.0.1:4174`. It is localhost-only; remote phone testing of holes is
  not supplied by the normal Vercel registry. Browser screenshots use fallback
  fonts, and art-review screenshots hide only the result overlay. Real-device
  appearance and feel still need Jonas' play-test.
- #22 was created on GitHub at Jonas' request. On 2026-09-08 Jonas confirmed that
  he had tried the workshop and explicitly authorized commit/push. Production
  merge followed in PR #23 on 2026-09-08 as `2d4bd42`.
