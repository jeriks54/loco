import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { startTileServer } from './tile-server.mjs';
import { chapter3 } from '../src/levels/chapter3.js';
import { sensorSolutions } from './chapter3-solutions.mjs';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE);
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const screenshots = fileURLToPath(new URL('./tmp/', import.meta.url));
await mkdir(screenshots, { recursive: true });
const { server, url } = await startTileServer(0, null);
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1280, height: 844 }, isMobile: mobile, hasTouch: mobile, reducedMotion: mobile ? 'reduce' : 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.addInitScript(() => {
      const timeout = window.setTimeout.bind(window);
      window.setTimeout = (fn, delay, ...args) => timeout(fn, [300, 600, 1200].includes(delay) ? 10 : delay, ...args);
    });
    await page.goto(url);
    await page.locator('#btn-play').click();
    assert.equal(await page.locator('.level-item').count(), 19);
    assert.equal(await page.locator('.chapter-header').last().textContent(), 'CHAPTER 3 — SENSING');
    await page.locator('.level-item').first().click();
    assert.equal(await page.locator('#sensor-note').isVisible(), false);
    await page.locator('#btn-back').click();
    for (let i = 0; i < 4; i++) {
      await page.locator('.level-item').nth(15 + i).click();
      assert.equal(await page.locator('#sensor-note').isVisible(), true);
      assert.match(await page.locator('#sensor-note').textContent(), /holes are not walls/);
      if (mobile) await page.locator('#sheet-chevron').click();
      for (const entry of sensorSolutions[i]) {
        const chip = page.locator(`#palette [data-block="${typeof entry === 'string' ? entry : entry.id}"]`);
        if (mobile) await chip.tap(); else await chip.click();
        if (entry.id === 'loop') {
          const line = page.locator('#program .filled').last();
          for (let c = 2; c < entry.count; c++) await line.getByLabel('increase loop count').click();
        }
        if (entry.id === 'loopUntil') {
          const line = page.locator('#program .filled').last();
          await line.locator('[data-slot="sensor"]').click();
          await page.locator('#palette [data-condition="wallSensor"]').click();
          await line.locator('[data-slot="value"]').click();
          await page.locator('#palette [data-condition="blocked"]').click();
        }
      }
      assert.equal(await page.locator('#program .filled').count(), sensorSolutions[i].length);
      assert.ok(await page.locator('[data-slot="sensor"]').evaluateAll(els => els.every(e => e.textContent.includes('wall sensor'))));
      assert.ok(await page.locator('[data-slot="value"]').evaluateAll(els => els.every(e => e.textContent.includes('blocked'))));
      assert.ok(await page.locator('#program .line-code').evaluateAll(els => els.every(e => e.scrollWidth <= e.clientWidth + 1)), 'line clipping');
      if (i === 3) {
        await page.screenshot({ path: resolve(screenshots, `sensors-${mobile ? 'phone' : 'desktop'}.png`) });
        if (mobile) for (const width of [280, 320, 390, 900, 901]) {
          await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(80);
          const box = await page.locator('#board').boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `board ${width}`);
          assert.ok(await page.locator('#program .line-code').evaluateAll(els => els.every(e => e.scrollWidth <= e.clientWidth + 1)), `condition ${width}`);
          assert.ok(await page.locator('#sensor-note').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
          if (width === 280) await page.screenshot({ path: resolve(screenshots, 'sensors-280.png') });
        }
        if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      }
      const run = page.locator(mobile ? '#btn-run-peek' : '#btn-run');
      await run.click();
      assert.match(await page.locator('#program').getAttribute('class'), /locked/);
      await page.waitForFunction(() => document.querySelector('#result-text').textContent.includes('LEVEL COMPLETE'));
      await page.locator('#btn-retry').click();
      assert.equal(await page.locator('#program .filled').count(), sensorSolutions[i].length);
      await page.locator(mobile ? '#btn-reset-peek' : '#btn-reset').click();
      await page.locator('#btn-back').click();
      assert.equal(await page.locator('.level-item').nth(15 + i).locator('.level-done').count(), 1);
      console.log(`PASS ${mobile ? 'touch' : 'desktop'}: ${chapter3[i].id}`);
    }
    // Inspect the actual renderer with deterministic poses, using real canvas
    // transforms to verify location, orientation, sensing and equipment gating.
    const cues = await page.evaluate(async () => {
      const { createScene } = await import('/src/render/scene.js');
      const { createLevelState } = await import('/src/game/state.js');
      const panel = document.createElement('div'); panel.style.cssText = 'width:320px;height:320px;padding:0;position:fixed;top:0;left:0';
      const wrap = document.createElement('div'), canvas = document.createElement('canvas');
      panel.append(wrap); wrap.append(canvas); document.body.append(panel);
      const ctx = canvas.getContext('2d'), captured = [];
      const stroke = ctx.strokeRect.bind(ctx), fill = ctx.fillRect.bind(ctx);
      ctx.strokeRect = (...args) => { if (ctx.shadowBlur === 8) captured.push({ kind: 'outline', args, matrix: Array.from(ctx.getTransform().toFloat64Array()) }); return stroke(...args); };
      ctx.fillRect = (...args) => { if (ctx.shadowBlur === 8) captured.push({ kind: 'filled' }); return fill(...args); };
      const scene = createScene({ canvas });
      await document.fonts.ready; await Promise.resolve();
      const state = createLevelState({ id: 'cue', grid: ['#####', '#S.G#', '#H..#', '#####'], startDir: 'E', memory: 3, sensor: 'frontWall' });
      const results = [];
      for (const dir of ['E', 'N', 'S', 'W']) {
        state.robot.dir = dir; captured.length = 0; scene.render(state);
        results.push({ dir, marks: structuredClone(captured) });
      }
      state.sensor = null; captured.length = 0; scene.render(state);
      results.push({ dir: 'none', marks: structuredClone(captured) });
      panel.remove(); return results;
    });
    for (const item of cues) {
      assert.equal(item.marks.filter(m => m.kind === 'outline').length, item.dir === 'none' ? 0 : 1);
      assert.equal(item.marks.filter(m => m.kind === 'filled').length, ['N', 'W'].includes(item.dir) ? 1 : 0);
      if (item.dir !== 'none') {
        const matrix = item.marks.find(m => m.kind === 'outline').matrix;
        const angle = Math.atan2(matrix[1], matrix[0]);
        const expected = { E: 0, N: -Math.PI / 2, S: Math.PI / 2, W: Math.PI }[item.dir];
        assert.ok(Math.abs(angle - expected) < 0.001, `cue rotates ${item.dir}`);
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('PASS: sensor UI, full labels, 280–901px fit, renderer orientation/equipment/holes, and four persisted completions.');
} finally { if (browser) await browser.close(); await new Promise(done => server.close(done)); }
