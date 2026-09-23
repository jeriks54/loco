// Workshop uses opaque ivory panels. Guard text contrast against the actual
// stylesheet tokens; live-browser checks cover layout and computed surfaces.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
const hex=name=>{const m=css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));assert.ok(m,`missing ${name}`);return m[1]};
const lum=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
for(const [fg,bg] of [['text','bg'],['text','surface'],['text','surface-2'],['text','code'],['muted','bg'],['muted','surface'],['muted','surface-2'],['accent-ink','accent-fill'],['surface','accent']]){
 const a=lum(hex(fg)),b=lum(hex(bg)),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(contrast>=4.5,`${fg}/${bg} ${contrast.toFixed(2)} < 4.5`);
 console.log(`${fg}/${bg}: ${contrast.toFixed(2)}:1`);
}
console.log('PASS: Workshop text, secondary text, operands and primary controls meet AA contrast.');
