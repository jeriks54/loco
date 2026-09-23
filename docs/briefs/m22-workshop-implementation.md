# Workshop implementation — approved 2026-09-20

Jonas selected Workshop from `docs/reference/graphics-2026/v2/warm.html` and asked
for Luna-high implementation with primary-agent review. This supersedes the earlier
request to avoid Luna for concept design; the approved artwork must be ported,
not redesigned. No push, PR, merge or deployment in this assignment.

## Ownership and invariants

- Renderer agent: `src/render/scene.js`, new `src/render/workshop-art.js` only.
- Interface agent: `styles/main.css` only.
- Equipment agent: `index.html`, `src/main.js`, new `src/ui/equipment.js` only.
- Manager: documentation, retained-test updates/review, integration verification.

Keep levels, state, executor, editor, palette, HUD and sheet logic unchanged.
Keep all existing DOM IDs and interactions. Keep MIN_TILE 14, frame-pad rule
`tile >= 24 ? round(tile * .5) : 0`, move/turn/fall timing and reduced motion.
Do not preserve obsolete visual tests that depend on the replaced sprite's color
or shadowBlur; update their probes while retaining behavior assertions.

## Pinned interfaces

`workshop-art.js` exports `WORKSHOP` (approved warm palette) and
`drawWorkshopRobot(ctx, { cx, cy, size, angle = 0, equipped = false,
alpha = 1, scale = 1 })`. Use the approved prototype's robot geometry. State-independent,
no DOM globals. Both scene and equipment portrait use this one renderer.

`createScene({ canvas, onSensorChange = () => {} })` keeps its existing returned
API. The optional callback receives `{ equipped, blocked, phase }`, where
`equipped` is boolean, `blocked` is boolean in phase `ready` and null otherwise,
and `phase` is `ready`, `moving`, `turning` or `unavailable`.
Notify on render/reset, move/turn start and settlement, and fall unavailability;
deduplicate identical payloads. Markers/readings refer to the settled visible pose,
never show the destination's reading while the sprite is still moving. Hide the
target marker during movement/turns/falling. Reduced motion settles immediately.
Falling/hidden robot has no reading. Preserve sensing of out-of-grid as blocked;
show an edge bracket at the boundary, not an off-canvas target cell.

`createEquipment()` exports `{ update(snapshot) }` and binds the DOM below.
Instantiate before the scene; pass `equipment.update` as onSensorChange. It draws
the portrait using the shared renderer. Update DOM only on changed readings;
only the primary status is `role=status`, `aria-live=polite`, `aria-atomic=true`.
Use “Wall detected”, “No wall detected”, “Moving…”, “Turning…” and
“Reading unavailable”; never say clear or safe. No sensor: “No sensor fitted”.

## DOM contract (equipment agent creates, interface agent styles)

- Existing `.screen-header` remains. Add `.game-brand` with text LoCo.
- `.sensor-summary` outside `.game-layout` contains existing `#sensor-note`
  (text includes “Front wall sensor fitted”, “holes are not walls”, and no automatic
  braking), and `#sensor-reading.sensor-reading`. HUD continues toggling sensor-note.
  `#sensor-reading` is hidden without equipment; snapshot sets `data-phase` and
  `data-blocked=true|false|unknown` on both reading elements below.
- `.game-layout` contains `.world-panel` and existing `#sheet`.
- `.world-panel` contains existing `.board-panel` (its immediate child remains
  `.canvas-wrap` with board and result overlay), then `.board-legend`, then
  `#equipment-card.equipment-card`.
- Legend: wall / hole / exit, decorative swatches `.legend-wall`, `.legend-hole`,
  `.legend-exit`.
- Equipment card children: `canvas#equipment-portrait` (78x78 logical pixels,
  aria-hidden); `.equipment-copy` with `#equipment-label.equipment-label`,
  `#equipment-name`, `#equipment-description`; `.equipment-state` with
  `#equipment-reading.sensor-reading` (not a second live region).
- `#board` gets descriptive accessible name and references sensor-note/status.
- Keep side-panel, sheet and editor DOM and all IDs. Rename heading “Robot memory”
  to “Your program”, retain memory-count. Run button copy may be “Run program”.

## Styling and fit

Apply Workshop tokens from the prototype globally (ivory, walnut, brass, dark
forest-green accents). Restyle existing welcome/level screens for coherence without
replacing their content or controls. Desktop editor is one coherent panel; all
palette chips, typed slots, steppers, current-line highlight, result overlay and
focus states remain readable and functional. No new dependencies or image assets.

Desktop world panel stacks board, legend and equipment, with board dominant. The
renderer measures `.board-panel` padding/content box; equipment must be a sibling,
not included in its measured height. Side editor may scroll for long programs.

Phones use 900px breakpoint and existing sheet classes/gesture behavior. Keep the
board detent-independent, top-aligned, and above the expanded sheet at 390x844 for
Safe Passage. Expanded sheet around 44svh on tall phones, more height on short
landscape; opaque ivory replaces old translucency. Both sheet detents retain
44px Run/Reset targets; palette chips/operands at least 44px on touch layout. At
short heights allow sheet to overlay board but keep collapsed board usable; do
not squash/clamp the maze beyond fit. Fit 16-column levels at 280px without clipping.
Equipment card can be below board/covered while editing; summary remains visible.
Preserve safe-area padding, reduced-motion transitions, and overflow scrolling.

## Acceptance

Port overhead robot, contiguous walnut wall tops, light walkable tiles, recessed
hole, exit target and one-cell brackets from approved prototype. Persistent start
marker and goal remain readable at small sizes. Render same robot in equipment
portrait, show absence of equipment in earlier chapters. State rules unchanged.

Manager checks source/diffs, real-paced sensor timing, fall/reset/resize,
all directions/boundaries/no-equipment, all 25 levels at narrow widths, desktop and
phone screenshots against prototype, keyboard/touch controls, reduced motion and
contrast. Run retained Node and browser checks; correct failures before sharing
local playable preview. Human play-test precedes any production release.

## Implementation review — 2026-09-23

Luna-high implementation completed and reviewed by the primary agent. Review
corrections include mobile summary wrapping, desktop Run visibility, phone editor
spacing, boundary brackets, and suppression of settled readings during a fall.
Desktop and phone screenshots were visually reviewed against the approved Workshop.

Validation passed: `verify.mjs`, `contrast.mjs`, `browser.mjs`,
`conditions-browser.mjs`, `sensors-browser.mjs`, `chapter4-browser.mjs`,
`tiles-browser.mjs`, and `workshop-browser.mjs`. All 25 levels fit at widths
280, 320, 390, 900, 901 and 1280 (844px height), plus 844×390 landscape;
board geometry stays stable across sheet detents. Sensor checks cover four
headings, equipment absence, boundaries, floors, holes, movement, turning,
fall, reset and reduced motion. Existing gameplay and saved-progress rules remain
unchanged. `git diff --check` passed.

Playable local preview: `http://127.0.0.1:4175/`. Pending user play-test;
no production deployment, push, merge or PR performed.
