# Chapter 3 capstone — The Uneven Spiral (#17 / PR #24)

Jonas requested one more level where counted loops remain available but a winning
program requires `loop until`. This means necessary within the level's memory
budget: any fixed finite route could otherwise be spelled out with enough lines.

## Level contract

Append `ch3-05`, **The Uneven Spiral**, with automatic front wall sensor, six
memory lines, par six, and the full move/left/right/counted-loop/loop-until/end
palette. Preserve all 19 existing level definitions and completion IDs.

```
################
#S.............#
##############.#
###..........#.#
###.########.#.#
###.#G.......#.#
###.##########.#
###............#
################
```

16×9, start E. The seven corridor lengths are 13, 6, 11, 4, 9, 2 and 7.
Intended six-line program:

```
loop 7
    loop until [wall sensor] = [blocked]
        move
    end
    turn right
end
```

The same inner instruction adapts to each distance. The goal ends the seventh
iteration before its turn. Counts above seven can also win because victory
interrupts execution; choosing a unique outer count is not the lesson.

## Required proof

The real executor already reaches the goal in 180 ticks (below 200). Independent
primitive-only BFS gives 58 lines (52 moves, six turns). That alone does NOT prove
counted loops insufficient, so acceptance also requires exhaustive search:

- Every balanced program of length 1–6 over move, left/right, counted loop and end.
- Every loop count 1–99, including nested and empty loops; no geometric assumptions
  that could accidentally exclude backtracking, turn-only bodies or early wins.
- Exact current 200-tick semantics, immediate goal termination, wall collision.
- Templates without a move can be skipped: start and goal are distinct, so they
  cannot win. Unbalanced programs are refused by the real executor and cannot win.
- An independent evaluator must be cross-checked against the real executor on
  representative programs, including any winning counterexample if found.

Do not claim the level requires sensing unless the search finds no counted-only
winner. Retain the exhaustive check so changing the map or budget invalidates the
claim visibly. Existing routes/IDs remain unchanged; append only this one level.

## Acceptance

Build the nested sensed program through the actual two-slot editor on desktop and
phone, including drag/tap operands and seven-count stepper. Confirm six memory
lines, correct nesting/highlighting, 16-wide mobile fit, goal/Retry/Reset and saved
completion. Review narrow screenshots; run the previous chapter regressions.
Publish the new level on the existing PR #24 preview, without merging production.

## Verified results — 2026-09-09

- A GPT-5.6-Luna high agent wrote the independent counted-only search. Manager
  reviewed its grammar and interpreter, independently reproduced its result, and
  added the retained cross-checks in `tests/spiral-proof.mjs`.
- All 1,687,728 balanced movement-containing programs of 1–6 lines were checked;
  none won. Every loop count 1–99 is included. The total agrees with the independent
  sum of Catalan(k) × choose(n,2k) × (3^(n−2k) − 2^(n−2k)) × 99^k over n=1..6
  and possible loop-pair counts k. This catches incomplete enumeration.
- Independent evaluation agrees with the real executor on 1,230 programs over
  spiral, open-box and hole fixtures. A three-line corridor positive control is
  found by the search and wins in the real executor.
- The six-line sensed program wins in 180 ticks; primitive BFS is 58 lines.
  Verification also preserves the exact previous 19 level definitions.
- All five Chapter 3 levels pass the two-slot editor flow on desktop/touch, and
  the spiral fits 280/320/390/900/901px. Manager reviewed the phone screenshot.
  Automated browser flows use fallback fonts and accelerated ticks; puzzle feel
  remains Jonas' play-test. No executor rules were changed for this level.

Merged with PR #24 to `main` as `ee25b75` on 2026-09-09; the registry is 20 levels
and `node tests/verify.mjs` still reports no counted-only spiral win.
