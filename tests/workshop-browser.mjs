// Workshop integration: settled sensor feedback, equipment, geometry and motion.
// Run with the same LOCO_PLAYWRIGHT_MODULE as the retained browser suites.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';
import { levels } from '../src/levels/index.js';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE);
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const { server, url } = await startTileServer(0, null);
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.goto(url);
    await page.locator('#btn-play').click();
    await page.locator('.level-item').first().click();
    assert.match(await page.locator('#equipment-card').textContent(), /No sensor fitted/);
    assert.equal(await page.locator('#sensor-reading').isVisible(), false);
    await page.locator('#btn-back').click();
    await page.locator('.level-item').nth(15).click();
    assert.match(await page.locator('#sensor-reading').textContent(), /No wall detected/);
    await page.evaluate(async () => {
      const { createScene } = await import('/src/render/scene.js');
      const { createLevelState } = await import('/src/game/state.js');
      const { createEquipment } = await import('/src/ui/equipment.js');
      const panel = document.createElement('div');
      panel.style.cssText = 'position:fixed;left:0;top:0;width:420px;height:360px;padding:0;z-index:999;background:white';
      const wrap = document.createElement('div'), canvas = document.createElement('canvas');
      panel.append(wrap); wrap.append(canvas); document.body.append(panel);
      const fresh = () => createLevelState({ id: 'workshop-test', grid: ['#####', '#S#G#', '#.H.#', '#####'], startDir: 'E', sensor: 'frontWall', memory: 6 });
      const equipment = createEquipment();
      const samples = [];
      const scene = createScene({ canvas, onSensorChange: value => { samples.push(value); equipment.update(value); } });
      const state = fresh();
      window.workshop = { scene, state, fresh, samples, panel };
      await document.fonts.ready;
      scene.render(state);
    });
    const reading = () => page.evaluate(() => workshop.samples.at(-1));
    for (const [dir, blocked] of [['N', true], ['E', true], ['S', false], ['W', true]]) {
      await page.evaluate(dir => { workshop.state.robot.dir = dir; workshop.scene.render(workshop.state); }, dir);
      assert.deepEqual(await reading(), { equipped: true, blocked, phase: 'ready' });
      assert.equal(await page.locator('#sensor-reading').getAttribute('data-blocked'), String(blocked));
    }
    await page.evaluate(() => { workshop.state.robot.x = 0; workshop.state.robot.dir = 'W'; workshop.scene.render(workshop.state); });
    assert.equal((await reading()).blocked, true, 'outside grid is detected');
    await page.evaluate(() => { workshop.state.sensor = null; workshop.scene.render(workshop.state); });
    assert.equal((await reading()).equipped, false);
    assert.equal(await page.locator('#sensor-reading').isVisible(), false);
    await page.evaluate(() => { workshop.state = workshop.fresh(); workshop.scene.render(workshop.state); });
    const before = await page.evaluate(() => workshop.samples.length);
    await page.evaluate(() => workshop.scene.render(workshop.state));
    assert.equal(await page.evaluate(() => workshop.samples.length), before, 'unchanged snapshots do not announce again');

    await page.evaluate(() => { workshop.state.robot.dir = 'S'; workshop.scene.handleEvent('turned', 'S'); });
    if (!reduced) assert.deepEqual(await reading(), { equipped: true, blocked: null, phase: 'turning' });
    await page.waitForTimeout(210);
    assert.deepEqual(await reading(), { equipped: true, blocked: false, phase: 'ready' });
    await page.evaluate(() => { workshop.state.robot.y = 2; workshop.scene.handleEvent('moved', { from: { x: 1, y: 1 }, to: { x: 1, y: 2 } }); });
    if (!reduced) assert.deepEqual(await reading(), { equipped: true, blocked: null, phase: 'moving' });
    await page.waitForTimeout(270);
    assert.deepEqual(await reading(), { equipped: true, blocked: true, phase: 'ready' });
    await page.evaluate(() => { workshop.state.robot.dir = 'E'; workshop.scene.handleEvent('turned', 'E'); });
    await page.waitForTimeout(210);
    assert.deepEqual(await reading(), { equipped: true, blocked: false, phase: 'ready' }, 'hole ahead is not detected');
    await page.evaluate(() => {
      workshop.state.robot.x = 2;
      workshop.scene.handleEvent('moved', { from: { x: 1, y: 2 }, to: { x: 2, y: 2 } });
      workshop.scene.handleEvent('fell', { at: { x: 2, y: 2 }, dir: 'E' });
      workshop.fallReadingIndex = workshop.samples.length;
    });
    await page.waitForTimeout(470);
    assert.ok(await page.evaluate(() => workshop.samples.slice(workshop.fallReadingIndex).every(s => s.phase === 'unavailable')), 'fall must never announce a valid reading while shrinking');
    assert.deepEqual(await reading(), { equipped: true, blocked: null, phase: 'unavailable' });
    assert.match(await page.locator('#sensor-reading').textContent(), /unavailable/i);
    await page.evaluate(() => {
      workshop.state = workshop.fresh(); workshop.scene.render(workshop.state);
      workshop.state.robot.dir = 'S'; workshop.scene.handleEvent('turned', 'S');
      workshop.state = workshop.fresh(); workshop.scene.render(workshop.state);
    });
    await page.waitForTimeout(240);
    assert.deepEqual(await reading(), { equipped: true, blocked: true, phase: 'ready' }, 'reset cancels in-flight presentation');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS Workshop sensor presentation: ${reduced ? 'reduced' : 'real'} motion, four headings, boundary, equipment, hole, fall, reset.`);
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(url); await page.locator('#btn-play').click();
  for (const [width, height] of [[280, 844], [320, 844], [390, 844], [900, 844], [901, 844], [1280, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (let i = 0; i < levels.length; i++) {
      await page.locator('.level-item').nth(i).click();
      const before = await page.locator('#board').boundingBox();
      const screen = await page.locator('#screen-game').boundingBox();
      assert.ok(screen.y >= -1 && screen.y + screen.height <= height + 1, `game screen exceeds ${width}x${height}`);
      if (levels[i].sensor) {
        const status = await page.locator('#sensor-reading').boundingBox();
        assert.ok(status && status.x >= 0 && status.x + status.width <= width + 1, 'sensor reading clipped');
        assert.ok(await page.locator('#sensor-note').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'sensor explanation clipped');
      }
      if (width > 900) {
        const run = await page.locator('#btn-run').boundingBox();
        assert.ok(run && run.y + run.height <= height + 1, 'desktop Run is below viewport');
      }
      assert.ok(before.x >= -1 && before.x + before.width <= width + 1, `${levels[i].id} clips at ${width}x${height}`);
      const panel = await page.locator('.board-panel').boundingBox();
      assert.ok(before.y >= panel.y - 1 && before.y + before.height <= panel.y + panel.height + 1, `${levels[i].id} exceeds board-panel height at ${width}x${height}`);
      if (width <= 900) {
        await page.locator('#sheet-chevron').click();
        const after = await page.locator('#board').boundingBox();
        assert.deepEqual(after, before, `${levels[i].id} board changed between detents`);
        if (width === 390 && i === 18) {
          const sheet = await page.locator('#sheet').boundingBox();
          assert.ok(after.y + after.height <= sheet.y, 'Safe Passage board must remain above expanded editor');
        }
      }
      await page.locator('#btn-back').click();
    }
    console.log(`PASS all 25 Workshop levels fit at ${width}x${height}; detent geometry stable.`);
  }
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
