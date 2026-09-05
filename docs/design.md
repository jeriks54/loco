# LoCo — Design

Architecture and tech decisions for LoCo. Guiding principle from prior art (the `web-game` repo): **vanilla web stack, zero build config, static deploy.**

## 1. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Rendering (maze, robot) | HTML5 `<canvas>` 2D | Full control over grid + animation, no dependencies |
| UI (editor, palette, screens) | DOM + CSS | Drag & drop, buttons, level select are easier as DOM than canvas |
| Logic | Vanilla ES modules | No framework, no build step — Vercel serves files as-is |
| Persistence | `localStorage` | Client-only progress saving |
| Hosting | Vercel (already wired) | Auto-deploy from `main` |

No bundler, no framework. If tooling ever becomes necessary, revisit — it should not be needed at this scale.

## 2. Architecture

Small set of ES modules with one-way dependencies:

```
src/
  main.js            boot: wires screens, loads level registry
  levels/
    chapter1.js      level definitions (one module per chapter)
    index.js         ordered registry of all levels
  game/
    state.js         level state: grid, robot pose, goal, memory size
    executor.js      interprets the block program, emits step events
  render/
    scene.js         draws grid, walls, goal, robot; animates moves/turns
  ui/
    editor.js        program list + memory slots, drag & drop
    palette.js       available command blocks for the current level
    hud.js           run/stop/speed controls, level result overlay
    screens.js       title / level select / game screen switching
  persist.js         load/save progress in localStorage
```

**Data flow:** `editor` produces a program (ordered list of block ids) → `executor` walks it against `state`, emitting events (`step`, `moved`, `turned`, `crashed`, `finished`, `goal`) → `scene` animates movement events → `editor` highlights the current block on `step` events (the program pointer) → `hud` reacts to terminal events.

## 3. Level format

Levels are plain JS objects (modules, not JSON, so they can be validated on import):

```js
export default {
  id: 'ch1-03',
  name: 'Zigzag',
  grid: [
    '#######',
    '#S.#..#',
    '#..#.G#',
    '#######',
  ],
  startDir: 'E',                       // N | E | S | W
  memory: 6,                           // program slots — the core constraint
  blocks: ['move', 'turnLeft', 'turnRight'],
  par: 5,                              // optional: target block count (post-MVP scoring)
};
```

Grid legend: `#` wall, `.` floor, `S` start, `G` goal.

## 4. Execution model

- A program is an ordered array of block ids, `length <= memory`.
- The executor is a tick machine: one block per tick; a timer drives ticks so animation can pace them (speed control changes the tick interval).
- Each tick first emits `step` with the index of the executing block — the editor uses it to highlight the current block (program pointer).
- Crash rule: `move` into a wall or out of bounds → emit `crashed`, halt.
- Reaching the goal tile at any point → emit `goal`, halt (win).
- Executor is deterministic and pure w.r.t. state — easy to unit-test later.

## 5. Drag & drop editor

- Palette shows the blocks unlocked for the current level; dragging a block creates a **copy** (blocks are reusable, memory is the limit).
- Program area renders the program as **numbered mono lines**, one per memory slot ("program-as-lines", shipped with M2 / issue #9); loop bodies indent per nesting depth and `repeat` lines carry ± steppers for the count (no typing). Drops insert a line at position; over-capacity drops reject.
- Implemented with Pointer Events (mouse-first; also works on touch later) rather than the HTML5 DnD API — more controllable styling and animation.
- Click a placed line to remove it. "Clear" button empties the program.
- Layout shell: board (canvas) and editor are self-contained panels in a flex layout — desktop shows the board left, editor right. Panels must not depend on their position, so the mobile mode (maze full-screen, program as a bottom sheet) is a layout-only change — see §8.1. On touch, drag is complemented by tap-to-add (already shipped: a pointerup under the 5px drag threshold appends the block).

## 6. Rendering

- Canvas is sized to the level grid with a fixed tile size (letterboxed/responsive via CSS).
- Robot is a simple vector-drawn sprite with a facing indicator; moves/turns tween between tiles over one tick.
- Crash feedback: brief shake + color flash. Goal feedback: simple celebration pulse.

## 7. Persistence

`localStorage['loco.progress.v1'] = { completed: ['ch1-01', ...] }` — level select shows completion; nothing else stored in MVP.

## 8. Milestones

| Milestone | Deliverable |
|---|---|
| **M0** | Requirements + design docs (this) — *awaiting review* |
| **M1** | Playable core: renderer + editor + executor + placeholder levels (grew to 7 chapter-1 levels post-merge) |
| **M2 (MVP)** | Update 2 pulled forward (decision D1, `level-design.md`): `repeat`/`while`/`end` loops + chapter-2 pack, lines-mode editor (issue #9), persistence, level-select polish → `v0.1` |
| **M3** | Update 3: sensors, memory upgrades — chapter 3 `loop until <condition>` + robot sensor (#17), chapter 4 `if` statements (#18), and the `repeat` → `loop` rename / chapter-2 rework (#16) |
| **M4** | Update 4: mobile layout — board on top, program as a bottom sheet (decisions in §8.1) |

### 8.1 M4 — mobile layout (decided 2026-09-05, deferred — not built yet; tracked in issue #15)

Recorded so the choices survive; implementation is roadmap work, deliberately not started.
Driver: jonas plays on a phone and currently has to rotate to landscape, because
`.game-layout` is a fixed `minmax(0,1fr) 340px` grid and `main.css` has no width-based
media query at all.

Decisions:

- **Breakpoint — width, not orientation or pointer.** `max-width: ~900px` switches to
  board-on-top + bottom sheet. Catches portrait phones *and* narrow desktop windows.
  Landscape phones get the sheet too: ~390px of height is too cramped for the sidebar.
- **Handle — grip bar with a chevron inside it.** Drag the bar to slide, tap the chevron
  to snap between detents. The chevron is the keyboard / assistive-tech path. Two detents:
  collapsed (peek) and expanded (`max-height ~70vh`, program list scrolls internally).
- **Peek bar contents — ▶ Run + memory count (`3 / 8`).** Program, collapse, run while
  watching the maze; no expand-collapse dance. Reset and the ×½/×1/×2 speed group live
  inside the expanded sheet.
- **On run — sheet auto-collapses** so the board re-fits to full height. Snaps instead of
  animating under `prefers-reduced-motion`.
- **Tile floor drops on narrow screens.** `MIN_TILE` (`src/render/scene.js`) is 28px, which
  overflows a ~390px viewport for the 16-cell-wide levels (ch2-01, ch2-05, ch2-06, ch2-08):
  16 × 28 = 448px against ~307px of usable panel width, silently clipped by
  `body { overflow-x: hidden }`. Lower the floor to ~18px so the whole maze always fits —
  chosen over pan/pinch-zoom to keep mobile to a single gesture.

Constraints for whoever builds it:

- **Gesture arbitration is the main risk.** Palette chips already use Pointer Events with
  `touch-action: none` + pointer capture, and drops are hit-tested against the program
  list's bounding rect. The sheet must be draggable *only* by its grip bar, or chip drags
  and sheet drags fight each other. Drops outside the sheet stay no-ops (acceptable).
- **Tap-to-add already exists** — `editor.js` treats a pointerup under the 5px threshold as
  "append this block". That satisfies the tap half of requirements §5.3 today, append-only.
- **Board re-fitting is free.** `fit()` + the existing `ResizeObserver` recompute from panel
  size, and robot pose is kept in grid space, so mid-animation resize is already safe. Verify
  no jank from continuous refit while dragging the sheet; refit on settle if there is.
- **Small but easy to miss:** `env(safe-area-inset-bottom)` padding under the peek bar (iOS
  home indicator), and the result overlay's Retry/Next buttons at the smallest board size.

## 9. Workflow

### 9.1 Git & deploy

- One feature branch per milestone (`feat/mN-...`), one PR per milestone; incremental conventional-ish commits (`feat:`, `docs:`, `fix:`, ...) referencing GitHub issues.
- Merge only after jonas play-tests the PR's Vercel preview and explicitly approves.
- Auto-deploy: `main` → production (Vercel); each PR gets its own preview URL — the play-test environment.
- Progress tracked in GitHub issues, labeled per milestone (`M1`, `M2`, ...).

### 9.2 Collaboration model

| Role | Who | Responsibilities |
|---|---|---|
| Vision & design | jonas + assistant | Docs, level design intent, difficulty curve, what "fun" means |
| Team manager | assistant | Written briefs per task, delegation, code review, integration, issue triage |
| Implementation | Subagents | Code from briefs (docs + contracts + conventions); nothing is committed before review |
| Play-testing — feel/fun | jonas | Plays the Vercel preview against a checklist provided by the assistant |
| Play-testing — systematic | assistant | Checklists, edge cases, code-level verification |

Principles:

- One agent per cohesive task; parallel agents only where scopes are disjoint (level packs, polish passes, bug batches). Trivial fixes the team manager may apply directly.
- Code review: the team manager reviews every delivery against docs, brief, and checklist (coding agents self-review before hand-off). For high-stakes deliveries or perception passes (graphics, level design) an independent critic agent may be added.
- Quality via gates, not crunch: each milestone gets a short acceptance checklist agreed before play-testing; findings become ranked GitHub issues feeding the next fix round. "Awesome" is reached through repeated tight play-test loops.
- Docs are reviewed before implementation; design decisions live in this document, not in code.

## 10. Open design questions

- Robot board sprite: M1 shipped a facing chevron; upgrade to a proper glyph robot (welcome-mascot lineage, canvas-rendered, no image assets) tracked in issue #8 (label `roadmap`).
- Sound: skip for MVP; tiny synth blips could come later.
- Accessibility (color-blind safe tiles, reduced motion) — track as polish items, cheap to include from the start of M1.
- Mobile UX details (bottom-sheet gesture vs arrow button, tap-to-add interaction) — **resolved 2026-09-05**, recorded in §8.1 and tracked in issue #15 (label `roadmap`); still unbuilt, shell must stay ready for it.
- Loop vocabulary rework — **decided 2026-09-05, deferred**: `repeat` is renamed `loop`; `while front clear` leaves chapter 2 (which becomes counted-loops only) and returns in chapter 3 as `loop until <condition>` driven by a robot sensor. Tracked in #16 (rename + chapter-2 rework; ch2-05 and ch2-06 become unsolvable without `while`, so Part B needs redesigning) and #17 (chapter-3 conditions). Settled in #17: `until` keeps its literal sense and the predicate is `blocked` — **`loop until front is blocked`** reproduces today's `while front clear` behaviour; the condition vocabulary is predicate-based, so `whileFrontClear` does not carry over.

## 11. Visual language

Locked 2026-08-23 (decided with the welcome-screen warm-up): **ASCII aesthetic inside a modern mobile app** — terminal/roguelike glyph art with contemporary app polish.

- **Typography:** two voices — clean system sans for human-facing copy (subtitle, tagline, buttons, tab labels); JetBrains Mono for terminal/ASCII elements (maze art, boot log/ticker, version).
- **Palette:** warm green-tinted charcoal surfaces, near-white text, muted grey-green secondary text, one mint neon accent. Reference: `docs/reference/welcome-mockup.png`. Exact values live as CSS custom properties in `styles/main.css` (source of truth).
- **Decoration:** figlet-style ASCII logo (block glyphs, mint glow — user preferred it over a line-art SVG variant, 2026-08-25); ASCII maze teaser with the robot and a glowing path to an `[EXIT]` badge; box-drawing wall fragments; blinking robot eyes. No code-rain background, no scanlines/CRT kitsch — it should feel 2026, not 1983.
- **Welcome structure (per reference):** figlet logo → maze teaser → tagline → outline-glow "Start Game" + secondary "Tutorial" → bottom tab bar (Settings / High Scores) with mini version. No subtitle line. Not-yet-built modules answer with a terminal "not found" joke.
- **Motion:** subtle — fade-ins, cursor blink, glow pulses; must honor `prefers-reduced-motion`.
- **Layout:** desktop-first for gameplay (requirements §3.7; mobile arrives with Update 4). The welcome screen is the exception: it must also look good on a phone (centered column there).
- **Copy voice:** terminal boot voice — short, dry, playful; no lorem ipsum.
