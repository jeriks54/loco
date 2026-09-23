import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';
import { chapter4 } from '../src/levels/chapter4.js';
import { decisionSolutions } from './chapter4-solutions.mjs';

const modulePath = process.env.LOCO_PLAYWRIGHT_MODULE;
assert.ok(modulePath, 'Set LOCO_PLAYWRIGHT_MODULE to an existing playwright/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath));
const { server, url } = await startTileServer(0, null);
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      hasTouch: mobile,
      isMobile: mobile,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.addInitScript(() => {
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = (fn, delay, ...args) => timeout(fn, [300, 600, 1200].includes(delay) ? 10 : delay, ...args);
    });
    await page.goto(url);
    await page.locator('#btn-play').click();
    assert.equal(await page.locator('.level-item').count(), 25);
    const command = id => page.locator(`#palette [data-block="${id}"]`);
    const operand = id => page.locator(`#palette [data-condition="${id}"]`);
    const run = page.locator(mobile ? '#btn-run-peek' : '#btn-run');
    const tap = async locator => { if (mobile) await locator.tap(); else await locator.click(); };
    const expand = async () => {
      if (mobile && await page.locator('#sheet-chevron').getAttribute('aria-expanded') === 'false') {
        await page.locator('#sheet-chevron').click();
      }
    };
    const add = async entry => {
      const id = typeof entry === 'string' ? entry : entry.id;
      await tap(command(id));
      if (id === 'if' || id === 'loopUntil') {
        const line = page.locator('#program .line.filled').last();
        await tap(line.locator('[data-slot="sensor"]'));
        await tap(operand('wallSensor'));
        await tap(line.locator('[data-slot="value"]'));
        await tap(operand('blocked'));
      }
      if (id === 'loop') {
        const line = page.locator('#program .line.filled').last();
        for (let count = 2; count < entry.count; count += 1) await line.getByLabel('increase loop count').click();
      }
    };

    await page.locator('.level-item').nth(21).click();
    await expand();
    assert.equal(await page.locator('#palette [data-block="if"]').count(), 1);
    assert.equal(await page.locator('#palette [data-block="else"]').count(), 1);
    assert.equal(await page.locator('#palette [data-condition="wallSensor"]').count(), 1);
    assert.equal(await page.locator('#palette [data-condition="blocked"]').count(), 1);
    await add({ id: 'loop', count: 99 });
    await add(decisionSolutions[1][1]);
    await add('turnRight');
    await add('else');
    await add('move');
    await add('end');
    await add('end');
    assert.equal(await page.locator('#memory-count').textContent(), '7 / 7');
    assert.equal(await page.locator('#program .filled').nth(1).evaluate(e => e.style.getPropertyValue('--indent')), '1');
    assert.equal(
      await page.locator('#program .filled').nth(3).evaluate(e => e.style.getPropertyValue('--indent')),
      await page.locator('#program .filled').nth(1).evaluate(e => e.style.getPropertyValue('--indent')),
      'else aligns with its matching if inside the outer loop',
    );
    assert.ok(await page.locator('#program .line-no').allTextContents().then(lines => lines.includes('07')));
    await run.click();
    assert.match(await page.locator('#program').getAttribute('class'), /locked/);
    await page.waitForFunction(() => document.querySelector('#result-text').textContent.includes('LEVEL COMPLETE'));
    await page.locator('#btn-retry').click();
    assert.equal(await page.locator('#program .filled').count(), 7);

    for (const width of [280, 320, 390, 900, 901]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(40);
      const board = await page.locator('#board').boundingBox();
      assert.ok(board.x >= 0 && board.x + board.width <= width + 1, `board clipping at ${width}px`);
      assert.ok(await page.locator('#program .line-code').evaluateAll(lines => lines.every(line => line.scrollWidth <= line.clientWidth + 1)), `line clipping at ${width}px`);
    }

    await page.locator('#btn-back').click();
    await page.locator('.level-item').nth(20).click();
    assert.equal(await page.locator('#palette [data-block="else"]').count(), 0, 'else unlocks at ch4-02');
    assert.equal(await page.locator('#palette [data-block="if"]').count(), 1);
    assert.deepEqual(errors, []);
    console.log(`PASS ${mobile ? 'touch' : 'desktop'}: Chapter 4 palette, typed if operands, indentation, lock, completion and width checks.`);
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
