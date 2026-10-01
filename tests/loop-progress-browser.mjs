// Real application wiring and layout; executor timers are advanced explicitly.
// Set LOCO_PLAYWRIGHT_MODULE to an existing playwright/index.mjs.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE);
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const level = {
  id: 'ch2-01', name: 'Nested loop workshop', chapter: 'Loops',
  grid: ['#####', '#S.G#', '#####'], startDir: 'E', memory: 8, par: 5,
  sensor: 'frontWall', blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'loopUntil', 'if', 'else', 'end'],
};
const hole = { ...level, id: 'ch2-02', name: 'Hole workshop', grid: ['#####', '#SHG#', '#####'] };
const { server, url } = await startTileServer(0, [level, hole]);
await mkdir(fileURLToPath(new URL('./tmp/', import.meta.url)), { recursive: true });
let browser;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [width, motion] of [[1280, 'no-preference'], [320, 'reduce'], [280, 'no-preference']]) {
    const mobile = width < 900;
    const page = await browser.newPage({ viewport: { width, height: mobile ? 680 : 800 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: motion });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.addInitScript(() => {
      localStorage.setItem('loco.onboarding.v1', JSON.stringify({ seen: ['ch2', 'ch3', 'ch4'] }));
      const originalSet = window.setTimeout.bind(window);
      const originalClear = window.clearTimeout.bind(window);
      const pending = new Map();
      let id = -1;
      window.setTimeout = (fn, delay, ...args) => {
        if ([300, 600, 1200].includes(delay)) {
          const key = id--;
          pending.set(key, () => fn(...args));
          return key;
        }
        return originalSet(fn, delay, ...args);
      };
      window.clearTimeout = key => key < 0 ? pending.delete(key) : originalClear(key);
      window.__loopClock = {
        next() {
          const entry = pending.entries().next().value;
          if (!entry) return false;
          pending.delete(entry[0]);
          entry[1]();
          return true;
        },
        drain() {
          let calls = 0;
          while (this.next()) if (++calls > 205) throw new Error('Executor did not halt');
        },
      };
    });
    await page.goto(url);
    await page.locator('#btn-play').click();
    await page.locator('.level-item').first().click();
    // Defensive skip if the onboarding storage contract changes.
    if (await page.locator('#tutorial-tour').isVisible()) await page.locator('#btn-tour-skip').click();

    async function expand() {
      if (mobile && await page.locator('#sheet-chevron').getAttribute('aria-expanded') === 'false') {
        await page.locator('#sheet-chevron').click();
      }
      if (mobile) {
        await page.locator('#sheet').evaluate(root => Promise.all(
          root.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))));
      }
    }
    async function add(ids) {
      await expand();
      for (const id of ids) {
        const command = page.locator(`#palette [data-block="${id}"]`);
        await command.waitFor({ state: 'visible' });
        await command.focus();
        await page.keyboard.press('Enter');
      }
    }
    const visibleProgress = () => page.locator('.loop-progress:not([hidden])').allTextContents();
    const counts = () => page.locator('.loop-count').allTextContents();
    const run = () => page.locator(mobile ? '#btn-run-peek' : '#btn-run').click();
    const drain = () => page.evaluate(() => window.__loopClock.drain());

    await add(['loop', 'loop', 'turnRight', 'end', 'end']);
    await page.locator('.line.filled').nth(1).locator('[data-step="1"]').click();
    await run();
    assert.deepEqual(await visibleProgress(), ['2 left'], 'inactive inner loop displayed a counter');
    await page.evaluate(() => window.__loopClock.next());
    assert.deepEqual(await visibleProgress(), ['2 left', '3 left']);
    assert.deepEqual(await counts(), ['2', '3'], 'authored counts changed');
    assert.equal(await page.locator('.line.current').getAttribute('data-index'), '1');
    assert.equal(await page.locator('.step-btn:not(:disabled)').count(), 0, 'steppers unlocked during run');
    assert.match(await page.locator('.loop-progress:not([hidden])').first().getAttribute('aria-label'), /including the current iteration/);
    assert.equal(await page.locator('.loop-progress[aria-live], .loop-progress[role="status"]').count(), 0);
    await expand();
    assert.match(await page.locator('.loop-progress:not([hidden])').first().ariaSnapshot(),
      /note "2 of 2 iterations left, including the current iteration"/);
    await page.locator('.line.filled').first().focus();
    await page.keyboard.press('Delete');
    assert.equal(await page.locator('.line.filled').count(), 5, 'keyboard editing unlocked during run');
    await page.waitForTimeout(200);
    const fit = await page.evaluate(() => {
      const program = document.getElementById('program');
      return { pageWidth: document.documentElement.scrollWidth, width: innerWidth,
        programWidth: program.clientWidth, contentWidth: program.scrollWidth,
        badges: [...document.querySelectorAll('.loop-progress:not([hidden])')].map(badge => {
          const box = badge.getBoundingClientRect();
          const parent = program.getBoundingClientRect();
          return box.left >= parent.left && box.right <= parent.right;
        }) };
    });
    assert.ok(fit.pageWidth <= fit.width, `${width}px page overflow`);
    assert.ok(fit.contentWidth <= fit.programWidth, `${width}px program overflow`);
    assert.ok(fit.badges.every(Boolean), `${width}px clipped badges`);
    await page.screenshot({ path: fileURLToPath(new URL(`./tmp/loop-progress-${width}.png`, import.meta.url)) });

    // Observe the inner decrement, disappearance, and restart in iteration two.
    await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__loopClock.next(); });
    assert.deepEqual(await visibleProgress(), ['2 left', '2 left']);
    await page.evaluate(() => {
      for (let i = 0; i < 20; i++) {
        if (document.querySelector('.loop-progress').textContent === '1 left') return;
        window.__loopClock.next();
      }
      throw new Error('Outer loop did not advance');
    });
    assert.deepEqual(await visibleProgress(), ['1 left']);
    await page.evaluate(() => window.__loopClock.next());
    assert.deepEqual(await visibleProgress(), ['1 left', '3 left']);
    await page.locator('#speed [data-speed="2"]').click();
    assert.deepEqual(await visibleProgress(), ['1 left', '3 left'], 'speed change reset counters');
    await page.locator(mobile ? '#btn-reset-peek' : '#btn-reset').click();
    assert.deepEqual(await visibleProgress(), []);
    assert.deepEqual(await counts(), ['2', '3']);
    await run();
    assert.deepEqual(await visibleProgress(), ['2 left']);
    await drain();
    assert.deepEqual(await visibleProgress(), []);
    assert.match(await page.locator('#result-text').textContent(), /FELL SHORT/);
    await page.locator('#btn-retry').click();
    assert.deepEqual(await counts(), ['2', '3']);
    assert.equal(await page.locator('.step-btn:not(:disabled)').count(), 4);
    await run();
    await page.locator('#btn-back').click();
    assert.deepEqual(await visibleProgress(), [], 'leaving play left counters');
    await page.locator('.level-item').first().click();
    assert.equal(await page.locator('.line.filled').count(), 0);

    // A goal halfway through loop 3 and a crash must clear the badge immediately.
    await add(['loop', 'move', 'end']);
    await page.locator('[data-step="1"]').click();
    await run();
    await drain();
    assert.match(await page.locator('#result-text').textContent(), /COMPLETE/);
    assert.deepEqual(await visibleProgress(), []);
    assert.deepEqual(await counts(), ['3']);
    await page.locator('#btn-retry').click();
    await expand();
    await page.locator('#btn-clear').click();
    await add(['loop', 'turnLeft', 'move', 'end']);
    await run();
    await drain();
    assert.match(await page.locator('#result-text').textContent(), /CRASHED/);
    assert.deepEqual(await visibleProgress(), []);
    await page.locator('#btn-retry').click();
    await expand();
    await page.locator('#btn-clear').click();

    // A sensed loop does not invent a countdown.
    await add(['loopUntil', 'move', 'end']);
    for (const condition of ['wallSensor', 'blocked']) {
      await page.locator(`[data-condition="${condition}"]`).focus();
      await page.keyboard.press('Enter');
    }
    await run();
    assert.deepEqual(await visibleProgress(), []);
    await drain();
    assert.deepEqual(await visibleProgress(), []);
    await page.locator('#btn-back').click();
    await page.locator('.level-item').nth(1).click();
    await add(['loop', 'move', 'end']);
    await run();
    await drain();
    assert.match(await page.locator('#result-text').textContent(), /FELL/);
    assert.deepEqual(await visibleProgress(), []);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS: ${width}px/${motion}: nested progress, cleanup, rerun, locked edits, sensed loops and fit.`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
