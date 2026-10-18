import { readFile } from 'node:fs/promises';
import { orderedCandidates } from './pure.mjs';
import { writeProjectFile } from '../project.mjs';

const body = await readFile(new URL('./page-script.js', import.meta.url), 'utf8');
export const pageScript = `(() => {\n${orderedCandidates.toString()}\n${body}\n})();`;

export async function installRecorder(context, onStep) {
  const pages = [];
  const pending = new Set();
  const remember = (page) => {
    if (!pages.includes(page)) pages.push(page);
    return pages.indexOf(page);
  };
  context.pages().forEach(remember);
  context.on('page', remember);
  await context.exposeBinding('__sr_event', ({ page }, step) => {
    const promise = Promise.resolve().then(() => onStep({ ...step, tab: remember(page) }));
    pending.add(promise);
    promise.finally(() => pending.delete(promise)).catch(() => {});
    return promise;
  });
  await context.addInitScript({ content: pageScript });
  return {
    async drain() {
      await Promise.allSettled(context.pages().flatMap((page) => page.frames().map((frame) =>
        frame.evaluate(() => window.__sr_drain?.()))));
      while (pending.size) await Promise.allSettled([...pending]);
    },
  };
}

export async function recordGuide({ url, name, headless = false, viewport = { width: 1440, height: 900 } }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless });
  const steps = [];
  let recorder;
  try {
    const disconnected = new Promise((resolve) => browser.once('disconnected', resolve));
    const context = await browser.newContext({ viewport });
    recorder = await installRecorder(context, (step) => { steps.push(step); });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    console.log('Click through your flow, then close the browser window.');
    await disconnected;
    await recorder.drain();
    if (!steps.length) throw new Error('No interactions were recorded');
    await writeProjectFile(name, 'guide', { version: 1, url, viewport, steps });
    return steps;
  } finally {
    try { await recorder?.drain(); }
    finally { await browser.close(); }
  }
}
