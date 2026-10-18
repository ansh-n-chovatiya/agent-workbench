import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-phase2-'));
process.env.SHOWREEL_HOME = home;
after(() => rm(home, { recursive: true, force: true }));
const { DEFAULT_BRIEF, validateBrief, setPath, isReady, questions } = await import('../scripts/lib/brief.mjs');
const fresh = () => structuredClone(DEFAULT_BRIEF);
const check = (key, value) => validateBrief(setPath(fresh(), key, value));
test('brief defaults are deeply frozen and valid', () => {
  assert.equal(validateBrief(DEFAULT_BRIEF).ok, true);
  for (const v of [DEFAULT_BRIEF, ...Object.values(DEFAULT_BRIEF).filter((v) => v && typeof v === 'object')]) assert.ok(Object.isFrozen(v));
});
test('brief validates every scalar rule and collects dotted errors', () => {
  const cases = [
    ['version', ['1'], ['2', 'null']], ['topic', ['null', 'Demo', 'a'.repeat(200)], ['', 'a'.repeat(201)]],
    ['targetSeconds', ['10', '600', '20.5'], ['9', '601', 'NaN', 'Infinity', 'null']],
    ['baseURL', ['null', 'http://localhost:3000', 'https://example.com'], ['', 'file:///tmp/a', 'http://a b']],
    ['flowMode', ['null', 'guide', 'auto'], ['manual']], ['theme', ['clean', 'dark', 'bold'], ['light']],
    ['captions.mode', ['band', 'overlay'], ['none']], ['voice.tier', ['auto', 'kokoro', 'kitten'], ['other']],
    ['music.mode', ['none', 'bundled'], ['other']],
    ['titleCard.title', ['null', 'a'.repeat(80)], ['a'.repeat(81)]], ['titleCard.subtitle', ['null', 'a'.repeat(80)], ['a'.repeat(81)]],
  ];
  for (const [key, good, bad] of cases) {
    for (const value of good) assert.equal(check(key, value).ok, true, `${key}=${value}`);
    for (const value of bad) assert.ok(check(key, value).errors.some((e) => e.includes(`"${key}"`)), `${key}=${value}`);
  }
  for (const key of ['titleCard.enabled', 'outroCard.enabled', 'captions.enabled', 'voice.enabled', 'outputs.landscape', 'outputs.vertical', 'outputs.gif']) {
    for (const v of key === 'voice.enabled' ? ['true', 'false', 'null'] : ['true', 'false']) assert.equal(check(key, v).ok, true, `${key}=${v}`);   // voice.enabled: null means unanswered
    for (const v of key === 'voice.enabled' ? ['0', 'yes'] : ['null', '0', 'yes']) assert.ok(check(key, v).errors.some((e) => e.includes(key)), `${key}=${v}`);
  }
  const brief = fresh(); brief.topic = ''; brief.theme = 'x'; brief.voice.tier = 'x';
  assert.equal(validateBrief(brief).errors.length, 3);
  brief.music.mode = 'file';
  assert.ok(validateBrief(brief).errors.some((e) => e.includes('music.file')));
  brief.topic = 'Demo'; brief.theme = 'clean'; brief.voice.tier = 'auto'; brief.music.file = 'music.wav';
  assert.equal(validateBrief(brief).ok, true);
});
test('brief rejects unknown keys at every level and malformed objects', () => {
  for (const parent of ['', 'titleCard', 'outroCard', 'captions', 'voice', 'music', 'outputs']) {
    const brief = fresh(); (parent ? brief[parent] : brief).typo = true;
    assert.ok(validateBrief(brief).errors.some((e) => e.includes(parent ? `${parent}.typo` : 'typo')));
    if (parent) { brief[parent] = null; assert.equal(validateBrief(brief).ok, false); }
  }
  for (const value of [null, [], 1]) assert.equal(validateBrief(value).ok, false);
  for (const key of ['audience', 'notes', 'voice.name', 'voice.language', 'outroCard.text']) assert.equal(check(key, '').ok, false);
});
test('setPath coerces by default type without mutation and rejects prototype paths', () => {
  const brief = fresh();
  assert.equal(setPath(brief, 'targetSeconds', '42').targetSeconds, 42);
  assert.equal(setPath(brief, 'voice.enabled', 'true').voice.enabled, true);
  assert.equal(setPath(brief, 'voice.enabled', 'false').voice.enabled, false);
  assert.equal(setPath(brief, 'topic', 'null').topic, null);
  assert.equal(setPath(brief, 'topic', '42').topic, '42');
  assert.deepEqual(brief, DEFAULT_BRIEF);
  for (const key of ['x', '__proto__.x', 'constructor', 'voice', 'voice.x']) assert.throws(() => setPath(brief, key, 'x'), { message: `Unknown brief key "${key}"` });
});
test('questions contain exactly unanswered essentials in order and bounded headers', () => {
  let brief = fresh(); brief.voice.enabled = null;
  assert.deepEqual(questions(brief).map((q) => q.key), ['topic', 'baseURL', 'flowMode', 'voice.enabled']);
  for (const q of questions(brief)) { assert.ok(q.header.length <= 12); assert.equal(q.freeText, q.options === null); }
  assert.equal(questions(brief)[2].options[0].label, 'Guide mode (Recommended)');
  for (const [key, v] of [['topic', 'Demo'], ['baseURL', 'https://example.com'], ['flowMode', 'guide'], ['voice.enabled', 'false']]) {
    brief = setPath(brief, key, v);
    assert.ok(questions(brief).length <= 4);
    assert.ok(!questions(brief).some((q) => q.key === key));
  }
  assert.deepEqual(questions(brief), []);
  assert.deepEqual(isReady(brief), { ready: true, missing: [] });
  assert.deepEqual(isReady(DEFAULT_BRIEF).missing, ['topic', 'baseURL', 'flowMode']);
});
test('intake asks the voice question until it is answered, and not after', () => {
  assert.deepEqual(questions(DEFAULT_BRIEF).map((q) => q.key), ['topic', 'baseURL', 'flowMode', 'voice.enabled']);
  assert.equal(DEFAULT_BRIEF.voice.enabled, null);
  const answered = setPath(DEFAULT_BRIEF, 'voice.enabled', 'false');   // "captions only" is an answer
  assert.equal(answered.voice.enabled, false);
  assert.ok(!questions(answered).some((q) => q.key === 'voice.enabled'));
  assert.ok(validateBrief(answered).ok === true || !validateBrief(answered).errors.some((e) => e.includes('voice.enabled')));
});
