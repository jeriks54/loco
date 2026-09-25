# LoCo — Requirements

**LoCo** ("Lines of Code") is a small 2D browser game that teaches programming fundamentals by having the player program a robot to navigate grid mazes.

## 1. Vision

Players do not steer the robot — they **program** it. Commands are dragged and dropped into the robot's limited memory, then executed. The memory budget forces players to discover loops, conditionals, and abstraction organically, because brute-force solutions stop fitting.

- **Genre:** Puzzle / educational programming game (Karel-the-Robot / Lightbot lineage)
- **Platform:** Browser (desktop-first, mouse), static hosting, no backend
- **Audience:** All ages, no prior programming knowledge assumed
- **Look & feel:** Warm workshop; clear overhead maze and robot, readable equipment, friendly coordinated controls and surfaces.

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
| 4 — shipped in Chapter 4 | `if` / `else` using the same condition vocabulary |
| 5 — later | Explicit ladder `climb`, combined concepts, memory upgrades |

### 3.4 Execution

- The program runs step by step with visible robot animation.
- Run controls: **run**, **stop/reset**, and speed control (no step-through in MVP).
- While running, a **program pointer** highlights the block currently executing so the player always sees where in the program the robot is.

### 3.5 Fail states

- Robot moves into a wall or off the maze → **crash**: the run ends immediately, level is retried with the program preserved.
- Robot enters a hole → **fell**: terminal failure; Retry preserves the program.
- Program finishes without reaching the goal → retry (program preserved).
- Unbalanced loops/ends, unmatched or duplicate `else`, an incomplete `loop until`/`if` condition, and a sensed condition on a level without the required sensor all refuse execution without movement; 200 executed lines trigger the runaway guard.

### 3.6 Progression

- Levels are hand-crafted and grouped into chapters; each chapter introduces one concept.
- Difficulty rises via maze complexity **and** tight memory budgets.
- Later chapters unlock new blocks and larger memories in step with mazes that require them.
- Progress (completed levels) persists in the browser.
- The merged registry has 25 stable IDs: the original 20 plus ch4-01..05 from Chapter 4, keeping all prior level data and completion marks. Chapter 3 and Chapter 4 automatically supply the front-wall sensor without requiring earlier chapter completion. Chapter 4's five levels require branching within their memory budgets; retain independent real-executor cross-checks.

### 3.7 Layout & controls

- Desktop-first, mouse input.
- Maze/board on the **left** as the dominant element; program editor (palette + memory) on the **right**.
- Commands are placed by dragging them from the palette into memory.
- Shipped M4 mobile layout: at widths up to 900px the board keeps a stable size as the two-detent program sheet opens, with grip/chevron, Run/Reset/memory peek bar, tap-to-add and auto-collapse on run. At short heights the expanded sheet may cover part of the board; the collapsed board remains usable. Workshop uses opaque ivory sheet surfaces.

### 3.8 Visual clarity and sensor feedback

- The board and robot read from above: contiguous wall tops, distinct floor and holes, paired robot tracks, and a visible front direction.
- Fitted front-wall sensor hardware is visible and named. A marker shows exactly the adjacent tile being checked.
- The reading uses text and shape: “Wall detected” or “No wall detected.” Walls and the outer boundary are detected; floors, starts, goals and holes are not.
- Explain that the sensor does not detect holes and does not brake automatically. Never describe a negative reading as safe.
- During movement and turns, do not imply the sensor has already read the destination tile. During a fall, the reading is unavailable.
- Reduced-motion behavior preserves the same reading semantics and usable controls.

## 4. Current scope (through issue #37 title teaser)

Latest feature merge is PR #41 (`fee2bda`). M2 shipped loops and M4 shipped mobile;
the counted-only chapter-2 revision #16 was play-tested and merged in PR #21 on
2026-09-07. Historical M2 mechanics remain in its brief. The #19 tile-system first
slice was play-tested and merged in PR #23 on 2026-09-08. M6's five Chapter 3
levels, the automatic front wall sensor and the two operand slots merged in PR #24
on 2026-09-09; #17 is closed and production deployed. Chapter 4's conditional
branching shipped as `v0.4` in PR #27 on 2026-09-19. The selected Workshop graphics
redesign shipped in PR #28 and deployed on 2026-09-23. The title teaser shipped
in PR #41 on 2026-09-25. The visual contracts, reviews and validation are recorded
in `briefs/m22-workshop-implementation.md` and `briefs/issue-37-title-screen-plan.md`.

In:

- Grid renderer, maze with entrance/goal, animated robot
- Drag & drop program editor with memory-slot limit
- Executor for `move` / `turn left` / `turn right`, counted `loop` / `end`, sensed `loop until` / `end`, and `if` / `else` / `end`, with run/reset/speed controls
- Crash + fall-short fail states with retry
- **25 hand-crafted levels**: seven sequence, eight counted-loop, five sensing and five decision levels, with per-level palettes and memory budgets
- Level select screen; progress saved to `localStorage`
- Mobile bottom-sheet editor and touch controls
- Workshop graphics: overhead brass robot with paired tracks, walnut walls and light floor, recessed holes, persistent start/exit markers, coordinated ivory/forest-green controls, visible sensor equipment, adjacent-tile marker and explicit readings
- Title teaser: cropped Chapter 1 board and robot, one-command reveal, arrow-free Start Game button

M5 shipped tile types and holes; M6 shipped conditional loops and one front wall sensor; Chapter 4 adds front-wall `if`/`else` branching. M22 unified the board and interface while retaining the same sensor rules.
Out: hole/distance/terrain sensors, selectable mounting, rewards/shop,
ladders, memory upgrades and scoring. Issue #19 remains open for further tile types
and ladders. Issues #22 and #37 are closed after their visual updates shipped.

## 5. Roadmap (post-MVP)

1. **Shipped — #16, PR #21:** renamed historical M2 `repeat` to `loop`, removed `while front clear`, and replaced chapter-2 Part B with counted-loop exercises. All IDs and completion marks stay stable. See `level-design.md` §4 and `briefs/m3-counted-loops.md`.
2. **First slice shipped — #19, PR #23:** tile types, fatal holes, start marker and fall feedback. Original 15 levels preserved. Ladders and explicit `climb` wait for chapter 5.
3. **Shipped — #17, PR #24:** Chapter 3 automatically equips a front wall sensor. Players drag `wall sensor` and `blocked` into two initially empty fields of `loop until [sensor] = [value]`; the expression costs one line. Incomplete conditions refuse Run before movement. Holes occur in maps but have no sensor. Shipped contract: `briefs/m6-condition-slots.md`. Issue #17 is closed.
4. **Shipped — #18, PR #27:** Chapter 4 adds explicit `if`/`else` branching, reusing Chapter 3's front-wall condition vocabulary. The five-level pack and structural control-flow contracts are recorded in `briefs/m7-if-branching.md`; the release is `v0.4`.
5. **Mobile — shipped in PR #20:** M4's width-based bottom sheet and touch controls are current functionality. Decisions and measured history remain in `design.md` §8.1.
6. **Ideas beyond:** chapter-5 Mastery and memory upgrades; fog of war, par/star ratings for efficient programs, level sharing.
7. **Workshop graphics shipped — #22 / #8:** The selected warm Workshop design shipped in PR #28 and production deployed on 2026-09-23. It clarifies the overhead robot, equipment and sensor reading, and unifies the board, background and controls. Issues #8 and #22 are closed. Design and implementation record: `briefs/m22-workshop-implementation.md`.
8. **Sensor equipment and rewards — future intent, 2026-09-08:** allow players to select sensor mounting locations and acquire wall, hole, distance and terrain sensors. Decide later between buying with rewards earned from levels and automatic chapter rewards. No economy or inventory implementation in M6.
9. **Title teaser shipped — #37, PR #41:** The welcome screen hints at the Workshop through a cropped real board, one command and one legal move. Start Game has no arrow. Issue #37 is closed; see `briefs/issue-37-title-screen-plan.md`.

## 6. Non-functional requirements

- Pure client-side: vanilla HTML/CSS/JS, no build step, deployable as static files (Vercel).
- Runs smoothly on current Chrome/Edge/Firefox; keyboard not required for MVP.
- Load time: instant (static assets only, no framework).
- Desktop and mobile layouts use self-contained panels; the current Workshop mobile sheet has opaque ivory surfaces and keeps the board size stable across its detents.
- Retain dependency-free checks with `node tests/verify.mjs`; coverage and manual checks are documented in `tests/README.md`. No test framework or dependencies are required.

## 7. Open questions

- Star rating / par block-count per level? (Lean: post-MVP.)
- Future chapter counts and difficulty curves — defined in `level-design.md`; the current 25 IDs remain stable.
