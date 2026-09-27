# Issue #30 follow-up — guided chapter examples

Phone play-testing found the four-step practice tour clear, while the Chapter 2–4
introduction cards explained too little. Optional guided example mazes replaced
those cards using the same board, editor, executor and spotlight dialog.

On first selection of a level in Chapters 2–4, open that chapter's example.
`Skip example` opens the level that was selected. `Replay intro` at the chapter
header opens the example again; from a replay, Skip and Exit return to level
select. The guide's final step starts free practice. A successful example offers
`Start selected level` (or `Choose levels` when replayed). Existing completed
chapters remain seen. Example wins never alter `loco.progress.v1`, level IDs or
the 25-level campaign registry. The only onboarding storage stays the guarded
`loco.onboarding.v1` set of seen chapter prefixes.

| Chapter | Example map and route | Guide focus |
|---|---|---|
| 2 — Loops | Three-tile corridor; `loop 3`, `move`, `end` in three lines | Map; loop palette; count stepper and numbered memory; Run |
| 3 — Sensing | Corridor ending at a wall, with the exit one tile south; `loop until wall sensor = blocked`, `move`, `end`, `turn right`, `move` | Map; fitted sensor and its limits; condition palette; memory; Run |
| 4 — Decisions | One open tile followed by a wall, then exit south; `loop 2`, `if wall sensor = blocked`, `turn right`, `else`, `move`, `end`, `end`, `move` | Map; sensor truth value; `if`/`else` palette; two branches in memory; Run |

Each tour uses short, sequential text and a brass spotlight. On phones, the sheet
opens for palette and memory steps and closes for the map and persistent Run/Reset
bar. Back and Next navigate steps; Skip example leaves the example immediately.
Focus moves to each step heading. Escape follows Skip example. After the guide,
contextual practice hints provide a reminder and a way to skip. Retry and Reset
keep the player's program. Reduced motion has no guide entrance animation.

Acceptance: the three routes win under the real executor, an example cannot
mark campaign completion, first-visit/skip/replay/existing-player flows work,
and phone/desktop/keyboard/reduced-motion checks cover all three spotlights.
