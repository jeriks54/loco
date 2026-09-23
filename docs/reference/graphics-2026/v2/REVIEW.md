# LoCo graphics — direct redesign, 2026-09-20

The primary agent rebuilt these concepts after Jonas rejected the initial Luna
drafts. These are static visual proposals, not changes to the running game.

## Choices

- **A — The workshop:** a walnut maze surface, brass tracked robot, ivory controls
  and forest-green sensor/interaction accents. Recommended for its continuity with
  the existing warm board and friendly, readable equipment presentation.
- **B — The robot lab:** cool wall masses, pale walkable tiles, a light tracked rover
  and a navy/mint console. A more technical direction, closer to the existing dark UI.

Both use one renderer for the board, robot, all eight direction/equipment examples,
small-size samples and three sensor examples. The robot's nose and roof arrow are
visible without equipment. A separate green module marks equipment. Corner brackets
mark exactly one adjacent tile. Sensor readings use both shape and text.

The mobile editor scrolls, with Run/Reset always above it. The board remains at the
same size and position, entirely above the expanded sheet in this 390x844 example.
The equipment rules remain visible while editing. All 11 program lines are present;
scrolling the editor reveals those below the initial viewport.

## Verified

- Rendered both concepts with headless Chrome; no page errors.
- Each desktop frame is 1280x800; each phone frame is 390x844.
- Phone board rectangle is identical in collapsed and expanded frames: 360x242,
  at (15,183) relative to the frame including its border.
- No horizontal overflow in program lines, sensor status or desktop equipment row.
- Phone command chips and Run/Reset are at least 44px high.
- The real ch3-04 grid and displayed 11-line program match retained source data.
  The program reaches the goal through the real executor.
- Wall/floor/hole examples match the real `isWallAhead` evaluator: true/false/false.
- Main text/secondary text/token contrast pairs range from 4.91:1 to 10.89:1 in
  Workshop, and 6.99:1 to 13.58:1 in Robot lab.

Captured and visually inspected desktop, collapsed/expanded phone and details
images. No production files changed. Full responsive regression checks, animation
timing, touch interactions, accessibility semantics and integration remain work for
the selected design's playable implementation. A static visual review cannot
establish whether new players understand the game without a usability play-test.

## Files

Open `warm.html` or `clean.html` for the full review sheets. `concepts.js` and
`concepts.css` are shared only by these prototypes. Adjacent PNGs are direct browser
captures. The rejected root drafts have been replaced with entry points to this
revision so existing review links do not show obsolete work.
