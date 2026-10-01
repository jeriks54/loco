# Issue #36 — Live counted-loop progress

Issue: https://github.com/jeriks54/loco/issues/36  
Branch: `codex/issue-36-loop-progress`

Jonas requested implementation on 2026-10-01 after the proposed separate
runtime indicator. Keep the authored `loop n` count visible and unchanged.

## Behavior

- Each active counted loop shows a compact `n left` badge beside its count.
  Remaining iterations include the iteration currently executing. Explain that
  meaning in the badge's accessible label and tooltip.
- Nested counted loops show independent remaining counts. The outer count stays
  visible while its inner loop executes; a completed inner loop disappears and
  starts from its full count on the next outer iteration.
- Inactive counted loops and sensor-driven `loop until` show no badge.
- Stop, Reset, Retry, all terminal outcomes, leaving play, and loading another
  level clear runtime progress. A rerun starts fresh. Programs and progress
  storage remain unchanged.
- Preserve the current-line highlight as the execution pointer. Badges have no
  animation, focus target, or live region, so they can be inspected by assistive
  technology without announcing every iteration.
- Fit desktop and narrow mobile layouts; wrap loop content when necessary.

## Runtime contract

Keep `step` as its existing numeric line index. Add `loopProgress`, a detached
array of `{ index, remaining, total }` snapshots for active counted frames.
Publish after each counted-loop head enters, advances, or exits; publish an empty
array when execution halts with active counted frames. Counts include the current
iteration. Do not expose mutable frames or edit authored program entries.

The main event handler passes snapshots to `editor.setLoopProgress`. The editor
updates only badges, without rebuilding lines or moving focus, and clears badges
when unlocking or loading/clearing a program.

## Verification

Use the real executor to check nested counters, counts 1 and 99, condition/sensed
nesting, inactive branches, snapshot isolation, all terminal outcomes, stop,
reset, rerun and speed changes. Retain existing execution traces and level
verification. Browser checks cover real application wiring, locked edits,
reset/retry/re-entry, authored-count preservation, and desktop/phone fit with
normal and reduced motion. Inspect screenshots of active nested counters.

Verified locally on 2026-10-01: `node tests/verify.mjs`,
`node tests/loop-progress-browser.mjs`, `node tests/chapter4-browser.mjs`,
`node tests/onboarding-browser.mjs`, `node tests/contrast.mjs`, and
`git diff --check` passed. Active nested-counter screenshots at 1280, 320 and
280px were inspected. Browser checks use an existing Playwright/Chrome runtime
and offline fallback fonts. Jonas accepted the playable preview on 2026-10-01
and explicitly authorized creating a PR to `main`, merging it, pushing, and
updating documentation and issues. Release is tracked by the PR linked below.
