# Issue #37 — Workshop title screen redesign

**Status:** revised concept for visual review.

**Branch:** `codex/issue-37-title-screen`

**Issue:** https://github.com/jeriks54/loco/issues/37

**Concept:** [responsive mockup](../reference/issue-37-title-concept.html)

Review captures: [desktop, 1280 × 800](../reference/issue-37-title-desktop.png) · [phone, 390 × 844](../reference/issue-37-title-phone.png).

## Goal

Make the title screen an invitation into LoCo. It should reveal just enough of the shipped Workshop to promise a tactile robot-programming game, then leave the first solution for the player to discover. The Start Game action should be the natural next step.

The previous concept showed the entire board and a completed six-line solution beside it. That explained too much and made the title feel like a second game screen. The revised hero uses a **cropped, close-up board fragment** and **one command**. The robot, walnut material and numbered code are recognizably real, while the rest of the maze and program remain out of view.

## Visual concept: “A peek into the Workshop”

- A spacious ivory page carries the LoCo identity, a large headline and a forest-green Start Game button. The button has **no arrow or icon**.
- A dark forest-green teaser surface creates a stronger contrast with the page. The actual brass robot and walnut board enter the frame from one side, like a glimpse of the world behind the welcome screen. The board is deliberately cropped; its full bounds are never presented on the title.
- A small ivory program slip overlaps the board with `01 move` and an empty second line. It hints at the core interaction without giving away a route or reproducing the whole editor.
- A short line inside the teaser, “The next line is yours,” turns the preview into an invitation. Keep this area visually quiet enough that the Start Game button remains the obvious action.
- Use the Workshop palette, flat board geometry and shared robot art. Depth comes from layering and scale; avoid unrelated decoration, fake game controls, or an invented mechanic.

Proposed copy:

- Eyebrow: `THE ROBOT PROGRAMMING GAME`
- Headline: `Give a little robot a way out.`
- Supporting line: `One command changes everything. What will you tell it to do next?`
- Primary action: `Start game`; secondary action: `Tutorial`. Tutorial currently gives a placeholder response; this redesign does not claim a playable tutorial. That belongs to #30.

## Representative scene and motion

Use the shipped `ch1-02` **The Bend** board, drawn through the shared Workshop scene renderer. The still frame is after the first legal `move`: the robot is at (2, 1), facing east. The scene contains no sensor or advanced command because Chapter 1 has none. A crop shows the robot and part of the maze, not the full layout or exit route.

For the live title, use a short **one-shot reveal**, not a looping demo: after the first paint, the `01 move` program slip becomes active and the robot moves one tile from (1, 1) to (2, 1). Then everything settles. The second line stays blank. This promises cause and effect and stops before solving the puzzle. A decorative pause or light settling accent may add polish, but no automatic second move, full solution, or replay control is needed.

With `prefers-reduced-motion: reduce`, show the settled still frame immediately. The title must be understandable without animation or canvas: provide a short accessible description of the robot, board fragment and command. Stop any pending reveal when leaving the title or hiding the page.

## Layout targets

### Desktop, around 1280 × 800

- Keep the brand and small version marker in a slim masthead.
- Give the headline and actions ample space. The teaser sits alongside them as a single striking visual object, not a collection of game panels.
- The cropped board is large enough to recognize the robot and floor/wall materials. The program slip stays small relative to the board. Empty space in the teaser should build curiosity rather than carry explanatory UI.
- Settings and High Scores remain visually tertiary in the footer with their existing placeholder behavior.

### Phone, 390 × 844 and down to 320 px

- Order: brand → headline and pitch → Start Game and Tutorial → teaser → footer. Start Game stays in the initial viewport at 320 × 568 and 390 × 844.
- Preserve the board crop and one-line hint, but simplify typography and overlaps at narrow widths. The hero can scroll naturally on short screens.
- No horizontal overflow, cut-off action, tiny robot, or false suggestion that the teaser can be played. Use safe-area padding and 44–48 px action targets.

## Implementation plan

1. **Approve the revised composition.** Compare the [desktop and phone concept](../reference/issue-37-title-concept.html) with the shipped [Workshop reference](../reference/graphics-2026/v2/warm.html). Adjust crop, copy, scale and contrast before changing the live title.
2. **Replace the title hero.** Update `index.html` and title-only CSS with semantic wordmark, headline, actions and teaser. Keep `#screen-title`, `#btn-play`, `#btn-tutorial`, `.boot-log`, `#ticker-text`, `.version-mini` and existing module buttons, or update their wiring in the same change. Remove the large ASCII maze and robot-eye blink behavior when their elements leave the DOM.
3. **Reuse the shipped scene art.** Build the fragment from `ch1-02` via `createLevelState` and a separate `createScene` instance, or extract a small shared board painter if scene sizing makes reuse awkward. `drawWorkshopRobot` and the existing board rules remain the sole art sources. The title must not mutate play state or saved progress.
4. **Add the one-command reveal.** Drive one legal move and one code-line emphasis, then stop. Render a meaningful still frame before animation begins. Cancel timers/listeners when the title hides; keep Start Game responsive throughout. Do not load the production editor/executor just for this presentation.
5. **Fit and refine.** Review at 320 × 568, 390 × 844, 844 × 390 and 1280 × 800. Compare the title with the real game, tune visual weight and click hierarchy, and check normal/reduced motion. Keep the title lightweight: no external video, large raster hero asset, framework or duplicate board/robot drawing logic.

## Acceptance for implementation

- The first screen promises robot programming and visually belongs to the Workshop, while showing only a **fragment** of the maze and **one command**. It does not expose a full board, editor or solution.
- Start Game is the dominant action and has no arrow/icon. It opens level select as before. Tutorial, Settings and High Scores preserve their current placeholder responses until separately implemented.
- The reveal shows one valid move, settles cleanly and stops. Reduced motion starts in a complete still state. No animation continues on other screens.
- Keyboard, touch and pointer controls remain reachable; focus is visible, copy is legible, and the main action remains above the fold at the target phone sizes.
- No page errors, clipped board fragment outside its intended mask, horizontal overflow, or significant mobile load cost.

## Review decision

This is a static design mockup; its board fragment is rendered from the shipped level and scene code. The live title remains unchanged until the composition is reviewed. The one-command reveal and final wording should be judged in the playable build.
