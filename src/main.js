/* ============================================================
   LoCo — main.js (M1 boot wiring, M2 loop outcomes)
   Wires screens, level registry, and the game screen's
   state / executor / scene / editor / HUD into one flow.
   Welcome-screen interactions (module boot-log joke, ambient
   ticker, robot blink) are kept intact — except Start Game,
   which now opens the level select (brief §7).
   M2: the terminal-event fan-out also covers the loop-era
   'syntax' (refused run) and 'runaway' (tick cap) outcomes.
   ============================================================ */

import { levels } from './levels/index.js';
import { createLevelState } from './game/state.js';
import { createExecutor } from './game/executor.js';
import { createScene } from './render/scene.js';
import { createEditor } from './ui/editor.js';
import { createHud } from './ui/hud.js';
import { createScreens, renderLevelList } from './ui/screens.js';

/* ---------- Welcome screen (kept from the warm-up) ---------- */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const M1_PENDING_LINE = '> update M1 pending — stand by_';

const FIRST_LINE_DELAY_MS = 420;
const LINE_INTERVAL_MS = 560;
const REENABLE_DELAY_MS = 240; // pause after the last line before re-enabling

const TICKER_START_DELAY_MS = 650;
const TICKER_CHAR_MS = 22;
const TICKER_LINE = '> loco.system v0.0.1 — ready_';

const BLINK_CLOSE_MS = 130;
const BLINK_GAP_MS = 140;

const EYES_OPEN = '▪ ▪';
const EYES_CLOSED = '─ ─';

const bootLog = document.querySelector('.boot-log');
const tickerText = document.getElementById('ticker-text');
const robotEyes = document.querySelector('.robot-eyes');
// Start Game (#btn-play) is wired to the level select instead —
// the boot-log joke stays for the not-yet-built modules only.
const moduleButtons = document.querySelectorAll('[data-module]:not(#btn-play)');

function playBootSequence(button) {
  const moduleName = button.dataset.module;
  const lines = [`> loading ${moduleName}.module .......... not found`, M1_PENDING_LINE];

  button.disabled = true;
  bootLog.textContent = '';
  bootLog.hidden = false;
  blink(2); // the robot noticed you pressed something

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

function blink(times) {
  if (!robotEyes || REDUCED_MOTION || times <= 0) return;
  robotEyes.textContent = EYES_CLOSED;
  window.setTimeout(() => {
    robotEyes.textContent = EYES_OPEN;
    window.setTimeout(() => blink(times - 1), BLINK_GAP_MS);
  }, BLINK_CLOSE_MS);
}

function scheduleBlink() {
  if (!robotEyes || REDUCED_MOTION) return;
  const delay = 2400 + Math.random() * 2200;
  window.setTimeout(() => {
    blink(Math.random() < 0.25 ? 2 : 1);
    scheduleBlink();
  }, delay);
}

moduleButtons.forEach((button) => {
  button.addEventListener('click', () => playBootSequence(button));
});

typeTicker();
scheduleBlink();

/* ---------- Game flow (M1 playable core) ---------- */

const levelListEl = document.getElementById('level-list');

let currentIndex = -1;
let state = null;
let executor = null;
let speed = 1;

function stopRun() {
  if (executor) executor.stop();
  editor.setRunning(false);
  editor.clearHighlight();
  hud.setRunning(false);
}

const screens = createScreens({
  onLeaveGame: stopRun,
});

const scene = createScene({ canvas: document.getElementById('board') });

const editor = createEditor({
  paletteEl: document.getElementById('palette'),
  programEl: document.getElementById('program'),
  countEl: document.getElementById('memory-count'),
  onChange: (len) => hud.setProgramLength(len),
});

const hud = createHud({
  onRun: run,
  onReset: resetRun,
  onRetry: retry,
  onNext: () => loadLevel(currentIndex + 1),
  onSpeed: (value) => {
    speed = value;
    if (executor) executor.setSpeed(value);
  },
});

function handleEvent(type, payload) {
  if (type === 'step') {
    editor.highlight(payload);
    return;
  }
  scene.handleEvent(type, payload); // moved / turned / crashed / goal
  if (type === 'crashed' || type === 'finished' || type === 'goal' || type === 'syntax' || type === 'runaway') {
    editor.setRunning(false);
    editor.clearHighlight();
    hud.setRunning(false);
    hud.showResult(type, { hasNext: currentIndex < levels.length - 1 });
  }
}

function loadLevel(index) {
  stopRun();
  currentIndex = index;
  const level = levels[index];
  state = createLevelState(level);
  executor = null;
  editor.loadLevel(level);
  hud.setLevel(level, index, levels.length);
  hud.setSpeedButtons(speed);
  hud.hideOverlay();
  hud.setRunning(false);
  screens.showScreen('game'); // show first so the panel has a size to fit into
  scene.render(state);
}

function run() {
  const program = editor.getProgram();
  if (program.length === 0) return;
  stopRun();
  hud.hideOverlay();
  executor = createExecutor({ state, program, onEvent: handleEvent });
  editor.setRunning(true);
  hud.setRunning(true);
  executor.start(speed);
}

function resetRun() {
  stopRun();
  if (executor) executor.reset();
  hud.hideOverlay();
  scene.render(state);
}

function retry() {
  // overlay hides, robot resets, program is preserved
  hud.hideOverlay();
  if (executor) executor.reset();
  editor.clearHighlight();
  hud.setRunning(false);
  scene.render(state);
}

document.getElementById('btn-clear').addEventListener('click', () => {
  if (editor) editor.clearProgram();
});

renderLevelList(levelListEl, levels, (index) => loadLevel(index));
