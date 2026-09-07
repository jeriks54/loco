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

Optional browser acceptance checks use an already-installed Playwright module and
Chrome. Set `LOCO_PLAYWRIGHT_MODULE` to the absolute path to `playwright/index.mjs`,
then run `node tests/browser.mjs`. It starts a temporary localhost server and an
isolated headless browser, exercises all eight chapter-2 programs through the UI
on desktop and touch, and saves screenshots to the ignored `tests/tmp/` directory.
It uses offline fallback fonts, reduced motion, and accelerated executor timers;
real phone feel, animation and downloaded-font appearance still need play-testing.
