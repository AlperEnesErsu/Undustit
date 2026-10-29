// The site is plain files: this serves the repository root as Netlify does (folder/index.html, 404.html for
// anything missing) and applies the same _headers and _redirects files, so the tests run under the live rules.
// Two local exceptions: no https upgrade or HSTS (this server is http), and the tests' stand-in database
// (http://sb.test) may be reached. No dependencies. node tests/sunucu.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 4455;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.ics':'text/calendar' };

// "/assets/fonts/*" -> a regular expression for the request path
const desen = p => new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
const satirlar = f => { try { return fs.readFileSync(path.join(root, f), 'utf8').split(/\r?\n/); } catch { return []; } };
// _headers: a path line, then indented "Name: value" lines
const basliklar = [];
for (const l of satirlar('_headers')){
  if (!l.trim() || l.trim().startsWith('#')) continue;
  if (!/^\s/.test(l)) basliklar.push({ re:desen(l.trim()), h:{} });
  else if (basliklar.length){ const i = l.indexOf(':'); basliklar[basliklar.length - 1].h[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
}
// _redirects: only the forced "404!" rules matter here (they hide the working files)
const gizli = satirlar('_redirects').map(l => l.trim()).filter(l => l && !l.startsWith('#') && /\s404!$/.test(l)).map(l => desen(l.split(/\s+/)[0]));
const yerel = (ad, v) => ad === 'Content-Security-Policy'
  ? v.replace(/;\s*upgrade-insecure-requests/, '').replace(/connect-src ([^;]*)/, 'connect-src $1 http://sb.test')
  : v;

http.createServer((req, res) => {
  const yol = decodeURIComponent((req.url || '/').split('?')[0]);
  const ek = {};
  for (const b of basliklar) if (b.re.test(yol)) for (const [ad, v] of Object.entries(b.h)) if (ad !== 'Strict-Transport-Security') ek[ad] = yerel(ad, v);
  const clean = path.normalize(yol).replace(/^[/\\]+/, '');
  let file = path.join(root, clean);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch {}
  const found = !gizli.some(re => re.test(yol)) && fs.existsSync(file) && fs.statSync(file).isFile();
  const f = found ? file : path.join(root, '404.html');
  res.writeHead(found ? 200 : 404, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store', ...ek });
  fs.createReadStream(f).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
