# LoCo — cold-start briefing

LoCo ("Lines of Code") is a browser puzzle game that teaches programming: you drag command
blocks into a robot's limited memory slots, then run it through a maze. The memory limit *is*
the puzzle. Vanilla HTML/CSS/JS — **no dependencies, no build step, no test framework**, static
files deployed by Vercel.

Read this, then `docs/design.md` §9 (workflow, roles, delegation protocol). Everything else is
indexed below. **Do not write code until jonas gives an explicit green light** — docs are
reviewed first, every time.

## State as of 2026-09-07

Merged baseline: `main` = `6a67e86` (PR #21). Shipped features:

- **Chapter 1 — Sequence**, 7 levels (`ch1-01..07`), move / turn left / turn right.
- **Chapter 2 — Loops**, 8 levels (`ch2-01..08`), programs rendered as numbered mono lines. Counted `loop n` / `end` replaced historical M2 `repeat` / `while front clear` in PR #21.
- **Persistence** — `localStorage['loco.progress.v1']` stores completed level ids only. Programs are never saved, so block renames have no migration cost.
- **M4 mobile bottom sheet** (PR #20) — under `max-width: 900px` the board fills the screen and the program panel is a floating translucent overlay sheet with a grip + chevron, a peek bar carrying Run / Reset / memory count, and auto-collapse on run. Play-tested on a Samsung S26 in Chrome.

15 levels total. Widest grids are 16 cells (ch2-01, ch2-08).

**Completed revision #16:** `feat/m3-counted-loops`, approved for implementation on
2026-09-06, play-tested and merged on 2026-09-07 in PR #21 (`6a67e86`). The runtime uses only
counted `loop n` / `end` (nested, default 2, integer 1..99); `repeat` and
`whileFrontClear` support are removed without aliases. Part B is now Double Step,
Beyond the Pattern, The Return Trip and Giant Steps (ch2-05..08). All 15 IDs,
chapter-1 levels, and chapter-2 Part A grids/budgets stay stable; stored completion
marks are preserved.

**Current work #19:** implementation on `feat/m5-tile-types`; see
`docs/briefs/m5-tile-types.md`. Jonas read and approved the focused tile-system,
start-marker and hole brief on 2026-09-07. Implementation and manager review are
complete; Node and desktop/touch checks pass. Jonas confirmed play-testing and
authorized commit/push on 2026-09-08. Production merge remains pending.
`node tests/tile-server.mjs` serves the
hole workshop at localhost:4174 without changing the production level registry.
For the game-logic and rendering coding agents, use **gpt-5.6-luna**, reasoning
**high**, as Jonas requested to reduce usage. The manager reviews both deliveries
and independently verifies integration; agents never run git.

Run retained checks with `node tests/verify.mjs`; see `tests/README.md` for coverage
and browser play-testing. These use the real executor plus independent path search,
with no test framework or dependencies.

## What's next

Open roadmap issues, all labeled `enhancement` + `roadmap`:

| # | What | Note |
|---|---|---|
| **#19** | Tile-type system + richer map art | **Implementation approved**: tile lookup, start marker and fatal holes; ladders stay with chapter 5 |
| **#17** | Chapter 3 — robot sensor + `loop until <direction> <predicate>` | Four levels designed and simulated in `docs/level-design.md` §10; real-executor checks follow implementation |
| **#18** | Chapter 4 — `if` statements | Reuses chapter 3's condition model |
| **#8** | Robot board sprite (replace the facing chevron) | Cosmetic; touches `scene.js`, so never parallel with renderer work |
| **#22** | Improve the game's overall graphics | Jonas requested 2026-09-07; agree visual direction with mockups, covering board, robot, feedback and UI consistency. Coordinate #8/#19; schedule separately |

**Order: #19 → #17 → #18.** Chapter 3's `ch3-03` uses the shipped `loop`, and the
condition vocabulary should not be designed before the tile types it has to describe.

## Where things are documented

- `docs/design.md` — architecture (§2), level format (§3), editor (§5), milestones (§8), **M4 mobile decisions (§8.1)**, workflow + roles + **delegation protocol (§9)**, open design questions (§10), visual language (§11).
- `docs/level-design.md` — curriculum map (§2), counted-loop mechanics and chapter-2 revision contracts (§3–§4), difficulty/memory policy (§5), **decisions D1–D14 (§7)**, risks (§8), **chapters 3–5 mechanics (§9)** and the **four proposed chapter-3 levels (§10)**.
- `docs/requirements.md` — the product requirements and the post-MVP roadmap (§5).
- `docs/briefs/` — one implementation brief per milestone. `m5-tile-types.md` is the current #19 proposal; `m3-counted-loops.md` records shipped #16. Earlier briefs retain their historical scope and decisions.
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

- **Version string is stale.** `index.html`'s tab bar and `main.js`'s ticker both say `v0.0.1` while the docs have called the game v0.1 since M2. Unresolved — ask jonas what it should read.
- **Three dead buttons on the title screen.** Tutorial, Settings and High Scores all still answer with the `> loading X.module .......... not found` joke (`main.js` wires every `[data-module]` except Start Game to it). Documented as intentional in `design.md` §11, but it shipped, and Tutorial is the biggest onboarding gap for a game whose whole promise is teaching.
- **Five M4 play-test items were never reported on** before the merge: chip-drag versus sheet-drag arbitration, right-edge clipping on ch2-01/ch2-08, the board not rescaling across detents, the desktop check across 900px, and heading legibility over the maze. The chip-drag one is the interaction that could only be verified by reading code — look there first if anything feels off.
- **Sheet translucency is a dial, not a settled value.** Currently 25% leak. `styles/main.css`'s "Sheet translucency" comment has the measured contrast table and how to change it.
- **Start marker:** merged baseline draws an ordinary floor dot; the M5 branch now draws a persistent outlined `S`, pending play-test and merge.
