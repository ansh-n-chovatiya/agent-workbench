export function localRunId(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function freshBenchmark(value, now = Date.now()) {
  const age = now - Date.parse(value?.at);
  return [1, 1.33, 1.67, 2].includes(value?.scale)
    && age >= 0 && age <= 30 * 86400_000 ? value.scale : undefined;
}

export function scaledViewport(viewport, scale) {
  return { width: Math.round(viewport.width * scale), height: Math.round(viewport.height * scale) };
}

export function emptyEvents(viewport, scale, profile = 'desktop') {
  return {
    version: 1, profile, viewport, scale, steps: [], cursor: [], clicks: [], keys: [],
    targets: [], moves: [], blocked: [], tabs: [],
  };
}

export function blockedSummary(blocked) {
  const counts = new Map();
  for (const { method, url } of blocked) {
    const key = `${method} ${new URL(url).pathname}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([key, count]) => `${key} x${count}`).join(', ');
}
