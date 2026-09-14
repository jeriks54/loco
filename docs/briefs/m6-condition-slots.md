# M6 correction — build the loop condition (#17 / PR #24)

Jonas requested this correction after trying the first preview. He wants players
to construct an expression, not receive a fixed sensor sentence. Implementation
authorized in this conversation. This contract supersedes the fixed-label and
plain-string loopUntil sections of the original M6 brief.

## Expression and data

Display `loop until [sensor] = [value]`. Both slots begin empty. Players drag the
`wall sensor` operand into the sensor slot and `blocked` into the value slot.
The fixed `=` comparison means equality; it is not a third editable field.
A completed expression reads `loop until [wall sensor] = [blocked]`.

One loop header still costs one memory line; operands cost no extra lines.
New entry: `{ id: 'loopUntil', sensor: null, value: null }`. Valid completed entry:
`{ id: 'loopUntil', sensor: 'wallSensor', value: 'blocked' }`.
Deep-copy these fields when returning/snapshotting programs. No implicit filled
defaults or legacy plain-string shortcut; programs are not saved, so no migration.

The robot still has one front-mounted wall sensor, automatically equipped in
Chapter 3. Physical mounting and condition construction are separate concepts.
No hole sensor, additional comparisons, rewards/shop or mounting controls now.
All four level grids, budgets and intended routes stay unchanged.

## Editor and palette

Keep command `loopUntil` labelled `loop until` in BLOCK_DEFS. Export separate
CONDITION_DEFS for `wallSensor` and `blocked`, labels `wall sensor` and `blocked`,
slot types `sensor` and `value`. Render these as distinct operand chips with
`data-condition` attributes when `loopUntil` is available and level.sensor is
`frontWall`. They must never insert as independent program lines.

Use buttons for the two slots: `.condition-slot`, `data-slot="sensor|value"`,
within the parent `.line[data-index]`. Label empty slots `sensor` and `value`;
accessible names include slot type and line number. Filled slots have separate
small clear buttons with `data-clear-slot` and an accessible clear label.
The loop keyword or line number can still remove the whole instruction; clicks
on slots, clear buttons and the comparison must not delete the line.

- Dragging an operand accepts only the matching slot type, even at full memory.
  Compatible targets highlight; dropping on a wrong slot, outside the program,
  or between lines leaves both program and operands unchanged.
- Dragging a command into a condition slot is rejected, not inserted as a line.
- Tap/click a slot to select it, then tap the matching palette operand to fill it.
  If no slot is selected, tapping an operand fills the first compatible empty slot.
  An incompatible selected slot is not bypassed. Selected slots get a visible ring.
- A drop/tap can replace the same operand in a filled matching slot. Clear buttons
  empty just that slot. Clear/delete/level load cancel selection; never retain an
  index into a different line after insertion/deletion.
- Preserve existing pointer capture and cancellation; cancel a drag safely if Run
  starts or the level changes. No stale drag can mutate a new or locked program.
- While running, operand placement, slot selection/clearing, and command edits
  are locked. Do not intercept sheet grips or program scrolling.
- Provide a small aria-live editor message for incompatible/no-target taps and
  rejected drops, e.g. `Choose a sensor slot for wall sensor.`
- Wrap the condition across visual rows on narrow screens while retaining one
  numbered memory line. Keep slot text readable and reachable at 280/320/390px;
  use existing graphite/mint styling, no new control theme.

## Runtime and feedback

Normalization retains primitive sensor/value fields in an isolated snapshot.
Before ANY program step, validate every sensed-loop condition. Missing or invalid
operands emit terminal `syntax { at: lineIndex, reason: 'condition' }`; missing
equipment uses `reason: 'sensor'`. Balance validation keeps its current priority.
Runtime must not silently fill either field or interpret wrong-slot values.

HUD messages:
- condition: `> INCOMPLETE CONDITION — fill the sensor and value slots.`
- equipment: `> SENSOR MISSING — this level needs a front wall sensor.`

Run remains enabled for nonempty programs so players get explanatory feedback.
Invalid expressions refuse before movement; Retry preserves the partial program.
For a valid condition evaluate `isWallAhead(state) === true` on each loop-header
visit, retaining current step/tick, nesting, goal/fall, reset and runaway behaviour.

## Ownership and acceptance

One GPT-5.6-Luna high agent owns palette/editor and the related CSS additions.
Manager owns executor, HUD/main payload wiring, documentation and independent tests.
Agent never runs git. Manager reviews the full delivery before commit/push to PR #24.
The implementation/review continued on 2026-09-09.

Tests must exercise actual pointer drag into each slot, wrong-type/outside drops,
command rejection on slots, tap selection with multiple loops, clearing, placement
at full memory, drag cancellation/lock, nested indentation, and no extra memory
cost. Run incomplete and complete programs through the real UI on desktop/touch.
Runtime tests cover missing/wrong operands, valid equality, snapshots, and no
movement before a later incomplete expression. Retain all four intended solutions
and previous chapter/tile regressions. Inspect narrow screenshots with filled slots.

## Manager review — 2026-09-09

- GPT-5.6-Luna high implemented the palette/editor/condition styling. Manager
  reviewed the full diff and requested fixes for stale selection, drag priority,
  expression clicks, feedback reset and readable wrapping; final changes reviewed.
- Node verification passes all 19 paths, 12 intended solutions and the existing
  executor/tile checks. Additional cases reject missing, reversed and unsupported
  operands before any step, including incomplete conditions later in a program;
  condition snapshots remain isolated from edits.
- `conditions-browser.mjs` passes desktop and touch: real pointer drops into both
  fields, wrong/outside/cancelled drops, command rejection with spare memory,
  explicit drop overriding an old selection, typed tap placement, clear buttons,
  placement at capacity, incomplete-condition feedback, running locks and nested
  slots. Clearing a field does not delete or add a memory line.
- `sensors-browser.mjs` passes all four completed expressions on desktop and touch.
  Retained Chapter 2 browser checks pass. No page errors reported.
- Manager inspected full desktop and 280px screenshots. The keyword stays intact;
  the comparison wraps naturally while remaining one numbered instruction.
- Browser flows use fallback fonts and accelerated ticks; human phone feel and
  the educational value of constructing the expression remain play-test items.

The correction updated the existing PR #24 preview and merged with it to `main` as
`ee25b75` on 2026-09-09, closing #17; production deployed the same minute.
