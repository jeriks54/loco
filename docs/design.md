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

Retained dependency-free verification runs with `node tests/verify.mjs`; see
`tests/README.md` for coverage and the browser play-test checklist.

## 2. Architecture

Small set of ES modules with one-way dependencies:

```
src/
  main.js            boot: wires screens, loads level registry
  levels/
    chapter1.js      level definitions (one module per chapter)
    chapter2.js      eight counted-loop levels
    chapter3.js      four front-wall sensing levels (M6)
    index.js         ordered registry of all levels
  game/
    state.js         level state: grid, robot pose, goal, memory size
    executor.js      interprets the block program, emits step events
  render/
    scene.js         draws grid, walls, goal, robot; animates moves/turns
  ui/
    editor.js        program list + memory slots, drag & drop
    palette.js       available command blocks for the current level
    hud.js           run/reset/speed controls, level result overlay
    screens.js       title / level select / game screen switching
    sheet.js         mobile bottom-sheet gestures and detents
  persist.js         load/save progress in localStorage
```

**Data flow:** `editor` produces a program (simple-command strings and counted-loop objects) → `executor` walks it against `state`, emitting events (`step`, `moved`, `turned`, `crashed`, `fell`, `finished`, `goal`, `syntax`, `runaway`) → `scene` animates movement events → `editor` highlights the current block on `step` events (the program pointer) → `hud` reacts to terminal events.

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

Grid legend: `#` wall, `.` floor, `S` start, `G` goal; M5 adds `H` fatal hole.
M5 state adds row-major `tiles` and a separate `start` pose, retaining `walls` for
compatibility. `tileAt` returns a type or null outside the grid; `isBlocked` means
wall/outside, while `isSafeToEnter` accepts only floor/start/goal. See the approved
`briefs/m5-tile-types.md` for the exact table. Existing levels contain no holes.

## 4. Execution model

- A program is an ordered array, `length <= memory`: simple commands are `move`, `turnLeft`, `turnRight`, `end` strings; counted loops are `{ id: 'loop', count }` objects.
- M6 adds `{ id: 'loopUntil', sensor, value }`, displayed as
  `loop until [wall sensor] = [blocked]`. Both slots begin null and must be filled
  with typed palette operands; equality is fixed. A header
  checks the adjacent wall before each body iteration; true skips the body.
  Both loop types nest and share `end`. Missing/wrong operands or equipment refuse
  execution before movement. Counted and sensed headers each cost one tick.
- `loop n` … `end` repeats the body n times and supports nesting. Count defaults to 2 and is clamped to integer 1..99 (`LOOP_MIN` / `LOOP_MAX`). Chapter 2 has counted loops only; sensing belongs to future chapter 3. No `repeat` or `whileFrontClear` aliases remain in revision #16.
- Balance is validated before movement; unmatched openers/ends emit terminal `syntax`. The 200-executed-line guard emits terminal `runaway`.
- The executor is a tick machine: one block per tick; a timer drives ticks so animation can pace them (speed control changes the tick interval).
- Each tick first emits `step` with the index of the executing block — the editor uses it to highlight the current block (program pointer).
- Crash rule: `move` into a wall or out of bounds → emit `crashed`, halt.
- M5 hole rule: enter `H`, emit `moved`, then terminal `fell` in the same tick.
  Every Run restores the stable start pose and resets the scene before execution.
- Reaching the goal tile at any point → emit `goal`, halt (win).
- Executor snapshots the program and mutates only the supplied game state; DOM-free execution is covered by the retained Node checks.

## 5. Drag & drop editor

- Palette shows the blocks unlocked for the current level; dragging a block creates a **copy** (blocks are reusable, memory is the limit).
- Program area renders the program as **numbered mono lines**, one per memory slot ("program-as-lines", shipped with M2 / issue #9); loop bodies indent per nesting depth and `loop` lines carry ± steppers for the count (no typing). Drops insert a line at position; over-capacity drops reject.
- Implemented with Pointer Events for mouse and touch rather than the HTML5 DnD API — more controllable styling and animation.
- Click a placed line to remove it. "Clear" button empties the program.
- Layout shell: board (canvas) and editor are self-contained panels — desktop shows the board left, editor right; the shipped mobile mode uses a floating bottom sheet at widths up to 900px (see §8.1). On touch, drag is complemented by tap-to-add (a pointerup under the 5px drag threshold appends the block).

## 6. Rendering

- Canvas is sized to the level grid with a fixed tile size (letterboxed/responsive via CSS).
- Robot is a simple vector-drawn sprite with a facing indicator; moves/turns tween between tiles over one tick.
- Crash feedback: brief shake + color flash. Goal feedback: simple celebration pulse.
- M5 adds a persistent outlined `S`, double-rim inset holes, and a 180ms shrink/fade
  after movement into a hole. Reduced motion hides immediately; reset restores.
- M6 automatically equips `sensor: 'frontWall'` on Chapter 3 levels only. A square
  at the robot's front is hollow for no wall and filled for a wall/boundary. It
  rotates/fades with the robot; holes never trigger it. A short level explanation
  wraps above the game layout, so its height is naturally excluded from board fit.

## 7. Persistence

`localStorage['loco.progress.v1'] = { completed: ['ch1-01', ...] }` — level select shows completion; nothing else stored in MVP.

Revision #16 preserves all 15 level IDs and existing completion marks. Programs are
not persisted, so the block rename requires no migration. The replacement Part B
levels retain IDs ch2-05..08: Double Step, Beyond the Pattern, The Return Trip and
Giant Steps. Exact grids and solutions live in `level-design.md` §4.

## 8. Milestones

| Milestone | Deliverable |
|---|---|
| **M0** | Requirements + design docs — completed |
| **M1** | Playable core: renderer + editor + executor + placeholder levels (grew to 7 chapter-1 levels post-merge) |
| **M2 (MVP, historical)** | Update 2 pulled forward (decision D1, `level-design.md`): original `repeat`/`while`/`end` loops + chapter-2 pack, lines-mode editor (issue #9), persistence, level-select polish → `v0.1` |
| **M3 (#16, shipped PR #21)** | Counted-loop rename and chapter-2 Part B redesign; play-tested and merged 2026-09-07. Brief: `briefs/m3-counted-loops.md` |
| **M4 (shipped, PR #20)** | Mobile layout — board on top, program as a bottom sheet (decisions and history in §8.1) |
| **M5 (#19 first slice, shipped PR #23)** | Tile lookup, start marker and fatal holes; original 15 levels preserved. Merged 2026-09-08 as `2d4bd42`; ladders remain chapter-5 work |
| **M6 (#17, local implementation)** | Four Chapter 3 levels, fixed front wall sensor and `loop until wall ahead`. Approved plan 2026-09-08; contract: `briefs/m6-front-wall-sensor.md` |

Merged baseline: `main` at `2d4bd42` (PR #23). The roadmap order is
**#17 → #18**: chapter-3 sensing, then chapter-4 `if`; tile groundwork is shipped.
Memory upgrades and explicit ladder `climb` remain future chapter-5 work.

### 8.1 M4 — mobile layout (shipped in PR #20; issue #15)

The following records the original decisions and measured implementation history.
The original driver was phone play requiring landscape: the old `.game-layout`
used a fixed `minmax(0,1fr) 340px` grid without a width-based media query.

Decisions:

- **Breakpoint — width, not orientation or pointer.** `max-width: ~900px` switches to
  board-on-top + bottom sheet. Catches portrait phones *and* narrow desktop windows.
  Landscape phones get the sheet too: ~390px of height is too cramped for the sidebar.
- **Sheet model — floating overlay, not a push** (jonas' call, 2026-09-05). The sheet floats
  above the board, `position: absolute` inside `#screen-game`; the board panel reserves only
  the *collapsed* peek height, so the maze keeps **one stable size across both detents** and
  never rescales when the sheet opens, closes or is dragged. A pushing sheet was rejected: at
  the 70svh detent it leaves the board ~200px tall (a 16×9 level drops to ~19px tiles) and it
  rescales continuously during the drag — unreadable exactly when the player glances at the
  maze to plan. The expanded body is **slightly translucent** (blur where supported, solid
  fallback) so the maze stays visible through the sheet; grip and peek bar stay solid.
  Transparency has a legibility floor — mono lines must hold contrast over lit wall tiles and
  the glowing EXIT badge, and if they don't, opacity goes up rather than text getting lighter.
  **Settled 2026-09-05, then revised the same day on play-test.** Option (a) shipped first —
  cards opaque, so the maze showed only through the body's padding and the gutters between
  cards. jonas' verdict on a real phone: *"I see no transparency so I can not see the map."*
  Correct: the three `.panel-section` cards are most of the body's area, so (a) was
  effectively solid. Now **25% leak** — body `color-mix(in srgb, var(--surface) 50%,
  transparent)` over the maze, cards `color-mix(in srgb, var(--bg) 50%, transparent)` over
  the body. Measured against the real tokens: `--muted` (the uppercase section headings) is
  **5.01:1** over the board's dark surfaces and `--text` stays **13.2:1**, because `.program`
  keeps its opaque `var(--bg)` fill and `.block-chip` keeps `var(--surface-2)` — opacity is
  spent where it buys legibility and given up where it doesn't. Known cost: over a pure
  `--accent` backdrop (EXIT badge, robot glow) `--muted` falls to **2.90:1**; `blur(8px)`
  spreads it and it is a small transient region, not a background. Dial both percentages up
  together to trade see-through back for contrast — **0.75 / 0.70 is the most transparent pair
  that still holds 4.5:1 even over pure accent** (7.5% leak).
  Also fixed while revising: the translucency block was gated on
  `@supports (backdrop-filter: blur(8px))`, but the transparency comes from `color-mix` — an
  unrelated feature. Any browser with only `-webkit-backdrop-filter` (older iOS Safari), or
  with `backdrop-filter` but no `color-mix` (Safari < 16.2), dropped the whole block and
  rendered the sheet solid regardless of alpha. The gate now tests `color-mix`.
- **Handle — grip bar with a chevron inside it.** Drag the bar to slide, tap the chevron
  to snap between detents. The chevron is the keyboard / assistive-tech path. Two detents:
  collapsed (peek) and expanded (`min(70svh, …)`, program list scrolls internally).
- **Peek bar contents — ▶ Run + Reset + memory count (`3 / 8`).** Program, collapse, run
  while watching the maze; no expand-collapse dance. Reset sits in the peek bar too so a run
  can be aborted without expanding the sheet mid-run — amended 2026-09-05 while closing out
  the M1 issues, which surfaced that `executor.stop()` has no user-facing control at all, so
  Reset is the only abort and it always rewinds. The ×½/×1/×2 speed group stays inside the
  expanded sheet.
- **On run — sheet auto-collapses** so nothing obscures the maze while the robot moves. The
  board's size does not change: with the overlay model it is detent-independent. Snaps instead
  of animating under `prefers-reduced-motion`.
- **Tile floor drops on narrow screens.** `MIN_TILE` (`src/render/scene.js`) is 28px, which
  overflows a ~390px viewport for any level 11+ cells wide — ch2-01 (16), ch2-05 (14),
  ch2-06 (14), ch2-07 (12) and ch2-08 (16), five of the fifteen levels: 16 × 28 = 448px
  against ~307px of usable panel width, silently clipped by `body { overflow-x: hidden }`.
  Lowered to **14px**, not the 18px first proposed: manager verification against the real CSS
  measured 18px as still clamping below ~342px of viewport width, clipping ch2-01/ch2-08 by
  22px at 320px (SE1) and four levels by up to 62px at 280px (Fold cover), where the crop cuts
  ch2-08's EXIT badge. 14px fits a 280px viewport and costs nothing at 360px+, where the
  computed tile is 19–22 and the floor never binds. Chosen over pan/pinch-zoom to keep mobile
  to a single gesture.

Original implementation constraints, retained for regression review:

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

### 9.3 Delegation protocol (earned 2026-09-05, after two failed attempts)

Subagents run **in-process** — there is no separate PID to inspect, only the transcript's last-modified time. Two whole-brief delegations hung having written nothing; the identical work split into narrow slices completed every time. These rules are the difference.

- **Scope by file, not by milestone.** An agent should own one or two files and finish in well under ten tool calls. The two failures ran 12 and 17 rounds at 208k and 366k tokens; the successes ran 6, 20 and 26 rounds on one or two files each.
- **Hand over verified facts.** Put the numbers in the prompt — level dimensions, existing constants, z-index values, the exact call sites — instead of letting the agent derive them. The first hung agent spent its rounds re-measuring what the manager had already measured.
- **Pin interfaces before parallelising.** Parallel agents are only safe on genuinely disjoint files, and only when the shared contract is written down first: exact ids, class names, data attributes, and which side owns which property. The DOM and detent contracts are why `sheet.js` and `main.css` agreed without ever reading each other.
- **Forbid exploration drift.** "Read only these sections; do not read X; write files early." Agents told to read everything read everything.
- **Never let an agent run git.** No stage, commit, branch, checkout or stash. The manager reviews and commits every delivery.
- **Stall detection.** Idle tens of seconds = working. Past ~4 min = the `streamIdleTimeoutMs` guard should have fired. Past 15 min = it has hit `QWEN_STREAM_MAX_LIFETIME_MS` and is in an invisible retry loop, still reporting `running` → stop it and relaunch smaller. Diagnose from transcript mtime plus `git status`.
- **Read what a stalled agent found before discarding it.** The first hung agent's last act was disproving a factual claim in its own brief. The most useful output of that day came from a run that produced no files.
- **Review is arithmetic, not reading.** Self-reports are not evidence — an M2 delivery claimed verification and failed 7 of 8 checks. Recompute independently: tile fit across every viewport, contrast against the real design tokens, brace balance, `git diff --numstat` to prove a cascade is untouched.

## 10. Open design questions

- Robot board sprite: M1 shipped a facing chevron; upgrade to a proper glyph robot (welcome-mascot lineage, canvas-rendered, no image assets) tracked in issue #8 (label `roadmap`).
- Sound: skip for MVP; tiny synth blips could come later.
- Accessibility (color-blind safe tiles, reduced motion) — track as polish items, cheap to include from the start of M1.
- Mobile UX details (bottom-sheet gesture vs arrow button, tap-to-add interaction) — **shipped in PR #20**, recorded in §8.1 and tracked in issue #15.
- **#17 preview correction:** Chapter 3 keeps its automatically fitted front wall sensor but players construct `loop until [wall sensor] = [blocked]` by dragging operands into two initially empty slots. No mounting selector or hole sensor. See `briefs/m6-condition-slots.md`; this supersedes the fixed-label implementation.
- **#19 first slice shipped PR #23:** tile infrastructure, start marker and fatal holes. Ladders and explicit `climb` remain chapter-5 work.
- **Future equipment/rewards:** sensors can eventually be acquired and mounted at selected robot locations. Candidate types: wall, hole, distance, terrain. Purchase using earned rewards versus automatic chapter rewards is deliberately undecided; do not build that system into M6.
- Broader graphics improvement — **#22**, requested by Jonas 2026-09-07. Agree desktop/mobile mockups before changing art direction; cover board/environment, robot, motion/outcome feedback and UI coherence. Coordinate #8/#19 and preserve legibility. This work is separately scheduled; the locked visual language below remains the baseline until a new direction is approved.

## 11. Visual language

Locked 2026-08-23 (decided with the welcome-screen warm-up): **ASCII aesthetic inside a modern mobile app** — terminal/roguelike glyph art with contemporary app polish.

- **Typography:** two voices — clean system sans for human-facing copy (subtitle, tagline, buttons, tab labels); JetBrains Mono for terminal/ASCII elements (maze art, boot log/ticker, version).
- **Palette:** warm green-tinted charcoal surfaces, near-white text, muted grey-green secondary text, one mint neon accent. Reference: `docs/reference/welcome-mockup.png`. Exact values live as CSS custom properties in `styles/main.css` (source of truth).
- **Decoration:** figlet-style ASCII logo (block glyphs, mint glow — user preferred it over a line-art SVG variant, 2026-08-25); ASCII maze teaser with the robot and a glowing path to an `[EXIT]` badge; box-drawing wall fragments; blinking robot eyes. No code-rain background, no scanlines/CRT kitsch — it should feel 2026, not 1983.
- **Welcome structure (per reference):** figlet logo → maze teaser → tagline → outline-glow "Start Game" + secondary "Tutorial" → bottom tab bar (Settings / High Scores) with mini version. No subtitle line. Not-yet-built modules answer with a terminal "not found" joke.
- **Motion:** subtle — fade-ins, cursor blink, glow pulses; must honor `prefers-reduced-motion`.
- **Layout:** desktop board/editor panels plus the shipped M4 mobile bottom sheet (requirements §3.7). The welcome screen uses a centered column on phones.
- **Copy voice:** terminal boot voice — short, dry, playful; no lorem ipsum.
