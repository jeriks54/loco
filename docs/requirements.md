# LoCo — Requirements

**LoCo** ("Lines of Code") is a small 2D browser game that teaches programming fundamentals by having the player program a robot to navigate grid mazes.

## 1. Vision

Players do not steer the robot — they **program** it. Commands are dragged and dropped into the robot's limited memory, then executed. The memory budget forces players to discover loops, conditionals, and abstraction organically, because brute-force solutions stop fitting.

- **Genre:** Puzzle / educational programming game (Karel-the-Robot / Lightbot lineage)
- **Platform:** Browser (desktop-first, mouse), static hosting, no backend
- **Audience:** All ages, no prior programming knowledge assumed
- **Look & feel:** Clean, minimal, friendly — not childish

## 2. Core loop

1. **View** the maze (grid, entrance, goal, robot start).
2. **Build** a program by dragging command blocks into the robot's memory slots.
3. **Run** the program; the robot executes it step by step.
4. **Result:** reach the goal → level complete; crash or fall short → adjust and retry.

## 3. Gameplay requirements

### 3.1 World

- Tile-based grid; one robot move = exactly one tile (a "step" is unambiguous).
- Each maze has an **entrance** (robot start) and a **goal** tile.
- In early levels the entire maze is visible at all times.

### 3.2 Programming model

- The player composes programs by **drag & drop** from a palette of command blocks — no typing, no syntax.
- The robot's **memory holds a limited number of lines** (program slots). A level defines how many.
- Blocks may be used any number of times; the memory limit is the only constraint.

### 3.3 Commands

| Chapter / status | Commands |
|---|---|
| 1 — shipped | `move` (1 step forward), `turn left`, `turn right` |
| 2 — shipped in PR #21 | `loop n` / `end`, including nesting; count 1..99, default 2 |
| 3 — shipped in PR #24 | Automatic front wall sensor and `loop until [sensor] = [value]` / `end`; fill with wall sensor and blocked |
| 4 — planned #18 | `if` using the same condition vocabulary |
| 5 — later | Explicit ladder `climb`, combined concepts, memory upgrades |

### 3.4 Execution

- The program runs step by step with visible robot animation.
- Run controls: **run**, **stop/reset**, and speed control (no step-through in MVP).
- While running, a **program pointer** highlights the block currently executing so the player always sees where in the program the robot is.

### 3.5 Fail states

- Robot moves into a wall or off the maze → **crash**: the run ends immediately, level is retried with the program preserved.
- Robot enters a hole → **fell**: terminal failure; Retry preserves the program.
- Program finishes without reaching the goal → retry (program preserved).
- Unbalanced loops/ends, an incomplete `loop until` condition, and a sensed loop on a level without the required sensor all refuse execution without movement; 200 executed lines trigger the runaway guard.

### 3.6 Progression

- Levels are hand-crafted and grouped into chapters; each chapter introduces one concept.
- Difficulty rises via maze complexity **and** tight memory budgets.
- Later chapters unlock new blocks and larger memories in step with mazes that require them.
- Progress (completed levels) persists in the browser.
- The merged registry has 20 stable IDs: the original 15 plus ch3-01..05 from PR #24, keeping all prior level data and completion marks. Chapter 3 automatically supplies its sensor without requiring Chapter 2 completion. The added six-line capstone requires sensing even with counted loops available; retain the exhaustive counted-program check.

### 3.7 Layout & controls

- Desktop-first, mouse input.
- Maze/board on the **left** as the dominant element; program editor (palette + memory) on the **right**.
- Commands are placed by dragging them from the palette into memory.
- Shipped M4 mobile layout: at widths up to 900px the program editor is a floating bottom sheet with grip/chevron, Run/Reset/memory peek bar, tap-to-add and auto-collapse on run.

## 4. Current scope (through M22 slice 1)

Merged baseline is `main` at `0d209c1`. M2 shipped loops and M4 shipped mobile;
the counted-only chapter-2 revision #16 was play-tested and merged in PR #21 on
2026-09-07. Historical M2 mechanics remain in its brief. The #19 tile-system first
slice was play-tested and merged in PR #23 on 2026-09-08. M6's five Chapter 3
levels, the automatic front wall sensor and the two operand slots merged in PR #24
on 2026-09-09; #17 is closed and production deployed. M22 slice 1's direction-A
board materials and brass robot base sprite were merged to `main` on 2026-09-17;
its review, visual checks and contrast measurements are recorded in
`briefs/m22-board-art.md`.

In:

- Grid renderer, maze with entrance/goal, animated robot
- Drag & drop program editor with memory-slot limit
- Executor for `move` / `turn left` / `turn right`, counted `loop` / `end` and sensed `loop until` / `end`, with run/reset/speed controls
- Crash + fall-short fail states with retry
- **20 hand-crafted levels**: seven sequence, eight counted-loop and five sensing levels, with per-level palettes and memory budgets
- Level select screen; progress saved to `localStorage`
- Mobile bottom-sheet editor and touch controls
- Direction-A tabletop board art: walnut floor, clay-brick walls, wall shadows, material LOD, persistent start/exit markers, fatal-hole absence and brass robot base sprite

M5 shipped tile types and holes; M6 shipped conditional loops and one front wall sensor.
Out: `if`, hole/distance/terrain sensors, selectable mounting, rewards/shop,
ladders, memory upgrades and scoring. M22 slice 2's richer motion, outcome
feedback and UI-coherence work is also not yet shipped.

## 5. Roadmap (post-MVP)

1. **Shipped — #16, PR #21:** renamed historical M2 `repeat` to `loop`, removed `while front clear`, and replaced chapter-2 Part B with counted-loop exercises. All IDs and completion marks stay stable. See `level-design.md` §4 and `briefs/m3-counted-loops.md`.
2. **First slice shipped — #19, PR #23:** tile types, fatal holes, start marker and fall feedback. Original 15 levels preserved. Ladders and explicit `climb` wait for chapter 5.
3. **Shipped — #17, PR #24:** Chapter 3 automatically equips a front wall sensor. Players drag `wall sensor` and `blocked` into two initially empty fields of `loop until [sensor] = [value]`; the expression costs one line. Incomplete conditions refuse Run before movement. Holes occur in maps but have no sensor. Shipped contract: `briefs/m6-condition-slots.md`. Issue #17 is closed.
4. **Next — #18:** Chapter 4 adds `if`, reusing chapter 3's condition vocabulary. Roadmap item, not scheduled — do not start without jonas pulling it forward.
5. **Mobile — shipped in PR #20:** M4's width-based bottom sheet and touch controls are current functionality. Decisions and measured history remain in `design.md` §8.1.
6. **Ideas beyond:** chapter-5 Mastery and memory upgrades; fog of war, par/star ratings for efficient programs, level sharing.
7. **Slice 1 shipped — #22 / #8:** Direction A's tabletop board art and the brass robot base sprite are merged to `main` as `0d209c1` on 2026-09-17. The contract, acceptance checks and visual review are recorded in `briefs/m22-board-art.md`; the console chrome, puzzle readability and reduced-motion support remain preserved. M22 slice 2 still covers richer motion/outcome feedback and UI coherence.
8. **Sensor equipment and rewards — future intent, 2026-09-08:** allow players to select sensor mounting locations and acquire wall, hole, distance and terrain sensors. Decide later between buying with rewards earned from levels and automatic chapter rewards. No economy or inventory implementation in M6.

## 6. Non-functional requirements

- Pure client-side: vanilla HTML/CSS/JS, no build step, deployable as static files (Vercel).
- Runs smoothly on current Chrome/Edge/Firefox; keyboard not required for MVP.
- Load time: instant (static assets only, no framework).
- Desktop and mobile layouts use self-contained panels; the M4 bottom sheet is shipped.
- Retain dependency-free checks with `node tests/verify.mjs`; coverage and manual checks are documented in `tests/README.md`. No test framework or dependencies are required.

## 7. Open questions

- Star rating / par block-count per level? (Lean: post-MVP.)
- Future chapter counts and difficulty curves — defined in `level-design.md`; the current 20 IDs remain stable.
