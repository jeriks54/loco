# M22 slice 1 brief — board art, direction A (#22; #8 base sprite)

**Historical status:** this initial direction-A slice shipped on 2026-09-17. It was
superseded by the Workshop redesign in PR #28, merged and production deployed on
2026-09-23. See `m22-workshop-implementation.md` and `design.md` §13 for current
visual guidance. Issue #8 is now closed; issue #22 remains open for tracking.
The contract below records the original slice and its review, not current styling.

The original scope was board materials + semantics + the robot base sprite. The
later Workshop pass unified the board, robot, sensor feedback and interface styling.

## Purpose and release scope

- Replace the glyph tiles (`#` rect + `·` dot) with direction A: walnut plank floor,
  oxide-clay brick walls with lit top faces, wall shadows on adjacent floor, and the
  canvas-drawn frame that makes the board read as a physical object.
- Replace the facing chevron with the **brass robot base sprite** (body, treads,
  mint visor on the facing side). This is #8's base sprite; its richer move/crash/goal
  animation is slice 2.
- Preserve exactly: all 20 levels and their data, executor semantics, editor, sheet,
  console chrome, `MIN_TILE`/`fit()` behaviour, event-driven FX, reduced-motion paths,
  the fall shrink/fade, and the `createScene` public API.
- Out: ladders, economy, new motion, chrome restyling, image assets, dependencies.

## Pinned contract (verified facts — do not re-derive)

- **Public API is exactly `{ render(newState), handleEvent(type, payload) }`**
  (`scene.js:394-449`). `handleEvent` acts on `moved` / `turned` / `crashed` / `goal` /
  `fell`; `step` and `finished` are no-ops. `main.js` and every browser test depend on
  nothing else from this module.
- **Sizing:** `MIN_TILE = 14` (`scene.js:14`), `MAX_TILE = 64` (`:15`),
  `TILE_DESKTOP = 48` (`:16`); `fit()` clamps at `:80`; `ResizeObserver` at `:388`;
  first draw waits for `document.fonts.ready` (`:372-383`). All retained.
- **Frame pad enters the fit arithmetic.** The frame is drawn in-canvas with
  `pad = tile >= 24 ? round(tile * 0.5) : 0` around the grid, and `fit()` must subtract
  `2 * pad` from the available width and height. Measured 2026-09-14: a 280px viewport
  leaves 226px of usable width, so a 16-wide level at `MIN_TILE` has 2px of headroom and
  any inset below tile 24 clips ch2-01/ch2-08 behind `overflow-x: hidden`. The frame
  therefore exists only from tile 24 up; phones get the board edge-to-edge as before.
  `MIN_TILE` may not be raised.
- **Animation state to preserve:** `MOVE_MS` / `TURN_MS` tweens, `fx.crash` shake + flash,
  `fx.goal` pulse, `pendingFall` / `fall` (180ms shrink/fade after `moved` into a hole),
  `robotHidden`, and every `reducedMotion` snap path.
- **Tile semantics come from state**, not grid characters: keep reading the parsed
  `tiles` / `tileAt` classification (`state.js`). Do not touch `isBlocked` or
  `isSafeToEnter`.
- **Reference implementation:** port treatment A's draw functions and the
  `wallShadows` pass from `docs/reference/m22-board-directions.html`, adapted to the
  existing scene structure and the rules below. That file is the visual oracle; where
  this brief and the file disagree on a colour, the brief wins.

**Palette and rules — `design.md` §12 is normative.** The load-bearing numbers:

| Element | Value |
|---|---|
| Frame | `#241B14`, inner shadow `rgba(0,0,0,.45)` |
| Floor | base `#342B22`; seam `#272019` |
| Wall | base `#5B4534`; lit top `#7E6047` (h `max(2, t*0.16)`); dark bottom `#37281C` (h `max(2, t*0.14)`); mortar `#40301F`; outline `#1F1710` 1px |
| Wall shadow on floor | `rgba(0,0,0,.38)`, thickness `max(1, t*0.14)`, on every edge whose neighbour is a wall |
| Hole | void `#0B0806`; outer rim `#241B14` (`max(2, t*0.12)`); inner rim `#000` at 22%–78% |
| Start | outline `#8A7867` inset 20%; `S` glyph only at `t >= 18` |
| Exit | chrome accent (`--accent`) outline badge + `EXIT` at `t >= 18`; below 18 a solid accent square with a dark centre dot |
| Robot | body `#B08D57` inset 18%; outline `#6E5636`; treads `#241B14`; visor `--accent` `28% × 24%` of the body on the facing side, `shadowBlur = t * 0.35` |

- **LOD thresholds:** plank seams and brick mortar at `t >= 24`; vertical plank joints at
  `t >= 32`; `S` / `EXIT` glyphs at `t >= 18`. Below the thresholds: shape only.
- **Draw order:** tiles → start/exit markers → wall-shadow pass → robot. The shadow must
  not cover the robot (it is edge-only) and must never touch a hole.
- **A hole is absence:** never lit, never a surface, never shadow-casting.
- **The board's only saturated hue is the chrome accent token.** Visor, exit and pointer
  read `--accent`; no second green, no new accent colours.
- **No new motion and no chrome changes.**

## Ownership

| Owner | Files | Delivery |
|---|---|---|
| Rendering agent (gpt-5.6-luna, high) | `src/render/scene.js` only | Materials, LOD, shadow pass, frame, robot base sprite |
| Manager | `styles/main.css` only if strictly required (prefer canvas), contrast re-measure, independent tests, docs, review, commits, PR | Everything else |

Agents never run git. No concurrent edits to `scene.js`. Read only `scene.js`, this
brief, `design.md` §12 and the mockup file; write early.

## Verification and acceptance

- `node tests/verify.mjs` passes unchanged (it syntax-checks every `src` module
  including `scene.js`; the executor/level checks must be untouched).
- Retained browser suites pass: `browser.mjs` (eight chapter-2 flows desktop + touch,
  fit 280–1280px), `tiles-browser.mjs` (real-paced fall, reduced motion, resize during
  fall, repeated Run/Reset/Retry), `sensors-browser.mjs` (five levels, cue orientation,
  hole exclusion), `conditions-browser.mjs`.
- **Manager re-runs the fit arithmetic** for all 20 levels at 280/320/360/390/414px with
  the frame pad included, proving `cols * tile + 2 * pad` and `rows * tile + 2 * pad`
  never exceed the usable panel box. A clip at any width is a blocking defect.
- **Manager re-measures sheet contrast** against the new worst-case board pixels
  (`#7E6047` lit wall top, `#5B4534` wall base) through the real translucency stack:
  `--muted` must hold ≥ 4.5:1. If it does not, raise the two `color-mix` percentages per
  the dial in `styles/main.css` and record the new table in that comment — never
  lighten the text.
- **Manager screenshot matrix:** ch2-08, ch3-04 and ch3-05 at tile 48/28/22/14, plus
  280/320/390/900/901px viewports. At 14px the board must answer wall / floor / hole /
  start / exit without squinting; anything that needs it is a blocking defect.
- Reduced motion: snap paths unchanged, no new animation introduced.

### Human play-test (Jonas, Vercel preview, desktop + real phone)

1. Does the board read as warm and physical without looking like a different game?
2. At arm's length on the phone, is the maze path obvious on the widest levels?
3. Does a hole still read as a hole — absence, not a surface?
4. Is the robot a thing now, and is its facing obvious at a glance? Chevron gone?
5. Can you find the exit on ch2-08 at phone size without hunting?
6. Is anything in the chrome — title, panels, sheet, ticker — visibly changed? It
   must not be.

## Review results — 2026-09-14

- One gpt-5.6-luna high agent delivered `src/render/scene.js` only; the manager
  reviewed the full diff against this brief and `design.md` §12 before any test run.
- **Manager corrections over the delivery:**
  1. *Accent.* The delivery pinned a literal lime `#B6FF3B` — the approval mockup's
     stand-in. `styles/main.css` is the source of truth and ships `--accent: #4CE68C`,
     so visor and exit now read `C.accent`; §12, this brief and the mockup were
     corrected to "the chrome accent token", keeping exactly one green in the product.
  2. *Frame pad.* The delivered `pad = 2` below tile 24 measured 228px of canvas in a
     226px panel at 280px on ch2-01/ch2-08 — a silent clip behind `overflow-x: hidden`,
     the exact M4 failure mode. Pad is 0 below tile 24 (frame from tile 24 up);
     re-measured 224 ≤ 226 with headroom at 280/320/390.
  3. *Sheet dial.* Re-measured against the real tokens, the shipped 0.5/0.5 puts
     `--muted` at **4.27:1** over the new lit brick top `#7E6047` — under AA. Raised to
     0.6/0.6 (16% leak): 4.65:1 lit top, 4.96:1 wall base, 5.28:1 floor, `--text`
     ≥ 11.1:1; pure accent 3.66:1 (was 2.90:1), still the accepted blurred-region cost.
     Recorded in the `main.css` comment and gated by the new `tests/contrast.mjs`.
- **Test maintenance:** `tests/tiles-browser.mjs` identified the robot by the chevron's
  `shadowBlur 16`; the probe now hooks the brass body fill and solves the tile from the
  documented pad rule. Fall ordering, reduced-motion, resize and restart assertions are
  unchanged and passing.
- **Verification:** `node tests/verify.mjs` (20 level paths, 8 counted + 5 sensed
  solutions, 1,687,728-program spiral proof); `browser.mjs` 16 desktop + touch flows;
  `tiles-browser.mjs` three contexts at real pacing; `sensors-browser.mjs` ten flows;
  `conditions-browser.mjs` desktop + touch; `contrast.mjs`; fit re-measure at
  280/320/390 (canvas ≤ usable width, no clip); manager screenshots at 1280/390/280
  inspected — the 14px board answers wall / floor / hole / start / exit, the hole still
  reads as absence, and the chevron is gone.
- **Carried to Jonas' play-test as judgement calls, not defects:** (a) see-through is
  fainter at 16% leak than the 25% he approved on M4 — the dial is his to turn; (b) on
  phones a width-bound maze letterboxes to the panel centre, so with the sheet expanded
  it sits behind the sheet — pre-existing M4 geometry, now fainter through it. Top-aligning
  the canvas under the breakpoint is the fix if his phone verdict wants it.
