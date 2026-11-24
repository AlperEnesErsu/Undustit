// Draws the site's icon files from one SVG (the "it" mark): favicon.svg, favicon.ico (16/32/48), the PNGs Google,
// phones and the web manifest ask for, and a square logo for structured data. Run after changing the mark:
//   node tools/ikon.mjs
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const KAGIT = '#FAF9F6', MOR = '#5B2EFF';
// the mark sits well inside the square: Google shows favicons in a circle and crops the corners
const svg = (yuvarlak = 14) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
  `<rect width="64" height="64" rx="${yuvarlak}" fill="${KAGIT}"/>` +
  `<text x="32" y="45" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-style="italic" font-size="38" fill="${MOR}">it</text></svg>`;

fs.writeFileSync('favicon.svg', svg());
const b = await chromium.launch();
const p = await b.newPage();
async function png(boyut, yuvarlak){
  await p.setViewportSize({ width:boyut, height:boyut });
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${boyut}px;height:${boyut}px}</style>${svg(yuvarlak)}`);
  return p.screenshot({ omitBackground:true, type:'png' });
}
const yaz = async (yol, boyut, yuvarlak) => { const v = await png(boyut, yuvarlak); fs.writeFileSync(yol, v); return v; };
await yaz('assets/ikon/ikon-48.png', 48);
await yaz('assets/ikon/ikon-96.png', 96);
await yaz('assets/ikon/ikon-192.png', 192);
await yaz('assets/ikon/ikon-512.png', 512);
await yaz('assets/ikon/logo-512.png', 512, 0);          // square, for search engines' logo
await yaz('apple-touch-icon.png', 180, 0);              // iOS rounds it itself
// favicon.ico: PNG images inside an ICO container
const parcalar = [];
for (const n of [16, 32, 48]) parcalar.push({ n, v: await png(n) });
const bas = Buffer.alloc(6 + 16 * parcalar.length);
bas.writeUInt16LE(0, 0); bas.writeUInt16LE(1, 2); bas.writeUInt16LE(parcalar.length, 4);
let yer = bas.length;
parcalar.forEach((x, i) => {
  const o = 6 + 16 * i;
  bas.writeUInt8(x.n, o); bas.writeUInt8(x.n, o + 1); bas.writeUInt8(0, o + 2); bas.writeUInt8(0, o + 3);
  bas.writeUInt16LE(1, o + 4); bas.writeUInt16LE(32, o + 6); bas.writeUInt32LE(x.v.length, o + 8); bas.writeUInt32LE(yer, o + 12);
  yer += x.v.length;
});
fs.writeFileSync('favicon.ico', Buffer.concat([bas, ...parcalar.map(x => x.v)]));
await b.close();
console.log('ikonlar yazıldı');
