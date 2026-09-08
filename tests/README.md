# Retained checks

Run from the repo root with Node.js 22 or newer:

```sh
node tests/verify.mjs
```

No dependencies or test framework are installed. The checks use the real game
executor with a synchronous fake timer queue, and an independent breadth-first
search over grid positions and headings using only each level's move/turn palette.
Every chapter-2 intended program must win within memory; its shortest loop-free
alternative must exceed memory. This proves that a loop is needed, not that the
intended program is globally shortest or that nesting is mandatory.

`chapter2-solutions.mjs` records the reviewed programs independently of the runtime
level definitions. `preserved-levels.json` protects chapter 1 and chapter-2 Part A's
geometry/budgets against accidental changes during #16 (baseline `32a71ae`). Update
these hashes only when deliberately revising those levels, with review.

The suite also covers nested loops, count normalization, syntax refusal, step
events, goal interruption, obsolete token rejection, runaway limits, snapshots,
speed, stop, reset and restart of an executor. Browser/editor interaction and
human play-testing remain separate checks; this is not a substitute for either.

M5 adds `tiles.mjs` (also run by `verify.mjs`): full 15-level registry hash from
`6a67e86`, tile/safety classification, real fall event ordering, nested fall,
independent BFS excluding holes, and fresh-executor restart. `tile-fixtures.mjs`
contains test-only grids; production imports none of these files.

Optional browser acceptance checks use an already-installed Playwright module and
Chrome. Set `LOCO_PLAYWRIGHT_MODULE` to the absolute path to `playwright/index.mjs`,
then run `node tests/browser.mjs`. It starts a temporary localhost server and an
isolated headless browser, exercises all eight chapter-2 programs through the UI
on desktop and touch, and saves screenshots to the ignored `tests/tmp/` directory.
It uses offline fallback fonts, reduced motion, and accelerated executor timers;
real phone feel, animation and downloaded-font appearance still need play-testing.

Run `node tests/tiles-browser.mjs` with the same Playwright setting for real-paced
desktop/touch fall animation, reduced motion, repeated Run, Reset, Retry, safe
detour/completion and 280/320/390/900/901px tile screenshots. Canvas draw observations
check that shrinking happens at the hole after entry, without changing animation
or executor timing. Fonts use the same offline fallback.

For manual hole play-testing, run `node tests/tile-server.mjs` and open
`http://127.0.0.1:4174`. This dedicated test server serves the actual app with a
single workshop fixture instead of the level registry. Move twice to fall; use
Retry or Reset to return. Stop with Ctrl+C. It listens on localhost only, so it
does not provide a remote phone/Vercel fixture link. Existing levels and production
deployment remain unchanged; the workshop's progress is isolated by its origin.
