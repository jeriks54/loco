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
- Program area renders `memory` slots; drops insert at position, slots past capacity reject the drop.
- Implemented with Pointer Events (mouse-first; also works on touch later) rather than the HTML5 DnD API — more controllable styling and animation.
- Click a placed block to remove it. "Clear" button empties the program.
- Layout shell: board (canvas) and editor are self-contained panels in a flex layout — desktop shows the board left, editor right. Panels must not depend on their position, so the mobile mode (maze full-screen, program as a bottom sheet) is a layout-only change. On touch, drag will be complemented by tap-to-add.

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
| **M1** | Playable core: renderer + editor + executor + 3 placeholder levels |
| **M2 (MVP)** | 10–15 hand-crafted levels, tuning, level select, persistence → `v0.1` |
| **M3** | Update 2: `while` loops + loop chapter |
| **M4** | Update 3: `if`, sensors, memory upgrades |

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
- Mobile UX details (bottom-sheet gesture vs arrow button, tap-to-add interaction) — decided in Update 4; shell must stay ready for it.

## 11. Visual language

Locked 2026-08-23 (decided with the welcome-screen warm-up): **ASCII aesthetic inside a modern mobile app** — terminal/roguelike glyph art with contemporary app polish.

- **Typography:** two voices — clean system sans for human-facing copy (subtitle, tagline, buttons, tab labels); JetBrains Mono for terminal/ASCII elements (maze art, boot log/ticker, version).
- **Palette:** warm green-tinted charcoal surfaces, near-white text, muted grey-green secondary text, one mint neon accent. Reference: `docs/reference/welcome-mockup.png`. Exact values live as CSS custom properties in `styles/main.css` (source of truth).
- **Decoration:** figlet-style ASCII logo (block glyphs, mint glow — user preferred it over a line-art SVG variant, 2026-08-25); ASCII maze teaser with the robot and a glowing path to an `[EXIT]` badge; box-drawing wall fragments; blinking robot eyes. No code-rain background, no scanlines/CRT kitsch — it should feel 2026, not 1983.
- **Welcome structure (per reference):** figlet logo → maze teaser → tagline → outline-glow "Start Game" + secondary "Tutorial" → bottom tab bar (Settings / High Scores) with mini version. No subtitle line. Not-yet-built modules answer with a terminal "not found" joke.
- **Motion:** subtle — fade-ins, cursor blink, glow pulses; must honor `prefers-reduced-motion`.
- **Layout:** desktop-first for gameplay (requirements §3.7; mobile arrives with Update 4). The welcome screen is the exception: it must also look good on a phone (centered column there).
- **Copy voice:** terminal boot voice — short, dry, playful; no lorem ipsum.
