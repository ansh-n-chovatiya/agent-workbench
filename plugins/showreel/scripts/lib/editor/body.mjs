export function readBody(request, limit = 1024 * 1024, subject = 'Composition') {
  return new Promise((resolve,reject) => {
    let length = 0, settled = false; const chunks = [];
    const cleanup = () => { request.off('data',data); request.off('end',end); request.off('error',error); request.off('aborted',aborted); };
    const error = err => { cleanup(); if (!settled) reject(err); settled = true; };
    const aborted = () => error(new Error('Request aborted'));
    const data = chunk => {
      if (settled) return; // Drain an oversized request without retaining the remaining bytes.
      length += chunk.length;
      if (length > limit) {
        settled = true; chunks.length = 0;
        reject(Object.assign(new Error(`${subject} exceeds ${limit >= 1024 * 1024 ? Math.round(limit / (1024 * 1024)) + ' MB' : Math.round(limit / 1024) + ' KB'}`),{statusCode:413}));
      } else chunks.push(chunk);
    };
    const end = () => { cleanup(); if (!settled) resolve(Buffer.concat(chunks)); settled = true; };
    request.on('data',data); request.once('end',end); request.once('error',error); request.once('aborted',aborted);
  });
}
