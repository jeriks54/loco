import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startTileServer } from './tile-server.mjs';
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const shots = fileURLToPath(new URL('./tmp/', import.meta.url));
await mkdir(shots, { recursive: true });
const { server, url } = await startTileServer(0, null);
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1280, height: 844 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.addInitScript(() => {
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = (fn, delay, ...args) => timeout(fn, [300, 600, 1200].includes(delay) ? 25 : delay, ...args);
    });
    await page.goto(url); await page.locator('#btn-play').click();
    await page.locator('.level-item').nth(15).click();
    const run = page.locator(mobile ? '#btn-run-peek' : '#btn-run');
    async function expand() {
      if (mobile && await page.locator('#sheet-chevron').getAttribute('aria-expanded') === 'false') await page.locator('#sheet-chevron').click();
    }
    async function tap(locator) { if (mobile) await locator.tap(); else await locator.click(); }
    const command = id => page.locator(`#palette [data-block="${id}"]`);
    const operand = id => page.locator(`#palette [data-condition="${id}"]`);
    const slot = (kind, index = 0) => page.locator(`#program [data-slot="${kind}"]`).nth(index);
    async function drag(source, target, cancel = false) {
      await source.scrollIntoViewIfNeeded(); await target.scrollIntoViewIfNeeded();
      const a = await source.boundingBox(), b = await target.boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
      if (cancel) await source.dispatchEvent('pointercancel', { pointerId: 1 });
      await page.mouse.up();
    }
    await expand();
    assert.equal(await operand('wallSensor').count(), 1);
    await tap(command('loopUntil')); await tap(command('move')); await tap(command('end')); await tap(command('move'));
    assert.equal(await slot('sensor').textContent(), 'sensor');
    assert.equal(await slot('value').textContent(), 'value');
    assert.equal(await page.locator('#memory-count').textContent(), '4 / 4');
    // A complete loop with empty fields must explain why it cannot run.
    await run.click();
    assert.match(await page.locator('#result-text').textContent(), /INCOMPLETE CONDITION/);
    assert.equal(await page.locator('#program .current').count(), 0);
    await page.locator('#btn-retry').click(); await expand();
    const before = await page.locator('#program').textContent();
    await drag(operand('wallSensor'), slot('value'));
    assert.equal(await page.locator('#program').textContent(), before, 'wrong-type drop mutates nothing');
    await page.locator('#program .filled').last().locator('.line-token').click();
    await drag(command('move'), slot('sensor'));
    assert.equal(await page.locator('#program .filled').count(), 3, 'commands do not enter slots even with spare memory');
    await tap(command('move'));
    await drag(operand('wallSensor'), page.locator('#board'));
    assert.equal(await slot('sensor').textContent(), 'sensor', 'outside drop rejected');
    await drag(operand('wallSensor'), slot('sensor'), true);
    assert.equal(await slot('sensor').textContent(), 'sensor', 'cancelled drag rejected');
    // Actual pointer drop placement must work even at capacity.
    await drag(operand('wallSensor'), slot('sensor'));
    await drag(operand('blocked'), slot('value'));
    assert.equal(await slot('sensor').textContent(), 'wall sensor');
    assert.equal(await slot('value').textContent(), 'blocked');
    assert.equal(await page.locator('#memory-count').textContent(), '4 / 4');
    await tap(page.locator('[data-clear-slot="sensor"]').first());
    assert.equal(await slot('sensor').textContent(), 'sensor');
    assert.equal(await page.locator('#program .filled').count(), 4, 'clearing field preserves line');
    await tap(slot('sensor')); await tap(operand('blocked'));
    assert.equal(await slot('sensor').textContent(), 'sensor', 'wrong selected type is not bypassed');
    await tap(operand('wallSensor'));
    await tap(page.locator('[data-clear-slot="sensor"]').first());
    await tap(slot('value'));
    await drag(operand('wallSensor'), slot('sensor'));
    assert.equal(await slot('sensor').textContent(), 'wall sensor', 'explicit drop wins over old incompatible selection');
    await page.locator('.condition-expression').first().dispatchEvent('click');
    assert.equal(await page.locator('#program .filled').count(), 4, 'expression whitespace does not delete its line');
    // Review compact fields and wrapping at narrow widths, without losing text.
    if (mobile) for (const width of [280, 320, 390]) {
      await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(80);
      assert.ok(await page.locator('#program .line-code').evaluateAll(els => els.every(e => e.scrollWidth <= e.clientWidth + 1)), `condition clips at ${width}`);
      assert.ok(await page.locator('#program .condition-slot').evaluateAll(els => els.every(e => e.scrollWidth <= e.clientWidth + 1)), `slot clips at ${width}`);
      await page.screenshot({ path: resolve(shots, `conditions-${width}.png`), fullPage: true });
    }
    if (!mobile) await page.screenshot({ path: resolve(shots, 'conditions-desktop.png'), fullPage: true });
    await run.click();
    assert.match(await page.locator('#program').getAttribute('class'), /locked/);
    // Synthetic clicks exercise the editor guard even while the mobile sheet hides.
    await slot('sensor').dispatchEvent('click');
    await page.locator('[data-clear-slot="sensor"]').first().dispatchEvent('click');
    assert.equal(await slot('sensor').textContent(), 'wall sensor');
    await page.waitForFunction(() => document.querySelector('#result-text').textContent.includes('LEVEL COMPLETE'));
    await page.locator('#btn-retry').click(); await expand();
    assert.equal(await slot('sensor').textContent(), 'wall sensor');
    assert.equal(await slot('value').textContent(), 'blocked');
    await page.locator('#btn-clear').click();
    for (const id of ['loopUntil', 'loopUntil', 'end', 'end']) await tap(command(id));
    await tap(slot('sensor', 1)); await tap(operand('wallSensor'));
    assert.equal(await slot('sensor', 0).textContent(), 'sensor');
    assert.equal(await slot('sensor', 1).textContent(), 'wall sensor', 'tap targets selected loop');
    await tap(slot('value', 1)); await tap(operand('blocked'));
    // Filling a slot clears selection; next operand tap chooses the first empty match.
    await tap(operand('wallSensor')); await tap(operand('blocked'));
    assert.equal(await slot('sensor', 0).textContent(), 'wall sensor');
    assert.equal(await slot('value', 0).textContent(), 'blocked');
    assert.equal(await page.locator('#program .filled').count(), 4);
    assert.equal(await page.locator('#program .filled').nth(1).evaluate(e => e.style.getPropertyValue('--indent')), '1');
    await page.locator('#btn-back').click(); await page.locator('.level-item').first().click();
    assert.equal(await page.locator('#palette [data-condition]').count(), 0, 'operands absent in chapter 1');
    assert.deepEqual(errors, []);
    console.log(`PASS ${mobile ? 'touch' : 'desktop'}: typed pointer drops, taps, empty-condition refusal, capacity, clear/cancel/lock and nested slots.`);
    await context.close();
  }
} finally { if (browser) await browser.close(); await new Promise(done => server.close(done)); }
