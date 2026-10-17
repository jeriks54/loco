# Issue 38 — navigable boards and Decisions capstones

Jonas authorized implementation on 2026-10-14, including two very tricky larger
maps in the last shipped chapter (Chapter 4). After the difficulty revision,
Jonas explicitly authorized a PR to main, merge, documentation update and issue
closure on 2026-10-14. This supersedes the earlier preview-only release scope.

The board becomes a clipped viewport. Fit map shows the entire maze, including
wide and tall maps; overview tiles may be smaller than 14px. Zoom restores detail
up to 64px per tile. Pointer drag, touch pan/pinch, wheel zoom, focusable-board
arrow keys and +/- keys supplement visible zoom, Fit map and Follow robot buttons.
Follow robot recenters and enables tracking; manual pan suspends tracking so the
map remains inspectable during execution. Run/Reset/Retry restore following at
the chosen zoom. Changing levels returns to overview. Resize preserves the
inspected center and zoom; mobile sheet detents do not change board dimensions.
Camera movement is direct, with no decorative easing or inertia.

Append ch4-06 and ch4-07 without changing the previous 25 levels. Use existing
commands, sensor and holes. Difficulty comes from compact repeated decisions,
unequal corridors, false routes and hazard placement, rather than map area alone.
Keep independently recorded winning programs and verify memory, palette, both
branch outcomes, safe reachability and the existing 200-tick guard. Check common
shortcut programs and incorrect counts; do not claim unique or optimal solutions
without an exhaustive proof.

Acceptance: retained executor suite; real browser desktop/phone/landscape,
normal/reduced motion; wide/tall fit, zoom limits, pan boundaries, pinch, keyboard,
follow during execution, overview, reset/retry, orientation changes, both sheet
detents, result overlays and previous small-level regression coverage. Record
the final level dimensions, solutions and verification results before handoff.

## Implemented level contracts

| ID | Name | Grid | Memory / par | Independent shortest move/turn route |
|---|---|---|---|---|
| ch4-06 | Blind Switchyard | 31×21 | 20 / 20 | 49 lines |
| ch4-07 | The Folded Circuit | 21×31 | 30 / 30 | 47 lines |

The first draft was rejected in play-testing: Jonas solved level 26 in ten
lines using eight repetitions of six moves, a right turn and a conditional
reversal. That exact program is now retained as a regression. The old map's
repeated geometry defeated its intended complexity; a long reference solution
did not establish difficulty. Both maps have been rebuilt, not just enlarged.

Blind Switchyard uses four bays of different lengths. Inspect north while
advancing east: holes on either side read "no wall", while the wall marker
identifies the drop. Turn south and sense the bottom, cross two cells, and restore
the inspection heading. Lateral spans are 3/2/5/4; drops are 2/4/3/5. Count four
bays, then change phase for a four-cell ascent to the exit. A fifth bay attempt
falls. The same front sensor therefore controls travel in one loop and measures
a side landmark in another. Blind forward travel and probing for an open side
both hit hazards. This level combines earlier concepts; its intended solution
does not use `if`, which remains available for alternative strategies.

The Folded Circuit rotates this inspection problem into a tall board. There are
two pairs of bays, with lateral spans 2/4/1/3 and drops 3/2/4/3. At a marker,
branch on the forward reading: a wall means turn immediately; an open tile means
advance once before turning. Both cases occur. A separate connector follows each
pair, making nested counted loops useful; flattening the pattern misses the
connector. After the second pair, use a separate exit traversal. The intended
program combines nested counted loops, two kinds of sensed movement and branching.

Exact grids live in `src/levels/chapter4.js`; independently authored winning
programs live in `tests/chapter4-solutions.mjs`. They win in 165 and 163 ticks.
Tests reject the prior five Chapter 4 solutions, both old capstone programs,
Jonas's exact shortcut, and 1,224 compact follower variants per map (all legal
fixed travel counts, sensed travel, both turn preferences and side probes).
Replacing either reusable sensor loop with any fixed count from 1 to 99 fails.
Wrong bay/pair counts, flattening the pairs and always taking one junction action
also fail. These are targeted checks, not an exhaustive search of all programs.
No global optimality or branch-necessity claim is made
for these two capstones. Jonas approved release after reviewing the revision;
further player feedback can guide future tuning.

## Verification and integration

- `node tests/verify.mjs`: all campaign paths, seven decision solutions, the
  retained interpreter/proof regressions and new large-map/camera checks.
- `tests/navigation-browser.mjs`: both new programs entered through the editor,
  desktop/touch with normal/reduced motion, real pointer/wheel/native pinch,
  keyboard pan/zoom, live inspection/follow, reset/retry and seven viewport sizes.
- `tests/workshop-browser.mjs`: all 27 levels across seven sizes, both mobile
  sheet detents, equipment and animation regression checks.
- `tests/conditions-browser.mjs` and `tests/onboarding-browser.mjs`: typed operands,
  drag/drop, existing tutorials and chapter examples.

The original 16-line program exposed an existing editor hit-testing bug: clipped condition
slots above the scrolled program could intercept a palette tap. `slotAt` now
rejects points outside the visible program viewport. The new browser flow
regresses this while entering the new 20- and 30-line programs.
Loading a level or clearing its program also resets editor scroll to line 01;
the previous level's long-program scroll position must not obscure the beginning.

Camera input is opt-in to `createScene` via its controls element; the title teaser
keeps its existing framing. Overview is allowed below 14px; Follow robot raises
the tile size to at least 24px, with zoom capped at 64px. Manual gestures pause
following. Controls remain available during execution, with no live zoom
announcements. Screenshots from browser verification are in ignored `tests/tmp/`.

## Release approval — 2026-10-14

Jonas requested: “OK, make a PR to main and merge it. Update the documentation
and close the issue.” This authorizes publication of the current camera and
harder-level revision, without another preview approval gate. The retained Node
suite passed again for release. Desktop/touch normal/reduced-motion navigation,
both new solutions, editor scroll reset and seven viewport layouts passed on
the final implementation. Prior Workshop, condition-slot and onboarding browser
regressions also passed during this work. Version remains v0.4 because no new
curriculum chapter was added. The PR links and closes #38 on merge.

Release delivery resumed on 2026-10-17 in
[PR #45](https://github.com/jeriks54/loco/pull/45), targeting main. The feature
commit is `8bb83f9`; Vercel deployment and preview-comment checks passed before
the release-documentation follow-up. The merge closes
[issue #38](https://github.com/jeriks54/loco/issues/38).
