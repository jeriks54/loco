import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { startTileServer } from './tile-server.mjs';
import { shortestSequence } from './helpers.mjs';
import { holeBoard } from './tile-fixtures.mjs';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE, 'Set LOCO_PLAYWRIGHT_MODULE to an existing playwright/index.mjs');
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const screenshots = fileURLToPath(new URL('./tmp/', import.meta.url));
await mkdir(screenshots, { recursive: true });
const { server, url } = await startTileServer();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [mobile, reduced] of [[false, false], [true, false], [true, true]]) {
    const label = `${mobile ? 'phone' : 'desktop'}-${reduced ? 'reduced' : 'motion'}`;
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1280, height: 844 }, hasTouch: mobile, isMobile: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    // Observe real canvas drawing without changing pacing or rendering. The
    // chevron is the filled path with shadowBlur 16; transforms stay in pixels.
    await page.addInitScript(() => {
      window.robotFrames = [];
      window.lastRobot = null;
      const proto = CanvasRenderingContext2D.prototype;
      const originalFill = proto.fill, originalRect = proto.fillRect;
      proto.fillRect = function(x, y, w, h) {
        if (this.canvas.id === 'board' && x === 0 && y === 0 && w > 100) window.lastRobot = null;
        return originalRect.call(this, x, y, w, h);
      };
      proto.fill = function(...args) {
        if (this.canvas.id === 'board' && this.shadowBlur === 16) {
          const t = this.getTransform();
          const tile = parseFloat(this.canvas.style.width) / 16;
          const dpr = window.devicePixelRatio || 1;
          const sample = { time: performance.now(), x: t.e / dpr / tile - 0.5, y: t.f / dpr / tile - 0.5, alpha: this.globalAlpha };
          window.lastRobot = sample.alpha > 0 ? sample : null;
          window.robotFrames.push(sample);
        }
        return originalFill.apply(this, args);
      };
    });
    await page.goto(url);
    await page.locator('#btn-play').click();
    assert.equal(await page.locator('.level-item').count(), 1);
    await page.locator('.level-item').click();
    const run = page.locator(mobile ? '#btn-run-peek' : '#btn-run');
    const reset = page.locator(mobile ? '#btn-reset-peek' : '#btn-reset');
    async function expand() {
      if (mobile && await page.locator('#sheet-chevron').getAttribute('aria-expanded') === 'false') await page.locator('#sheet-chevron').click();
    }
    async function build(program) {
      await expand();
      await page.locator('#btn-clear').click();
      for (const id of program) await page.locator(`#palette [data-block="${id}"]`).click();
    }
    await build(['move', 'move', 'turnRight']);
    await page.evaluate(() => { window.robotFrames = []; });
    await run.click();
    assert.equal(await run.isDisabled(), true);
    assert.match(await page.locator('#program').getAttribute('class'), /locked/);
    await page.waitForFunction(() => document.querySelector('#result-text').textContent.startsWith('> FELL —'));
    assert.equal(await run.isDisabled(), false);
    assert.doesNotMatch(await page.locator('#program').getAttribute('class'), /locked/);
    assert.equal(await page.locator('#program .current').count(), 0);
    assert.equal(await page.locator('#btn-next').isVisible(), false);
    if (mobile && !reduced) await page.setViewportSize({ width: 320, height: 844 });
    await page.waitForFunction(() => window.lastRobot === null);
    const samples = await page.evaluate(() => window.robotFrames);
    if (!reduced) {
      assert.ok(samples.some(s => s.x > 2 && s.x < 3 && s.alpha === 1), 'move completes before shrinking');
      const fading = samples.filter(s => s.alpha > 0 && s.alpha < 0.99);
      assert.ok(fading.length > 0, 'normal motion fall must fade');
      assert.ok(fading.every(s => Math.abs(s.x - 3) < 0.01 && Math.abs(s.y - 1) < 0.01), 'fall stays on hole');
      assert.ok(fading.at(-1).time - fading[0].time < 300, 'brief fall effect');
    } else assert.ok(samples.every(s => s.alpha === 1), 'reduced motion has no fade');
    if (mobile && !reduced) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.lastRobot), null, 'resize must preserve hidden fall state');
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('loco.progress.v1')), null, 'fall must not save progress');
    // Run again without Retry must visibly restart, even after the robot hid.
    await run.click();
    await page.waitForFunction(() => window.lastRobot && window.lastRobot.x <= 2.01);
    await reset.click();
    await page.waitForFunction(() => window.lastRobot && Math.abs(window.lastRobot.x - 1) < 0.01);
    assert.equal(await page.locator('#result-overlay').isVisible(), false);
    assert.equal(await page.locator('#program .filled').count(), 3);
    await run.click();
    await page.waitForFunction(() => document.querySelector('#result-overlay').classList.contains('hidden') === false);
    await page.locator('#btn-retry').click(); // cancels even an in-flight fall
    await page.waitForFunction(() => window.lastRobot && Math.abs(window.lastRobot.x - 1) < 0.01);
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => Math.round(window.lastRobot.x)), 1, 'no delayed fall after Retry');
    assert.equal(await page.locator('#program .filled').count(), 3);
    // Leave the entrance to inspect its marker and every other tile type.
    await build(['move']);
    await run.click();
    await page.waitForFunction(() => document.querySelector('#result-text').textContent.includes('FELL SHORT'));
    // Hide only the result overlay in these art-review screenshots; the overlay
    // and copy were checked above through the unmodified application UI.
    const screenshotStyle = '#result-overlay { visibility: hidden !important; }';
    await page.locator('#board').screenshot({ path: resolve(screenshots, `tiles-${label}.png`), style: screenshotStyle });
    if (mobile && reduced) {
      for (const width of [280, 320, 390, 900, 901]) {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(100);
        const box = await page.locator('#board').boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `board fit ${width}`);
        await page.locator('#board').screenshot({ path: resolve(screenshots, `tiles-${width}.png`), style: screenshotStyle });
      }
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.locator('#btn-retry').click();
    await build(shortestSequence(holeBoard));
    await run.click();
    await page.waitForFunction(() => document.querySelector('#result-text').textContent.includes('LEVEL COMPLETE'), null, { timeout: 15000 });
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('loco.progress.v1')).completed), ['test-holes']);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${label}: real-paced fall, repeat Run, Reset, Retry, safe detour and completion.`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
