// Pure timing math for the edit stage. Inputs are milliseconds on the raw
// video's clock (0 = its first frame); cuts are [fromMs, toMs] ranges of that
// clock that the edited clip leaves out.

// Mouse travel is visible motion, never a stale wait, so it is never cut.
const MOTION = new Set(['mouseMove', 'mouseClick', 'mouseDown', 'mouseUp', 'mouseWheel']);

// How much of a cut action or wait stays in the edit (the page is seen reacting).
export const KEEP_MS = 500;

// Every action/expect/wait longer than maxWaitMs keeps its first keepMs and
// loses the rest. Overlapping cuts are merged.
export function computeCuts(actions, { maxWaitMs = 1200, keepMs = KEEP_MS } = {}) {
  const raw = actions
    .filter((a) => !MOTION.has(a.method) && a.end - a.start > maxWaitMs)
    .map((a) => [a.start + keepMs, a.end])
    .sort((a, b) => a[0] - b[0]);
  return mergeCuts(raw);
}

// Sorted, non-overlapping copy of [fromMs, toMs] ranges.
export function mergeCuts(ranges) {
  const cuts = [];
  for (const c of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = cuts[cuts.length - 1];
    if (last && c[0] <= last[1]) last[1] = Math.max(last[1], c[1]);
    else cuts.push([...c]);
  }
  return cuts;
}

// Raw time -> edited time. A time inside a cut lands on the cut point.
export function remap(t, cuts) {
  let removed = 0;
  for (const [a, b] of cuts) if (a < t) removed += Math.min(t, b) - a;
  return t - removed;
}

// Edited time -> the raw time shown at that instant (inverse of remap).
export function unmap(t, cuts) {
  for (const [a, b] of cuts) if (t >= a) t += b - a;
  return t;
}

const sec = (ms) => Math.round(ms) / 1000;

// captions.json: seconds on the edited timeline, sorted, never overlapping.
export function buildCaptions(steps, cuts) {
  const caps = steps
    .map((s) => ({ index: s.index, text: s.title, start: Math.max(0, remap(s.start, cuts)), end: Math.max(0, remap(s.end, cuts)) }))
    .sort((a, b) => a.start - b.start);
  return caps.map((c, i) => {
    const next = caps[i + 1];
    const end = Math.max(c.start, next ? Math.min(c.end, next.start) : c.end);
    return { index: c.index, text: c.text, start: sec(c.start), end: sec(end) };
  });
}

// A position counts as over a target while inside its box within this long of the action.
const HOVER_MS = 1500;
const EASE_MS = 200;

// Recordly cursor log on the edited timeline. Samples sit on an exact hz grid
// of the edited clip; each shows the last known raw position at the raw
// instant that frame came from, so nothing inside a cut is ever sampled.
// targets: [{start, end, box, cursorType}] set the cursor shape while the
// cursor is over them; clicks: [{t, x, y}] add a click and a mouseup.
export function buildCursor(moves, clicks, { width, height, hz = 60, durationMs, targets = [] }, cuts) {
  const ms = [...moves].sort((a, b) => a.t - b.t);
  if (!ms.length) return { version: 2, samples: [] };
  const end = remap(durationMs ?? ms[ms.length - 1].t, cuts);
  const nx = (x) => Math.min(1, Math.max(0, x / width));
  const ny = (y) => Math.min(1, Math.max(0, y / height));
  const typeAt = (t, p) => {
    for (const g of targets) {
      const b = g.box;
      const inside = p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
      if (inside && t >= g.start - HOVER_MS && t <= g.end + HOVER_MS) return g.cursorType;
    }
    return 'arrow';
  };
  // A cut can land the cursor somewhere else; it glides there over EASE_MS
  // instead of jumping. `gap` is where it was minus where it is at each cut.
  const last = (t) => ms.reduce((p, m) => (m.t <= t ? m : p), ms[0]);
  const joins = cuts.map(([a, b]) => {
    const p = last(a), q = last(b);
    return { at: remap(b, cuts), gx: p.x - q.x, gy: p.y - q.y };
  }).filter((j) => j.gx || j.gy);
  const samples = [];
  let i = 0;
  let pos = ms[0];
  for (let k = 0; k * 1000 / hz <= end; k++) {
    const te = k * 1000 / hz;
    const tr = unmap(te, cuts);
    while (i < ms.length && ms[i].t <= tr) pos = ms[i++];
    let { x, y } = pos;
    for (const j of joins) {
      const f = (te - j.at) / EASE_MS;
      if (f >= 0 && f < 1) { const w = 1 - f * f * (3 - 2 * f); x += j.gx * w; y += j.gy * w; }
    }
    samples.push({ timeMs: Math.round(te), cx: nx(x), cy: ny(y), interactionType: 'move', cursorType: typeAt(tr, pos) });
  }
  for (const c of clicks) {
    if (cuts.some(([a, b]) => c.t > a && c.t < b)) continue;
    const te = remap(c.t, cuts);
    const base = { cx: nx(c.x), cy: ny(c.y), cursorType: typeAt(c.t, c) };
    samples.push({ timeMs: Math.round(te), ...base, interactionType: 'click' });
    samples.push({ timeMs: Math.round(te + 90), ...base, interactionType: 'mouseup' });
  }
  const order = { move: 0, click: 1, mouseup: 2 };
  samples.sort((a, b) => a.timeMs - b.timeMs || order[a.interactionType] - order[b.interactionType]);
  return { version: 2, samples };
}

// How long a step must stay on screen. Silent: its caption's reading time or
// the minimum step length. Narrated (narrationSec of speech, starting
// pace.voiceLeadMs after the caption): the speech plus the breath, and nothing
// else, since the caption is read along with the voice. The next voice also
// starts voiceLeadMs into its own step, so the silence between two sentences
// is exactly (floor - speech) = breathMs. It is a minimum: time the step
// spends acting counts toward it, so a long action adds no pause on top. The
// fixture paces to it live; keepFloors enforces it on the edit.
export function stepFloorMs(title, pace, narrationSec = 0) {
  if (narrationSec) return narrationSec * 1000 + Math.max(pace.breathMs, pace.voiceLeadMs);
  return Math.max(title.length * pace.msPerChar, pace.minStepMs);
}

// Gives cut time back to any step the cuts would leave shorter than its floor
// (floorOf(step) ms), from its last cut backward: waits the fixture could not
// see (expect, waitForURL, goto) are cut without it adding a hold for them.
// The time restored is the start of each cut's part inside the step, so it
// runs on from what was just shown; nothing before `keepFrom` (the blank
// page before the first paint) is ever restored.
export function keepFloors(steps, cuts, floorOf, keepFrom = 0) {
  const out = cuts.map((c) => [...c]);
  for (const s of steps) {
    let short = floorOf(s) - (remap(s.end, out) - remap(s.start, out));
    for (let i = out.length - 1; i >= 0 && short > 0; i--) {
      const [a, b] = out[i];
      const lo = Math.max(a, s.start, keepFrom);
      const give = Math.min(short, Math.min(b, s.end) - lo);
      if (give <= 0) continue;
      out.splice(i, 1, ...[[a, lo], [lo + give, b]].filter(([x, y]) => y > x));
      short -= give;
    }
  }
  return out;
}

// The optional header condition at the end of an allowWrites rule:
// " [Next-Action=<id>]" or " [header:<name>=<value>]" (group 1: the name, unset
// for Next-Action; group 2: the value). Kept here, in a module with no imports,
// because both the save guard (fixture.mjs) and config validation read it and
// the CLI must not load Playwright just to check a config.
export const RULE_HEADER = / \[(?:Next-Action|header:([!#$%&'*+.^_`|~\w-]+))=([^\]]+)\]$/;
// " [Next-Action-Name=<export>]" or "<file>#<export>": record swaps it for one
// [Next-Action=<id>] rule per id the Next.js build currently has for that action.
export const ACTION_NAME = / \[Next-Action-Name=([^\]]+)\]$/;
