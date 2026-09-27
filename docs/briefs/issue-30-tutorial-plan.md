# Issue #30 — Tutorial and chapter introductions

**Branch:** `codex/issue-30-tutorial`  
**Issue:** https://github.com/jeriks54/loco/issues/30

## Goal and flow

The title's Tutorial button opens a real, optional practice level using the shipped
board, editor and executor. It is separate from the 25 campaign levels and never
records a campaign completion. Skip opens level select; Exit returns to the title.
On success, the result offers Start Chapter 1, which opens `ch1-01`.

Practice data: `id: 'tutorial-01'`, grid
`['#####', '#S.##', '##.G#', '#####']`, east-facing start, six memory lines,
and only `move`, `turnLeft`, `turnRight`. The intended five-line program is
`move`, `turnRight`, `move`, `turnLeft`, `move`. The player may solve it another way.

A compact hint panel stays readable alongside the mobile sheet. It changes at
meaningful points, never on each executor step, and does not lock editing or give
away the full solution. Copy:

Before free practice, a four-step guide explains one area at a time. A brass
outline and dimmed surroundings identify the area being described. The guide
shows the map, command palette, numbered memory lines and Run/Reset controls in
that order. On phones it opens the editor sheet for commands and memory, then
closes it to show the persistent Run/Reset bar. Each step has Back and Next;
Skip guide starts practice immediately. The guide starts again when Tutorial is
selected from the title, but never gates level selection. Its text explains:

- **Read the map:** the robot begins at S, its arrow shows facing, EXIT is the
  destination, walls block movement and `move` advances one tile.
- **Choose commands:** `move` advances; turns only change facing. Commands can be
  dragged or tapped (tap on phones).
- **Fill the memory:** execution follows numbered lines from top to bottom, the
  counter shows the six-line budget, and selecting a filled line removes it.
- **Run and try again:** Run starts at the entrance and lights the active line;
  Reset returns the robot to start without erasing commands; speed changes only
  the playback pace.

The guide uses a labelled dialog, moves focus to each step title, traps focus in
its actions, and returns focus to the practice editor when closed. Highlight
position follows viewport and sheet changes without an entrance animation.

- Start: “Reach EXIT. Commands run from line 01 downward. Drag a command to a
  line or tap it to add it.”
- Narrow start: “Reach EXIT. Tap the arrow below to open the program panel.
  Tap commands into numbered lines, then Run.”
- After editing: “Turns change the robot's facing without moving it. You have
  six memory lines. Press Run when ready.”
- Narrow after editing: “You have six memory lines. Turns change facing without
  moving. Close the panel to inspect the maze, then Run.”
- During a run: “The highlighted line is the command running. Reset returns
  the robot to the start and keeps your program.”
- After Reset: “Reset returned the robot to the start and kept your program.
  Edit it or press Run again.”
- After a failed run: “Edit your program and try again. Run starts at the
  entrance.”
- On success: “You reached EXIT. Ready for Chapter 1?”

## Chapter examples

The initial card design was replaced after phone play-testing. The first
selection of a level in Chapters 2–4 now opens a separate guided example maze.
Each guide spotlights the map, concept controls, memory and Run/Reset before
free practice. Skip example opens the selected level; Replay intro at each
chapter header opens the example again. Examples are optional and do not gate
campaign access. See [issue-30-chapter-examples.md](issue-30-chapter-examples.md)
for the maps, routes and detailed flow.

## Data and integration

- Keep all practice level data outside `src/levels/index.js`. Use explicit
  tutorial/example/campaign modes in `src/main.js` so Run, Reset and Retry share
  the current machinery but practice goals cannot call `markCompleted` or
  campaign Next-level logic.
- `localStorage['loco.onboarding.v1']` holds only seen chapter prefixes. Read
  and write defensively. Existing completion of any level in a chapter counts
  as already seen; `loco.progress.v1` remains unchanged. Skipping a first
  example counts as seen so it does not interrupt again.
- Make palette chips keyboard reachable. Enter/Space uses the same append or
  operand-placement path as pointer tap. Filled lines can be removed with
  Delete/Backspace; preserve focus near the edited line. Existing steppers and
  condition-slot buttons keep their native keyboard behavior.
- Keep new UI in the Workshop palette and do not bump the chapter-based
  `v0.4` version for this onboarding addition.

## Acceptance

- The intended practice program wins under the real executor. Crash, unfinished
  program, Reset, Retry, Skip, Exit, re-entry and success preserve the intended
  program and progress behavior.
- Desktop, touch, keyboard, screen-reader labels/focus, reduced motion and
  narrow phones work without hiding the board or controls.
- First visit, skip, replay, reload, corrupt storage and already-completed
  chapters behave as described; all 25 campaign levels remain accessible.
- Run `node tests/verify.mjs` and the title/browser checks. Record a short
  first-time-player observation pass in issue #40 after a playable preview.
