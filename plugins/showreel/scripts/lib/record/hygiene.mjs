export const ACCEPT_TEXT = /^(accept( all)?|agree|allow all|got it|ok(ay)?|i understand)$/i;

const OVERLAYS = [
  'nextjs-portal', '#__next-build-watcher', '[data-nextjs-toast]',
  '[data-nextjs-dialog-overlay]', '#vite-plugin-checker-error-overlay',
  '[data-radix-toast-viewport] ~ .rq-devtools', '.tsqd-parent-container',
  '#react-refresh-overlay',
];

export function hygieneScript({ hideDevOverlays = true, hideScrollbars = true } = {}) {
  const css = [];
  if (hideDevOverlays) css.push(`${OVERLAYS.join(',')}{display:none!important}`);
  if (hideScrollbars) {
    css.push('::-webkit-scrollbar{display:none!important}', '*{scrollbar-width:none!important}');
  }
  if (!css.length) return '';
  // Init scripts run before the document head necessarily exists.
  return `(() => {
    const inject = () => {
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(css.join('\n'))};
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.documentElement) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  })();`;
}

export function dismissCookieBanners(page) {
  return page.evaluate((pattern) => {
    const accept = new RegExp(pattern, 'i');
    const visible = (element) => {
      const style = getComputedStyle(element);
      return style.visibility !== 'hidden' && style.visibility !== 'collapse'
        && style.display !== 'none' && element.getClientRects().length > 0;
    };
    const selector = '[role=dialog], [id*=cookie i], [class*=cookie i], '
      + '[id*=consent i], [class*=consent i]';
    for (const banner of document.querySelectorAll(selector)) {
      if (!visible(banner)) continue;
      for (const button of banner.querySelectorAll('button, [role=button]')) {
        const text = (button.innerText ?? button.textContent ?? '').trim();
        if (visible(button) && accept.test(text)) {
          button.click();
          return text;
        }
      }
    }
    return null;
  }, ACCEPT_TEXT.source);
}
