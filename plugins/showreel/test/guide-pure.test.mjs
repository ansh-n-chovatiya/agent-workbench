import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { orderedCandidates, pickNearestBox, formatResolvedStep, parseGuideAdd, sameDocument } from '../scripts/lib/guide/pure.mjs';
import { chooseSelector } from '../scripts/lib/guide/resolver.mjs';
import { pageScript, installRecorder } from '../scripts/lib/guide/recorder.mjs';
import { formatSnapshot } from '../scripts/lib/snapshot.mjs';

const run = promisify(execFile);
const cli = new URL('../scripts/showreel.mjs', import.meta.url);

test('candidate ordering includes both scoped candidates and escapes quoted names', () => {
  const candidates = orderedCandidates({
    testId: 'a"b', role: 'link', name: 'Learn "more"', scopeSelector: 'article:has(h3)',
    id: 'learn', ariaLabel: 'Read', css: 'article > a',
  });
  assert.deepEqual(candidates, [
    '[data-testid="a\\"b"]', 'role=link[name="Learn \\"more\\""i]',
    'article:has(h3) >> role=link[name="Learn \\"more\\""i]', '#learn', '[aria-label="Read"]',
    'text="Learn \\"more\\""', 'article:has(h3) >> text="Learn \\"more\\""', 'article > a',
  ]);
  assert.deepEqual(orderedCandidates({ css: 'html' }), ['html']);
});

test('nearest box uses page centres, inclusive 40 px limit, stable ties and no null fallback', () => {
  const box = { x: 10, y: 20, w: 10, h: 10 };
  assert.equal(pickNearestBox(box, [null, { ...box, x: 50 }]), 1);
  assert.equal(pickNearestBox(box, [{ ...box, x: 50.01 }]), -1);
  assert.equal(pickNearestBox(box, [{ ...box }, { ...box }]), 0);
  assert.equal(pickNearestBox(null, [box]), -1);
  assert.equal(pickNearestBox(box, []), -1);
});

test('resolved formatting carries press key, omits captions, candidates and sensitive values', () => {
  const step = {
    action: 'press', name: 'Search', role: 'textbox', url: 'https://example.com/', tab: 1,
    frameUrl: 'https://example.com/frame', sensitive: false, scope: 'Search', key: 'Enter',
    caption: 'Never copy', candidates: ['input'],
  };
  assert.deepEqual(formatResolvedStep(step, 2, 'input', 'unique'), {
    i: 2, action: 'press', selector: 'input', how: 'unique', name: 'Search', role: 'textbox',
    url: step.url, tab: 1, frameUrl: step.frameUrl, sensitive: false, scope: 'Search', key: 'Enter',
  });
  assert.equal(formatResolvedStep({ action: 'fill', sensitive: true, value: 'secret' }, 0, 'input', 'css').value, undefined);
  assert.equal(formatResolvedStep({ action: 'fill', value: '' }, 0, 'input', 'css').value, '');
});

function fakeFrame(matches) {
  return { locator(candidate) {
    const value = matches[candidate];
    return {
      async count() { if (value instanceof Error) throw value; return value?.length ?? 0; },
      async evaluateAll() { return value; },
    };
  } };
}

test('selector choice prefers the first unique candidate before any nth fallback', async () => {
  const frame = fakeFrame({ bad: new Error('invalid'), duplicate: [null, null], 'article:has(h3) >> a': [{}], css: [{}] });
  assert.deepEqual(await chooseSelector(frame, {
    candidates: ['bad', 'duplicate', 'article:has(h3) >> a', 'css'], tag: 'a', box: null,
  }), { selector: 'article:has(h3) >> a', how: 'scoped' });
  assert.deepEqual(await chooseSelector(frame, { candidates: ['css'], tag: 'a' }), { selector: 'css', how: 'css' });
});

test('selector choice checks multi-match candidates in order and explains absent boxes', async () => {
  const box = { x: 0, y: 0, w: 10, h: 10 };
  const frame = fakeFrame({ a: [{ ...box, x: 100 }, null], b: [null, box] });
  assert.deepEqual(await chooseSelector(frame, { candidates: ['a', 'b'], box }), { selector: 'b >> nth=1', how: 'nth' });
  assert.match((await chooseSelector(frame, { candidates: ['a'], box: null })).why, /no recorded box/);
  assert.match((await chooseSelector(frame, { candidates: ['a'], box })).why, /none near/);
  assert.equal((await chooseSelector(frame, { candidates: ['missing'], box })).why, 'no candidate matched on replay');
});

test('snapshot formatting is compact, caption-free and one line per element', () => {
  const snapshot = {
    title: 'Demo\npage', headings: ['First\nheading'],
    elements: [{ role: 'button', name: 'Say "hi"\nnow', selector: '#hello', y: 123, caption: 'Ignored' }],
  };
  assert.equal(formatSnapshot(snapshot), '# Demo page\nheadings: First heading\nbutton "Say \\"hi\\" now" -> #hello');
  assert.equal(formatSnapshot({ title: '', headings: [], elements: [] }), '# \nheadings: ');
});

const addFlags = ['--name', 'demo', '--action', 'click', '--selector', 'button', '--label', 'Save'];
test('guide add parses defaults, empty fill, press key and explicit metadata', () => {
  assert.deepEqual(parseGuideAdd(addFlags), { name: 'demo', action: 'click', selector: 'button', label: 'Save', tab: 0 });
  const fill = [...addFlags]; fill[3] = 'fill';
  assert.equal(parseGuideAdd([...fill, '--value', '']).value, '');
  const press = [...addFlags]; press[3] = 'press';
  assert.equal(parseGuideAdd([...press, '--key', 'Enter', '--tab', '2', '--role', 'textbox', '--url', 'https://example.com/']).tab, 2);
});

test('guide add rejects missing, duplicate, unknown and invalid arguments', () => {
  for (const key of ['name', 'action', 'selector', 'label']) {
    const flags = [...addFlags]; flags.splice(flags.indexOf(`--${key}`), 2);
    assert.throws(() => parseGuideAdd(flags), new RegExp(`--${key}`));
  }
  for (const flags of [
    [...addFlags, '--wat', 'x'], [...addFlags, '--tab'], [...addFlags, '--tab', '-1'],
    [...addFlags, '--tab', '1.1'], [...addFlags, '--tab', '9007199254740992'],
    [...addFlags, '--name', 'again'], ['name', 'demo'],
  ]) assert.throws(() => parseGuideAdd(flags));
  for (const action of ['fill', 'press', 'other']) {
    const flags = [...addFlags]; flags[3] = action;
    assert.throws(() => parseGuideAdd(flags), action === 'other' ? /--action/ : new RegExp(action));
  }
});

test('page script runs without imports, guards html and never reads sensitive values', () => {
  const listeners = {};
  const window = {};
  window.top = window;
  const context = vm.createContext({
    window, location: { href: 'https://example.com/' }, scrollX: 0, scrollY: 100,
    CSS: { escape: (value) => value }, document: { getElementById: () => null },
    addEventListener: (event, fn) => { listeners[event] = fn; },
  });
  vm.runInContext(pageScript, context);
  const el = {
    tagName: 'HTML', id: '', parentElement: null, innerText: '',
    getAttribute: () => null, matches: () => true,
    getBoundingClientRect: () => ({ x: 0, y: 10, width: 20, height: 30 }),
    get value() { throw new Error('sensitive value was read'); },
  };
  const facts = window.__sr_facts('fill', el);
  assert.equal(facts.candidates.at(-1), 'html');
  assert.equal(facts.sensitive, true);
  assert.equal(Object.hasOwn(facts, 'value'), false);
  assert.equal(facts.box.y, 110);
  assert.equal(facts.frameUrl, facts.url);
  assert.equal(facts.isTopFrame, true);
  assert.equal(window.__sr_facts('press', el).key, 'Enter');
  assert.deepEqual(Object.keys(listeners), ['click', 'change', 'keydown']);
});

test('installRecorder covers context pages and drains in-flight callbacks', async () => {
  let binding;
  let script;
  const first = { frames: () => [] };
  const second = { frames: () => [] };
  const context = {
    pages: () => [first], on() {},
    async exposeBinding(name, fn) { assert.equal(name, '__sr_event'); binding = fn; },
    async addInitScript(value) { script = value.content; },
  };
  const steps = [];
  const recorder = await installRecorder(context, async (step) => {
    await new Promise((resolve) => setImmediate(resolve));
    steps.push(step);
  });
  binding({ page: second }, { action: 'click' });
  binding({ page: first }, { action: 'press', key: 'Enter' });
  await recorder.drain();
  assert.deepEqual(steps.map((step) => step.tab), [1, 0]);
  assert.equal(script, pageScript);
});

test('guide add CLI creates and appends using project storage and URL defaults', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-guide-'));
  const env = { ...process.env, SHOWREEL_HOME: home };
  const invoke = (args) => run(process.execPath, [cli.pathname, ...args], { env });
  try {
    await invoke(['brief', 'init', '--name', 'demo', '--url', 'https://example.com/']);
    assert.equal((await invoke(['guide', 'add', ...addFlags])).stdout.trim(), '1');
    assert.equal((await invoke(['guide', 'add', ...addFlags, '--url', 'https://example.com/next'])).stdout.trim(), '2');
    const press = [...addFlags]; press[3] = 'press';
    assert.equal((await invoke(['guide', 'add', ...press, '--key', 'Enter'])).stdout.trim(), '3');
    const { readFile } = await import('node:fs/promises');
    const guide = JSON.parse(await readFile(path.join(home, 'projects/demo/guide.json'), 'utf8'));
    assert.equal(guide.version, 1);
    assert.equal(guide.url, 'https://example.com/');
    assert.deepEqual(guide.viewport, { width: 1440, height: 900 });
    assert.deepEqual(guide.steps[0], {
      action: 'click', candidates: ['button'], name: 'Save', role: '', url: guide.url,
      frameUrl: guide.url, isTopFrame: true, box: null, scope: null, sensitive: false, tab: 0,
    });
    assert.equal(guide.steps[1].url, 'https://example.com/next');
    assert.equal(guide.steps[2].url, null);       // no --url on a later step: continue on whatever page the previous step left
    assert.equal(guide.steps[2].frameUrl, null);
    assert.equal(guide.steps[2].key, 'Enter');
    await assert.rejects(invoke(['guide', 'add', ...press]), /press needs --key/);
    await assert.rejects(invoke(['guide', 'unknown']), (error) => error.code === 2);
  } finally { await rm(home, { recursive: true, force: true }); }
});

test('page facts enforce scope and CSS depth limits and escape scope headings', () => {
  const window = {};
  window.top = window;
  vm.runInNewContext(pageScript, {
    window, location: { href: 'https://example.com/' }, scrollX: 0, scrollY: 0,
    CSS: { escape: (value) => value }, document: { getElementById: () => null }, addEventListener() {},
  });
  function element(tag, parent = null, heading = null) {
    const node = {
      tagName: tag.toUpperCase(), id: '', parentElement: parent, innerText: tag === 'a' ? 'Learn more' : '',
      children: [], getAttribute: () => null, hasAttribute: () => false,
      matches: () => false, querySelector: () => heading && ({ textContent: heading }),
      getBoundingClientRect: () => ({ x: 0, y: 0, width: 10, height: 10 }),
    };
    parent?.children.push(node);
    return node;
  }
  const card = element('article', null, 'A "quoted" heading');
  const link = element('a', card);
  const scoped = window.__sr_facts('click', link);
  assert.equal(scoped.scope, 'A "quoted" heading');
  assert.equal(scoped.candidates[1],
    'article:has(:is(h1,h2,h3,h4,h5,h6):text-is("A \\"quoted\\" heading")) >> role=link[name="Learn more"i]');
  card.querySelector = () => ({ textContent: 'a'.repeat(61) });
  assert.equal(window.__sr_facts('click', link).scope, null);
  let parent = element('section', null, 'Too far away');
  for (let i = 0; i < 6; i++) parent = element('div', parent);
  const deep = window.__sr_facts('click', element('a', parent));
  assert.equal(deep.scope, null);
  assert.equal(deep.candidates.at(-1).split(' > ').length, 5);
  parent.querySelector = () => ({ textContent: 'a'.repeat(60) });
  assert.equal(window.__sr_facts('click', parent.children[0]).scope.length, 60);
});

test('sameDocument ignores the hash and a trailing slash but not the path, query or origin', () => {
  assert.equal(sameDocument('https://a.test/x/', 'https://a.test/x#section'), true);
  assert.equal(sameDocument('https://a.test', 'https://a.test/#work'), true);
  assert.equal(sameDocument('https://a.test/x', 'https://a.test/y'), false);
  assert.equal(sameDocument('https://a.test/x?q=1', 'https://a.test/x?q=2'), false);
  assert.equal(sameDocument('https://a.test/x', 'http://a.test/x'), false);
  assert.equal(sameDocument('not a url', 'https://a.test/'), false);
});
