/* ============================================================
   LoCo — main.js (M1 placeholder boot wiring)
   Wires the title-screen START button to a short terminal
   boot-log sequence. No router, no state, no imports yet —
   screen switching arrives later with ui/screens.js.
   ============================================================ */

const BOOT_LINES = [
  '> loading maze.module .......... not found',
  '> update M1 pending — stand by_',
];

const FIRST_LINE_DELAY_MS = 420;
const LINE_INTERVAL_MS = 560;
const REENABLE_DELAY_MS = 240; // pause after the last line before re-enabling START

const btnPlay = document.getElementById('btn-play');
const bootLog = document.querySelector('.boot-log');

function playBootSequence() {
  btnPlay.disabled = true;
  bootLog.textContent = '';
  bootLog.hidden = false;

  BOOT_LINES.forEach((line, index) => {
    window.setTimeout(() => {
      bootLog.textContent += (index > 0 ? '\n' : '') + line;
    }, FIRST_LINE_DELAY_MS + index * LINE_INTERVAL_MS);
  });

  window.setTimeout(() => {
    btnPlay.disabled = false;
  }, FIRST_LINE_DELAY_MS + BOOT_LINES.length * LINE_INTERVAL_MS + REENABLE_DELAY_MS);
}

if (btnPlay && bootLog) {
  btnPlay.addEventListener('click', playBootSequence);
}
