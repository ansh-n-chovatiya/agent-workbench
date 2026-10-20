import { DEFAULT_BRIEF, validateBrief } from './brief.mjs';
import { orderedCandidates } from './guide/pure.mjs';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' && Boolean(v.trim());
export const MINIMAL_PLAN = { url: 'http://localhost:3000', topic: 'Demo', steps: [{ caption: 'Open the app', do: [{ goto: '/' }] }] };
export function validatePlan(plan) {
  const errors = [];
  const fail = (at, fix) => errors.push(`${at}: ${fix}`);
  const keys = (v, allowed, at) => { if (object(v)) for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${at}.${k}`, 'remove this unknown key'); };
  const url = (v, base) => { try { return text(v) && !/\s/.test(v) && ['http:', 'https:'].includes(new URL(v, base).protocol); } catch { return false; } };
  if (!object(plan)) fail('plan', 'use a JSON object');
  else {
    keys(plan, ['url','topic','audience','theme','profile','brief','captions','voice','steps'], 'plan');
    if (!url(plan.url)) fail('url', 'set an absolute http(s) URL');
    if (!text(plan.topic) || plan.topic.length > 200) fail('topic', 'set 1 to 200 characters');
    if (plan.audience !== undefined && !text(plan.audience)) fail('audience', 'set a non-empty string');
    if (plan.theme !== undefined && !['clean','dark','bold'].includes(plan.theme)) fail('theme', 'use clean|dark|bold');
    if (plan.profile !== undefined && !['desktop','phone'].includes(plan.profile)) fail('profile', 'use desktop|phone');
    for (const key of ['captions', 'voice']) {
      if (plan[key] !== undefined && typeof plan[key] !== 'boolean') fail(key, 'use true|false');
    }
    if (!Array.isArray(plan.steps) || !plan.steps.length) fail('steps', 'provide at least one step');
    for (const [i, s] of (Array.isArray(plan.steps) ? plan.steps : []).entries()) {
      const at = `steps[${i}]`;
      if (!object(s)) { fail(at, 'use an object with caption and do'); continue; }
      keys(s, ['caption','narration','do'], at);
      if (!text(s.caption) || s.caption.length > 70 || /`|>>|role=|#|\[data-/.test(s.caption)) fail(at + '.caption', 'set 1 to 70 plain-language characters without selectors');
      if (s.narration !== undefined && (!text(s.narration) || s.narration.trim().split(/\s+/).length > 45)) fail(at + '.narration', 'set a non-empty string of at most 45 words, or omit');
      if (!Array.isArray(s.do) || !s.do.length) fail(at + '.do', 'provide at least one action');
      for (const [j, a] of (Array.isArray(s.do) ? s.do : []).entries()) {
        const p = at + `.do[${j}]`;
        if (!object(a) || Object.keys(a).length !== 1 || !['goto','click','fill','scroll','wait','press'].includes(Object.keys(a)[0])) { fail(p, 'use exactly one of goto|click|fill|scroll|wait|press'); continue; }
        const [k, v] = Object.entries(a)[0];
        if (k === 'goto' && !url(v, plan.url)) fail(p + '.goto', 'set an http(s) URL or a path relative to url');
        if (k === 'click') {
          if (!text(v) && !(object(v) && text(v.role) && ROLES.includes(v.role) && text(v.name))) fail(p + '.click', 'set visible text or { "role": "button", "name": "Visible name" } (use a supported ARIA role)');
          if (object(v)) keys(v, ['role','name'], p + '.click');
        }
        if (k === 'fill') {
          if (!object(v) || !text(v.label)) fail(p + '.fill.label', 'set the visible field label');
          if (!object(v) || !(typeof v.value === 'string' || (object(v.value) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(v.value.secret) && Object.keys(v.value).length === 1))) fail(p + '.fill.value', 'set a string or { "secret": "ENV_NAME" }');
          keys(v, ['label','value'], p + '.fill');
        }
        if (k === 'scroll' && (!Number.isFinite(v) || Math.abs(v) > 100000)) fail(p + '.scroll', 'set a finite pixel count between -100000 and 100000');
        if (k === 'wait' && (!Number.isFinite(v) || v < 0 || v > 60000)) fail(p + '.wait', 'set milliseconds from 0 to 60000');
        if (k === 'press' && !text(v)) fail(p + '.press', 'set a key such as Enter');
      }
    }
  }
  return { ok: !errors.length, errors };
}
export function assertPlan(plan) {
  const v = validatePlan(plan);
  if (!v.ok) throw new Error(`Invalid plan:\n${v.errors.join('\n')}\nMinimal valid example:\n${JSON.stringify(MINIMAL_PLAN)}`);
  return plan;
}
export const ROLES = ['button','link','tab','checkbox','radio','menuitem','option','combobox','textbox','switch','treeitem','slider','spinbutton','searchbox','menuitemcheckbox','menuitemradio'];
export function briefFromPlan(plan, warn = () => {}) {
  const brief = structuredClone(DEFAULT_BRIEF);
  brief.voice.enabled = false;
  const ignored = (key, reason) => warn(`ignored plan field brief.${key}: ${reason}`);
  if (plan.brief !== undefined && !object(plan.brief)) ignored('*', 'must be an object');
  for (const [key, raw] of Object.entries(object(plan.brief) ? plan.brief : {})) {
    if (key === 'version' || !Object.hasOwn(DEFAULT_BRIEF, key)) {
      ignored(key, 'is an unknown plan answer'); continue;
    }
    let value = raw;
    if (['captions', 'voice'].includes(key) && typeof raw === 'boolean') {
      ignored(key, `expected an object; using ${key}.enabled=${raw}`);
      value = { enabled: raw };
    }
    const candidate = structuredClone(brief);
    candidate[key] = object(value) && object(candidate[key]) ? { ...candidate[key], ...value } : value;
    const validation = validateBrief(candidate);
    if (!validation.ok) {
      ignored(key, validation.errors.join('; ')); continue;
    }
    brief[key] = candidate[key];
  }
  brief.baseURL = plan.url; brief.topic ??= plan.topic;
  brief.audience ??= plan.audience ?? null;
  brief.flowMode = 'auto'; brief.theme = plan.theme ?? brief.theme;
  for (const key of ['captions', 'voice']) {
    if (typeof plan[key] === 'boolean') brief[key].enabled = plan[key];
  }
  return brief;
}
export function guideFromPlan(plan, profile = 'desktop') {
  const guide = { version: 1, url: plan.url, viewport: profile === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 900 }, steps: [] };
  const groups = [];
  for (const step of plan.steps) {
    const indexes = [];
    for (const a of step.do) {
      const [action, value] = Object.entries(a)[0];
      const g = { action, url: guide.steps.length ? null : plan.url, isTopFrame: true, frameUrl: null, tab: 0, box: null, sensitive: false, candidates: [], name: '', role: '' };
      if (action === 'click') {
        g.name = typeof value === 'string' ? value : value.name;
        g.role = typeof value === 'string' ? '' : value.role;
        g.candidates = g.role ? orderedCandidates(g) : [...ROLES.map(role => orderedCandidates({ role, name: g.name })[0]), ...orderedCandidates(g)];
      }
      if (action === 'fill') {
        g.name = value.label;
        g.candidates = [`internal:label=${JSON.stringify(value.label)}s`];
        g.sensitive = object(value.value);
        g.value = g.sensitive ? null : value.value;
        if (g.sensitive) g.secretEnv = value.value.secret;
      }
      if (action === 'goto') g.url = new URL(value, plan.url).href;
      if (action === 'scroll') g.deltaY = value;
      if (action === 'wait') g.ms = value;
      if (action === 'press') { g.key = value; g.candidates = [':focus', 'body']; }
      indexes.push(guide.steps.length); guide.steps.push(g);
    }
    groups.push(indexes);
  }
  return { guide, groups };
}
