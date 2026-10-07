/* ============================================================
   LoCo — main.js (M1 boot wiring, M2 loop outcomes + progress)
   Wires screens, level registry, and the game screen's
   state / executor / scene / editor / HUD into one flow.
   Welcome-screen interactions (module boot-log joke and ambient
   ticker) are kept intact — except Start Game,
   which now opens the level select (brief §7).
   M2: the terminal-event fan-out also covers the loop-era
   'syntax' (refused run) and 'runaway' (tick cap) outcomes.
   Progress (design.md §7) is loaded at boot, saved on goal,
   and reflected in the level list's completion marks.
   M4: the program panel is a bottom sheet under the width
   breakpoint (design.md §8.1). It starts collapsed on every
   level load and collapses when a run starts, so the maze is
   never obscured. Sheet state is not persisted.
   ============================================================ */

import { levels } from './levels/index.js';
import { createLevelState } from './game/state.js';
import { createExecutor } from './game/executor.js';
import { createScene } from './render/scene.js';
import { createEditor } from './ui/editor.js';
import { createEquipment } from './ui/equipment.js';
import { createHud } from './ui/hud.js';
import { createSheet } from './ui/sheet.js';
import { createScreens, renderLevelList } from './ui/screens.js';
import { createTitlePreview } from './ui/title-preview.js';
import { createTutorialTour } from './ui/tutorial-tour.js';
import { loadProgress, markCompleted } from './persist.js';
import { tutorialLevel, chapterExamples, loadSeenChapters, markChapterSeen } from './onboarding.js';

/* ---------- Welcome screen (kept from the warm-up) ---------- */

// Single source of truth for the version: written into .version-mini at boot and
// interpolated into the ticker. index.html deliberately carries no literal.
const VERSION = 'v0.4';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const M1_PENDING_LINE = '> update M1 pending — stand by_';

const FIRST_LINE_DELAY_MS = 420;
const LINE_INTERVAL_MS = 560;
const REENABLE_DELAY_MS = 240; // pause after the last line before re-enabling

const TICKER_START_DELAY_MS = 650;
const TICKER_CHAR_MS = 22;
const TICKER_LINE = `> loco.system ${VERSION} — ready_`;

const bootLog = document.querySelector('.boot-log');
const tickerText = document.getElementById('ticker-text');
const versionMini = document.querySelector('.version-mini');
// Start Game (#btn-play) is wired to the level select instead —
// the boot-log joke stays for the not-yet-built modules only.
const moduleButtons = document.querySelectorAll('[data-module]:not(#btn-play):not(#btn-tutorial)');

function playBootSequence(button) {
  const moduleName = button.dataset.module;
  const lines = [`> loading ${moduleName}.module .......... not found`, M1_PENDING_LINE];

  button.disabled = true;
  bootLog.textContent = '';
  bootLog.hidden = false;
  lines.forEach((line, index) => {
    window.setTimeout(() => {
      bootLog.textContent += (index > 0 ? '\n' : '') + line;
    }, FIRST_LINE_DELAY_MS + index * LINE_INTERVAL_MS);
  });

  window.setTimeout(() => {
    button.disabled = false;
  }, FIRST_LINE_DELAY_MS + lines.length * LINE_INTERVAL_MS + REENABLE_DELAY_MS);
}

function typeTicker() {
  if (!tickerText) return;
  if (REDUCED_MOTION) {
    tickerText.textContent = TICKER_LINE;
    return;
  }
  window.setTimeout(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      tickerText.textContent = TICKER_LINE.slice(0, index);
      if (index >= TICKER_LINE.length) {
        window.clearInterval(timer);
      }
    }, TICKER_CHAR_MS);
  }, TICKER_START_DELAY_MS);
}

moduleButtons.forEach((button) => {
  button.addEventListener('click', () => playBootSequence(button));
});

if (versionMini) versionMini.textContent = VERSION;
typeTicker();

const titlePreview = createTitlePreview({
  canvas: document.getElementById('title-preview-board'),
  commandEl: document.getElementById('title-preview-command'),
  root: document.getElementById('title-preview'),
});
titlePreview.show();

/* ---------- Game flow (M1 playable core) ---------- */

const levelListEl = document.getElementById('level-list');
let progress = loadProgress();
let seenChapters = loadSeenChapters(progress);

let currentIndex = -1;
let mode = 'campaign';
let state = null;
let executor = null;
let speed = 1;
let tutorialHintPhase = '';
let exampleContext = null;

const tutorialHints = document.getElementById('tutorial-hints');
const tutorialHintText = document.getElementById('tutorial-hint-text');
const backButton = document.getElementById('btn-back');

const TUTORIAL_HINTS = {
  start: 'Reach EXIT. Commands run from line 01 downward. Drag a command to a line or tap it to add it.',
  edited: "Turns change the robot's facing without moving it. You have six memory lines. Press Run when ready.",
  running: 'The highlighted line is the command running. Reset returns the robot to the start and keeps your program.',
  reset: 'Reset returned the robot to the start and kept your program. Edit it or press Run again.',
  failed: 'Edit your program and try again. Run starts at the entrance.',
  complete: 'You reached EXIT. Ready for Chapter 1?',
};
const TUTORIAL_MOBILE_HINTS = {
  start: 'Reach EXIT. Tap the arrow below to open the program panel. Tap commands into numbered lines, then Run.',
  edited: "You have six memory lines. Turns change facing without moving. Close the panel to inspect the maze, then Run.",
};
const EXAMPLE_START_HINTS = {
  ch2: 'Build loop 3, move, end. Use + on the loop line to set the count, then Run.',
  ch3: 'Build loop until [wall sensor] = [blocked], move, end, turn right, move. Fill both condition slots.',
  ch4: 'Build loop 2, if blocked, turn right, else, move, end, end, move. Fill the if condition slots.',
};
const EXAMPLE_HINTS = {
  edited: 'Check the numbered lines and condition or count controls, then Run. Reset keeps your program.',
  running: 'The highlighted line is running. Watch for a repeated line or a different branch.',
  reset: 'Reset returned the robot to S and kept your program. Edit it or Run again.',
  failed: 'Edit your program and try again. Run starts at S.',
  complete: 'You reached EXIT. Ready for the selected level?',
};

function setTutorialHint(phase) {
  if ((mode !== 'tutorial' && mode !== 'example') || phase === tutorialHintPhase) return;
  tutorialHintPhase = phase;
  if (mode === 'example') {
    tutorialHintText.textContent = phase === 'start'
      ? EXAMPLE_START_HINTS[exampleContext.prefix]
      : phase === 'complete' && exampleContext.destination === null
        ? 'You reached EXIT. Choose another level when ready.'
        : EXAMPLE_HINTS[phase];
  } else {
    tutorialHintText.textContent = window.matchMedia('(max-width: 900px)').matches
      ? TUTORIAL_MOBILE_HINTS[phase] || TUTORIAL_HINTS[phase]
      : TUTORIAL_HINTS[phase];
  }
}

function stopRun() {
  if (executor) executor.stop();
  editor.setRunning(false);
  editor.clearHighlight();
  hud.setRunning(false);
}

const screens = createScreens({
  onLeaveGame: stopRun,
  onBackGame: () => mode === 'tutorial' ? 'title' : 'levels',
  onScreenChange: (name) => {
    if (name === 'title') titlePreview.show();
    else titlePreview.hide();
  },
});

const equipment = createEquipment();
const scene = createScene({
  canvas: document.getElementById('board'),
  onSensorChange: equipment.update,
});

const editor = createEditor({
  paletteEl: document.getElementById('palette'),
  programEl: document.getElementById('program'),
  countEl: document.getElementById('memory-count'),
  onChange: (len) => {
    hud.setProgramLength(len);
    if (mode !== 'campaign' && tutorialHintPhase !== 'running' && tutorialHintPhase !== 'complete') {
      setTutorialHint(len ? 'edited' : 'start');
    }
  },
});

const hud = createHud({
  onRun: run,
  onReset: resetRun,
  onRetry: retry,
  onNext: () => mode === 'tutorial' ? loadLevel(0)
    : mode === 'example' ? skipExample()
      : selectLevel(currentIndex + 1, document.getElementById('btn-next')),
  onSpeed: (value) => {
    speed = value;
    scene.setSpeed(value);
    if (executor) executor.setSpeed(value);
  },
});

// No onDetentChange on purpose: the board is detent-independent (the overlay
// model reserves only the collapsed peek height in the panel's padding, and
// scene.js already re-fits on its own ResizeObserver), so a settle must not
// trigger a re-fit.
const sheet = createSheet({
  root: document.getElementById('sheet'),
  grip: document.getElementById('sheet-grip'),
  chevron: document.getElementById('sheet-chevron'),
  body: document.getElementById('sheet-body'),
});

const tutorialTour = createTutorialTour({
  root: document.getElementById('tutorial-tour'),
  game: document.getElementById('screen-game'),
  sheet,
  onFinish: showPracticeHints,
  onSkip: () => mode === 'example' ? skipExample() : showPracticeHints(),
});

function showPracticeHints() {
  tutorialHints.classList.remove('hidden');
  setTutorialHint(editor.getProgram().length ? 'edited' : 'start');
  document.querySelector(window.matchMedia('(max-width: 900px)').matches
    ? '#sheet-chevron' : '#palette .block-chip')?.focus();
}

function skipExample() {
  const { destination, trigger } = exampleContext;
  if (destination === null) {
    stopRun();
    screens.showScreen('levels');
    trigger?.focus();
  } else {
    loadLevel(destination);
    backButton.focus();
  }
}

function selectLevel(index, trigger = null) {
  if (index < 0 || index >= levels.length) return;
  const prefix = levels[index].id.split('-')[0];
  if (chapterExamples[prefix] && !seenChapters.has(prefix)) {
    seenChapters = markChapterSeen(seenChapters, prefix);
    loadExample(prefix, index, trigger);
  } else {
    loadLevel(index);
  }
}

function renderLevels() {
  renderLevelList(levelListEl, levels, selectLevel, progress,
    (prefix, trigger) => loadExample(prefix, null, trigger));
}

function handleEvent(type, payload) {
  if (type === 'loopProgress') {
    editor.setLoopProgress(payload);
    return;
  }
  if (type === 'step') {
    editor.highlight(payload);
    return;
  }
  scene.handleEvent(type, payload); // moved / turned / crashed / fell / goal
  if (type === 'crashed' || type === 'fell' || type === 'finished' || type === 'goal' || type === 'syntax' || type === 'runaway') {
    editor.setRunning(false);
    editor.clearHighlight();
    hud.setRunning(false);
    const practice = mode !== 'campaign';
    hud.showResult(type, {
      hasNext: practice || currentIndex < levels.length - 1,
      reason: payload?.reason,
      tutorial: mode === 'tutorial',
      example: mode === 'example',
      nextLabel: mode === 'example' && exampleContext.destination === null ? 'Choose levels' : null,
    });
    if (practice) setTutorialHint(type === 'goal' ? 'complete' : 'failed');
    if (type === 'goal') {
      if (!practice) {
        progress = markCompleted(levels[currentIndex].id);
        renderLevels();
      }
    }
  }
}

function loadLevel(index) {
  stopRun();
  tutorialTour.stop();
  mode = 'campaign';
  exampleContext = null;
  document.getElementById('screen-game').classList.remove('is-tutorial', 'is-example');
  tutorialHints.classList.add('hidden');
  document.getElementById('board').setAttribute('aria-describedby', 'sensor-note sensor-reading');
  backButton.textContent = '← Levels';
  currentIndex = index;
  const level = levels[index];
  state = createLevelState(level);
  executor = null;
  editor.loadLevel(level);
  hud.setLevel(level, index, levels.length);
  hud.setSpeed(speed);
  hud.hideOverlay();
  hud.setRunning(false);
  sheet.collapse(); // a level always opens with the board unobstructed
  screens.showScreen('game'); // show first so the panel has a size to fit into
  window.scrollTo(0, 0);
  scene.render(state);
}

function loadTutorial() {
  stopRun();
  tutorialTour.stop();
  mode = 'tutorial';
  exampleContext = null;
  document.getElementById('screen-game').classList.add('is-tutorial');
  document.getElementById('screen-game').classList.remove('is-example');
  currentIndex = -1;
  state = createLevelState(tutorialLevel);
  executor = null;
  tutorialHintPhase = '';
  tutorialHints.classList.add('hidden');
  document.getElementById('btn-tutorial-skip').textContent = 'Skip tutorial';
  document.getElementById('board').setAttribute('aria-describedby', 'tutorial-board-description');
  backButton.textContent = '← Exit tutorial';
  editor.loadLevel(tutorialLevel);
  hud.setLevel(tutorialLevel, 0, 1);
  hud.setSpeed(speed);
  hud.hideOverlay();
  hud.setRunning(false);
  sheet.collapse();
  screens.showScreen('game');
  window.scrollTo(0, 0);
  scene.render(state);
  tutorialTour.start();
}

function loadExample(prefix, destination, trigger = null) {
  stopRun();
  tutorialTour.stop();
  mode = 'example';
  exampleContext = { prefix, destination, trigger };
  const level = chapterExamples[prefix];
  const game = document.getElementById('screen-game');
  game.classList.add('is-tutorial', 'is-example');
  currentIndex = -1;
  state = createLevelState(level);
  executor = null;
  tutorialHintPhase = '';
  tutorialHints.classList.add('hidden');
  document.getElementById('btn-tutorial-skip').textContent = 'Skip example';
  document.getElementById('example-board-description').textContent = level.description;
  document.getElementById('board').setAttribute('aria-describedby',
    level.sensor ? 'example-board-description sensor-note sensor-reading' : 'example-board-description');
  backButton.textContent = '← Exit example';
  editor.loadLevel(level);
  hud.setLevel(level, 0, 1);
  hud.setSpeed(speed);
  hud.hideOverlay();
  hud.setRunning(false);
  sheet.collapse();
  screens.showScreen('game');
  window.scrollTo(0, 0);
  scene.render(state);
  tutorialTour.start(prefix);
}

function run() {
  const program = editor.getProgram();
  if (program.length === 0) return;
  stopRun();
  hud.hideOverlay();
  executor = createExecutor({ state, program, onEvent: handleEvent });
  // Every Run starts at the level entrance, including after a fall. Reset the
  // renderer too so an earlier fall cannot leave the robot hidden.
  executor.reset();
  scene.render(state);
  editor.setRunning(true);
  hud.setRunning(true);
  if (mode !== 'campaign') setTutorialHint('running');
  sheet.collapse(); // the run plays out on the board, not behind an expanded sheet
  scene.setSpeed(speed);
  executor.start(speed);
}

function resetRun() {
  stopRun();
  if (executor) executor.reset();
  hud.hideOverlay();
  scene.render(state);
  if (mode !== 'campaign') setTutorialHint('reset');
}

function retry() {
  // overlay hides, robot resets, program is preserved
  hud.hideOverlay();
  if (executor) executor.reset();
  editor.clearHighlight();
  hud.setRunning(false);
  scene.render(state);
  if (mode !== 'campaign') setTutorialHint('failed');
}

document.getElementById('btn-clear').addEventListener('click', () => {
  if (editor) editor.clearProgram();
});

document.getElementById('btn-tutorial').addEventListener('click', loadTutorial);
backButton.addEventListener('click', () => {
  if (mode === 'example') exampleContext?.trigger?.focus();
});
document.getElementById('btn-tutorial-skip').addEventListener('click', () => {
  if (mode === 'example') return skipExample();
  stopRun();
  mode = 'campaign';
  screens.showScreen('levels');
});

renderLevels();
