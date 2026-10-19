import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { parseRange } from './http.mjs';

// Serves one file with single-range support (HEAD and GET), like the recording route.
export async function serveRanged(request, response, file, type) {
  const { size } = await stat(file), range = parseRange(request.headers.range, size);
  if (range === false) { response.writeHead(416, { 'content-range': `bytes */${size}` }); response.end(); return; }
  const { start, end } = range ?? { start: 0, end: size - 1 };
  response.writeHead(range ? 206 : 200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size === 0 ? 0 : end - start + 1,
    ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}) });
  if (request.method === 'HEAD' || size === 0) { response.end(); return; }
  const stream = createReadStream(file, { start, end });
  stream.on('error', error => response.destroy(error)); response.on('close', () => stream.destroy()); stream.pipe(response);
}
