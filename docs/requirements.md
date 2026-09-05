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

| Phase | Commands |
|---|---|
| MVP | `move` (1 step forward), `turn left`, `turn right` |
| Update 2 | `while` loops |
| Update 3 | `if` statements, sensors (e.g. distance to wall), memory upgrades |

### 3.4 Execution

- The program runs step by step with visible robot animation.
- Run controls: **run**, **stop/reset**, and speed control (no step-through in MVP).
- While running, a **program pointer** highlights the block currently executing so the player always sees where in the program the robot is.

### 3.5 Fail states

- Robot moves into a wall or off the maze → **crash**: the run ends immediately, level is retried with the program preserved.
- Program finishes without reaching the goal → retry (program preserved).

### 3.6 Progression

- Levels are hand-crafted and grouped into chapters; each chapter introduces one concept.
- Difficulty rises via maze complexity **and** tight memory budgets.
- Later chapters unlock new blocks and larger memories in step with mazes that require them.
- Progress (completed levels) persists in the browser.

### 3.7 Layout & controls (MVP)

- Desktop-first, mouse input.
- Maze/board on the **left** as the dominant element; program editor (palette + memory) on the **right**.
- Commands are placed by dragging them from the palette into memory.

## 4. MVP scope (v0.1)

In:

- Grid renderer, maze with entrance/goal, animated robot
- Drag & drop program editor with memory-slot limit
- Executor for `move` / `turn left` / `turn right` with run/stop/speed controls
- Crash + fall-short fail states with retry
- **~10–15 hand-crafted levels**, move/turn only, gradually shrinking memory budgets
- Level select screen; progress saved to `localStorage`

Out (roadmap, §5): loops, conditionals, sensors, memory upgrades, scoring.

## 5. Roadmap (post-MVP)

1. **Update 2 — Loops:** `while` blocks + a chapter of levels that only fit with loops.
2. **Update 3 — Sensing & decisions:** `if`, sensor unlocks (distance-to-wall, goal detection), memory upgrades as collectibles. *Decided 2026-09-05, deferred — issues #16/#17/#18, `design.md` §10, `level-design.md` §2:* split across chapters. Chapter 2 becomes counted-loops only (`repeat` renamed `loop`, `while front clear` removed — #16); chapter 3 introduces the robot sensor and `loop until <condition>` (#17); chapter 4 reuses that same condition vocabulary for `if` (#18). Memory upgrades stay with Mastery, now chapter 5.
3. **Update 4 — Mobile:** phone layout with the maze as the default view; the program panel opens as a bottom sheet (swipe up or arrow button); tap-to-add blocks alongside drag. *Decided 2026-09-05, deferred — see `design.md` §8.1:* width breakpoint (~900px) rather than orientation, grip bar + chevron handle, collapsed peek bar showing Run, Reset and the memory count, sheet auto-collapses when a run starts, and the canvas minimum tile size drops on narrow screens so the 16-wide levels fit.
4. **Ideas beyond:** new obstacle kinds (holes, ladders) via a tile-type system + richer board art — #19, infrastructure that later chapters consume; fog of war (maze not fully visible), par/star ratings for efficient programs, level sharing.

## 6. Non-functional requirements

- Pure client-side: vanilla HTML/CSS/JS, no build step, deployable as static files (Vercel).
- Runs smoothly on current Chrome/Edge/Firefox; keyboard not required for MVP.
- Load time: instant (static assets only, no framework).
- Desktop-first for MVP, but the UI is architected mobile-ready: panels are self-contained components (see Roadmap, Update 4).

## 7. Open questions

- Star rating / par block-count per level? (Lean: post-MVP.)
- Exact level count and difficulty curve per chapter — defined during level design.
