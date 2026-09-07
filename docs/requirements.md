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
| 2 — counted-only revision #16 in review | `loop n` / `end`, including nesting; count 1..99, default 2 |
| 3 — planned #17, after tile types #19 | Robot sensor and `loop until <direction> <predicate>` |
| 4 — planned #18 | `if` using the same condition vocabulary |
| 5 — later | Explicit ladder `climb`, combined concepts, memory upgrades |

### 3.4 Execution

- The program runs step by step with visible robot animation.
- Run controls: **run**, **stop/reset**, and speed control (no step-through in MVP).
- While running, a **program pointer** highlights the block currently executing so the player always sees where in the program the robot is.

### 3.5 Fail states

- Robot moves into a wall or off the maze → **crash**: the run ends immediately, level is retried with the program preserved.
- Program finishes without reaching the goal → retry (program preserved).
- Unbalanced loops/ends refuse execution without movement; 200 executed lines trigger the runaway guard.

### 3.6 Progression

- Levels are hand-crafted and grouped into chapters; each chapter introduces one concept.
- Difficulty rises via maze complexity **and** tight memory budgets.
- Later chapters unlock new blocks and larger memories in step with mazes that require them.
- Progress (completed levels) persists in the browser.
- The current registry has 15 stable IDs: seven chapter-1 and eight chapter-2 levels. Revision #16 retains completion marks when replacing ch2-05..08 with Double Step, Beyond the Pattern, The Return Trip and Giant Steps.

### 3.7 Layout & controls

- Desktop-first, mouse input.
- Maze/board on the **left** as the dominant element; program editor (palette + memory) on the **right**.
- Commands are placed by dragging them from the palette into memory.
- Shipped M4 mobile layout: at widths up to 900px the program editor is a floating bottom sheet with grip/chevron, Run/Reset/memory peek bar, tap-to-add and auto-collapse on run.

## 4. Current scope (v0.1 and revision #16)

Production baseline is `main` at `32a71ae`. M2 shipped loops and M4 shipped mobile;
the counted-only chapter-2 revision #16 is in review, awaiting PR/play-testing and
explicit production-merge approval. Historical M2 mechanics remain in its brief.

In:

- Grid renderer, maze with entrance/goal, animated robot
- Drag & drop program editor with memory-slot limit
- Executor for `move` / `turn left` / `turn right` and counted `loop` / `end` with run/reset/speed controls
- Crash + fall-short fail states with retry
- **15 hand-crafted levels**: seven sequence levels and eight counted-loop levels, with per-level palettes and memory budgets
- Level select screen; progress saved to `localStorage`
- Mobile bottom-sheet editor and touch controls

Out (roadmap, §5): conditional loops, `if`, sensors, new tile types, memory upgrades, scoring.

## 5. Roadmap (post-MVP)

1. **Current review — #16:** rename historical M2 `repeat` to `loop`, remove `while front clear`, and replace chapter-2 Part B with counted-loop exercises. All IDs and completion marks stay stable. See `level-design.md` §4 and `briefs/m3-counted-loops.md`.
2. **Next — #19:** tile-type system, holes, visible start marker and richer board art. Define safe-to-enter sensing separately from blocked movement; holes are always fatal. Ladders and explicit `climb` wait for chapter 5.
3. **Then — #17 → #18:** chapter 3 introduces the robot sensor and `loop until <direction> <predicate>`; chapter 4 reuses the condition vocabulary for `if`. Four chapter-3 levels are designed in `level-design.md` §10; real-executor verification waits for implementation.
4. **Mobile — shipped in PR #20:** M4's width-based bottom sheet and touch controls are current functionality. Decisions and measured history remain in `design.md` §8.1.
5. **Ideas beyond:** chapter-5 Mastery and memory upgrades; fog of war, par/star ratings for efficient programs, level sharing.

## 6. Non-functional requirements

- Pure client-side: vanilla HTML/CSS/JS, no build step, deployable as static files (Vercel).
- Runs smoothly on current Chrome/Edge/Firefox; keyboard not required for MVP.
- Load time: instant (static assets only, no framework).
- Desktop and mobile layouts use self-contained panels; the M4 bottom sheet is shipped.
- Retain dependency-free checks with `node tests/verify.mjs`; coverage and manual checks are documented in `tests/README.md`. No test framework or dependencies are required.

## 7. Open questions

- Star rating / par block-count per level? (Lean: post-MVP.)
- Future chapter counts and difficulty curves — defined in `level-design.md`; the current 15 IDs remain stable through #16.
