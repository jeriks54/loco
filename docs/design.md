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
    chapter3.js      five front-wall sensing levels (M6)
    chapter4.js      five conditional-branching levels (M7)
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

**Data flow:** `editor` produces a program (simple-command strings, counted-loop objects, and typed condition objects) → `executor` walks it against `state`, emitting events (`step`, `moved`, `turned`, `crashed`, `fell`, `finished`, `goal`, `syntax`, `runaway`) → `scene` animates movement events → `editor` highlights the current block on `step` events (the program pointer) → `hud` reacts to terminal events.

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
`briefs/m5-tile-types.md` for the exact table. Chapters 1–2 contain no holes;
M6's ch3-03 and ch3-04 use them as hazards the wall sensor cannot detect.
Chapter 3 levels additionally carry `sensor: 'frontWall'`; parsed state exposes it
as `sensor: level.sensor ?? null`, so earlier chapters have no equipment.

## 4. Execution model

- A program is an ordered array, `length <= memory`: simple commands are `move`,
  `turnLeft`, `turnRight`, `else`, and `end` strings; counted loops are
  `{ id: 'loop', count }` objects; conditional entries are
  `{ id: 'loopUntil'|'if', sensor, value }` objects.
- M6 adds `{ id: 'loopUntil', sensor, value }`, displayed as
  `loop until [wall sensor] = [blocked]`. M7 adds `{ id: 'if', sensor, value }`,
  displayed as `if [wall sensor] = [blocked]`, plus the explicit `else` marker.
  Both condition slots begin null and must be filled with typed palette operands;
  equality is fixed. A `loopUntil` header checks the adjacent wall before each
  body iteration; true skips the body. An `if` header checks once: true enters
  its body, false jumps to `else` or past its `end`.
- `else` is allowed only once in the nearest open `if`. A true branch reaching
  `else` skips the alternate body and continues after its matching `end`; a false
  branch falls through it. `end` closes the nearest open `if`, `loop`, or
  `loopUntil`. Loops and conditionals may nest in either direction, including an
  `if` inside a loop and a loop inside an `if`. Empty branches are valid runtime
  syntax, but no shipped level relies on one.
- Every visited line, including `if`, `else`, and `end`, emits one `step` event
  and consumes one tick. Skipped branch lines emit neither. Missing or invalid
  condition operands, invalid nesting, unmatched `else`, duplicate `else`, and
  unmatched `end` refuse execution before movement. The 200-executed-line guard
  emits terminal `runaway`.
- `loop n` … `end` repeats the body n times and supports nesting. Count defaults to 2 and is clamped to integer 1..99 (`LOOP_MIN` / `LOOP_MAX`). Chapter 2 has counted loops only; sensing belongs to future chapter 3. No `repeat` or `whileFrontClear` aliases remain in revision #16.
- Structure is validated before movement; the analyzer returns matching `end`
  and `else` positions. The 200-executed-line guard emits terminal `runaway`.
- The executor is a tick machine: one block per tick; a timer drives ticks so animation can pace them (speed control changes the tick interval).
- Each tick first emits `step` with the index of the executing block — the editor uses it to highlight the current block (program pointer).
- Crash rule: `move` into a wall or out of bounds → emit `crashed`, halt.
- M5 hole rule: enter `H`, emit `moved`, then terminal `fell` in the same tick.
  Every Run restores the stable start pose and resets the scene before execution.
- Reaching the goal tile at any point → emit `goal`, halt (win).
- Executor snapshots the program and mutates only the supplied game state; DOM-free execution is covered by the retained Node checks.

## 5. Drag & drop editor

- Palette shows the blocks unlocked for the current level; dragging a block creates a **copy** (blocks are reusable, memory is the limit).
- Program area renders the program as **numbered mono lines**, one per memory slot ("program-as-lines", shipped with M2 / issue #9); loop and conditional bodies indent per nesting depth, `else` is aligned with its matching `if`, and `loop` lines carry ± steppers for the count (no typing). Drops insert a line at position; over-capacity drops reject.
- Implemented with Pointer Events for mouse and touch rather than the HTML5 DnD API — more controllable styling and animation.
- Click a placed line to remove it. "Clear" button empties the program.
- Layout shell: board (canvas) and editor are self-contained panels — desktop shows the board left, editor right; the shipped mobile mode uses a floating bottom sheet at widths up to 900px (see §8.1). On touch, drag is complemented by tap-to-add (a pointerup under the 5px drag threshold appends the block).

## 6. Rendering

The shipped Workshop implementation supersedes the historical appearance below;
see §13 and `briefs/m22-workshop-implementation.md`. It shipped in PR #28 and
production deployed on 2026-09-23.

- Canvas is sized to the level grid with a fixed tile size (letterboxed/responsive via CSS).
- Robot is the Workshop's overhead brass chassis with paired tracks, a distinct nose and a roof arrow. Moves/turns tween between tiles over one tick.
- Crash feedback: brief shake + color flash. Goal feedback: simple celebration pulse.
- M5 adds a persistent outlined `S`, double-rim inset holes, and a 180ms shrink/fade
  after movement into a hole. Reduced motion hides immediately; reset restores.
- M6 automatically equips `sensor: 'frontWall'` on Chapter 3 levels only. The
  Workshop presents its hardware on the robot, brackets the one adjacent tile, and
  pairs shape cues with a text reading. Walls/boundaries are detected; holes are
  not. The note explains that the sensor does not brake automatically.
- M22 Workshop rendering presents the robot overhead, shares its artwork with the
  equipment portrait, and synchronizes the adjacent-tile marker and text reading
  with settled robot pose. See §13 for the active visual and sensor contract.

## 7. Persistence

`localStorage['loco.progress.v1'] = { completed: ['ch1-01', ...] }` — level select shows completion; nothing else stored in MVP.

Revision #16 preserves all 15 level IDs and existing completion marks. Programs are
not persisted, so the block rename requires no migration. The replacement Part B
levels retain IDs ch2-05..08: Double Step, Beyond the Pattern, The Return Trip and
Giant Steps. Chapter 4 appends ch4-01..05 without renumbering or rewriting any
earlier entry. Exact grids and solutions live in `level-design.md` §§4 and 11.

## 8. Milestones

| Milestone | Deliverable |
|---|---|
| **M0** | Requirements + design docs — completed |
| **M1** | Playable core: renderer + editor + executor + placeholder levels (grew to 7 chapter-1 levels post-merge) |
| **M2 (MVP, historical)** | Update 2 pulled forward (decision D1, `level-design.md`): original `repeat`/`while`/`end` loops + chapter-2 pack, lines-mode editor (issue #9), persistence, level-select polish → `v0.1` |
| **M3 (#16, shipped PR #21)** | Counted-loop rename and chapter-2 Part B redesign; play-tested and merged 2026-09-07. Brief: `briefs/m3-counted-loops.md` |
| **M4 (shipped, PR #20)** | Mobile layout — board on top, program as a bottom sheet (decisions and history in §8.1) |
| **M5 (#19 first slice, shipped PR #23)** | Tile lookup, start marker and fatal holes; original 15 levels preserved. Merged 2026-09-08 as `2d4bd42`; ladders remain chapter-5 work |
| **M6 (#17, shipped PR #24)** | Five Chapter 3 levels, front wall equipment and two operand drop slots. Merged 2026-09-09 as `ee25b75`; contracts: `briefs/m6-front-wall-sensor.md`, `briefs/m6-condition-slots.md` and `briefs/m6-uneven-spiral.md` |
| **M7 (#18, Chapter 4)** | Five conditional-branching levels, explicit `if` / `else` / `end`, front-wall condition reuse, structural validation and desktop/touch coverage. Shipped in PR #27 on 2026-09-19 as `8614ff1`; contract: `briefs/m7-if-branching.md` |
| **M22 slice 1 (#22 / #8, shipped)** | Initial board materials and robot sprite, recorded in `briefs/m22-board-art.md`. Superseded by the complete Workshop redesign below. Issue #8 is closed. |
| **M22 Workshop (#22, shipped)** | Unified board, robot, sensor feedback, background and controls. PR #28 merged and production deployed 2026-09-23; issue #22 remains open as a tracking issue. Contract and review: `briefs/m22-workshop-implementation.md`. |

Merged baseline: `main` at `2315384` (PR #28). Chapter-3 sensing, Chapter 4
branching and the Workshop graphics are shipped. Memory upgrades and explicit
ladder `climb` remain future work.

### 8.1 M4 — mobile layout (shipped in PR #20; issue #15)

The following records the original decisions and measured implementation history.
Its translucency and opaque-card proposals are historical; the current Workshop
sheet uses opaque ivory surfaces as documented in §13. The mobile breakpoint,
gesture, detent and fit decisions remain relevant unless called out otherwise.
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

- Robot board sprite: the M22 Workshop renderer replaced M1's facing chevron with the overhead brass robot, visible facing cues and front sensor. It is shared with the equipment portrait; issue #8 is closed. No image assets are used.
- Sound: skip for MVP; tiny synth blips could come later.
- Accessibility (color-blind safe tiles, reduced motion) — track as polish items, cheap to include from the start of M1.
- Mobile UX details (bottom-sheet gesture vs arrow button, tap-to-add interaction) — **shipped in PR #20**, recorded in §8.1 and tracked in issue #15.
- **#17 shipped (PR #24):** Chapter 3 keeps its automatically fitted front wall sensor and players construct `loop until [wall sensor] = [blocked]` by dragging operands into two initially empty slots. No mounting selector or hole sensor. See `briefs/m6-condition-slots.md`; this superseded the fixed-label implementation before merge.
- **#19 first slice shipped PR #23:** tile infrastructure, start marker and fatal holes. Ladders and explicit `climb` remain chapter-5 work.
- **Future equipment/rewards:** sensors can eventually be acquired and mounted at selected robot locations. Candidate types: wall, hole, distance, terrain. Purchase using earned rewards versus automatic chapter rewards is deliberately undecided; do not build that system into M6.
- Broader graphics improvement — **Workshop shipped** in PR #28 and deployed 2026-09-23. It updates board, robot, equipment feedback and interface styling together; see §13. Issue #22 remains open for tracking. The slice-1 brief in `briefs/m22-board-art.md` is historical.

## 11. Visual language

The active product direction is the Workshop (see §13), selected 2026-09-20 and
shipped in PR #28. Issue #37 updates the title on its feature branch to give a
cropped glimpse of the same board and robot. Its implementation and review contract
is in `briefs/issue-37-title-screen-plan.md`; it awaits human play-testing.

- **Typography:** two voices — clean system sans for human-facing copy (headline, pitch, buttons); JetBrains Mono for code details, boot ticker and version.
- **Palette:** warm ivory surfaces, walnut board, brass robot and forest-green controls. Exact values live as CSS custom properties in `styles/main.css` (source of truth).
- **Decoration:** the title uses a cropped, partly veiled rendering of a real Chapter 1 board with the shared brass robot, plus a one-command program slip. It does not show a full solution or editor. Game screens use the same Workshop artwork with restrained surface detail. No code-rain background or scanlines.
- **Welcome structure:** LoCo wordmark → headline and short pitch → Start Game and Tutorial → Workshop glimpse, with ticker and tertiary Settings / High Scores in the footer. Not-yet-built modules still answer with a terminal “not found” message.
- **Version:** one `VERSION` constant in `src/main.js` is the single source of truth — it is interpolated into the ticker and written into the empty `.version-mini` span at boot, so `index.html` carries no literal and the two cannot drift. Bump that constant only. Scheme agreed 2026-09-14: one minor per shipped curriculum chapter — v0.1 chapter 2, v0.2 mobile + tiles, v0.3 chapter 3, and v0.4 Chapter 4, shipped in PR #27.
- **Motion:** title entrance is restrained; its preview makes one legal move and stops. Reduced motion shows the settled still frame immediately. Other game motion retains its own reduced-motion behavior.
- **Layout:** desktop board/editor panels plus the shipped M4 mobile bottom sheet (requirements §3.7). Its Workshop surfaces are opaque ivory; the board stays stable across detents. The welcome screen becomes a two-column hero on desktop and puts actions above the glimpse on phones.
- **Copy voice:** terminal boot voice — short, dry, playful; no lorem ipsum.

## 12. Board art — direction A, tabletop flat-shape (#22, slice 1 shipped 2026-09-17)

Historical shipped direction. Workshop (§13) supersedes these palette and chrome
restrictions. Issue #8 later closed with the Workshop robot; the slice-one note below
records its then-pending approval condition.

The board is a **physical object inside the console**: oiled-walnut planks under oxide-clay
brick, drawn with flat shapes only — no gradients, no noise, no image assets. The concept is
the split between the programmer's console and the physical board. It was approved against
`docs/reference/m22-board-directions.html`; that mockup is an archive, not the current visual
reference. Section §13 now defines the shipped Workshop appearance.

**Palette (board only; chrome keeps §11 tokens):**

| Element | Value |
|---|---|
| Frame around the board | `#241B14`, inner shadow `rgba(0,0,0,.45)`; drawn only at `tile >= 24` — below that the board is edge-to-edge, because a 280px viewport leaves only 2px of headroom at `MIN_TILE` |
| Floor (walnut plank) | base `#342B22`; seam `#272019` |
| Wall (clay brick) | base `#5B4534`; lit top face `#7E6047`; dark bottom `#37281C`; mortar `#40301F`; per-tile outline `#1F1710` |
| Wall shadow on floor | `rgba(0,0,0,.38)` |
| Hole | void `#0B0806`; outer rim `#241B14`; inner rim `#000` |
| Start marker | outline `#8A7867`, `S` glyph |
| Exit | the chrome accent (`--accent`, `#4CE68C` at approval) outline badge + `EXIT`; below the glyph threshold a solid accent square with a dark centre dot |
| Robot | brass body `#B08D57`, outline `#6E5636`, treads `#241B14`, accent visor with glow on the facing side |

**Rules:**

- **Legibility is carried by height, not texture.** Every wall casts a shadow onto each
  orthogonally adjacent floor tile (`rgba(0,0,0,.38)`, thickness `max(1, tile*0.14)`). This is
  what keeps the maze readable once material detail is dropped, and it is not optional.
- **Level-of-detail thresholds.** Plank seams and brick mortar only at `tile >= 24`; vertical
  plank joints only at `tile >= 32`; `S` and `EXIT` glyphs only at `tile >= 18`. Below 18 the
  exit is a solid accent mark. `MIN_TILE` stays 14 (`scene.js`); the 14px board must answer
  wall / floor / hole / start / exit without squinting.
- **The board's only saturated hue is the chrome accent itself.** Visor, exit and
  program pointer all read `--accent` from `styles/main.css`, so the product has
  exactly one green; the board never introduces a second one. (The approval mockup
  rendered a lime stand-in; the shipped token governs.) Materials stay desaturated
  (walnut and clay, never pine or brick-red).
- **A hole is absence.** Never a surface, never lit, never shadow-casting. Its double rim is
  the only cue, so ch3-03/ch3-04 keep teaching that a wall sensor misses a hole.
- **Console chrome is untouched**: title screen, panels, sheet, ticker keep §11 exactly.
- **Historical sheet contrast for slice 1:** the translucent M4 sheet was re-measured
  against the lit wall top `#7E6047`; its then-current dial was 0.6 / 0.6 (16% leak),
  with `--muted` at 4.65:1 over that top, 4.96:1 over the wall base and 5.28:1 over
  the walnut floor. These values do not describe the current opaque Workshop sheet;
  see `tests/contrast.mjs` for the active palette check.
- **No new motion in slice 1.** The follow-up motion and interface-coherence work was
  delivered with Workshop in PR #28; see §13 for the current behavior.
- **Future tile types follow the same rules.** When #19's ladders land, they get a material,
  a shadow behaviour and an LOD plan under this section, not a one-off style.
- **#8 folds in here.** The brass robot base sprite (body, treads, facing visor) ships with
  this slice so `scene.js` is not rewritten twice; its richer move/crash/goal animation is
  slice 2. Issue #8 closes on the base sprite only if Jonas agrees the chevron is gone for
  good.

Implementation contract, ownership and acceptance: `briefs/m22-board-art.md`.

## 13. Workshop — shipped graphics and sensor clarity

Jonas selected the primary agent's revised Workshop concept on 2026-09-20 and
requested Luna-high implementation with primary-agent review. Visual reference:
`reference/graphics-2026/v2/warm.html`. Implementation contract:
`briefs/m22-workshop-implementation.md`. This changes appearance and presentation,
not levels, program semantics, sensor physics, saved progress or equipment rules.
The design was accepted, merged in PR #28 and deployed to production on 2026-09-23.
Issue #22 remains open as a tracking item; issue #8 is closed.

- **One visual language:** ivory panels, dark forest-green controls, a walnut board
  with light walkable tiles, and a brass robot. Welcome, level selection and game
  screens share stylesheet tokens. The mobile editor uses opaque ivory surfaces.
- **Overhead geometry:** paired tracks, a shaped nose and a roof arrow establish
  facing even without equipment. `render/workshop-art.js` supplies the shared robot
  renderer for the scene and equipment portrait. Walls are contiguous top surfaces;
  holes remain recessed voids, with persistent start and exit markings.
- **Equipment:** a front-mounted green module is present only on equipped levels.
  The equipment card names it and explains its limitations. A bracket marks exactly
  the adjacent tile being checked; outside-grid readings use an inward edge bracket.
- **Sensor timing:** `createScene` accepts optional `onSensorChange` and retains its
  existing `render`/`handleEvent` API. It emits deduplicated snapshots with `equipped`,
  `blocked` and `phase` (`ready`, `moving`, `turning`, `unavailable`). Readings and
  markers refer to the settled visible pose. During a tween the marker is hidden;
  falling stays unavailable until reset. Reduced motion settles immediately.
- **Accessible status:** one polite live region says “Wall detected”, “No wall
  detected”, “Moving…”, “Turning…” or “Reading unavailable”. Shape accompanies color.
  The duplicate equipment-card reading is not a second live region. A negative
  reading never says safe: holes are not walls and sensing does not brake.
- **Fit:** the 900px mobile breakpoint, stable board size across sheet detents,
  safe-area support, minimum 14px tiles and reduced-motion behavior are retained.
  Desktop controls stay accessible; mobile program content scrolls independently.

The Workshop checks supplement the retained gameplay/browser suites with
real-paced sensor transitions, all four headings, boundary/hole readings, reset
while turning, fall unavailability, and all 25 levels at narrow/landscape sizes.
Review and deployment details are in `briefs/m22-workshop-implementation.md`.
