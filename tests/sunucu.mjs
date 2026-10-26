// The site is plain files: this serves the repository root as GitHub Pages does (folder/index.html,
// 404.html for anything missing). No dependencies. node tests/sunucu.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 4455;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.ics':'text/calendar' };

http.createServer((req, res) => {
  const clean = path.normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^[/\\]+/, '');
  let file = path.join(root, clean);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch {}
  const found = fs.existsSync(file) && fs.statSync(file).isFile();
  const f = found ? file : path.join(root, '404.html');
  res.writeHead(found ? 200 : 404, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
