// Dedicated test server: replaces the level registry only on this localhost
// server. Production source and Vercel's 15-level registry stay unchanged.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { holeBoard } from './tile-fixtures.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
export async function startTileServer(port = 0, fixtureLevels = [holeBoard]) {
  const server = http.createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/favicon.ico') { response.writeHead(204).end(); return; }
    if (path === '/src/levels/index.js' && fixtureLevels !== null) {
      response.writeHead(200, { 'Content-Type': 'text/javascript' })
        .end(`export const levels = ${JSON.stringify(fixtureLevels)};`);
      return;
    }
    if (path !== '/' && path !== '/index.html' && !/^\/(src|styles)\/[\w/.-]+$/.test(path)) {
      response.writeHead(404).end(); return;
    }
    const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!target.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(403).end(); return; }
    try {
      const data = await readFile(target);
      response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(target)] }).end(data);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const game = process.argv.includes('--game');
  const { url } = await startTileServer(game ? 4175 : 4174, game ? null : [holeBoard]);
  console.log(game ? `Full game: ${url} — Ctrl+C to stop.` : `Tile workshop: ${url} — Ctrl+C to stop. Move twice to fall; Retry or Reset to return.`);
}
