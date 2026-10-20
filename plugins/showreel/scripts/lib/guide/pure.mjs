export function orderedCandidates({ testId, role, name, scopeSelector, id, ariaLabel, css }) {
  const quote = (value) => JSON.stringify(value);
  const roleSelector = role && name ? `role=${role}[name=${quote(name)}i]` : null;
  const textSelector = name ? `text=${quote(name)}` : null;
  return [
    testId && `[data-testid=${quote(testId)}]`,
    roleSelector,
    scopeSelector && roleSelector && `${scopeSelector} >> ${roleSelector}`,
    id && `#${id}`,
    ariaLabel && `[aria-label=${quote(ariaLabel)}]`,
    textSelector,
    scopeSelector && textSelector && `${scopeSelector} >> ${textSelector}`,
    css,
  ].filter(Boolean);
}

export function pickNearestBox(recorded, boxes, limit = 40) {
  if (!recorded) return -1;
  let best = -1;
  let distance = Infinity;
  for (const [index, box] of boxes.entries()) {
    if (!box) continue;
    const d = Math.hypot(
      box.x + box.w / 2 - recorded.x - recorded.w / 2,
      box.y + box.h / 2 - recorded.y - recorded.h / 2,
    );
    if (d <= limit && d < distance) { best = index; distance = d; }
  }
  return best;
}

// Copy only pipeline facts; page content must never invent captions or retain secrets.
export function formatResolvedStep(step, i, selector, how) {
  const out = { i, action: step.action, selector, how };
  for (const key of ['name', 'role', 'url', 'tab', 'frameUrl', 'sensitive', 'scope', 'secretEnv', 'deltaY', 'ms']) {
    if (Object.hasOwn(step, key)) out[key] = step[key];
  }
  if (step.action === 'fill' && !step.sensitive) out.value = step.value;
  if (step.action === 'press') out.key = step.key;
  return out;
}

function parseSingleGuideAdd(flags) {
  const allowed = ['name', 'action', 'selector', 'label', 'role', 'url', 'value', 'key', 'tab'];
  const options = {};
  for (let i = 0; i < flags.length; i += 2) {
    const key = flags[i].replace(/^--/, '');
    if (flags[i] !== `--${key}` || !allowed.includes(key) || Object.hasOwn(options, key)) {
      throw new Error(`Invalid option: ${flags[i]}`);
    }
    if (flags[i + 1] === undefined || flags[i + 1].startsWith('--')) {
      throw new Error(`Missing value for ${flags[i]}`);
    }
    options[key] = flags[i + 1];
  }
  for (const key of ['name', 'action', 'selector', 'label']) {
    if (!options[key]?.trim()) throw new Error(`--${key} is required`);
  }
  if (!['click', 'fill', 'press'].includes(options.action)) {
    throw new Error('--action must be click|fill|press');
  }
  if (options.action === 'fill' && options.value === undefined) throw new Error('fill needs --value');
  if (options.action === 'press' && !options.key?.trim()) throw new Error('press needs --key');
  if (options.tab !== undefined && !/^\d+$/.test(options.tab)) {
    throw new Error('--tab must be a non-negative integer');
  }
  options.tab = Number(options.tab ?? 0);
  if (!Number.isSafeInteger(options.tab)) throw new Error('--tab must be a non-negative integer');
  return options;
}

// Two URLs name the same document when origin, path and query match; the hash and a trailing slash do not matter. Anchor links change
// only the hash, and treating that as a different page made the resolver reload the site on every step.
export function sameDocument(a, b) {
  try {
    const x = new URL(a), y = new URL(b);
    const path = (u) => u.pathname.replace(/\/+$/, '') || '/';
    return x.origin === y.origin && path(x) === path(y) && x.search === y.search;
  } catch { return false; }
}

export const GUIDE_ADD_USAGE = 'Usage: showreel guide add --name N (--json ARRAY | --file FILE | --action click|fill|press --selector SELECTOR --label LABEL)';
export const GUIDE_ADD_EXAMPLE = "Example: showreel guide add --name demo --json '[{\"action\":\"click\",\"selector\":\"text=Features\",\"label\":\"Features\"}]'";
export function parseGuideAdd(flags) {
  try { return parseSingleGuideAdd(flags); }
  catch (error) { throw new Error(error.message + '\n' + GUIDE_ADD_USAGE + '\n' + GUIDE_ADD_EXAMPLE); }
}
