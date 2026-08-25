# Brief — Welcome screen (visual identity warm-up)

**Date:** 2026-08-23 · **Milestone:** M1 (issue #1, game shell) · **Branch:** `feat/m1-playable-core`

## Context

LoCo is a browser game where the player programs a robot with drag-and-drop command blocks. This task is the first coded deliverable: it reskins the title screen with the game's locked visual identity and makes the page boot cleanly. It is deliberately small — its job is to set the look & feel bar for everything that follows.

**Required reading before writing any code:** `docs/design.md` — §1 (stack), §2 (architecture), §11 (visual language). The visual language section is a locked decision; implement it, don't reinterpret it.

## Scope

**In:** the `#screen-title` section only, shared base styles, and a minimal `src/main.js`.
**Out:** level select, game screen, editor, canvas, screen routing. Leave those markup sections untouched and hidden via CSS. No frameworks, no libraries, no build step — vanilla HTML/CSS/ES modules served as static files.

## Deliverables

### 1. `styles/main.css` (new)

- Design tokens as CSS custom properties on `:root` (fine-tune ±slightly if it improves contrast, keep the relationships):
  - `--bg: #0B0F14` (near-black graphite)
  - `--surface: #12181F`, `--surface-2: #1A222C`
  - `--border: #26303B`
  - `--text: #E8EEF2`, `--muted: #7E8B98`
  - `--accent: #B6FF3B` (neon lime), `--accent-soft: rgba(182, 255, 59, 0.14)`
- Minimal reset; body uses the mono stack; `--bg` background; `--text` color.
- `.screen` = full-viewport-height centered column with comfortable padding; `.hidden { display: none; }`.
- Button styles for the existing classes (`btn`, `btn-primary`, `btn-large`, `btn-ghost`): touch target ≥ 48px, clear hover/active states, visible `:focus-visible` outline in the accent color. Primary button should feel neon without screaming (accent color + subtle glow).
- Load animation: title content fades/rises in once, subtly.
- **Every** animation/transitions that is decorative lives inside `@media (prefers-reduced-motion: no-preference)`.

### 2. `index.html` — reskin `#screen-title`

- `<head>`: add Google Fonts `JetBrains Mono` (400, 700) with `preconnect`, and `<meta name="theme-color" content="#0B0F14">`.
- Logo: the figlet asset below in `<pre class="ascii-logo" aria-hidden="true">`, plus a visually-hidden `<h1 class="sr-only">LoCo — Lines of Code</h1>` (provide the `.sr-only` utility in CSS).
- Keep the existing tagline text; add a blinking block cursor (`▮`) after it.
- Replace the button label: `<button id="btn-play" class="btn btn-primary btn-large">▶ START</button>`.
- Add a small `<pre class="boot-log" hidden>` area below the button (used by `main.js` for the placeholder interaction).
- Add an ASCII-framed footer: box-drawing frame around `v0.0.1` and one terminal-hint line (e.g. `> insert blocks. escape maze.`). Frame may be a CSS-border + corner-glyph hybrid if that survives responsive widths better — but it must read as an ASCII frame and must not break at 320 px.
- Do not modify `#screen-levels` / `#screen-game` content.

### 3. `src/main.js` (new, ES module)

The file is already referenced from `index.html` — creating it removes the 404.

- Wire `#btn-play`: on click, reveal `.boot-log` and type out (simple `setTimeout` cascade or CSS typing effect) two lines in terminal boot voice, e.g.:
  ```
  > loading maze.module .......... not found
  > update M1 pending — stand by_
  ```
  Disable the button while the sequence plays, then re-enable. Copy may be refined but must match the voice in design.md §11 (short, dry, playful, no lorem).
- Nothing else. No router, no state machine, no imports yet.
- Page must load with zero console errors/warnings.

## Asset — figlet logo (use verbatim, preserve spacing)

ANSI-shadow style "LoCo", 34 columns:

```
██╗      ██████╗  ██████╗ ██████╗ 
██║     ██╔═══██╗██╔════╝██╔═══██╗
██║     ██║   ██║██║     ██║   ██║
██║     ██║   ██║██║     ██║   ██║
███████╗╚██████╔╝╚██████╗╚██████╔╝
╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ 
```

Size it with a fluid font size (e.g. `clamp()`) so all 34 columns fit a 320 px viewport with page padding — **no horizontal scroll, ever**. Give it a subtle accent glow via `text-shadow`.

## Style guardrails

- It must feel like a polished 2026 mobile app rendered in monospace: generous spacing, calm hierarchy, one accent color used sparingly.
- No CRT scanlines, no phosphor green-on-black, no fake OS window chrome — "modern app", not "1983 terminal" (design.md §11).
- All ASCII art is real text, not images.
- Font must degrade gracefully to the system mono stack if Google Fonts is unreachable.

## Self-check before hand-off (report results in your summary)

1. Loads with zero console errors/warnings (verify in a real browser or with careful reasoning if no browser is available).
2. At 320 px, 390 px and desktop widths: no horizontal scroll; logo, tagline, START button and footer all visible and legible.
3. Identity reads at a glance: monospace type, graphite dark, neon-lime accent, ASCII logo + box-drawing frame.
4. Blink cursor and fade-in animate; both are disabled under `prefers-reduced-motion`.
5. START click plays the boot-log sequence and the button becomes clickable again.
6. Keyboard: Tab reaches START with a visible focus ring; `h1.sr-only` present and `.ascii-logo` is `aria-hidden`.

## Working rules

- Do **not** run any git commands; hand off the changed working tree for review.
- Do not touch `.gitignore`, `.vercel/`, or `docs/` (except nothing — this brief is your only doc).
