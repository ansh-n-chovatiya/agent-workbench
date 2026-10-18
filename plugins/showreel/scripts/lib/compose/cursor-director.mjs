import { cursorAt } from './cursor-track.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// All times and positions stay in the recording's clock and CSS coordinate space.
export function directCursor({ events, options = {} }) {
  const o = { autoShape: true, microCorrection: true, entrance: true, hideWhenIdleSec: 1.8, ...options };
  const follow = { enabled: true, distancePx: 140, durationSec: 0.8, startAfterClickSec: 0.35, ...options.followThrough };
  const original = events.cursor ?? [], clicks = events.clicks ?? [], keys = events.keys ?? [];
  const at = (t) => cursorAt({ ...events, cursor: original }, t);
  const latest = (list, time, extra = 0) => list.reduce((end, item) => Math.max(end, item[time] + extra), 0);
  const duration = options.durationSec ?? Math.max(latest(original, 't'), latest(clicks, 't', 4), latest(keys, 't', 2), latest(events.steps ?? [], 'tEnd'));
  const moves = [];
  for (let i = 1; i < original.length; i++) {
    const a = original[i - 1], b = original[i];
    if (distance(a, b) < 1e-7) continue;
    const previous = moves.at(-1);
    if (previous && previous.end === a.t) previous.end = b.t;
    else moves.push({ start: a.t, end: b.t });
  }
  const firstMove = moves[0]?.start ?? original[0]?.t ?? 0;
  const targets = (events.targets ?? []).map((target, i, all) => {
    const end = all[i + 1]?.t ?? duration;
    const click = clicks.find((c) => c.stepId === target.stepId && c.t >= target.t && c.t < end);
    const typing = keys.filter((k) => k.stepId === target.stepId && k.t >= target.t && k.t < end);
    const shape = target.cursor !== undefined ? (target.cursor === 'pointer' ? 'hand' : target.cursor === 'text' ? 'text' : 'arrow')
      : ({ click: 'hand', fill: 'text' }[target.kind] ?? 'arrow');
    const point = click ?? { x: target.box.x + target.box.w / 2, y: target.box.y + target.box.h / 2 };
    return { ...target, shape, point, click, typing, end: shape === 'text' && typing.length ? typing.at(-1).t + 0.8 : (click?.t ?? target.t) + 0.35 };
  });
  // A fill's count-only key event is recorded at completion; protect the whole fill.
  const protectedTimes = [
    ...clicks.map((c) => ({ start: c.t - 1, end: c.t + 1 })),
    ...keys.map((k) => ({ start: k.t - 0.5, end: k.t + 0.5 })),
    ...targets.filter((t) => t.kind === 'fill' && t.typing.length).map((t) => ({ start: t.click?.t ?? t.t, end: t.typing.at(-1).t + 0.5 })),
  ];
  const drifts = follow.enabled ? clicks.flatMap((c, index) => {
    const next = Math.min(moves.find((m) => m.start > c.t)?.start ?? duration + 0.15,
      clicks[index + 1] ? clicks[index + 1].t - 0.22 : Infinity);
    const start = c.t + follow.startAfterClickSec;
    if (next - c.t < follow.startAfterClickSec + 0.2) return [];
    const end = Math.min(start + follow.durationSec, next - 0.15);
    if (end <= start) return [];
    const motion = moves.filter((m) => m.end <= c.t).at(-1);
    const a = motion ? at(Math.max(motion.start, motion.end - 0.1)) : c;
    const b = motion ? at(motion.end) : { x: c.x + 1, y: c.y + 1 };
    const length = distance(a, b);
    const dx = length > 1e-7 ? (b.x - a.x) / length : Math.SQRT1_2;
    const dy = length > 1e-7 ? (b.y - a.y) / length : Math.SQRT1_2;
    const fraction = Math.min(1, (end - start) / follow.durationSec);
    const marginX = Math.min(24, events.viewport.width / 2), marginY = Math.min(24, events.viewport.height / 2);
    const to = { x: clamp(c.x + dx * follow.distancePx * fraction, marginX, events.viewport.width - marginX),
      y: clamp(c.y + dy * follow.distancePx * fraction, marginY, events.viewport.height - marginY) };
    return [{ start, end, next, from: c, to }];
  }) : [];
  function position(t) {
    let p = at(t);
    const drift = drifts.findLast((d) => t >= d.start && t < d.next);
    if (drift) {
      if (t <= drift.end) p = mix(drift.from, drift.to, 1 - (1 - (t - drift.start) / (drift.end - drift.start)) ** 3);
      else {
        const age = t - drift.end;
        // Fixed phases; subtract the initial sine to keep the hold continuous.
        const float = (hz, phase) => 0.75 * (Math.sin(age * 2 * Math.PI * hz + phase) - Math.sin(phase));
        p = { x: drift.to.x + float(0.35, 0.73), y: drift.to.y + float(0.55, 1.91) };
        p.x = clamp(p.x, Math.min(24, events.viewport.width / 2), events.viewport.width - Math.min(24, events.viewport.width / 2));
        p.y = clamp(p.y, Math.min(24, events.viewport.height / 2), events.viewport.height - Math.min(24, events.viewport.height / 2));
        if (t > drift.next - 0.15) p = mix(p, at(drift.next), smooth((t - drift.next + 0.15) / 0.15));
      }
    }
    if (o.microCorrection) {
      const c = clicks.find((c) => t >= c.t - 0.22 && t <= c.t);
      if (c) {
        const a = at(c.t - 0.22);
        const motion = moves.filter((m) => m.end <= c.t).at(-1);
        const before = motion ? at(Math.max(motion.start, motion.end - 0.1)) : { x: c.x - 1, y: c.y - 1 };
        const n = distance(before, c);
        const short = { x: c.x - 5 * (n > 1e-7 ? (c.x - before.x) / n : Math.SQRT1_2),
          y: c.y - 5 * (n > 1e-7 ? (c.y - before.y) / n : Math.SQRT1_2) };
        const f = (t - c.t + 0.22) / 0.22;
        p = f < 0.5 ? mix(a, short, smooth(f * 2)) : mix(short, c, smooth(f * 2 - 1));
      }
    }
    return p;
  }
  const activity = [
    ...moves.map((m) => ({ start: m.start, end: m.end, wake: 0.15 })),
    ...drifts.map((d) => ({ start: d.start, end: d.end, wake: 0.15 })),
    ...protectedTimes.map((p) => ({ ...p, wake: 0.25 })),
  ].sort((a, b) => a.start - b.start);
  const busy = [];
  for (const interval of activity) {
    const previous = busy.at(-1);
    if (previous && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end);
    else busy.push({ ...interval });
  }
  function opacity(t) {
    const entrance = o.entrance ? clamp((t - firstMove + 0.4) / 0.3, 0, 1) : 1;
    if (!o.hideWhenIdleSec) return entrance;
    let idle = 1, previousEnd = 0;
    for (const interval of [...busy, { start: Infinity, end: Infinity, wake: 0.15 }]) {
      if (t < interval.start + 0.25 - interval.wake) {
        const faded = 1 - clamp((t - previousEnd - o.hideWhenIdleSec) / 0.4, 0, 1);
        const wake = clamp((t - interval.start + interval.wake) / 0.25, 0, 1);
        idle = Math.max(faded, wake);
        break;
      }
      if (t <= interval.end) break;
      previousEnd = interval.end;
    }
    return Math.min(entrance, idle);
  }
  const disabled = !o.autoShape && !follow.enabled && !o.microCorrection && !o.entrance && !o.hideWhenIdleSec;
  if (disabled) return { samples: original.map((s) => ({ ...s })), shapes: [{ t: 0, shape: 'arrow' }], alpha: [{ t: 0, a: 1 }] };
  // Include event boundaries as well as the 60 Hz grid to preserve exact click hits.
  const times = new Set([0, duration, ...clicks.map((c) => c.t)]);
  for (let i = 0; i / 60 < duration; i++) times.add(i / 60);
  const samples = [], shapes = [{ t: 0, shape: 'arrow' }], alpha = [];
  for (const t of [...times].filter((t) => t >= 0 && t <= duration).sort((a, b) => a - b)) {
    const p = position(t); samples.push({ t, ...p }); alpha.push({ t, a: opacity(t) });
    const target = o.autoShape && targets.findLast((target) => t >= target.t && t <= target.end && (t >= (target.click?.t ?? Infinity) || distance(p, target.point) <= 24));
    const shape = target?.shape ?? 'arrow';
    if (shape !== shapes.at(-1).shape) shapes.push({ t, shape });
  }
  return { samples, shapes, alpha };
}
