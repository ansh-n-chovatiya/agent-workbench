import http from 'node:http';
import { open, readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { FrameQueue, encoderSettings } from './frame-queue.mjs';
import { writeChunk } from './chunk-writer.mjs';

export async function startEncoder({ browser, width, height, outFile, maxBacklog = 8 }) {
  const config = encoderSettings(width, height);
  const queue = new FrameQueue(maxBacklog);
  const bundle = await readFile(new URL('../../../dist/encoder-page.js', import.meta.url));
  const prefix = `/${randomUUID()}/`;
  let file, server, page, failure;
  let writes = Promise.resolve();
  let bytes = 0;
  async function cleanup() {
    queue.end();
    try { await page?.close(); }
    finally {
      try {
        if (server?.listening) {
          server.closeAllConnections();
          await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        }
      } finally {
        await writes.catch(() => {});
        await file?.close();
      }
    }
  }
  try {
    file = await open(outFile, 'wx');
    server = http.createServer((request, response) => {
      const handle = async () => {
        const route = request.url;
        if (request.method === 'GET' && route === prefix) {
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(`<script>window.__config=${JSON.stringify(config)}</script>`
            + '<script src="encoder-page.js"></script>');
        } else if (request.method === 'GET' && route === `${prefix}encoder-page.js`) {
          response.setHeader('Content-Type', 'text/javascript');
          response.end(bundle);
        } else if (request.method === 'GET' && route === `${prefix}next`) {
          const frame = await queue.next();
          if (!frame) {
            response.writeHead(204, { 'x-end-ts': String(queue.endTs) });
            response.end();
          } else {
            response.writeHead(200, { 'Content-Type': 'image/jpeg', 'x-ts': String(frame.ts) });
            response.end(frame.data);
          }
        } else if (request.method === 'POST' && route === `${prefix}chunk`) {
          const position = Number(request.headers['x-pos']);
          if (!Number.isSafeInteger(position) || position < 0) throw new Error('Invalid chunk position');
          const chunks = [];
          let length = 0;
          for await (const chunk of request) {
            length += chunk.length;
            if (length > 32 * 1024 * 1024) throw new Error('Encoder chunk exceeds limit');
            chunks.push(chunk);
          }
          const data = Buffer.concat(chunks);
          writes = writes.then(async () => {
            bytes = Math.max(bytes, await writeChunk(file, data, position));
          });
          await writes;
          response.writeHead(204);
          response.end();
        } else { response.writeHead(404); response.end(); }
      };
      handle().catch((error) => {
        failure ??= error;
        response.writeHead(500);
        response.end('Encoder transport failed');
      });
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
    });
    page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}${prefix}`);
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 30000 });
    const error = await page.evaluate(() => window.__error);
    if (error) throw new Error(error);
  } catch (error) {
    try { throw error; } finally { await cleanup(); }
  }
  let finishing;
  return {
    push(data, ts) {
      if (failure) throw failure;
      return queue.push(data, ts);
    },
    finish(endTs) {
      finishing ??= (async () => {
        queue.end(endTs);
        try {
          await page.waitForFunction(() => window.__done, null, { timeout: 120000 });
          const { result, error } = await page.evaluate(() => ({
            result: window.__result, error: window.__error,
          }));
          if (failure || error) throw failure ?? new Error(error);
          await writes;
          if (!result.frames) throw new Error('Screencast produced no frames');
          return {
            ...result, dropped: queue.dropped, maxBacklog: queue.maxBacklog,
            bytes, firstTs: queue.firstTs, lastTs: queue.lastTs,
          };
        } finally { await cleanup(); }
      })();
      return finishing;
    },
  };
}
