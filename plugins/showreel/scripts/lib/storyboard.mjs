const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function validateStoryboard(sb, { resolvedGuide = null, captionsEnabled = true } = {}) {
  const errors = [], warnings = [];
  const fail = (key, message) => errors.push(`storyboard.json: "${key}" ${message}`);
  if (!object(sb)) return { ok: false, errors: ['storyboard.json: "storyboard" must be an object'], warnings };
  if (sb.version !== 1) fail('version', 'must be 1');
  if (sb.title !== null) {
    if (!object(sb.title)) fail('title', 'must be an object or null');
    else {
      if (!text(sb.title.text, 80)) fail('title.text', 'must be 1 to 80 characters');
      if (sb.title.subtitle !== null && !text(sb.title.subtitle, 80)) fail('title.subtitle', 'must be null or 1 to 80 characters');
    }
  }
  if (sb.outro !== null && (!object(sb.outro) || !text(sb.outro.text, Infinity))) fail('outro.text', 'must be a non-empty string');
  if (!Array.isArray(sb.steps) || !sb.steps.length) fail('steps', 'must contain at least one step');
  const ids = new Set(), used = new Set();
  let previous = -1;
  for (const [i, step] of (Array.isArray(sb.steps) ? sb.steps : []).entries()) {
    const key = `steps.${i}`;
    if (!object(step)) { fail(key, 'must be an object'); continue; }
    if (typeof step.id !== 'string' || !/^s[0-9]+$/.test(step.id)) fail(`${key}.id`, 'must match ^s[0-9]+$');
    if (ids.has(step.id)) fail(`${key}.id`, 'must be unique');
    ids.add(step.id);
    if ((captionsEnabled || step.caption != null) && (!text(step.caption, 70) || /`|>>|role=|#|\[data-/.test(step.caption))) fail(`${key}.caption`, 'must be 1 to 70 characters without selectors, ids or backticks');
    if (step.narration !== null && (!text(step.narration, Infinity) || step.narration.trim().split(/\s+/).length > 45)) fail(`${key}.narration`, 'must be null or a non-empty string of at most 45 words');
    if (!['auto', 'none'].includes(step.zoom)) fail(`${key}.zoom`, 'must be auto|none');
    if (typeof step.highlight !== 'boolean') fail(`${key}.highlight`, 'must be true or false');
    if (step.holdMs !== null && (!Number.isFinite(step.holdMs) || step.holdMs < 0 || step.holdMs > 10000)) fail(`${key}.holdMs`, 'must be null or a number from 0 to 10000');
    if (!Array.isArray(step.guideSteps) || !step.guideSteps.length) { fail(`${key}.guideSteps`, 'must be a non-empty array of non-negative integers'); continue; }
    for (const [j, index] of step.guideSteps.entries()) {
      const at = `${key}.guideSteps.${j}`;
      if (!Number.isInteger(index) || index < 0) { fail(at, 'must be a non-negative integer'); continue; }
      if (resolvedGuide) {
        if (!Object.hasOwn(resolvedGuide.steps, index)) fail(at, `index ${index} does not exist in resolvedGuide.steps`);
        if (used.has(index)) fail(at, `index ${index} is already used`);
        if (index < previous) fail(at, 'indexes must be ascending across the storyboard');
        previous = index;
      }
      used.add(index);
    }
  }
  if (resolvedGuide) for (let i = 0; i < resolvedGuide.steps.length; i++) if (!used.has(i)) warnings.push(`resolvedGuide.steps.${i} is not referenced`);
  return { ok: !errors.length, errors, warnings };
}
function captionFor(step) {
  const verb = step.action === 'fill' ? 'Enter' : step.action === 'press' ? 'Press' : step.role === 'link' ? 'Open' : ['tab', 'radio', 'checkbox'].includes(step.role) ? 'Select' : 'Press';
  // Names are page content, so remove selector-like fragments before drafting prose.
  const name = String(step.name ?? '').replace(/\[data-[^\s]*/g, '').replace(/role=|>>|`|#/g, '').replace(/\s+/g, ' ').trim();
  const caption = `${verb}${name ? ` ${name}` : ' field'}`;
  if (caption.length <= 70) return caption;
  const cut = caption.slice(0, 71);
  return cut.slice(0, cut.lastIndexOf(' ')).trimEnd();
}
export function draftFromGuide(resolvedGuide) {
  if (!Array.isArray(resolvedGuide?.steps) || !resolvedGuide.steps.length) throw new Error('resolvedGuide.steps must contain at least one step');
  return { version: 1, title: null, steps: resolvedGuide.steps.map((step, index) => ({ id: `s${index + 1}`, caption: captionFor(step), narration: null, guideSteps: [index], zoom: 'auto', highlight: false, holdMs: null })), outro: null };
}
