# M22 — graphics clarity and interface coherence

Status: Workshop selected on 2026-09-20; implementation shipped in PR #28 and
deployed to production on 2026-09-23. Jonas approved the
revised Workshop concept and explicitly requested Luna-high implementation with
primary-agent review. See `m22-workshop-implementation.md` for the active contract.
This brief extends #22. Older slice-1 restrictions against chrome changes do not
apply to these explicitly requested concepts. Existing gameplay contracts remain.

## Purpose

Make the overhead viewpoint and robot facing immediately understandable; make
front-wall equipment, its one-tile range, and its reading visible; unify the board,
background, editor and controls. Audience: beginners, all ages, desktop and phone.

## Ownership and deliverables

Jonas rejected both initial Luna concepts and requested that the primary agent
redesign them directly, without delegating to weaker models. The primary agent
owns the revised concepts. Jonas subsequently requested Luna-high agents for
implementation of the selected Workshop design. The initial drafts are
superseded by the shared renderer and styling under `graphics-2026/v2`:

- `docs/reference/graphics-2026/v2/warm.html`: The workshop, wood and brass.
- `docs/reference/graphics-2026/v2/clean.html`: The robot lab, cool overhead world.

The root concept URLs also load the revised design. Both concepts share exact
robot geometry and sensor semantics; materials, palette and surfaces differ.

No changes to production game files during exploration. Each concept provides a
1280x800 desktop scene, 390x844 collapsed/expanded phone scenes, four robot headings
with/without equipment, three sensor examples and 14/22/48px size comparisons.
The mockups are static, not functional game previews. Both use real ch3-04 Safe
Passage, initial pose (1,1,E), 11/11 memory and its retained solution:
until-wall / move / end / right / loop 4 / move / end / right / until-wall / move / end.

## Required visual semantics

- Paired tracks or wheels and top casing establish overhead robot geometry.
- A distinct front remains visible in all headings without relying only on color.
- Equipped hardware and a readable equipment label identify the front wall sensor.
- Mark only the adjacent tile being checked, without hiding its actual tile type.
- Use “Wall detected” and “No wall detected”; do not label a negative reading safe.
- Walls and boundaries trigger detection; floors, starts, exits and holes do not.
- Explain that holes are not detected and the sensor does not brake automatically.
- No side-elevation wall textures that contradict the overhead viewpoint.
- Board, background and controls share a coherent palette and surface treatment.
- Phone sheets preserve board sizing; readable text and touch controls take priority.

## Concept review and selection — completed

The primary agent rendered and inspected all scenes, checked the real level grid
and program, verified clipping, and corrected defects. Jonas reviewed both revised
options and selected Workshop. The side-by-side concepts remain available at
`docs/reference/graphics-2026/index.html`; their review is recorded in
`docs/reference/graphics-2026/v2/REVIEW.md`.

## Selected direction and delivered work

The implementation contract records the chosen geometry, palette, spacing,
responsive simplifications and sensor feedback timing. Luna-high agents implemented
the renderer, UI and sensor feedback; the primary agent reviewed their changes and
independently verified the integrated game.

The delivered design preserves levels, execution, stored progress and gameplay.
It adds no inventory, economy or sensor types. The implementation passed all
headings, sensing after movement/turn/reset/retry, boundaries, holes, reduced motion,
contrast, small-tile readability and desktop/mobile fit checks. Jonas accepted the
playable preview before PR #28 was merged and deployed. See the implementation
brief for the complete review and validation record.
