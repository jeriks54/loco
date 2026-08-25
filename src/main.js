/* ============================================================
   LoCo — main.js (M1 placeholder boot wiring)
   Title-screen interactions: module buttons play a terminal
   boot-log sequence, ambient boot ticker, robot mascot
   blinking. No router, no state, no imports yet — screen
   switching arrives later with ui/screens.js.
   ============================================================ */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const M1_PENDING_LINE = '> update M1 pending — stand by_';
const BOOT_LINES = [
  '> loading maze.module .......... not found',
  M1_PENDING_LINE,
];
const TICKER_LINE = '> loco.system v0.0.1 — ready_';

const FIRST_LINE_DELAY_MS = 420;
const LINE_INTERVAL_MS = 560;
const REENABLE_DELAY_MS = 240; // pause after the last line before re-enabling

const TICKER_START_DELAY_MS = 650;
const TICKER_CHAR_MS = 22;

const BLINK_CLOSE_MS = 130;
const BLINK_GAP_MS = 140;

const EYES_OPEN = '▪ ▪';
const EYES_CLOSED = '─ ─';

const bootLog = document.querySelector('.boot-log');
const tickerText = document.getElementById('ticker-text');
const robotEyes = document.querySelector('.robot-eyes');
const moduleButtons = document.querySelectorAll('[data-module]');

function playBootSequence(button) {
  const moduleName = button.dataset.module;
  const lines = moduleName === 'maze'
    ? BOOT_LINES
    : [`> loading ${moduleName}.module .......... not found`, M1_PENDING_LINE];

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
