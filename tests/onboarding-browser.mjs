// Tutorial and chapter-example integration checks. Set LOCO_PLAYWRIGHT_MODULE.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startTileServer } from './tile-server.mjs';

assert.ok(process.env.LOCO_PLAYWRIGHT_MODULE);
const { chromium } = await import(pathToFileURL(process.env.LOCO_PLAYWRIGHT_MODULE));
const { server, url } = await startTileServer(0, null);
const screenshots = fileURLToPath(new URL('./tmp/', import.meta.url));
await mkdir(screenshots, { recursive: true });
let browser;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await desktop.goto(url);
  await desktop.locator('#btn-tutorial').click();
  assert.equal(await desktop.locator('#tutorial-tour').isVisible(), true);
  assert.equal(await desktop.locator('#tutorial-hints').isVisible(), false);
  assert.match(await desktop.locator('#level-progress').textContent(), /PRACTICE/);
  await desktop.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-desktop.png', import.meta.url)) });

  async function spotlightCovers(page, selector) {
    await page.waitForTimeout(30);
    const boxes = await page.evaluate((targetSelector) => {
      const spot = document.getElementById('tutorial-spotlight').getBoundingClientRect();
      const target = document.querySelector(targetSelector).getBoundingClientRect();
      return { spot: { left: spot.left, top: spot.top, right: spot.right, bottom: spot.bottom },
        target: { left: target.left, top: target.top, right: target.right, bottom: target.bottom },
        width: innerWidth, height: innerHeight };
    }, selector);
    assert.ok(boxes.spot.left <= Math.max(boxes.target.left, 4) + 2
      && boxes.spot.top <= Math.max(boxes.target.top, 4) + 2
      && boxes.spot.right >= Math.min(boxes.target.right, boxes.width - 4) - 2
      && boxes.spot.bottom >= Math.min(boxes.target.bottom, boxes.height - 4) - 2,
    `spotlight missed ${selector}: ${JSON.stringify(boxes)}`);
  }

  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'Read the map');
  assert.match(await desktop.locator('#tutorial-tour-copy').textContent(), /EXIT.*Walls/);
  assert.equal(await desktop.evaluate(() => document.activeElement.id), 'tutorial-tour-title');
  await desktop.keyboard.press('Tab');
  assert.equal(await desktop.evaluate(() => document.activeElement.id), 'btn-tour-skip');
  await spotlightCovers(desktop, '#board');
  await desktop.locator('#btn-tour-next').click();
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'Choose commands');
  await spotlightCovers(desktop, '#palette');
  await desktop.locator('#btn-tour-back').click();
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'Read the map');
  await desktop.locator('#btn-tour-next').click();
  await desktop.locator('#btn-tour-next').click();
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'Fill the memory');
  assert.match(await desktop.locator('#tutorial-tour-copy').textContent(), /six lines/);
  await spotlightCovers(desktop, '#program');
  await desktop.locator('#btn-tour-next').click();
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'Run and try again');
  await spotlightCovers(desktop, '.panel-section.controls');
  await desktop.locator('#btn-tour-next').click();
  assert.equal(await desktop.locator('#tutorial-tour').isVisible(), false);
  assert.equal(await desktop.locator('#tutorial-hints').isVisible(), true);

  async function keyAdd(id) {
    await desktop.locator(`#palette [data-block="${id}"]`).focus();
    await desktop.keyboard.press('Enter');
  }

  await keyAdd('move');
  await desktop.locator('#program .line.filled').first().focus();
  await desktop.keyboard.press('Delete');
  assert.equal(await desktop.locator('#program .line.filled').count(), 0, 'keyboard deletion failed');

  await keyAdd('move');
  await keyAdd('move');
  await desktop.locator('#btn-run').click();
  await desktop.locator('#btn-reset').click();
  assert.equal(await desktop.locator('#program .line.filled').count(), 2, 'Reset lost the program');
  assert.equal(await desktop.locator('#result-overlay').isVisible(), false);
  await desktop.locator('#btn-run').click();
  await desktop.locator('#result-overlay').waitFor({ state: 'visible' });
  assert.match(await desktop.locator('#result-text').textContent(), /CRASHED/);
  await desktop.locator('#btn-retry').click();
  assert.equal(await desktop.locator('#program .line.filled').count(), 2, 'Retry lost the program');
  await desktop.locator('#btn-clear').click();
  for (const id of ['move', 'turnRight', 'move', 'turnLeft', 'move']) await keyAdd(id);
  assert.match(await desktop.locator('#tutorial-hint-text').textContent(), /six memory lines/i);
  await desktop.locator('#btn-run').click();
  await desktop.locator('#result-overlay').waitFor({ state: 'visible' });
  assert.match(await desktop.locator('#result-text').textContent(), /PRACTICE COMPLETE/);
  assert.equal(await desktop.locator('#btn-next').textContent(), 'Start Chapter 1');
  assert.equal(await desktop.evaluate(() => localStorage.getItem('loco.progress.v1')), null, 'tutorial changed campaign progress');
  await desktop.locator('#btn-next').click();
  assert.equal(await desktop.locator('#level-name').textContent(), 'Corridor');
  await desktop.locator('#btn-back').click();

  async function finishGuide(count) {
    for (let i = 0; i < count; i += 1) await desktop.locator('#btn-tour-next').click();
    assert.equal(await desktop.locator('#tutorial-tour').isVisible(), false);
    assert.equal(await desktop.locator('#tutorial-hints').isVisible(), true);
  }
  async function fillCondition() {
    await desktop.locator('#palette [data-condition="wallSensor"]').focus();
    await desktop.keyboard.press('Enter');
    await desktop.locator('#palette [data-condition="blocked"]').focus();
    await desktop.keyboard.press('Space');
  }
  async function winExample(expectedLevel) {
    await desktop.locator('#speed [data-speed="2"]').click();
    await desktop.locator('#btn-run').click();
    await desktop.locator('#result-overlay').waitFor({ state: 'visible' });
    assert.match(await desktop.locator('#result-text').textContent(), /EXAMPLE COMPLETE/);
    assert.equal(await desktop.evaluate(() => localStorage.getItem('loco.progress.v1')), null, 'example changed campaign progress');
    assert.equal(await desktop.locator('#btn-next').textContent(), 'Start selected level');
    await desktop.locator('#btn-next').click();
    assert.equal(await desktop.locator('#level-name').textContent(), expectedLevel);
    await desktop.locator('#btn-back').click();
  }

  await desktop.locator('.level-item').nth(7).click();
  assert.equal(await desktop.locator('#level-name').textContent(), 'Loop example');
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'See the repeated path');
  await spotlightCovers(desktop, '#board');
  await desktop.locator('#btn-tour-next').click();
  await spotlightCovers(desktop, '#palette');
  await desktop.locator('#btn-tour-next').click();
  await spotlightCovers(desktop, '#program');
  await desktop.locator('#btn-tour-next').click();
  await spotlightCovers(desktop, '.panel-section.controls');
  await desktop.locator('#btn-tour-next').click();
  for (const id of ['loop', 'move', 'end']) await keyAdd(id);
  await desktop.locator('#speed [data-speed="2"]').click();
  await desktop.locator('#btn-run').click();
  await desktop.locator('#result-overlay').waitFor({ state: 'visible' });
  assert.match(await desktop.locator('#result-text').textContent(), /FELL SHORT/);
  await desktop.locator('#btn-retry').click();
  assert.equal(await desktop.locator('#program .line.filled').count(), 3, 'example Retry lost the program');
  await desktop.locator('#program .step-btn[data-step="1"]').click();
  assert.equal(await desktop.locator('#program .loop-count').textContent(), '3');
  await winExample('The Long Haul');
  await desktop.locator('.level-item').nth(7).click();
  assert.equal(await desktop.locator('#tutorial-tour').isVisible(), false, 'seen chapter repeated');
  await desktop.locator('#btn-back').click();
  await desktop.locator('.chapter-replay').first().click();
  assert.equal(await desktop.locator('#level-name').textContent(), 'Loop example');
  await desktop.locator('#btn-tour-skip').click();
  assert.equal(await desktop.locator('#screen-levels').isVisible(), true);
  assert.equal(await desktop.evaluate(() => document.activeElement.classList.contains('chapter-replay')), true, 'replay focus was not restored');
  assert.match(await desktop.evaluate(() => localStorage.getItem('loco.onboarding.v1')), /ch2/);

  await desktop.locator('.level-item').nth(15).click();
  assert.equal(await desktop.locator('#level-name').textContent(), 'Sensor example');
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'Find the wall');
  await desktop.locator('#btn-tour-next').click();
  await spotlightCovers(desktop, '#equipment-card');
  assert.match(await desktop.locator('#tutorial-tour-copy').textContent(), /Holes are not walls/);
  await finishGuide(4);
  for (const id of ['loopUntil', 'move', 'end', 'turnRight', 'move']) await keyAdd(id);
  await fillCondition();
  assert.match(await desktop.locator('#program .line.filled').first().textContent(), /wall sensor.*blocked/);
  await winExample('Cruise Control');

  await desktop.locator('.level-item').nth(20).click();
  assert.equal(await desktop.locator('#level-name').textContent(), 'Decision example');
  assert.equal(await desktop.locator('#tutorial-tour-title').textContent(), 'See two situations');
  await desktop.locator('#btn-tour-next').click();
  await spotlightCovers(desktop, '#equipment-card');
  await finishGuide(4);
  for (const id of ['loop', 'if', 'turnRight', 'else', 'move', 'end', 'end', 'move']) await keyAdd(id);
  await fillCondition();
  await winExample('The Hairpin');
  assert.deepEqual(errors, [], 'desktop page errors');
  await desktop.close();

  const returning = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await returning.goto(url);
  await returning.evaluate(() => {
    localStorage.setItem('loco.progress.v1', JSON.stringify({ completed: ['ch4-01'] }));
    localStorage.setItem('loco.onboarding.v1', '{corrupt');
  });
  await returning.reload();
  await returning.locator('#btn-play').click();
  await returning.locator('.level-item').nth(20).click();
  assert.equal(await returning.locator('#level-name').textContent(), 'The Hairpin');
  assert.equal(await returning.locator('#tutorial-tour').isVisible(), false, 'completed chapter should count as seen');
  await returning.close();

  const phone = await browser.newPage({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const phoneErrors = [];
  phone.on('pageerror', error => phoneErrors.push(error.message));
  await phone.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await phone.goto(url);
  await phone.locator('#btn-tutorial').click();
  assert.equal(await phone.locator('#tutorial-tour').isVisible(), true);
  assert.equal(await phone.locator('#sheet-chevron').getAttribute('aria-expanded'), 'false');
  await spotlightCovers(phone, '#board');
  const layout = await phone.evaluate(() => ({ width: document.documentElement.scrollWidth, board: document.getElementById('board').width }));
  assert.ok(layout.width <= 320, 'phone overflow');
  assert.ok(layout.board > 0, 'practice board missing');
  await phone.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-phone.png', import.meta.url)) });
  for (const [width, height] of [[280, 844], [844, 390]]) {
    await phone.setViewportSize({ width, height });
    const fit = await phone.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      board: document.getElementById('board').getBoundingClientRect(),
    }));
    assert.ok(fit.scrollWidth <= width, `tutorial overflow at ${width}px`);
    assert.ok(fit.board.width > 0 && fit.board.height > 0, `tutorial board missing at ${width}px`);
  }
  await phone.setViewportSize({ width: 320, height: 568 });
  await phone.locator('#btn-tour-next').click();
  assert.equal(await phone.locator('#sheet-chevron').getAttribute('aria-expanded'), 'true');
  await spotlightCovers(phone, '#palette');
  await phone.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-phone-commands.png', import.meta.url)) });
  await phone.locator('#btn-tour-next').click();
  await spotlightCovers(phone, '#program');
  await phone.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-phone-memory.png', import.meta.url)) });
  await phone.locator('#btn-tour-next').click();
  assert.equal(await phone.locator('#sheet-chevron').getAttribute('aria-expanded'), 'false');
  await spotlightCovers(phone, '#sheet-peek');
  await phone.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-phone-run.png', import.meta.url)) });
  await phone.locator('#btn-tour-skip').click();
  assert.equal(await phone.locator('#tutorial-hints').isVisible(), true);
  await phone.locator('#sheet-chevron').click();
  assert.equal(await phone.locator('#tutorial-hints').isVisible(), true, 'hint obscured by sheet');
  assert.equal(await phone.locator('#board').evaluate(el => el.width), layout.board, 'sheet resized board');
  await phone.locator('#btn-tutorial-skip').click();
  assert.equal(await phone.locator('#screen-levels').isVisible(), true);
  await phone.locator('.level-item').nth(7).click();
  assert.equal(await phone.locator('#level-name').textContent(), 'Loop example');
  await spotlightCovers(phone, '#board');
  await phone.locator('#btn-tour-next').click();
  await spotlightCovers(phone, '#palette');
  await phone.locator('#btn-tour-next').click();
  await spotlightCovers(phone, '#program');
  await phone.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-phone-loop.png', import.meta.url)) });
  await phone.locator('#btn-tour-next').click();
  await spotlightCovers(phone, '#sheet-peek');
  await phone.locator('#btn-tour-skip').click();
  assert.equal(await phone.locator('#level-name').textContent(), 'The Long Haul');
  await phone.locator('#btn-back').click();
  for (const [index, name] of [[15, 'Sensor example'], [20, 'Decision example']]) {
    await phone.locator('.level-item').nth(index).click();
    assert.equal(await phone.locator('#level-name').textContent(), name);
    await spotlightCovers(phone, '#board');
    await phone.locator('#btn-tour-next').click();
    await spotlightCovers(phone, '#sensor-note');
    await phone.screenshot({ path: fileURLToPath(new URL(`./tmp/onboarding-phone-${name.split(' ')[0].toLowerCase()}.png`, import.meta.url)) });
    await phone.locator('#btn-tour-next').click();
    await spotlightCovers(phone, '#palette');
    await phone.locator('#btn-tour-next').click();
    await spotlightCovers(phone, '#program');
    if (index === 20) await phone.screenshot({ path: fileURLToPath(new URL('./tmp/onboarding-phone-decision-memory.png', import.meta.url)) });
    await phone.locator('#btn-tour-next').click();
    await spotlightCovers(phone, '#sheet-peek');
    if (index === 20) {
      await phone.locator('#btn-tour-next').click();
      await phone.locator('#sheet-chevron').click();
      for (const id of ['loop', 'if', 'turnRight', 'else', 'move', 'end', 'end', 'move']) {
        await phone.locator(`#palette [data-block="${id}"]`).click();
      }
      await phone.locator('#palette [data-condition="wallSensor"]').click();
      await phone.locator('#palette [data-condition="blocked"]').click();
      await phone.locator('#sheet-chevron').click();
      await phone.locator('#btn-run-peek').click();
      await phone.locator('#result-overlay').waitFor({ state: 'visible' });
      assert.match(await phone.locator('#result-text').textContent(), /EXAMPLE COMPLETE/);
      assert.equal(await phone.evaluate(() => localStorage.getItem('loco.progress.v1')), null);
      await phone.locator('#btn-next').click();
      assert.equal(await phone.locator('#level-name').textContent(), 'The Hairpin');
    } else {
      await phone.locator('#btn-tour-skip').click();
    }
    await phone.locator('#btn-back').click();
  }
  await phone.locator('#btn-title').click();
  await phone.locator('#btn-tutorial').click();
  assert.equal(await phone.locator('#tutorial-tour-title').textContent(), 'Read the map');
  await phone.keyboard.press('Escape');
  assert.equal(await phone.locator('#tutorial-tour').isVisible(), false);
  assert.equal(await phone.evaluate(() => document.activeElement.id), 'sheet-chevron');
  await phone.locator('#btn-back').click();
  assert.equal(await phone.locator('#screen-title').isVisible(), true);
  assert.deepEqual(phoneErrors, [], 'phone page errors');
  await phone.close();

  console.log('PASS onboarding: tutorial, chapter examples, progress isolation, replay, and phone layout.');
} finally {
  await browser?.close();
  server.close();
}
