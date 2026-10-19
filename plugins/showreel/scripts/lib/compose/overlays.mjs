import { TEMPLATES, validateParams, resolveParams, POSITIONS } from './templates/index.mjs';
import { enterExit, DURATIONS } from './easing.mjs';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export function validateOverlays(overlays, { duration = Number.MAX_VALUE, storyboard = false, path = 'overlays' } = {}) {
  const errors = [], ids = new Set();
  if (!Array.isArray(overlays) || overlays.length > 100) return [`${path} must be an array of at most 100 overlays`];
  overlays.forEach((o,i) => {
    const p = `${path}.${i}`, fail = (field,message) => errors.push(`${p}${field ? '.'+field : ''} ${message}`);
    if (!object(o)) { fail('', 'must be an object'); return; }
    const allowed = storyboard ? ['template','params','at','duration'] : ['id','template','start','end','params','anchor','label'];
    for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(k,'is unknown');
    if (!storyboard) {
      if (typeof o.id !== 'string' || !o.id.trim() || o.id.length > 100) fail('id','must contain 1 to 100 characters');
      if (ids.has(o.id)) fail('id','must be unique'); ids.add(o.id);
      for (const k of ['start','end']) if (!Number.isFinite(o[k]) || o[k] < 0 || o[k] > duration) fail(k,'must be a source time within the recording');
      if (Number.isFinite(o.start) && Number.isFinite(o.end) && o.end <= o.start) fail('end','must be after start');
      if (o.anchor !== undefined && !POSITIONS.includes(o.anchor)) fail('anchor','must be a named position');
      if (o.label !== undefined && (typeof o.label !== 'string' || o.label.length > 140)) fail('label','must be text up to 140 characters');
    } else {
      if (o.at !== undefined && !['start','end'].includes(o.at) && (!Number.isFinite(o.at) || o.at < 0)) fail('at','must be start, end or a nonnegative number of seconds');
      if (o.duration !== undefined && (!Number.isFinite(o.duration) || o.duration <= 0 || o.duration > 300)) fail('duration','must be greater than 0 and at most 300 seconds');
    }
    const template = Object.hasOwn(TEMPLATES,o.template) ? TEMPLATES[o.template] : null;
    if (!template) fail('template','must name an available template');
    else errors.push(...validateParams(template,o.params,`${p}.params`));
  });
  return errors;
}
// Intersect with every kept interval, rather than mapping endpoints that may be trimmed.
// A hold belongs only to an overlay whose interior spans its source time.
export function planOverlays(overlays, timemap) {
  const result = [], notices = [];
  for (const o of overlays) {
    const spans = timemap.segments.flatMap(s => {
      if (s.rate === 0) return o.start < s.start && o.end > s.start ? [[s.outputStart,s.outputEnd]] : [];
      const start = Math.max(o.start,s.start), end = Math.min(o.end,s.end);
      return end > start ? [[s.outputStart+(start-s.start)/s.rate,s.outputStart+(end-s.start)/s.rate]] : [];
    });
    if (!spans.length) { notices.push(`Overlay "${o.id}" is entirely inside a cut and was dropped.`); continue; }
    result.push({ id:o.id, template:o.template, outStart:Math.min(...spans.map(s=>s[0])), outEnd:Math.max(...spans.map(s=>s[1])),
      params:resolveParams(TEMPLATES[o.template],o.params), ...(o.anchor ? { anchor:o.anchor } : {}) });
  }
  return { overlays:result, notices };
}
export function overlayStates(overlays, t, pace = 1) {
  return overlays.flatMap(o => {
    const state = enterExit(t,o.outStart,o.outEnd,{enter:DURATIONS.enter*pace,exit:DURATIONS.exit*pace});
    return state.phase === 'off' ? [] : [{ id:o.id,template:o.template,...state,params:o.params }];
  });
}
export function storyboardOverlays(storyboard, events) {
  return (storyboard?.steps ?? []).flatMap(step => {
    const span = events.steps?.find(s=>s.id===step.id);
    if (!span) return [];
    const errors = validateOverlays(step.overlays ?? [], {storyboard:true,path:`step ${step.id} overlays`});
    if (errors.length) throw new Error(errors.join('\n'));
    return (step.overlays ?? []).map((o,i) => {
      const duration = o.duration ?? TEMPLATES[o.template].defaultDuration;
      const start = o.at === 'end' ? Math.max(span.tStart,span.tEnd-duration) : span.tStart+(o.at === 'start' ? 0 : o.at ?? 0.3);
      const end = Math.min(span.tEnd,start+duration);
      if (start >= end) throw new Error(`Step ${step.id} overlay ${i} starts after the step ends`);
      return {id:`${step.id}-overlay-${i+1}`,template:o.template,start,end,params:o.params ?? {}};
    });
  });
}
