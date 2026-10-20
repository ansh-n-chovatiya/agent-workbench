import { rename } from 'node:fs/promises';

const BUSY = new Set(['EPERM', 'EBUSY', 'EACCES']);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Atomic replace that survives Windows briefly locking the target (antivirus, indexers, another reader):
// retry EPERM/EBUSY/EACCES with a short backoff (about 1.5 s in total), then give up with the original error.
export async function renameRetry(from, to, { attempts = 10, delayMs = 20, rename: rn = rename } = {}) {
  for (let attempt = 1; ; attempt++) {
    try { return await rn(from, to); }
    catch (error) {
      if (!BUSY.has(error?.code) || attempt >= attempts) throw error;
      await wait(Math.min(delayMs * attempt, 250));
    }
  }
}
