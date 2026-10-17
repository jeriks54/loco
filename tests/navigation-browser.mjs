import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';
import { decisionSolutions } from './chapter4-solutions.mjs';
import { levels } from '../src/levels/index.js';

const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const { server, url } = await startTileServer(0, null);
await mkdir(new URL('./tmp/', import.meta.url), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const reduced of [false, true]) {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 844 },
        hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      await page.addInitScript(() => {
        localStorage.setItem('loco.onboarding.v1', JSON.stringify({ seen: ['ch2', 'ch3', 'ch4'] }));
        const timeout = window.setTimeout.bind(window);
        window.setTimeout = (fn, delay, ...args) => timeout(fn, [75, 150, 300, 600, 1200].includes(delay) ? 15 : delay, ...args);
      });
      await page.goto(url); await page.locator('#btn-play').click();
      const board = page.locator('#board');
      const view = async () => JSON.parse(await board.getAttribute('data-camera'));
      const fit = () => page.getByRole('button', { name: 'Fit map', exact: true }).click();
      const follow = page.getByRole('button', { name: 'Follow robot', exact: true });
      async function build(program) {
        if (mobile) await page.locator('#sheet-chevron').click();
        for (const entry of program) {
          const id = typeof entry === 'string' ? entry : entry.id;
          await page.locator(`#palette [data-block="${id}"]`).click();
          const line = page.locator('#program .line.filled').last();
          if (id === 'loop') await line.getByLabel('increase loop count').evaluate((button, count) => {
            const index = button.closest('.line').dataset.index;
            for (let n = 2; n < count; n++) document.querySelector(`#program .line[data-index="${index}"] [data-step="1"]`).click();
          }, entry.count);
          if (id === 'if' || id === 'loopUntil') {
            await line.locator('[data-slot="sensor"]').click();
            await page.locator('#palette [data-condition="wallSensor"]').click();
            await line.locator('[data-slot="value"]').click();
            await page.locator('#palette [data-condition="blocked"]').click();
          }
        }
      }
      for (const index of [25, 26]) {
        await page.locator('.level-item').nth(index).click();
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#program').evaluate(el => el.scrollTop), 0, 'new level opens at line 01');
        let v = await view();
        const pad = t => t >= 24 ? Math.round(t / 2) : 0;
        assert.ok(v.cols * v.tile + pad(v.tile) * 2 <= v.width, 'full map width');
        assert.ok(v.rows * v.tile + pad(v.tile) * 2 <= v.height, 'full map height');
        if (!reduced) await page.screenshot({ path: `tests/tmp/large-${index + 1}-${mobile ? 'phone' : 'desktop'}-overview.png` });
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
        await board.focus(); await board.press('+'); await board.press('+');
        const zoom = (await view()).tile;
        assert.ok(zoom > v.tile);
        await board.press('ArrowRight'); await board.press('ArrowDown');
        assert.equal((await view()).following, false);
        await follow.click();
        assert.equal(await follow.getAttribute('aria-pressed'), 'true');
        await board.press('ArrowLeft');
        assert.equal(await follow.getAttribute('aria-pressed'), 'false');
        // Actual drag and wheel input, with pointer capture.
        const box = await board.boundingBox();
        await page.mouse.move(box.x + box.width * .55, box.y + box.height * .55);
        await page.mouse.down(); await page.mouse.move(box.x + box.width * .35, box.y + box.height * .4, { steps: 5 }); await page.mouse.up();
        v = await view();
        assert.equal(v.following, false);
        await page.mouse.wheel(0, -100); await page.waitForTimeout(50);
        assert.ok((await view()).tile >= v.tile);
        if (mobile) {
          const session = await context.newCDPSession(page);
          const x = box.x + box.width / 2, y = box.y + box.height / 2;
          const before = (await view()).tile;
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 20, y }, { x: x + 20, y }] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 45, y }, { x: x + 45, y }] });
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await page.waitForTimeout(50);
          assert.ok((await view()).tile > before, 'native pinch zoom');
          await session.detach();
        }
        await fit(); assert.equal((await view()).tile, (await view()).fitTile);
        await follow.click();
        const retainedTile = (await view()).tile;
        if (!reduced) await page.screenshot({ path: `tests/tmp/large-${index + 1}-${mobile ? 'phone' : 'desktop'}-detail.png` });
        await build(decisionSolutions[index - 20]);
        assert.equal(await page.locator('#program .filled').count(), decisionSolutions[index - 20].length);
        const slots = await page.locator('#program .condition-slot').allTextContents();
        assert.ok(slots.every(s => /wall sensor|blocked/i.test(s)), `filled condition slots: ${slots.join(', ')}`);
        await page.locator(mobile ? '#btn-run-peek' : '#btn-run').click();
        assert.equal((await view()).following, true, 'Run restores follow');
        assert.equal((await view()).tile, retainedTile, 'Run retains zoom');
        // Inspection remains available during a run; Follow resumes immediately.
        await board.focus(); await board.press('ArrowRight');
        assert.equal((await view()).following, false);
        await follow.click();
        await page.locator('#result-overlay').waitFor({ state: 'visible' });
        assert.match(await page.locator('#result-text').textContent(), /LEVEL COMPLETE/);
        v = await view();
        const goalY = levels[index].grid.findIndex(row => row.includes('G'));
        const goals = [levels[index].grid[goalY].indexOf('G'), goalY];
        for (const [axis, coordinate, extent] of [['x', goals[0], 'width'], ['y', goals[1], 'height']]) {
          const screen = (coordinate + .5) * v.tile + pad(v.tile) + v[axis];
          assert.ok(screen >= 0 && screen <= v[extent], 'goal robot stays visible');
        }
        await page.locator('#btn-retry').click();
        assert.equal((await view()).following, true, 'Retry restores follow');
        assert.equal((await view()).tile, retainedTile, 'Retry retains zoom');
        await page.locator(mobile ? '#btn-reset-peek' : '#btn-reset').click();
        assert.equal((await view()).tile, retainedTile, 'Reset retains zoom');
        await board.focus(); await board.press('Home');
        assert.equal((await view()).tile, (await view()).fitTile);
        await page.locator('#btn-back').click();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS large maps UI: ${mobile ? 'touch' : 'desktop'}, ${reduced ? 'reduced' : 'normal'} motion; solutions, navigation, follow, retry/reset.`);
      await context.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
  await page.addInitScript(() => localStorage.setItem('loco.onboarding.v1', JSON.stringify({ seen: ['ch4'] })));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(url); await page.locator('#btn-play').click(); await page.locator('.level-item').last().click();
  for (const [width, height] of [[280, 844], [320, 844], [390, 844], [844, 390], [900, 844], [901, 844], [1280, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Fit map', exact: true }).click();
    for (const locator of ['#board', '#board-controls']) {
      const box = await page.locator(locator).boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${locator} fits ${width}x${height}`);
    }
    const before = await page.locator('#board').boundingBox();
    if (width <= 900) {
      await page.locator('#sheet-chevron').click();
      assert.deepEqual(await page.locator('#board').boundingBox(), before, 'detent-independent viewport');
      await page.locator('#sheet-chevron').click();
    }
    await page.getByRole('button', { name: 'Follow robot', exact: true }).click();
  }
  console.log('PASS navigation layout: 280–1280px and short landscape, resize and both sheet detents.');
  await page.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
