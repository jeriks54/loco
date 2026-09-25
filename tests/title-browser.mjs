// Issue #37: title teaser, navigation, reduced motion, phone fit and placeholders.
// Set LOCO_PLAYWRIGHT_MODULE to an installed playwright/index.mjs before running.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE);
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const { server, url } = await startTileServer(0, null);
let browser;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [width, height] of [[1280, 800], [390, 844], [320, 568], [844, 390]]) {
    for (const reduced of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      await page.goto(url);

      const layout = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        startBottom: document.getElementById('btn-play').getBoundingClientRect().bottom,
        canvasWidth: document.getElementById('title-preview-board').width,
        startText: document.getElementById('btn-play').textContent.trim(),
        commandActive: document.getElementById('title-preview-command').classList.contains('is-active'),
      }));
      assert.equal(layout.scrollWidth, width, `horizontal title overflow at ${width}px`);
      assert.equal(layout.startText, 'Start game', 'primary action copy/icon drifted');
      assert.ok(layout.canvasWidth > 0, 'Workshop canvas did not render');
      if (width <= 390 && height > 500) assert.ok(layout.startBottom < height, `Start game below phone fold at ${width}px`);
      if (reduced) assert.equal(layout.commandActive, true, 'reduced motion should start in the settled state');

      const before = await page.locator('#title-preview-board').evaluate(canvas => canvas.toDataURL());
      await page.waitForTimeout(850);
      const after = await page.locator('#title-preview-board').evaluate(canvas => canvas.toDataURL());
      if (reduced) assert.equal(after, before, 'reduced-motion preview changed frames');
      else assert.notEqual(after, before, 'the one-command reveal did not move the robot');
      assert.equal(await page.locator('#title-preview-command').evaluate(el => el.classList.contains('is-active')), true);

      await page.locator('#btn-play').click();
      assert.equal(await page.locator('#screen-levels').isVisible(), true);
      await page.locator('#btn-title').click();
      assert.equal(await page.locator('#screen-title').isVisible(), true);
      assert.equal(await page.locator('#title-preview-command').evaluate(el => el.classList.contains('is-active')), true);
      assert.deepEqual(errors, [], `browser errors at ${width}px, reduced=${reduced}`);
      await page.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(url);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-play', 'first keyboard focus should reach Start game');
  for (const moduleName of ['tutorial', 'settings', 'scores']) {
    await page.locator(`[data-module="${moduleName}"]`).click();
    await page.waitForTimeout(1850);
    assert.match(await page.locator('.boot-log').textContent(), /not found/, `${moduleName} placeholder response missing`);
  }
  await page.close();

  console.log('PASS title: Workshop teaser, one move, reduced-motion still, desktop/phone fit, navigation, keyboard and module responses.');
} finally {
  await browser?.close();
  server.close();
}
