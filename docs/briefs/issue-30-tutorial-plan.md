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

- Start: “Reach EXIT. Commands run from line 01 downward. Drag a command to a
  line or tap it to add it.”
- After editing: “Turns change the robot's facing without moving it. You have
  six memory lines.”
- During a run: “The highlighted line is the command running. Reset returns
  the robot to the start and keeps your program.”
- After a failed run: “Edit your program and try again. Run starts at the
  entrance.”
- On success: “You reached EXIT. Ready for Chapter 1?”

## Chapter cards

The first selection of any level in Chapters 2–4 opens a short, skippable card
before that selected level. Continue and Skip both open the selected level; Skip
merely omits reading the card. The card appears once per chapter. A Replay intro
button beside each chapter header opens the same card and closes back to level
select. Chapter 1 has no card. No chapter or level is gated.

- **Chapter 2 — Loops:** “A loop repeats the commands between `loop` and `end`.
  Set its count to travel farther while using fewer memory lines.”
- **Chapter 3 — Sensing:** “The front wall sensor checks the next tile. Build
  `loop until [wall sensor] = [blocked]` to repeat until it sees a wall. It does
  not stop the robot for you, and holes are not walls.”
- **Chapter 4 — Decisions:** “`if` runs commands when its condition is true.
  `else` runs the other path. Fill both condition slots, then close the choice
  with `end`. ”

Cards use a labelled modal dialog with focus trapped while open, Escape/Skip,
and focus returned to the trigger. Reduced motion removes entrance transitions.

## Data and integration

- Keep tutorial level data outside `src/levels/index.js`. Use an explicit
  tutorial/campaign mode in `src/main.js` so Run, Reset and Retry share the
  current machinery but tutorial goals cannot call `markCompleted` or campaign
  Next-level logic.
- `localStorage['loco.onboarding.v1']` holds only seen chapter prefixes. Read
  and write defensively. Existing completion of any level in a chapter counts
  as already seen; `loco.progress.v1` remains unchanged. Skipping a first card
  counts as seen so it does not interrupt again.
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
