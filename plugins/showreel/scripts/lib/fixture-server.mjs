import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { PLUGIN_ROOT } from './env.mjs';
import { createBenchmarkRoutes } from '../../fixtures/demo-app/server.mjs';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};
const outside = (root, file) => {
  const relative = path.relative(root, file);
  return relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
};

export async function startFixtureServer(dir = path.join(PLUGIN_ROOT, 'fixtures', 'demo-app')) {
  const root = await realpath(dir);
  const benchmarkRoutes = root === await realpath(path.join(PLUGIN_ROOT, 'fixtures', 'demo-app')) ? createBenchmarkRoutes() : null;
  const server = http.createServer(async (req, res) => {
    const reply = (status, text) => {
      res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(text);
    };
    if (req.method === 'POST' && req.url === '/api/choose') {
      req.resume();
      res.writeHead(204);
      res.end();
      return;
    }
    let pathname;
    try { pathname = decodeURIComponent(req.url.split(/[?#]/, 1)[0]); }
    catch { return reply(400, 'Invalid path'); }
    // Inspect the raw request target before URL normalization can erase traversal.
    if (pathname.split(/[\\/]/).includes('..') || pathname.includes('\0')) return reply(403, 'Forbidden');
    if (benchmarkRoutes) {
      try { if (await benchmarkRoutes(req, res, pathname)) return; }
      catch { return reply(500, 'Cannot serve benchmark page'); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) return reply(405, 'Method not allowed');
    const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (outside(root, file)) return reply(403, 'Forbidden');
    try {
      const resolved = await realpath(file);
      if (outside(root, resolved)) return reply(403, 'Forbidden');
      const data = await readFile(resolved);
      res.writeHead(200, { 'Content-Type': types[path.extname(resolved)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (err) {
      reply(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(err.code) ? 404 : 500, err.code === 'ENOENT' ? 'Not found' : 'Cannot serve file');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  };
}
