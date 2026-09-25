# Issue #37 — Workshop title screen redesign

**Status:** design plan and responsive concept, ready for visual review.

**Branch:** `codex/issue-37-title-screen`

**Issue:** https://github.com/jeriks54/loco/issues/37

**Concept:** [desktop and phone mockup](../reference/issue-37-title-concept.html)

Review captures: [desktop, 1280 × 800](../reference/issue-37-title-desktop.png) · [phone, 390 × 844](../reference/issue-37-title-phone.png).

## Goal

The first screen should immediately show the game players will enter: a brass robot on the real walnut Workshop board, a short numbered program, and a visible relationship between the active command and the robot's position. Make the page feel like the entrance to a crafted game, with a strong LoCo identity and an unmistakable Start Game action.

This is a full hero redesign. Replace the ASCII maze as the dominant image. Keep a little of the code voice in labels, line numbers and compact details, but let the actual board and robot carry the personality.

## Design direction

**Concept: “The workshop in motion.”** The board sits inside a warm, substantial preview surface, paired with a compact program card. The robot and current line are the visual focal point. The surrounding page uses generous ivory space, large human-facing typography, a forest-green primary action and restrained brass details. The board frame, materials, robot, goal and program styling must match the shipped Workshop rather than become a new illustration style.

Proposed first-screen copy:

- Eyebrow: `THE ROBOT PROGRAMMING GAME`
- Headline: `Give a little robot a way out.`
- Supporting line: `Build a program. Follow the path. Learn to think like a coder, one move at a time.`
- Primary action: `Start game`; secondary action: `Tutorial`. The latter is currently a placeholder, so this redesign must not claim that a real tutorial ships with it. A playable introduction belongs to #30.
- Preview label: `CHAPTER 01 / THE BEND` and `YOUR PROGRAM`.

Copy should remain short enough to leave the game preview and actions visible at phone height. Do not present the preview as playable if it is illustrative.

## Representative scene and behavior

Use the shipped `ch1-02` level, **The Bend**, unchanged. Its legal six-command route is:

| Line | Command | Robot after command |
| --- | --- | --- |
| 01 | move | (2, 1), east |
| 02 | turn right | (2, 1), south |
| 03 | move | (2, 2), south |
| 04 | move | (2, 3), south |
| 05 | turn right | (2, 3), west |
| 06 | move | (1, 3), exit |

The mockup freezes at the start of line 04: robot at (2, 2), facing south, line 04 highlighted. This is a real reachable state, not a made-up board. The first chapter has no sensor, so the preview must not display sensor hardware, readings, a hole, or any advanced command.

For implementation, make the preview **illustrative and non-interactive**. Run the six-command sequence once after the page settles, highlighting each line as the robot moves and turns; hold on the exit. Offer a small, explicitly labelled `Replay preview` control. A one-shot sequence gives the page a memorable moment without perpetual activity next to the main actions. Do not use the production editor or executor for this presentation. Pause/cancel timers when the title is hidden, the page is backgrounded, or the component is removed. Re-entering the title may show the settled still frame until replay is requested.

With `prefers-reduced-motion: reduce`, show the complete still composition immediately: board, robot, exit and highlighted line 04. The preview must communicate the game without motion. The same still is the fallback if canvas cannot initialize.

## Layout targets

### Desktop, around 1280 × 800

- Slim masthead with a prominent `LoCo` wordmark on the left and version on the right.
- Hero grid: about **40% identity and actions / 60% showcase**. The preview is the large visual object, with the board occupying more area than the program.
- Brand, headline, one-sentence pitch and both actions sit in the left column; the primary action is visually dominant.
- Preview heading, real board, six numbered lines and a quiet progress cue stay within one framed composition. Use depth through surfaces and shadows, not extra ornaments.
- Settings and High Scores remain visually tertiary in the footer; their existing placeholder behavior should still work.

### Phone, 390 × 844 and down to 320 px

- Order: compact brand → headline/pitch → Start Game and Tutorial → preview → footer. **Start Game stays in the initial viewport** at 320 × 568 and 390 × 844.
- At 390 px, show the board and a narrow but readable program side by side. At 320 px, stack them if needed. The preview may continue below the fold; the actions may not.
- Preserve 44–48 px touch targets, safe-area insets and natural page scrolling. No horizontal scroll and no board crop.
- Keep the real board/robot legible at the smallest mockup size. If six command labels become cramped, use shorter labels (`move`, `right`) while retaining the exact sequence and line count.

## Implementation plan

1. **Lock the visual composition.** Review the [responsive concept](../reference/issue-37-title-concept.html) at desktop and phone widths against the approved [Workshop reference](../reference/graphics-2026/v2/warm.html). Refine hierarchy, copy, scale, material balance and phone fold before touching the live title.
2. **Build the hero structure.** Replace `.ascii-logo`/`.maze` as the primary hero in `index.html`; add semantic wordmark, headline, preview region, accessible preview description and replay control. Retain `#screen-title`, `#btn-play`, `#btn-tutorial`, `.boot-log`, `#ticker-text`, `.version-mini`, and existing module buttons or deliberately update their wiring together.
3. **Reuse Workshop rendering.** Create the preview from `ch1-02` via `createLevelState` and a separate `createScene` instance, or extract a small shared board painter from `scene.js` if its fit contract makes the first option awkward. Keep `drawWorkshopRobot` and the existing board color/geometry rules as the only sources of art. Do not copy the board palette or robot paths into title-specific code. The title preview must not mutate the actual game state or saved progress.
4. **Add a six-step presentation controller.** Define the exact route as data, synchronize canvas events and line highlight, settle on the exit, and expose Replay. Keep Start Game responsive while the presentation runs. Scope timers and listeners to title visibility; use one animation sequence, no endless loop. The still frame is rendered before any animation begins.
5. **Finish the responsive styling.** Replace title-only ASCII sizing and entrance choreography with the new grid/card styles. Preserve shared controls and Workshop tokens. Treat 320 × 568, 390 × 844, 844 × 390 and 1280 × 800 as design checkpoints; use natural vertical scroll where the full preview cannot fit.
6. **Review and refine in a real browser.** Compare screenshots with the concept and the actual game at the same widths. Tune typography, board scale, line legibility, spacing and contrast. Play the scene at normal speed, reduced motion and under a slow device profile. Remove the old robot-eye blink behavior if its DOM is retired; preserve version and placeholder-module behavior.

## Acceptance for the implementation

- In five seconds a new player can identify **a robot, a maze, a numbered program, and an exit**. The visual style matches the playable Workshop board and editor.
- Start Game and Tutorial are obvious and reachable by keyboard, touch and pointer. The existing Tutorial, Settings and High Scores placeholder responses remain intact until those features are built. No existing route or progress behavior changes.
- The six-line preview has a legal route and a synchronized highlight. It ends at the real goal. Replay works repeatedly and cannot leave timers running on other screens.
- Reduced motion produces a useful still image with no decorative movement or delayed reveal. Canvas fallback includes a text description of the board/program relationship.
- No clipped board, horizontal overflow or obscured main action at 320, 390, 900 and 1280 px; short landscape can scroll. Focus rings and text contrast remain clear.
- The title remains quick to load on mobile. Avoid a new framework, external video, large raster asset or a second copy of board/robot drawing logic.

## Review decision

Use the concept to approve the composition and visual tone before implementing the live screen. The mockup is intentionally static; its board is drawn with the shipped scene renderer at a real intermediate state, so the key visual is an accurate game preview. The one-shot motion and final copy still need to be judged in the playable build.
