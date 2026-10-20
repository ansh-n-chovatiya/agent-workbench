import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-phase2-'));
process.env.SHOWREEL_HOME = home;
after(() => rm(home, { recursive: true, force: true }));
const { draftFromGuide, validateStoryboard } = await import('../scripts/lib/storyboard.mjs');
const guide = JSON.parse(await readFile(new URL('./fixtures/guide.resolved.sample.json', import.meta.url)));
const fresh = () => draftFromGuide(guide);
test('draft captions use roles, trim names, and cut long names on word boundaries', () => {
  const steps = [
    ['click', 'link', '  Details  ', 'Open Details'], ['click', 'button', 'Save', 'Press Save'],
    ...['tab', 'radio', 'checkbox'].map((role) => ['click', role, 'Choice', 'Select Choice']),
    ['fill', 'textbox', 'Name', 'Enter Name'], ['press', 'textbox', 'Search', 'Press Search'],
    ['click', 'link', 'word '.repeat(40), null], ['click', 'button', 'x'.repeat(100), null],
    ['click', 'button', '`role=#>>[data-test=x]', null],
  ];
  for (const [action, role, name, caption] of steps) {
    const draft = draftFromGuide({ steps: [{ action, role, name }] });
    assert.equal(validateStoryboard(draft).ok, true, JSON.stringify(draft));
    if (caption) assert.equal(draft.steps[0].caption, caption);
    else assert.ok(draft.steps[0].caption.length <= 70);
  }
  assert.equal(fresh().steps.length, 6);
  assert.equal(validateStoryboard(fresh(), { resolvedGuide: guide }).ok, true);
});
test('storyboard validates step fields, lengths, forbidden fragments and collects errors', () => {
  const cases = [
    ['id', ['s0', 's12'], ['', 'bad', 1]], ['caption', ['a', 'a'.repeat(70)], ['', 'a'.repeat(71), ...['`', '>>', 'role=', '#', '[data-'].map((v) => `Open ${v}`)]],
    ['narration', [null, 'a'.repeat(280), 'a'.repeat(281), Array(45).fill('a').join(' ')], ['', Array(46).fill('a').join(' ')]],
    ['zoom', ['auto', 'none'], ['yes', null]], ['highlight', [true, false], [0, 'true']],
    ['holdMs', [null, 0, 10000], [-1, 10001, Infinity, '0']], ['guideSteps', [[0], [1, 2]], [[], [-1], [0.5], ['0'], null]],
  ];
  for (const [key, good, bad] of cases) for (const [values, ok] of [[good, true], [bad, false]]) for (const value of values) {
    const sb = fresh(); sb.steps[0][key] = value;
    const result = validateStoryboard(sb);
    assert.equal(result.ok, ok, `${key}=${value}: ${result.errors}`);
    if (!ok) assert.ok(result.errors.some((e) => e.includes(`steps.0.${key}`)));
  }
  const sb = fresh(); sb.steps[0].caption = null;
  assert.equal(validateStoryboard(sb, { captionsEnabled: false }).ok, true);
  sb.version = 2; sb.steps[0].highlight = 'yes';
  assert.equal(validateStoryboard(sb).errors.length, 3);
});
test('storyboard validates structure, unique ids, references, ordering and coverage', () => {
  for (const sb of [null, {}, { version: 1, title: null, outro: null, steps: [] }]) assert.equal(validateStoryboard(sb).ok, false);
  let sb = fresh(); sb.steps[1].id = 's1'; assert.match(validateStoryboard(sb).errors.join(), /steps.1.id/);
  sb = fresh(); sb.steps[1].guideSteps = [0]; assert.match(validateStoryboard(sb, { resolvedGuide: guide }).errors.join(), /already used/);
  sb = fresh(); sb.steps[0].guideSteps = [1]; sb.steps[1].guideSteps = [0]; assert.match(validateStoryboard(sb, { resolvedGuide: guide }).errors.join(), /ascending/);
  sb = fresh(); sb.steps[0].guideSteps = [99]; assert.match(validateStoryboard(sb, { resolvedGuide: guide }).errors.join(), /index 99 does not exist/);
  sb = fresh(); sb.steps.pop(); assert.deepEqual(validateStoryboard(sb, { resolvedGuide: guide }).warnings, ['resolvedGuide.steps.5 is not referenced']);
  sb = fresh(); sb.title = { text: 'Demo', subtitle: null }; sb.outro = { text: 'Thanks' }; assert.equal(validateStoryboard(sb).ok, true);
  sb.title.text = ''; sb.title.subtitle = 1; sb.outro.text = ''; assert.equal(validateStoryboard(sb).errors.length, 3);
});
test('draft rejects an empty guide rather than returning an invalid empty storyboard', () => {
  assert.throws(() => draftFromGuide({ steps: [] }), /resolvedGuide.steps/);
});
