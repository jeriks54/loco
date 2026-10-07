# Issue #35 — Faster run speeds

Issue: https://github.com/jeriks54/loco/issues/35  
Branch: `codex/issue-35-run-speed`  
Status: Jonas accepted the playable preview and authorized PR creation, merge,
documentation updates and issue closure on 2026-10-07.

## Player behavior

Replace the three speed buttons with one native range input labeled **Run speed**.
Use five equally spaced slider positions mapped to **0.5×, 1×, 2×, 4×, 8×**.
These are discrete stops, not a continuous numeric range: each keyboard arrow
advances one stop, with Home/End selecting the slowest/fastest stop. Display all
five stop labels and the exact selected multiplier beside the control. Default
to 1×. Keep the current session's selection across levels, practice, Retry and
Reset; do not add a stored preference in this slice.

The slider remains enabled before and during execution. Keep it in the existing
desktop controls section and expanded mobile sheet. Run still collapses the
sheet; players can reopen it to change speed without stopping the program.
The track's touch area should be at least 44px high, with a visible focus outline
and a thumb that can be dragged comfortably. Preserve panel scrolling and grip
gestures: do not apply sheet dragging behavior to the input.

Associate the visible label with the input and provide `aria-valuetext` such as
"0.5 times" or "8 times" rather than exposing only its internal 0–4 position.
Update the visible value on `input` so dragging changes speed immediately.
Use native keyboard and assistive-technology behavior. Do not add a live region
for the selected speed or for rapidly changing sensor/loop feedback.

## Execution and animation

Keep one program line per tick, including structural loop/condition lines, with
the existing 600ms base interval. The first line still executes immediately.
Do not batch or skip interpreter lines or change event ordering, memory counting,
the 200-line runaway guard, winning conditions, or progress storage.

| Speed | Tick interval | Move duration | Turn duration |
|---|---:|---:|---:|
| 0.5× | 1200ms | 220ms | 160ms |
| 1× | 600ms | 220ms | 160ms |
| 2× | 300ms | 220ms | 160ms |
| 4× | 150ms | 112.5ms | 112.5ms |
| 8× | 75ms | 56.25ms | 56.25ms |

Cap each movement/turn duration at 75% of the selected tick interval, preserving
the existing 220ms/160ms maxima. The remaining time lets the robot settle and
the front sensor show a valid reading before the next line. High speeds will
be harder to trace visually; the exact final pose and result remain clear.

Live speed changes keep the executor's existing behavior: cancel its pending
timeout and schedule one tick a full new interval after the change. Preserve
the instruction pointer, loop frames and robot state. A single change to 8×
must take effect without waiting out an old 1200ms timeout.

Give the scene a `setSpeed(speed)` method. When speed changes, settle an active
ordinary move or turn at its already committed destination before adopting the
new animation duration. Do not replay events or advance the executor. At a new
movement/turn event, finish any prior ordinary animation first, even if browser
frame delivery was delayed, so stale facing or sensor coordinates cannot leak
into the next event. Keep this settlement logic inside the scene.

Sensor feedback remains unavailable while moving/turning and becomes ready only
at the settled pose; holes are never reported as walls. A pending or active fall
must stay unavailable when speed changes. Retain terminal effects at their
current durations: fall 180ms, crash 340ms and goal 750ms. Reaching a hole, wall
or goal ends execution immediately, so these effects cannot overlap later
program ticks. A fall still follows entry into the hole; Retry/Reset interrupts
the effect and restores the entrance as today. Results do not wait for effects.

Reduced motion continues to place the robot directly at its destination and
facing, without interpolation, fall shrinking, crash shake or goal pulse.
Changing speed changes pacing equally with either motion setting.

## Implementation boundaries

Confirmed against `main` at `6788204` on 2026-10-07:

- `index.html`, `src/ui/hud.js`, `styles/main.css`: replace button markup/styles
  and click handling; rename `setSpeedButtons` to `setSpeed` and synchronize
  slider position, visible multiplier and accessible value.
- `src/main.js`: update HUD calls and pass speed to both scene and executor.
  Synchronize the scene before starting a run, and when speed changes.
- `src/render/scene.js`: add speed-aware movement/turn durations and reliable
  ordinary-animation settlement. Preserve the terminal-effect lifecycle.
- `src/game/executor.js`: the scheduler already supports the required positive
  speeds and live rescheduling; update its outdated speed documentation. Make
  behavioral changes only if verification identifies a real defect.
- `src/ui/tutorial-tour.js`: replace the desktop tutorial's "speed buttons"
  wording with "speed slider". Mobile instructions to open the panel still apply.
- Tests: replace old `[data-speed="2"]` button interactions with range input
  interactions. Keep accelerated-timer tests separate from real-paced animation
  checks; their existing 300/600/1200ms interception does not cover 4×/8×.

No level pack, scoring, persistent settings, title Settings screen, step-through
debugging, or changes to the title teaser's independent animation in this slice.
After approval, update the project guide/design record to describe the accepted
control and add verification instructions to `tests/README.md`.

## Acceptance and verification

1. Run the real executor at every stop with deterministic timers. Compare event
   traces, final pose and outcomes for a long counted loop, nested loops, sensed
   loops, branches, alternating moves/turns, goal interruption, crash, fall,
   unfinished, syntax refusal and runaway. Assert tick delays and faster total
   execution for a fixed trace. Change speed mid-run in both directions and
   assert one pending timeout, unchanged loop progress and clean stop/reset.
2. Exercise the actual range control with keyboard, touch/pointer and DOM input
   events. Check default, all five stops, visible/accessible values, changes while
   running, Retry/Reset, level navigation and tutorial/example entry. Verify
   0.5×→8× and 8×→0.5× during moves and turns.
3. Use real-paced browser checks with normal and reduced motion. Inspect pose,
   heading and sensor phases across consecutive moves/turns at 4×/8×; include
   delayed frames and live speed changes. Check fall at the hole, terminal
   overlays, remaining-loop badges, and Reset/Retry during terminal effects.
   Terminal events must occur once, and no movement may continue afterward.
4. Verify 280/320/390px phones, 900/901/1280px widths and 844×390 landscape.
   Inspect slider labels, touch area, keyboard focus, horizontal overflow and
   both sheet detents. Board geometry stays stable across detents; the slider
   can be reached and used during a run without conflicting with sheet gestures.
5. Run `node tests/verify.mjs`, the new targeted speed browser check, and affected
   onboarding/loop-progress browser checks. Run the Workshop check for renderer
   and sheet regressions and `git diff --check`. Inspect screenshots and provide
   a playable preview for Jonas to judge animation feel before release approval.

## Local verification — 2026-10-07

Passed `node tests/verify.mjs`, `node tests/speed.mjs`,
`node tests/speed-browser.mjs`, `node tests/loop-progress-browser.mjs`,
`node tests/onboarding-browser.mjs`, `node tests/workshop-browser.mjs`,
`node tests/contrast.mjs` and `git diff --check`. Browser checks used the existing
Playwright/Chrome runtime and offline fallback fonts. Speed screenshots at
280/320/1280px were inspected; controls fit and focus remained visible.

The speed browser check covers native keyboard/pointer/touch input, all five
stops, real-paced goal/crash/fall/unfinished results, live changes, session
selection and seven layouts in normal/reduced motion. Its controlled scene
clock verifies the accepted move/turn durations, late-frame facing/position,
speed-change settlement, 180ms fall presentation and reset. Retained executor
checks compare traces/poses and every terminal outcome at all five speeds.
The local full-game preview uses `node tests/tile-server.mjs --game` at
`http://127.0.0.1:4175`.

## Approval and release status

Jonas requested implementation after reviewing this brief on 2026-10-07. The
accepted contract uses the five discrete stops, 75%-of-tick animation cap,
settlement on speed changes, existing terminal-effect durations and session-only
selection. After playing the local preview, Jonas accepted the implementation
and explicitly authorized creating and merging the PR, updating documentation
and closing #35 on the same date. Merging `main` triggers the normal Vercel
production deployment.
