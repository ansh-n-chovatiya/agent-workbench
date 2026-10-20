const clamp = (v, max) => Math.max(0, Math.min(max, v));
export function maxSharpZoom({ sourceWidthPx, frameWidthPx }) {
  if (!(sourceWidthPx > 0) || !(frameWidthPx > 0) || !Number.isFinite(sourceWidthPx + frameWidthPx)) throw new Error('Widths must be finite and positive');
  return Math.max(1, sourceWidthPx / frameWidthPx);
}

export function suggestZoomRegions({ events, record, options = {} }) {
  const { depth = 1.7, kinds = ['click', 'fill'], leadIn = 0.1, holdAfterClick = 0.9,
    holdAfterTyping = 0.6, minGap = 0.8, maxBoxFraction = 0.6 } = options;
  const { width, height } = events.viewport;
  const regions = [];
  for (const target of events.targets) {
    const { box, stepId } = target;
    if (!kinds.includes(target.kind) || box.w * box.h > width * height * maxBoxFraction) continue;
    const click = events.clicks.find((c) => c.stepId === stepId && c.t >= target.t);
    const keys = target.kind === 'fill' ? events.keys.filter((k) => k.stepId === stepId && k.t >= target.t) : [];
    const end = keys.length ? keys.at(-1).t + holdAfterTyping : (click?.t ?? target.t) + holdAfterClick;
    const tStart = clamp(target.t + leadIn, record.durationSec), tEnd = clamp(end, record.durationSec);
    if (tEnd - tStart < 0.4) continue;
    const keyframe = { t: tStart, x: clamp(box.x + box.w / 2, width), y: clamp(box.y + box.h / 2, height) };
    const previous = regions.at(-1);
    if (previous && tStart - previous.tEnd < minGap) {
      previous.tEnd = Math.max(previous.tEnd, tEnd);
      previous.keyframes.push(keyframe);
      if (!previous.stepIds.includes(stepId)) previous.stepIds.push(stepId);
    } else regions.push({ id: `z${regions.length + 1}`, tStart, tEnd, depth, keyframes: [keyframe], stepIds: [stepId], source: 'auto' });
  }
  return regions;
}

export function validateRegions(regions, { duration = Infinity, maxSharp = Infinity } = {}) {
  const errors = [], warnings = [], ids = new Set();
  if (!Array.isArray(regions)) return { ok: false, errors: ['regions must be an array'], warnings };
  regions.forEach((r, i) => {
    const prefix = `regions[${i}]`;
    if (!r || typeof r !== 'object') { errors.push(`${prefix} must be an object`); return; }
    for (const k of Object.keys(r)) if (!['id', 'tStart', 'tEnd', 'depth', 'keyframes', 'stepIds', 'source'].includes(k)) errors.push(`${prefix}.${k} is unknown`);
    if (typeof r.id !== 'string' || !r.id.trim() || ids.has(r.id)) errors.push(`${prefix}.id must be nonempty and unique`);
    ids.add(r.id);
    if (!Number.isFinite(r.tStart) || !Number.isFinite(r.tEnd) || r.tStart < 0 || r.tStart >= r.tEnd || r.tEnd > duration) errors.push(`${prefix} has invalid times`);
    if (i && r.tStart < regions[i - 1]?.tEnd) errors.push(`${prefix} must be sorted and non-overlapping`);
    if (!Number.isFinite(r.depth) || r.depth < 1.05 || r.depth > 5) errors.push(`${prefix}.depth must be from 1.05 to 5`);
    if (r.depth > maxSharp) warnings.push(`region ${r.id} depth ${r.depth} exceeds the sharp limit ${maxSharp}`);
    if (!['auto', 'manual'].includes(r.source)) errors.push(`${prefix}.source must be auto|manual`);
    if (!Array.isArray(r.stepIds) || r.stepIds.some((id) => typeof id !== 'string')) errors.push(`${prefix}.stepIds must be strings`);
    if (!Array.isArray(r.keyframes) || !r.keyframes.length) errors.push(`${prefix}.keyframes must not be empty`);
    else r.keyframes.forEach((k, j) => {
      if (!k || !Number.isFinite(k.t) || k.t < r.tStart || k.t > r.tEnd || (j && k.t < r.keyframes[j - 1]?.t)
        || !Number.isFinite(k.x) || !Number.isFinite(k.y)) errors.push(`${prefix}.keyframes[${j}] is invalid`);
      if (k && Object.keys(k).some((key) => !['t', 'x', 'y'].includes(key))) errors.push(`${prefix}.keyframes[${j}] has an unknown key`);
    });
    if (r.keyframes?.[0]?.t !== r.tStart) errors.push(`${prefix}.keyframes[0].t must equal tStart`);
  });
  return { ok: !errors.length, errors, warnings };
}
