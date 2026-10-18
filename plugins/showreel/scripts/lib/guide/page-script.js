// This body is wrapped with the pure candidate formatter before being installed in every frame.
const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();
const labelled = (el) => clean((el.getAttribute('aria-labelledby') || '').split(/\s+/)
  .map((id) => document.getElementById(id)?.textContent || '').join(' '));
function elementName(el) {
  const labels = el.labels ? [...el.labels].map((label) => label.textContent).join(' ') : '';
  return clean(el.getAttribute('aria-label') || labelled(el) || labels || el.innerText
    || el.getAttribute('title') || el.getAttribute('placeholder')).slice(0, 60);
}
function elementRole(el) {
  if (el.getAttribute('role')) return el.getAttribute('role');
  if (el.tagName === 'INPUT') {
    if (['checkbox', 'radio'].includes(el.type)) return el.type;
    if (['button', 'submit', 'reset'].includes(el.type)) return 'button';
    return 'textbox';
  }
  return { A: 'link', BUTTON: 'button', TEXTAREA: 'textbox', SELECT: 'combobox', SUMMARY: 'button' }[el.tagName] || '';
}
function cssPath(el) {
  const parts = [];
  while (el && parts.length < 5) {
    let part = el.tagName.toLowerCase();
    if (el.id) { parts.unshift(`#${CSS.escape(el.id)}`); break; }
    // html has no parent: shallow documents must still produce a valid fallback.
    if (!el.parentElement) { parts.unshift(part); break; }
    const siblings = [...el.parentElement.children].filter((sibling) => sibling.tagName === el.tagName);
    if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(el) + 1})`;
    parts.unshift(part);
    el = el.parentElement;
  }
  return parts.join(' > ');
}
function findScope(el) {
  let ancestor = el.parentElement;
  for (let depth = 0; ancestor && depth < 6; depth++, ancestor = ancestor.parentElement) {
    const heading = ancestor.querySelector('h1,h2,h3,h4,h5,h6');
    const label = ancestor.getAttribute('aria-label') || labelled(ancestor);
    if (!heading && !label) continue;
    const name = clean(heading?.textContent || label);
    if (!name || name.length > 60) return { scope: null, scopeSelector: null };
    const tag = ancestor.tagName.toLowerCase();
    let scopeSelector;
    if (heading) {
      scopeSelector = `${tag}:has(:is(h1,h2,h3,h4,h5,h6):text-is(${JSON.stringify(name)}))`;
    } else if (ancestor.hasAttribute('aria-label')) {
      scopeSelector = `${tag}[aria-label=${JSON.stringify(ancestor.getAttribute('aria-label'))}]`;
    } else {
      scopeSelector = `${tag}[aria-labelledby=${JSON.stringify(ancestor.getAttribute('aria-labelledby'))}]`;
    }
    return { scope: name, scopeSelector };
  }
  return { scope: null, scopeSelector: null };
}
function facts(action, el) {
  const rect = el.getBoundingClientRect();
  const { scope, scopeSelector } = findScope(el);
  const name = elementName(el);
  const role = elementRole(el);
  const sensitive = el.matches('input[type="password" i]')
    || (el.getAttribute('autocomplete') || '').toLowerCase().startsWith('cc-');
  const candidates = orderedCandidates({
    testId: el.getAttribute('data-testid'), role, name, scopeSelector,
    id: el.id && CSS.escape(el.id), ariaLabel: el.getAttribute('aria-label'), css: cssPath(el),
  });
  const step = {
    action, candidates, name, role, tag: el.tagName.toLowerCase(), url: location.href,
    frameUrl: location.href, isTopFrame: window === window.top,
    box: { x: rect.x + scrollX, y: rect.y + scrollY, w: rect.width, h: rect.height },
    scope, sensitive, ts: Date.now(),
  };
  // Do not even read sensitive values, including when formatting snapshots.
  if (action === 'fill' && !sensitive) step.value = el.value;
  if (action === 'press') step.key = 'Enter';
  return step;
}
window.__sr_facts = facts;
const pending = new Set();
function emit(step) {
  if (!window.__sr_event) return;
  const promise = window.__sr_event(step);
  pending.add(promise);
  promise.catch(() => {}).finally(() => pending.delete(promise));
}
window.__sr_drain = () => Promise.allSettled([...pending]);
addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : event.target.parentElement;
  const el = target?.closest('a,button,[role],input,select,textarea,summary,label') || target;
  if (el) emit(facts('click', el));
}, true);
addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('input:not([type=checkbox]):not([type=radio]),textarea,select')) emit(facts('fill', el));
}, true);
addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('input,textarea')) emit(facts('press', event.target));
}, true);
