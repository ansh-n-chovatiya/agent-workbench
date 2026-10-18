import { validateStoryboard } from './storyboard.mjs';
import { sameDocument } from './guide/pure.mjs';
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const nonempty = (v) => typeof v === 'string' && Boolean(v.trim());
const httpURL = (v) => { try { return nonempty(v) && !/\s/.test(v) && ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; } };
// A sensitive value is never stored. A sensitive fill is therefore valid with value null, and is reported as pending: the recorder must
// refuse to start until each pending step has a secret supplied at run time (`secrets` is keyed by step id).
export function validateScenario(sc, { secrets = {} } = {}) {
  const errors = [];
  const pending = [];
  const fail = (key, message) => errors.push(`scenario.json: "${key}" ${message}`);
  if (!object(sc)) return { ok: false, errors: ['scenario.json: "scenario" must be an object'], pending };
  if (!httpURL(sc.baseURL)) fail('baseURL', 'must be an http(s) URL');
  const storyboard = { version: sc.version, title: null, outro: null, steps: Array.isArray(sc.steps) ? sc.steps.map((s) => object(s) ? { ...s, guideSteps: [0] } : s) : sc.steps };
  errors.push(...validateStoryboard(storyboard, { captionsEnabled: false }).errors.map((e) => e.replace('storyboard.json:', 'scenario.json:')));
  for (const [i, step] of (Array.isArray(sc.steps) ? sc.steps : []).entries()) {
    if (!object(step)) continue;
    const prefix = `steps.${i}.actions`;
    if (!Array.isArray(step.actions) || !step.actions.length) { fail(prefix, 'must be a non-empty array'); continue; }
    for (const [j, action] of step.actions.entries()) {
      const key = `${prefix}.${j}`;
      if (!object(action)) { fail(key, 'must be an object'); continue; }
      if (!['goto', 'click', 'fill', 'press', 'wait'].includes(action.type)) fail(`${key}.type`, 'must be goto|click|fill|press|wait');
      if (action.type === 'goto' && !httpURL(action.url)) fail(`${key}.url`, 'must be an http(s) URL');
      if (['click', 'fill', 'press'].includes(action.type)) {
        if (!nonempty(action.selector)) fail(`${key}.selector`, 'must be a non-empty string');
        if (Object.hasOwn(action, 'tab') && (!Number.isInteger(action.tab) || action.tab < 0)) fail(`${key}.tab`, 'must be a non-negative integer');
        if (Object.hasOwn(action, 'frameUrl') && !nonempty(action.frameUrl)) fail(`${key}.frameUrl`, 'must be a non-empty string');
      }
      if (action.type === 'fill') {
        if (Object.hasOwn(action, 'sensitive') && typeof action.sensitive !== 'boolean') fail(`${key}.sensitive`, 'must be true or false');
        if (action.sensitive === true) {
          if (action.value !== null) fail(`${key}.value`, 'must be null for a sensitive field');
          if (secrets[step.id] === undefined) pending.push(`step ${step.id} needs a secret at run time`);
        } else if (typeof action.value !== 'string') fail(`${key}.value`, 'must be a string');
      }
      if (action.type === 'press' && !nonempty(action.key)) fail(`${key}.key`, 'must be a non-empty string');
      if (action.type === 'wait' && (!Number.isFinite(action.ms) || action.ms < 0 || action.ms > 60000)) fail(`${key}.ms`, 'must be a number from 0 to 60000');
    }
  }
  return { ok: !errors.length, errors, pending };
}
export function buildScenario({ brief, storyboard, resolvedGuide }) {
  const validation = validateStoryboard(storyboard, { resolvedGuide });
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  const warnings = [...validation.warnings];
  let previous;
  const steps = storyboard.steps.map(({ guideSteps, ...step }) => {
    const actions = [];
    for (const index of guideSteps) {
      const guide = resolvedGuide.steps[index];
      if (!previous && !guide.url) throw new Error(`step ${step.id}: the first guide step needs a url to open`);
      // A null url continues on the current page; a click that navigates needs no goto of its own.
      if (guide.url && (!previous || (!sameDocument(guide.url, previous.url ?? guide.url) && previous.action !== 'click'))) actions.push({ type: 'goto', url: guide.url });
      if (!['click', 'fill', 'press'].includes(guide.action)) throw new Error(`resolvedGuide.steps.${index}.action must be click|fill|press`);
      const action = { type: guide.action, selector: guide.selector };
      if (guide.action === 'fill') {
        action.value = guide.sensitive ? null : guide.value;
        if (Object.hasOwn(guide, 'sensitive')) action.sensitive = guide.sensitive;
      }
      if (guide.action === 'press') action.key = guide.key;
      // A null frameUrl means the top frame (Auto mode steps carry none), so it is left out instead of copied as null.
      for (const key of ['tab', 'frameUrl']) if (guide[key] != null) action[key] = guide[key];
      actions.push(action);
      if (guide.action === 'fill') actions.push({ type: 'wait', ms: 400 });
      if (guide.action === 'click' && /delete|remove|pay|purchase|buy now|place order|confirm|submit/i.test(guide.name)) warnings.push(`step ${step.id} clicks "${guide.name}", which may write data; writes are blocked during recording unless allowed`);
      previous = guide;
    }
    return { ...step, actions };
  });
  return { scenario: { version: 1, baseURL: brief.baseURL, steps }, warnings };
}
