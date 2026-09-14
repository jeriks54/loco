// Retained check: the mobile sheet's translucency dial against the board art.
// design.md §12 requires --muted to hold >= 4.5:1 over the board's worst-case
// pixel through the real stack in styles/main.css: board pixel, then the sheet
// body color-mix(--surface a%, transparent), then the card color-mix(--bg b%,
// transparent). color-mix in srgb is linear sRGB interpolation, so the stack is
// exact arithmetic — no browser needed. Reads the dial and the tokens straight
// from main.css so the gate tracks whichever pair is shipped.
//
//   node tests/contrast.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../styles/main.css', import.meta.url)), 'utf8');
// main.css contains other color-mix rules; the dial lives in the sheet block.
const sheetBlock = css.slice(css.indexOf('Sheet translucency'));
assert.ok(sheetBlock.length > 0, 'sheet translucency block not found');
const hex = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `token --${name} not found`);
  return [1, 3, 5].map(i => parseInt(m[1].slice(i, i + 2), 16));
};
const pct = (token) => {
  const m = sheetBlock.match(new RegExp(`color-mix\\(in srgb, var\\(--${token}\\) (\\d+)%`));
  assert.ok(m, `sheet dial for --${token} not found`);
  return parseInt(m[1], 10) / 100;
};

const T = { bg: hex('bg'), surface: hex('surface'), muted: hex('muted'), text: hex('text') };
const a = pct('surface');   // sheet body over the board
const b = pct('bg');        // card over the body

// Worst-case board pixels from design.md §12: the lit brick top face is the
// brightest thing the board puts behind the sheet; pure --accent stays an
// accepted small blurred region and is reported, not gated.
const BOARD = {
  'lit wall top': [0x7E, 0x60, 0x47],
  'wall base': [0x5B, 0x45, 0x34],
  'walnut floor': [0x34, 0x2B, 0x22],
};
const ACCENT = hex('accent');

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, bl]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
const ratio = (f, bk) => (Math.max(f, bk) + 0.05) / (Math.min(f, bk) + 0.05);
const over = (top, under, w) => top.map((v, i) => w * v + (1 - w) * under[i]);

console.log(`sheet dial: body ${a} / card ${b} (leak ${(((1 - a) * (1 - b)) * 100).toFixed(1)}%)`);
for (const [name, p] of Object.entries(BOARD)) {
  const back = lum(over(T.bg, over(T.surface, p, a), b));
  const muted = ratio(lum(T.muted), back);
  const text = ratio(lum(T.text), back);
  console.log(`  ${name.padEnd(13)} muted ${muted.toFixed(2)}:1  text ${text.toFixed(2)}:1`);
  assert.ok(muted >= 4.5, `--muted over ${name} is ${muted.toFixed(2)}:1, below 4.5:1 — raise the sheet dial`);
  assert.ok(text >= 7, `--text over ${name} is ${text.toFixed(2)}:1`);
}
const accentBack = lum(over(T.bg, over(T.surface, ACCENT, a), b));
console.log(`  pure accent   muted ${ratio(lum(T.muted), accentBack).toFixed(2)}:1 (reported: small blurred region, not gated)`);
console.log('PASS: sheet translucency holds AA for --muted over every direction-A board surface.');
