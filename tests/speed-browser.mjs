// Native controls, real-paced application runs, and delayed-frame scene probes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE);
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const corridor = { id: 'ch2-01', name: 'Speed workshop', chapter: 'Loops',
  grid: ['########', '#S....G#', '########'], startDir: 'E', sensor: 'frontWall',
  memory: 12, par: 3, blocks: ['move', 'turnLeft', 'turnRight', 'loop', 'end'] };
const hole = { ...corridor, id: 'ch2-02', grid: ['#####', '#SHG#', '#####'] };
const { server, url } = await startTileServer(0, [corridor, hole]);
await mkdir(fileURLToPath(new URL('./tmp/', import.meta.url)), { recursive: true });
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 844 },
      reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.addInitScript(() => localStorage.setItem('loco.onboarding.v1', JSON.stringify({ seen: ['ch2', 'ch3', 'ch4'] })));
    await page.goto(url);
    await page.locator('#btn-play').click();
    await page.locator('.level-item').first().click();
    const slider = page.getByRole('slider', { name: 'Run speed' });
    assert.equal(await slider.inputValue(), '1');
    assert.equal(await slider.getAttribute('aria-valuetext'), '1 times');
    await slider.focus();
    await slider.press('Home');
    for (const [i, speed] of [0.5, 1, 2, 4, 8].entries()) {
      if (i) await slider.press('ArrowRight');
      assert.equal(await slider.inputValue(), String(i));
      assert.equal(await slider.getAttribute('aria-valuetext'), `${speed} times`);
      assert.equal(await page.locator('#speed-value').textContent(), `${speed}×`);
      await page.locator('#btn-clear').click();
      await page.locator('#palette [data-block="turnRight"]').click();
      await page.locator('#btn-run').click();
      await page.locator('#result-overlay').waitFor({ state: 'visible' });
      assert.match(await page.locator('#result-text').textContent(), /FELL SHORT/);
      await page.locator('#btn-retry').click();
      assert.equal(await slider.inputValue(), String(i), 'Retry preserves selection');
    }
    await slider.press('End');
    assert.equal(await slider.inputValue(), '4');

    async function build(program) {
      await page.locator('#btn-clear').click();
      for (const id of program) await page.locator(`#palette [data-block="${id}"]`).click();
    }
    for (const speed of ['3', '4']) {
      await slider.fill(speed);
      await build(['turnRight', 'turnLeft', 'move', 'turnLeft', 'turnRight', 'move', 'move', 'move', 'move']);
      await page.locator('#btn-run').click();
      await page.locator('#result-overlay').waitFor({ state: 'visible' });
      assert.match(await page.locator('#result-text').textContent(), /LEVEL COMPLETE/);
      await page.waitForFunction(() => document.querySelector('#sensor-reading').dataset.phase === 'ready');
      assert.equal(await page.locator('#sensor-reading').getAttribute('data-blocked'), 'true', 'goal reads the wall ahead');
      assert.equal(await page.locator('#program .current').count(), 0);
      await page.locator('#btn-retry').click();
    }

    // Change while the first move is in flight, then reverse while a turn runs.
    await slider.fill('0');
    await build(['move', 'turnRight', 'turnLeft', 'move', 'move', 'move', 'move']);
    await page.locator('#btn-run').click();
    await slider.fill('4');
    await page.locator('#result-overlay').waitFor({ state: 'visible', timeout: 2500 });
    assert.match(await page.locator('#result-text').textContent(), /LEVEL COMPLETE/);
    await page.locator('#btn-retry').click();
    await build(['turnRight', 'turnLeft', 'move']);
    await page.locator('#btn-run').click();
    await slider.fill('0');
    await page.locator('#btn-reset').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#result-overlay').isVisible(), false);
    assert.equal(await page.locator('#sensor-reading').getAttribute('data-blocked'), 'false');
    assert.equal(await slider.inputValue(), '0');

    await slider.fill('4');
    await build(['turnLeft', 'move']);
    await page.locator('#btn-run').click();
    await page.locator('#result-overlay').waitFor({ state: 'visible' });
    assert.match(await page.locator('#result-text').textContent(), /CRASHED/);
    await page.locator('#btn-reset').click();
    await page.locator('#btn-back').click();
    await page.locator('.level-item').nth(1).click();
    assert.equal(await slider.inputValue(), '4', 'level navigation preserves selection');
    await build(['move', 'turnRight']);
    await page.locator('#btn-run').click();
    await page.locator('#result-overlay').waitFor({ state: 'visible' });
    assert.match(await page.locator('#result-text').textContent(), /FELL —/);
    await slider.fill('0');
    assert.equal(await page.locator('#sensor-reading').getAttribute('data-phase'), 'unavailable');
    await page.locator('#btn-retry').click();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#sensor-reading').getAttribute('data-phase'), 'ready');
    await page.locator('#btn-back').click();
    await page.locator('.level-item').first().click();

    // Layout and actual pointer/touch controls across sheet detents.
    for (const [width, height] of [[280, 844], [320, 844], [390, 844], [900, 844], [901, 844], [1280, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const before = await page.locator('#board').boundingBox();
      if (width <= 900) {
        if (await page.locator('#sheet-chevron').getAttribute('aria-expanded') === 'true') await page.locator('#sheet-chevron').click();
        await slider.waitFor({ state: 'hidden' });
        await page.locator('#sheet-chevron').click();
        await page.locator('#sheet').evaluate(root => Promise.all(root.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {}))));
      }
      await slider.scrollIntoViewIfNeeded();
      const box = await slider.boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width, `slider fits ${width}`);
      assert.ok(await page.locator('#speed').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'labels fit');
      const after = await page.locator('#board').boundingBox();
      assert.ok(Math.abs(before.width - after.width) < 1 && Math.abs(before.height - after.height) < 1, `detents preserve board size at ${width}: ${JSON.stringify({ before, after })}`);
      await slider.focus();
      await slider.press('Home');
      assert.equal(await slider.evaluate(e => getComputedStyle(e).outlineStyle), 'solid');
      await page.mouse.move(box.x + 9, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 9, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
      assert.equal(await slider.inputValue(), '4', 'pointer drag selects 8×');
      if (width <= 900) assert.equal(await page.locator('#sheet-chevron').getAttribute('aria-expanded'), 'true', 'slider does not drag sheet');
      if ([280, 320, 1280].includes(width)) await page.screenshot({ path: fileURLToPath(new URL(`./tmp/speed-${width}-${reduced ? 'reduce' : 'motion'}.png`, import.meta.url)) });
    }
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS speed controls and real-paced runs: ${reduced ? 'reduced' : 'normal'} motion, five stops, results, live changes and seven layouts.`);
  }

  const touch = await browser.newPage({ viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await touch.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await touch.addInitScript(() => localStorage.setItem('loco.onboarding.v1', JSON.stringify({ seen: ['ch2'] })));
  await touch.goto(url); await touch.locator('#btn-play').tap(); await touch.locator('.level-item').first().tap();
  await touch.locator('#sheet-chevron').tap();
  await touch.locator('#speed-slider').scrollIntoViewIfNeeded();
  const box = await touch.locator('#speed-slider').boundingBox();
  await touch.touchscreen.tap(box.x + box.width - 9, box.y + box.height / 2);
  assert.equal(await touch.locator('#speed-slider').inputValue(), '4');
  await touch.locator('#palette [data-block="loop"]').tap();
  await touch.locator('#palette [data-block="turnRight"]').tap();
  await touch.locator('#palette [data-block="end"]').tap();
  await touch.getByRole('button', { name: 'increase loop count' }).tap();
  await touch.locator('#btn-run-peek').tap();
  await touch.locator('#sheet-chevron').tap();
  await touch.locator('#speed-slider').fill('0');
  await touch.locator('#btn-reset-peek').tap();
  assert.equal(await touch.locator('#speed-value').textContent(), '0.5×');
  await touch.close();

  // Controlled scene clock: defer every rAF to reproduce late frames without
  // changing the executor. Observe actual robot draw transforms, not internals.
  for (const reduced of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.goto(url);
    const result = await page.evaluate(async reduced => {
      const { createScene } = await import('/src/render/scene.js');
      const { createLevelState } = await import('/src/game/state.js');
      await document.fonts.ready;
      const panel = document.createElement('div'), wrap = document.createElement('div'), canvas = document.createElement('canvas');
      panel.style.cssText = 'position:fixed;left:0;top:0;width:420px;height:360px';
      panel.append(wrap); wrap.append(canvas); document.body.append(panel);
      let now = 0, frame, sample;
      const originalNow = performance.now.bind(performance), originalRaf = window.requestAnimationFrame;
      performance.now = () => now;
      window.requestAnimationFrame = cb => { frame = cb; return 999; };
      const ctx = canvas.getContext('2d'), originalFill = ctx.fill;
      ctx.fill = function(...args) {
        if (this.fillStyle.toLowerCase() === '#c88e42') {
          const tr = this.getTransform();
          let tile, pad;
          for (let t = 14; t <= 64; t++) {
            const p = t >= 24 ? Math.round(t * .5) : 0;
            if (7 * t + 2 * p === parseFloat(canvas.style.width)) { tile = t; pad = p; break; }
          }
          const dpr = window.devicePixelRatio || 1;
          sample = { x: (tr.e / dpr - pad) / tile - .5, y: (tr.f / dpr - pad) / tile - .5, angle: Math.atan2(tr.b, tr.a), alpha: this.globalAlpha };
        }
        return originalFill.apply(this, args);
      };
      const samples = [];
      const scene = createScene({ canvas, onSensorChange: s => samples.push(s) });
      await Promise.resolve(); // Let the scene's fonts-ready callback enable fitting.
      const state = createLevelState({ grid: ['#######', '#S...G#', '#..H..#', '#######'], startDir: 'E', sensor: 'frontWall' });
      const draw = time => {
        now = time;
        const cb = frame;
        frame = null;
        // An idle scene keeps its last drawing, including in reduced motion.
        if (cb) { sample = null; cb(now); }
        return sample;
      };
      scene.render(state);
      const observations = [];
      for (const [speed, duration, turnDuration] of [[0.5, 220, 160], [1, 220, 160], [2, 220, 160], [4, 112.5, 112.5], [8, 56.25, 56.25]]) {
        scene.render(state); scene.setSpeed(speed);
        scene.handleEvent('moved', { from: { x: 1, y: 1 }, to: { x: 2, y: 1 } });
        const started = now;
        const mid = draw(started + duration / 2), end = draw(started + duration + 1);
        const reading = samples.at(-1);
        scene.handleEvent('turned', 'S');
        const turnStart = now;
        const turnMid = draw(turnStart + turnDuration / 2), turnEnd = draw(turnStart + turnDuration + 1);
        observations.push({ speed, mid, end, reading, turnMid, turnEnd });
      }
      scene.render(state); scene.setSpeed(0.5);
      scene.handleEvent('moved', { from: { x: 1, y: 1 }, to: { x: 2, y: 1 } });
      scene.setSpeed(8);
      const changed = draw(now), changedReading = samples.at(-1);
      scene.handleEvent('turned', 'S'); // No frames before the following move.
      scene.handleEvent('moved', { from: { x: 2, y: 1 }, to: { x: 2, y: 2 } });
      const delayed = draw(now + 57), delayedReading = samples.at(-1);
      scene.handleEvent('moved', { from: { x: 2, y: 2 }, to: { x: 3, y: 2 } });
      scene.handleEvent('fell', { at: { x: 3, y: 2 }, dir: 'S' });
      const fallIndex = samples.length;
      scene.setSpeed(0.5);
      const fallStart = now;
      draw(fallStart); const falling = draw(fallStart + 90); const hidden = draw(fallStart + 181);
      const fallReadings = samples.slice(fallIndex);
      scene.render(state); draw(now);
      const resetReading = samples.at(-1);
      performance.now = originalNow; window.requestAnimationFrame = originalRaf;
      panel.remove();
      return { observations, changed, changedReading, delayed, delayedReading, falling, hidden, fallReadings, resetReading, reduced };
    }, reduced);
    for (const o of result.observations) {
      assert.ok(Math.abs(o.end.x - 2) < .01 && Math.abs(o.end.y - 1) < .01, `settles before next tick: ${JSON.stringify(o)}`);
      if (!reduced) assert.ok(o.mid.x > 1 && o.mid.x < 2, 'movement interpolates');
      else assert.equal(o.mid.x, 2);
      assert.equal(o.reading.phase, 'ready');
      assert.ok(Math.abs(o.turnEnd.angle - Math.PI / 2) < .01, 'turn settles before next tick');
      if (!reduced) assert.ok(o.turnMid.angle > 0 && o.turnMid.angle < Math.PI / 2, 'turn interpolates');
      else assert.ok(Math.abs(o.turnMid.angle - Math.PI / 2) < .01);
    }
    assert.equal(result.changed.x, 2, 'speed change settles committed move');
    assert.equal(result.changedReading.phase, 'ready');
    assert.ok(Math.abs(result.delayed.angle - Math.PI / 2) < .01, 'late turn preserves facing');
    assert.equal(result.delayed.x, 2); assert.equal(result.delayed.y, 2);
    assert.deepEqual(result.delayedReading, { equipped: true, blocked: true, phase: 'ready' }, 'late move reads the boundary south of its new position');
    assert.ok(result.fallReadings.every(s => s.phase === 'unavailable'), 'speed change during fall never reads safe');
    if (!reduced) {
      assert.equal(result.falling.x, 3); assert.equal(result.falling.y, 2);
      assert.ok(result.falling.alpha > 0 && result.falling.alpha < 1, 'fall stays animated for 180ms');
    }
    assert.equal(result.hidden, null);
    assert.equal(result.resetReading.phase, 'ready');
    await page.close();
  }
  console.log('PASS scene pacing: all stops, interpolation/reduced motion, live settlement, late facing/position, fall and reset.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
