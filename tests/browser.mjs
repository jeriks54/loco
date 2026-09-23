// Optional browser acceptance checks. Supply an existing Playwright module with
// LOCO_PLAYWRIGHT_MODULE; this repo installs no browser or production dependencies.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chapter2 } from '../src/levels/chapter2.js';
import { solutions } from './chapter2-solutions.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const screenshots = resolve(root, 'tests/tmp');
await mkdir(screenshots, { recursive: true });
const modulePath = process.env.LOCO_PLAYWRIGHT_MODULE;
assert.ok(modulePath, 'Set LOCO_PLAYWRIGHT_MODULE to an existing playwright/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { response.writeHead(204).end(); return; }
  if (path !== '/' && path !== '/index.html' && !/^\/(src|styles)\/[\w/.-]+$/.test(path)) {
    response.writeHead(404).end(); return;
  }
  const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!target.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' }).end(data);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    // Deterministic offline font fallback; no network access beyond the local game.
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    // Accelerate only executor tick intervals. Logic and UI run unmodified; real
    // speed values are independently checked in verify.mjs.
    await page.addInitScript(() => {
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = (fn, delay, ...args) => timeout(fn, [300, 600, 1200].includes(delay) ? 10 : delay, ...args);
    });
    await page.goto(url);
    await page.locator('#btn-play').click();
    assert.equal(await page.locator('.level-item').count(), 25);
    for (let i = 0; i < chapter2.length; i++) {
      await page.locator('.level-item').nth(7 + i).click();
      const before = await page.locator('#board').boundingBox();
      if (mobile) {
        assert.equal(await page.locator('#sheet-chevron').getAttribute('aria-expanded'), 'false');
        await page.locator('#sheet-chevron').click();
        const after = await page.locator('#board').boundingBox();
        assert.equal(after.width, before.width); assert.equal(after.height, before.height);
      }
      assert.equal(await page.locator('[data-block="whileFrontClear"]').count(), 0);
      assert.equal(await page.locator('[data-block="repeat"]').count(), 0);
      if (i === 0) {
        const chip = await page.locator('#palette [data-block="loop"]').boundingBox();
        const slot = await page.locator('#program .line').first().boundingBox();
        await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
        await page.mouse.down();
        await page.mouse.move(slot.x + slot.width / 2, slot.y + slot.height / 2, { steps: 8 });
        await page.mouse.up();
        assert.equal(await page.locator('#program .line.filled').count(), 1, 'drag-to-insert');
        if (mobile) assert.equal(await page.locator('#sheet-chevron').getAttribute('aria-expanded'), 'true', 'chip drag must not collapse sheet');
        await page.locator('#program .line.filled').getByLabel('decrease loop count').click();
        assert.equal(await page.locator('.loop-count').textContent(), '1');
        assert.equal(await page.getByLabel('decrease loop count').isDisabled(), true);
        await page.locator('#program .line.filled .line-token').click();
        assert.equal(await page.locator('#program .line.filled').count(), 0, 'click-to-remove');
      }
      for (const entry of solutions[i]) {
        const id = typeof entry === 'string' ? entry : entry.id;
        const chip = page.locator(`#palette [data-block="${id}"]`);
        if (mobile) await chip.tap(); else await chip.click();
        if (typeof entry !== 'string') {
          const line = page.locator('#program .line.filled').last();
          assert.equal(await line.locator('.loop-count').textContent(), '2');
          for (let count = 2; count < entry.count; count++) await line.getByLabel('increase loop count').click();
        }
      }
      assert.equal(await page.locator('#program .line.filled').count(), solutions[i].length);
      assert.equal(await page.locator('#memory-count').textContent(), `${solutions[i].length} / ${chapter2[i].memory}`);
      assert.ok(await page.locator('#program .line.filled').evaluateAll(lines => lines.some(line => Number(line.style.getPropertyValue('--indent')) > 0)));
      assert.ok(await page.locator('#program .line-code').evaluateAll(lines => lines.every(line => line.scrollWidth <= line.clientWidth + 1)), 'program line clipping');
      if (i === 7) await page.screenshot({ path: resolve(screenshots, `counted-loops-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true });
      if (solutions[i].length === chapter2[i].memory) {
        await page.locator('#palette [data-block="move"]').click();
        assert.equal(await page.locator('#program .line.filled').count(), chapter2[i].memory);
      }
      await page.locator(mobile ? '#btn-run-peek' : '#btn-run').click();
      assert.equal(await page.locator(mobile ? '#btn-run-peek' : '#btn-run').isDisabled(), true);
      assert.match(await page.locator('#program').getAttribute('class'), /locked/);
      assert.equal(await page.locator('#program .current').count(), 1);
      if (mobile) assert.equal(await page.locator('#sheet-chevron').getAttribute('aria-expanded'), 'false');
      await page.waitForFunction(() => document.querySelector('#result-text').textContent.includes('LEVEL COMPLETE'));
      await page.locator('#btn-retry').click();
      assert.equal(await page.locator('#program .line.filled').count(), solutions[i].length);
      if (mobile) await page.locator('#sheet-chevron').click();
      await page.locator('#btn-clear').click();
      assert.equal(await page.locator('#program .line.filled').count(), 0);
      await page.locator('#btn-back').click();
      assert.equal(await page.locator('.level-item').nth(7 + i).locator('.level-done').count(), 1);
      console.log(`${mobile ? 'touch 390px' : 'desktop 1280px'}: ${chapter2[i].id} editor -> goal -> retry passed`);
    }
    // Smallest/widest board and nine-line capstone; desktop breakpoint transition.
    await page.locator('.level-item').nth(14).click();
    if (mobile) {
      for (const width of [280, 320, 360, 390, 900, 901, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await page.waitForTimeout(80);
        const board = await page.locator('#board').boundingBox();
        assert.ok(board.x >= 0 && board.x + board.width <= width + 1, `board clipping at ${width}px`);
      }
    }
    assert.deepEqual(errors, [], 'browser errors');
    await context.close();
  }
  console.log('PASS: desktop + touch editor flows for all eight loop levels; board fit 280–1280px; no browser errors.');
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
