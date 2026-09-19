# LoCo — cold-start briefing

LoCo ("Lines of Code") is a browser puzzle game that teaches programming: you drag command
blocks into a robot's limited memory slots, then run it through a maze. The memory limit *is*
the puzzle. Vanilla HTML/CSS/JS — **no dependencies, no build step, no test framework**, static
files deployed by Vercel.

Read this, then `docs/design.md` §9 (workflow, roles, delegation protocol). Everything else is
indexed below. **Do not write code until jonas gives an explicit green light** — docs are
reviewed first, every time.

## State as of 2026-09-19

Merged baseline: `main` = `ee25b75` (PR #24). Chapter 4 is implemented in the
working tree pending final review and Jonas' play-test. Shipped features:

- **Chapter 1 — Sequence**, 7 levels (`ch1-01..07`), move / turn left / turn right.
- **Chapter 2 — Loops**, 8 levels (`ch2-01..08`), programs rendered as numbered mono lines. Counted `loop n` / `end` replaced historical M2 `repeat` / `while front clear` in PR #21.
- **Chapter 3 — Sensing**, 5 levels (`ch3-01..05`), automatic front wall sensor and player-constructed `loop until [wall sensor] = [blocked]` / `end` via two typed operand slots. Shipped in PR #24.
- **Persistence** — `localStorage['loco.progress.v1']` stores completed level ids only. Programs are never saved, so block renames have no migration cost.
- **M4 mobile bottom sheet** (PR #20) — under `max-width: 900px` the board fills the screen and the program panel is a floating translucent overlay sheet with a grip + chevron, a peek bar carrying Run / Reset / memory count, and auto-collapse on run. Play-tested on a Samsung S26 in Chrome.

20 merged levels across three chapters; Chapter 4 adds five working-tree levels
(`ch4-01..05`) without changing the existing IDs.
Widest grids are 16 cells (ch2-01, ch2-08, ch3-03, ch3-05).

**Completed revision #16:** `feat/m3-counted-loops`, approved for implementation on
2026-09-06, play-tested and merged on 2026-09-07 in PR #21 (`6a67e86`). The runtime uses only
counted `loop n` / `end` (nested, default 2, integer 1..99); `repeat` and
`whileFrontClear` support are removed without aliases. Part B is now Double Step,
Beyond the Pattern, The Return Trip and Giant Steps (ch2-05..08). All 15 IDs,
chapter-1 levels, and chapter-2 Part A grids/budgets stay stable; stored completion
marks are preserved.

**Completed #19 first slice:** tile lookup, persistent start marker, fatal holes,
fall feedback and reliable restart shipped in PR #23 on 2026-09-08. Ladders remain
future work. `node tests/tile-server.mjs` still serves the isolated hole workshop.

**Completed #17 / M6:** Jonas requested implementation of the agreed Chapter 3 plan
on 2026-09-08. `feat/m6-front-wall-sensor` adds five levels with automatically
fitted front wall equipment. After the first preview Jonas requested two typed
operand slots: `loop until [wall sensor] = [blocked]` / `end`, initially empty.
See `docs/briefs/m6-condition-slots.md` for the corrective implementation contract.
The fifth level, The Uneven Spiral, adds unequal corridor lengths in six memory
lines. Exhaustive search of 1,687,728 counted-only programs finds no winner;
the sensed solution wins in 180 ticks. See `docs/briefs/m6-uneven-spiral.md`.
Holes are hazards, never detected by this sensor. No mounting selectors, shop,
currency or equipment inventory. Brief: `docs/briefs/m6-front-wall-sensor.md`.
Merged to `main` in PR #24 as `ee25b75` on 2026-09-09; issue #17 closed and the
production deployment followed the same minute.
`node tests/tile-server.mjs --game` serves the full game
at localhost:4175.

Future sensors are equipment players acquire and mount: wall, hole, distance and
terrain types. Reward purchases versus chapter rewards is undecided. This replaces
the older globally selectable direction/predicate plan; see level-design §9.

Coding agents use **gpt-5.6-luna**, reasoning **high**, at Jonas' request to reduce
usage. Manager reviews every diff and independently verifies; agents never run git.


Run retained checks with `node tests/verify.mjs`; see `tests/README.md` for coverage
and browser play-testing. These use the real executor plus independent path search,
with no test framework or dependencies.

## What's next

Open roadmap issues, all labeled `enhancement` + `roadmap`:

| # | What | Note |
|---|---|---|
| **#18** | Chapter 4 — `if` statements | Implemented in the working tree; reuses chapter 3's condition model |
| **#19** | Tile types + map art | First slice shipped PR #23; ladders stay with chapter 5 |
| **#8** | Robot board sprite (replace the facing chevron) | Cosmetic; touches `scene.js`, so never parallel with renderer work |
| **#22** | Improve the game's overall graphics | Direction A (tabletop board) agreed 2026-09-14 against `docs/reference/m22-board-directions.html`; rules in `design.md` §12, contract in `briefs/m22-board-art.md`. Slice 1 = board materials + robot base sprite (#8); slice 2 = motion/feedback/UI coherence |

Shipped and closed: **#17** (Chapter 3 — front wall sensor + constructed loop
condition, two operand slots, five levels, no hole sensor) in PR #24.

Chapter 3, the tile groundwork, M22 slice 1 and the Chapter 4 implementation are
represented in the current working tree. Equipment acquisition and mounting, M22
slice 2, memory upgrades and explicit ladder `climb` remain future work.

## Where things are documented

- `docs/design.md` — architecture (§2), level format (§3), editor (§5), milestones (§8), **M4 mobile decisions (§8.1)**, workflow + roles + **delegation protocol (§9)**, open design questions (§10), visual language (§11).
- `docs/level-design.md` — curriculum map (§2), counted-loop mechanics and chapter-2 revision contracts (§3–§4), difficulty/memory policy (§5), decisions (§7), sensor equipment direction (§9), five Chapter 3 levels (§10) and the fixed Chapter 4 pack (§11).
- `docs/requirements.md` — the product requirements and the post-MVP roadmap (§5).
- `docs/briefs/` — milestone contracts, including `m7-if-branching.md` and historical M3/M5/M6 records.
- `tests/README.md` — retained Node verification and browser play-test checklist.

## Hard rules

- **No code without jonas' explicit green light.** Docs first, reviewed before implementation.
- **Pushes, PRs and merges only on his explicit instruction.** Merging `main` deploys to production.
- One branch per milestone (`feat/mN-…`), one PR per milestone, incremental conventional-ish commits referencing issues. **Merged branches are never deleted** in this repo — don't tidy them.
- **Agents never run git.** The manager reviews and commits everything. See `docs/design.md` §9.3 for the full delegation protocol, including how to detect a stalled agent.
- **Self-reported verification is never accepted.** An M2 level pack claimed it was verified and failed 7 of 8 checks under real cross-check. Recompute independently.
- `.gitignore` carries jonas' uncommitted duplicate `.vercel` line. **Leave it alone** — do not commit or revert it without asking.
- Visual identity is locked (`docs/design.md` §11): JetBrains Mono for terminal elements, system sans for human copy, dark graphite palette, one mint accent, restrained motion that honours `prefers-reduced-motion`.

## Known loose ends

- **Three dead buttons on the title screen.** Tutorial, Settings and High Scores all still answer with the `> loading X.module .......... not found` joke (`main.js` wires every `[data-module]` except Start Game to it). Documented as intentional in `design.md` §11, but it shipped, and Tutorial is the biggest onboarding gap for a game whose whole promise is teaching.
- **Five M4 play-test items were never reported on** before the merge: chip-drag versus sheet-drag arbitration, right-edge clipping on ch2-01/ch2-08, the board not rescaling across detents, the desktop check across 900px, and heading legibility over the maze. The chip-drag one is the interaction that could only be verified by reading code — look there first if anything feels off.
- **Sheet translucency is a dial, not a settled value.** Currently 25% leak. `styles/main.css`'s "Sheet translucency" comment has the measured contrast table and how to change it.
- **Start marker:** persistent outlined `S` shipped in PR #23.
