import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { hygieneScript, ACCEPT_TEXT } from '../scripts/lib/record/hygiene.mjs';

const selectors = [
  'nextjs-portal', '#__next-build-watcher', '[data-nextjs-toast]',
  '[data-nextjs-dialog-overlay]', '#vite-plugin-checker-error-overlay',
  '[data-radix-toast-viewport] ~ .rq-devtools', '.tsqd-parent-container',
  '#react-refresh-overlay',
];

function runScript(options, ready = true) {
  const styles = [];
  const listeners = [];
  const root = { appendChild: (style) => styles.push(style.textContent) };
  const document = {
    documentElement: ready ? root : null,
    head: null,
    createElement: (tag) => { assert.equal(tag, 'style'); return {}; },
    addEventListener: (...args) => listeners.push(args),
  };
  vm.runInNewContext(hygieneScript(options), { document });
  return { styles, listeners, document, root };
}

test('hygiene installs only CSS and each option independently removes its CSS', () => {
  for (const hideDevOverlays of [true, false]) for (const hideScrollbars of [true, false]) {
    const { styles, listeners } = runScript({ hideDevOverlays, hideScrollbars });
    assert.equal(listeners.length, 0);
    assert.equal(styles.length, hideDevOverlays || hideScrollbars ? 1 : 0);
    for (const selector of selectors) assert.equal(styles.join('').includes(selector), hideDevOverlays);
    for (const css of ['::-webkit-scrollbar{display:none!important}', '*{scrollbar-width:none!important}']) {
      assert.equal(styles.join('').includes(css), hideScrollbars);
    }
  }
  assert.deepEqual(runScript().styles, runScript({ hideDevOverlays: true, hideScrollbars: true }).styles);
  assert.equal(hygieneScript({ hideDevOverlays: false, hideScrollbars: false }), '');
});

test('hygiene waits once when init runs before the root element exists', () => {
  const { document, listeners, styles, root } = runScript({}, false);
  assert.equal(styles.length, 0);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0][0], 'DOMContentLoaded');
  assert.equal(listeners[0][2].once, true);
  document.documentElement = root;
  listeners[0][1]();
  assert.equal(styles.length, 1);
  assert.ok(styles[0].includes('nextjs-portal'));
});

test('cookie acceptance regex matches the exact phrases only, case insensitively', () => {
  for (const text of ['accept', 'accept all', 'agree', 'allow all', 'got it', 'ok', 'okay', 'i understand']) {
    assert.equal(ACCEPT_TEXT.test(text), true, text);
    assert.equal(ACCEPT_TEXT.test(text.toUpperCase()), true, text);
  }
  for (const text of ['', 'reject', 'accept selected', 'disagree', 'not okay', 'okay thanks', 'allow', ' accept']) {
    assert.equal(ACCEPT_TEXT.test(text), false, text);
  }
});
