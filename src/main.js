/* ============================================================
   LoCo — main.js (M1 placeholder boot wiring)
   Title-screen interactions: START button boot-log sequence,
   ambient boot ticker, robot mascot blinking. No router, no
   state, no imports yet — screen switching arrives later with
   ui/screens.js.
   ============================================================ */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BOOT_LINES = [
  '> loading maze.module .......... not found',
  '> update M1 pending — stand by_',
];
const TICKER_LINE = '> loco.system v0.0.1 — ready_';

const FIRST_LINE_DELAY_MS = 420;
const LINE_INTERVAL_MS = 560;
const REENABLE_DELAY_MS = 240; // pause after the last line before re-enabling START

const TICKER_START_DELAY_MS = 650;
const TICKER_CHAR_MS = 22;

const BLINK_CLOSE_MS = 130;
const BLINK_GAP_MS = 140;

const EYES_OPEN = '▪ ▪';
const EYES_CLOSED = '─ ─';

const btnPlay = document.getElementById('btn-play');
const bootLog = document.querySelector('.boot-log');
const tickerText = document.getElementById('ticker-text');
const robotEyes = document.querySelector('.robot-eyes');

function playBootSequence() {
  btnPlay.disabled = true;
  bootLog.textContent = '';
  bootLog.hidden = false;
  blink(2); // the robot noticed you pressed something

  BOOT_LINES.forEach((line, index) => {
    window.setTimeout(() => {
      bootLog.textContent += (index > 0 ? '\n' : '') + line;
    }, FIRST_LINE_DELAY_MS + index * LINE_INTERVAL_MS);
  });

  window.setTimeout(() => {
    btnPlay.disabled = false;
  }, FIRST_LINE_DELAY_MS + BOOT_LINES.length * LINE_INTERVAL_MS + REENABLE_DELAY_MS);
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

if (btnPlay && bootLog) {
  btnPlay.addEventListener('click', playBootSequence);
}

typeTicker();
scheduleBlink();
