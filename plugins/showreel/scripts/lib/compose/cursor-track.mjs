const smooth = (t) => t * t * (3 - 2 * t);
function latest(samples, t) {
  let lo = 0, hi = samples.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (samples[mid].t <= t) lo = mid + 1; else hi = mid; }
  return lo - 1;
}
export function cursorAt(events, t) {
  const samples = events.cursor;
  if (!samples.length) return { x: events.viewport.width / 2, y: events.viewport.height / 2 };
  const i = latest(samples, t), a = samples[Math.max(0, i)], b = samples[i + 1];
  if (i < 0 || !b) return { x: a.x, y: a.y };
  const f = (t - a.t) / (b.t - a.t);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}
export function pressAmount(events, t) {
  let amount = 1;
  for (const click of events.clicks) {
    const age = t - click.t;
    if (age < 0 || age >= 0.12) continue;
    const scale = age <= 0.045 ? 1 - 0.14 * smooth(age / 0.045) : 0.86 + 0.14 * smooth((age - 0.045) / 0.075);
    amount = Math.min(amount, scale);
  }
  return amount;
}
export function rippleAt(events, t) {
  const c = events.clicks[latest(events.clicks, t)];
  return c && t < c.t + 0.55 ? { x: c.x, y: c.y, progress: (t - c.t) / 0.55 } : null;
}
