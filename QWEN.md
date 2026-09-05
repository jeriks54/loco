# LoCo — cold-start briefing

LoCo ("Lines of Code") is a browser puzzle game that teaches programming: you drag command
blocks into a robot's limited memory slots, then run it through a maze. The memory limit *is*
the puzzle. Vanilla HTML/CSS/JS — **no dependencies, no build step, no test framework**, static
files deployed by Vercel.

Read this, then `docs/design.md` §9 (workflow, roles, delegation protocol). Everything else is
indexed below. **Do not write code until jonas gives an explicit green light** — docs are
reviewed first, every time.

## State as of 2026-09-06

`main` = `f1d89f6`. Shipped and live in production:

- **Chapter 1 — Sequence**, 7 levels (`ch1-01..07`), move / turn left / turn right.
- **Chapter 2 — Loops**, 8 levels (`ch2-01..08`), `repeat n` / `while front clear` / `end`, programs rendered as numbered mono lines.
- **Persistence** — `localStorage['loco.progress.v1']` stores completed level ids only. Programs are never saved, so block renames have no migration cost.
- **M4 mobile bottom sheet** (PR #20) — under `max-width: 900px` the board fills the screen and the program panel is a floating translucent overlay sheet with a grip + chevron, a peek bar carrying Run / Reset / memory count, and auto-collapse on run. Play-tested on a Samsung S26 in Chrome.

15 levels total. Widest grids are 16 cells (ch2-01, ch2-08).

## What's next

Open roadmap issues, all labeled `enhancement` + `roadmap`:

| # | What | Note |
|---|---|---|
| **#16** | Rename `repeat` → `loop`; remove `while front clear` from chapter 2 | **Do this first.** ch2-05 and ch2-06 become *unsolvable* without `while` (no `repeat` in their palettes), so Part B needs redesigning, not just a palette edit |
| **#19** | Tile-type system + richer map art (holes, ladders) | Infrastructure, not graphics: `state.js` throws on any tile outside `# . S G`, and the world model is one `walls` Set behind a single boolean `isBlocked()` |
| **#17** | Chapter 3 — robot sensor + `loop until <direction> <predicate>` | Four levels already designed and verified in `docs/level-design.md` §10 |
| **#18** | Chapter 4 — `if` statements | Reuses chapter 3's condition model |
| **#8** | Robot board sprite (replace the facing chevron) | Cosmetic; touches `scene.js`, so never parallel with renderer work |

**Order: #16 → #19 → #17 → #18.** Chapter 3's `ch3-03` uses the renamed `loop`, and the
condition vocabulary should not be designed before the tile types it has to describe.

## Where things are documented

- `docs/design.md` — architecture (§2), level format (§3), editor (§5), milestones (§8), **M4 mobile decisions (§8.1)**, workflow + roles + **delegation protocol (§9)**, open design questions (§10), visual language (§11).
- `docs/level-design.md` — curriculum map (§2), chapter 2 as shipped (§3–§4), difficulty/memory policy (§5), **decisions D1–D14 (§7)**, risks (§8), **chapters 3–5 mechanics (§9)** and the **four verified chapter-3 levels (§10)**.
- `docs/requirements.md` — the product requirements and the post-MVP roadmap (§5).
- `docs/briefs/` — one implementation brief per milestone. `m4-mobile-sheet.md` is the most recent and shows the current house format, including its DOM and detent contracts.

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
- **The start tile is never drawn.** `S` gets an ordinary floor dot, so once the robot moves there's no trace of where it began. Folded into #19.
