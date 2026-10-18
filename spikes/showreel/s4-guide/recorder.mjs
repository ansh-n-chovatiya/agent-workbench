// Guide-mode recorder core: capture facts synchronously in the page at event time; resolve uniqueness later (see resolve.mjs).
export async function installRecorder(ctx, steps, log = () => {}) {
  await ctx.exposeBinding('__sr_event', async ({ page }, ev) => { steps.push(ev); log(steps.length, ev.action, ev.name); });
  await ctx.addInitScript(() => {
    const accName = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const role = (el) => el.getAttribute('role') || ({ A: 'link', BUTTON: 'button', INPUT: 'textbox', TEXTAREA: 'textbox', SELECT: 'combobox' })[el.tagName] || '';
    const cssPath = (el) => {
      const parts = [];
      while (el && el.nodeType === 1 && parts.length < 5) {
        let p = el.tagName.toLowerCase();
        if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
        if (!el.parentElement) { parts.unshift(p); break; }   // reached <html>
        const sib = [...el.parentElement.children].filter((s) => s.tagName === el.tagName);
        if (sib.length > 1) p += `:nth-of-type(${sib.indexOf(el) + 1})`;
        parts.unshift(p); el = el.parentElement;
      }
      return parts.join(' > ');
    };
    const candidates = (el) => {
      const out = []; const n = accName(el); const r = role(el);
      const tid = el.getAttribute('data-testid'); if (tid) out.push(`[data-testid="${tid}"]`);
      if (r && n) out.push(`role=${r}[name="${n.replace(/"/g, '\\"')}"i]`);
      if (el.id) out.push('#' + CSS.escape(el.id));
      const lbl = el.getAttribute('aria-label'); if (lbl) out.push(`[aria-label="${lbl}"]`);
      if (n) out.push(`text="${n.replace(/"/g, '\\"')}"`);
      out.push(cssPath(el)); return out;
    };
    const facts = (action, el, extra = {}) => {            // everything the later resolver needs, taken synchronously
      const r = el.getBoundingClientRect();
      return { action, candidates: candidates(el), name: accName(el), role: role(el), tag: el.tagName.toLowerCase(), url: location.href,
        box: { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }, ...extra };
    };
    addEventListener('click', (e) => { const el = e.target.closest('a,button,[role],input,select,textarea,summary,label') || e.target; window.__sr_event(facts('click', el)); }, true);
    addEventListener('change', (e) => { window.__sr_event(facts('fill', e.target, { value: e.target.value })); }, true);
  });
}
