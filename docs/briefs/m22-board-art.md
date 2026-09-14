# M22 slice 1 brief — board art, direction A (#22; #8 base sprite)

**Status:** direction approved by Jonas on 2026-09-14 against
`docs/reference/m22-board-directions.html` (treatment A). Rules live in `design.md` §12.
**Implementation awaits Jonas' explicit green light.** Branch: `feat/m22-board-art`,
from `main` at `86c820a`.

Slice 1 is board materials + semantics + the robot base sprite. Slice 2 (later,
separate) is richer motion, outcome feedback and the UI-coherence pass.

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
  `pad = tile >= 24 ? round(tile * 0.5) : 2` around the grid, and `fit()` must subtract
  `2 * pad` from the available width and height. The pad collapses to a 2px hairline
  below tile 24 **on purpose**: at a 280px viewport a 16-wide level has ~226px of usable
  width, and a full inset there would clip ch2-01/ch2-08. `MIN_TILE` may not be raised.
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
| Exit | mint outline badge + `EXIT` at `t >= 18`; below 18 a solid mint square with a dark centre dot |
| Robot | body `#B08D57` inset 18%; outline `#6E5636`; treads `#241B14`; visor mint `28% × 24%` of the body on the facing side, `shadowBlur = t * 0.35` |

- **LOD thresholds:** plank seams and brick mortar at `t >= 24`; vertical plank joints at
  `t >= 32`; `S` / `EXIT` glyphs at `t >= 18`. Below the thresholds: shape only.
- **Draw order:** tiles → start/exit markers → wall-shadow pass → robot. The shadow must
  not cover the robot (it is edge-only) and must never touch a hole.
- **A hole is absence:** never lit, never a surface, never shadow-casting.
- **Mint is the only saturated hue on the board.** No new accent colours.
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

## Review results

(filled in by the manager after implementation)
