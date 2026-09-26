// Reads a Playwright trace.zip into steps, actions, mouse positions and
// screencast frames. Every time is in milliseconds on the trace's shared
// monotonic clock: the test runner's test.trace and the browser context's
// N-trace.trace files use the same clock, so steps and actions line up as is.
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { run } from './env.mjs';

const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

// texts: { [fileName]: contents } of every *.trace file in the zip.
export function parseTrace(texts) {
  const steps = [];
  const actions = [];
  const moves = [];
  const frames = [];
  let videoPage = null;

  for (const [name, text] of Object.entries(texts)) {
    const isTestRunner = name === 'test.trace';
    const byId = new Map();
    const lastTime = new Map(); // latest timestamp seen for a call, to date its input event
    for (const line of text.split('\n')) {
      if (!line) continue;
      let e;
      try { e = JSON.parse(line); } catch { continue; } // a trace cut short by a crash ends mid-line
      if (isTestRunner) {
        if (e.type === 'before') byId.set(e.callId, { ...e, end: e.startTime });
        else if (e.type === 'after' && byId.has(e.callId)) Object.assign(byId.get(e.callId), { end: e.endTime, annotations: e.annotations });
        continue;
      }
      switch (e.type) {
        case 'before': {
          const a = { method: e.method, start: e.startTime, end: e.startTime };
          byId.set(e.callId, a);
          actions.push(a);
          lastTime.set(e.callId, e.startTime);
          // mouse.move dispatches at once; its input event carries no time of its own.
          if (e.method === 'mouseMove' || e.method === 'mouseClick') moves.push({ t: e.startTime, x: e.params.x, y: e.params.y });
          break;
        }
        case 'log': lastTime.set(e.callId, e.time); break;
        case 'input': {
          const a = byId.get(e.callId);
          if (!a) break;
          if (e.point) a.point = e.point;
          if (e.box) a.box = e.box;
          if (a.method !== 'mouseMove' && a.method !== 'mouseClick') {
            const p = e.point || (e.box && center(e.box));
            if (p) {
              a.inputAt = lastTime.get(e.callId);
              moves.push({ t: a.inputAt, x: p.x, y: p.y });
            }
          }
          break;
        }
        case 'after': { const a = byId.get(e.callId); if (a) a.end = e.endTime; break; }
        case 'screencast-frame':
          videoPage ??= e.pageId; // the recorded video is the first page's screencast
          if (e.pageId === videoPage) frames.push({ t: e.timestamp });
          break;
      }
    }
    if (isTestRunner) {
      // Only outermost test.step calls become captions; nested ones would
      // overlap them. A skipped step (test.step.skip, or info.skip() inside
      // it) is not one either; the fixture does not count it, so narration
      // indices stay on the same steps.
      const hasStepAncestor = (s) => {
        for (let p = byId.get(s.parentId); p; p = byId.get(p.parentId)) if (p.method === 'test.step') return true;
        return false;
      };
      for (const s of byId.values()) {
        if (s.method === 'test.step' && !hasStepAncestor(s) && !s.annotations?.some((a) => a.type === 'skip')) steps.push({ title: s.title, start: s.startTime, end: s.end });
      }
    }
  }
  const byT = (a, b) => (a.t ?? a.start) - (b.t ?? b.start);
  steps.sort(byT);
  return {
    steps: steps.map((s, index) => ({ index, ...s })),
    actions: actions.sort(byT),
    moves: moves.sort(byT),
    frames: frames.sort(byT),
  };
}

export async function readTrace(zipPath) {
  const dir = await mkdtemp(path.join(tmpdir(), 'demo-trace-'));
  try {
    const { code, stderr } = await run('unzip', ['-qo', zipPath, '*.trace', '-d', dir]);
    if (code !== 0) throw new Error(`could not unzip ${zipPath}: ${stderr.trim().split('\n').pop() || `exit ${code}`}`);
    const texts = {};
    for (const f of await readdir(dir)) if (f.endsWith('.trace')) texts[f] = await readFile(path.join(dir, f), 'utf8');
    return parseTrace(texts);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
