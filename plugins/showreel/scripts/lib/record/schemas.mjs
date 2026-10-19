const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && Boolean(value.trim());
const number = (value) => Number.isFinite(value);
const nonnegative = (value) => number(value) && value >= 0;
const positive = (value) => number(value) && value > 0;
const integer = (value) => Number.isInteger(value) && value >= 0;
const dimension = (value) => Number.isInteger(value) && value > 0;
const scale = (value) => number(value) && value >= 1 && value <= 2;
const requested = (value) => ['auto', 1, 1.33, 1.67, 2].includes(value);
const profile = (value) => value === undefined || ['desktop', 'phone'].includes(value);
const boolean = (value) => typeof value === 'boolean';
function iso(value) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)
    || !Number.isFinite(Date.parse(value))) return false;
  // Date.parse normalizes dates such as February 30 instead of rejecting them.
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function validator(label) {
  const errors = [];
  const fail = (key, message) => errors.push(`${label}: "${key}" ${message}`);
  function fields(value, key, checks) {
    if (!object(value)) { fail(key, 'must be an object'); return false; }
    for (const [name, check] of Object.entries(checks)) {
      if (!check(value[name])) fail(key ? `${key}.${name}` : name, 'is invalid');
    }
    return true;
  }
  function array(value, key, visit) {
    if (!Array.isArray(value)) { fail(key, 'must be an array'); return; }
    for (const [index, entry] of value.entries()) visit(entry, `${key}.${index}`);
  }
  function ordered(value, key, checks, times = ['t'], visit = () => {}) {
    const previous = {};
    array(value, key, (entry, prefix) => {
      if (!fields(entry, prefix, checks)) return;
      for (const time of times) {
        if (!nonnegative(entry[time])) continue;
        if (entry[time] < previous[time]) fail(`${prefix}.${time}`, 'must be non-decreasing');
        previous[time] = entry[time];
      }
      visit(entry, prefix);
    });
  }
  return { fail, fields, array, ordered, result: () => ({ ok: !errors.length, errors }) };
}

export function validateEvents(events) {
  const v = validator('events.json');
  if (!v.fields(events, '', { version: (value) => value === 1, scale, profile })) return v.result();
  v.fields(events.viewport, 'viewport', { width: dimension, height: dimension });
  const ids = new Set();
  v.ordered(events.steps, 'steps', {
    id: text, tStart: nonnegative, tEnd: nonnegative, holdStart: nonnegative,
  }, ['tStart', 'holdStart', 'tEnd'], (step, key) => {
    if (ids.has(step.id)) v.fail(`${key}.id`, 'must be unique');
    ids.add(step.id);
    if (step.tStart > step.holdStart || step.holdStart > step.tEnd) {
      v.fail(key, 'must have tStart <= holdStart <= tEnd');
    }
  });
  const position = { t: nonnegative, x: number, y: number };
  v.ordered(events.cursor, 'cursor', position);
  v.ordered(events.clicks, 'clicks', { ...position, stepId: text, tab: integer,
    kind: (value) => value === undefined || ['click', 'tap'].includes(value) }, ['t'], (entry, key) => {
      if (events.profile === 'phone' && entry.kind !== 'tap') v.fail(`${key}.kind`, 'must be tap for phone recordings');
    });
  v.ordered(events.keys, 'keys', { t: nonnegative, stepId: text, count: integer }, ['t'], (entry, key) => {
    // Only counts belong in this file; unknown payloads can leak typed secrets.
    for (const name of Object.keys(entry)) {
      if (!['t', 'stepId', 'count'].includes(name)) v.fail(`${key}.${name}`, 'is not allowed in keys');
    }
  });
  v.ordered(events.targets, 'targets', {
    stepId: text, t: nonnegative,
    kind: (value) => ['click', 'fill', 'press'].includes(value), sensitive: boolean,
  }, ['t'], (entry, key) => {
    if (entry.cursor !== undefined && typeof entry.cursor !== 'string') v.fail(`${key}.cursor`, 'must be a string');
    v.fields(entry.box, `${key}.box`, { x: number, y: number, w: positive, h: positive });
  });
  v.ordered(events.moves, 'moves', position);
  v.ordered(events.blocked, 'blocked', { t: nonnegative, method: text, url: text });
  v.ordered(events.tabs, 'tabs', { t: nonnegative, index: integer, url: text });
  return v.result();
}

export function validateRecord(record) {
  const v = validator('record.json');
  if (!v.fields(record, '', {
    version: (value) => value === 1, projectName: text, runId: text,
    profile, startedAt: iso, durationSec: nonnegative,
  })) return v.result();
  v.fields(record.scale, 'scale', { requested, used: scale, reason: text });
  v.fields(record.fps, 'fps', {
    nominal: positive, effective: nonnegative, dropped: integer, maxBacklog: integer,
  });
  v.fields(record.video, 'video', {
    file: text, width: dimension, height: dimension, durationSec: nonnegative, bytes: integer,
  });
  v.array(record.warnings, 'warnings', (warning, key) => {
    if (typeof warning !== 'string') v.fail(key, 'must be a string');
  });
  return v.result();
}
