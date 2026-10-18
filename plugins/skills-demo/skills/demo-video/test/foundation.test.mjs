import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mergeConfig, readConfigFile, writeTemplate, DEFAULTS } from '../scripts/lib/config.mjs';
import { pickSayVoice, ttsAvailable, synth } from '../scripts/lib/tts.mjs';
import { run, ffprobeDuration, SKILL_ROOT } from '../scripts/lib/env.mjs';

const tmp = () => mkdtemp(path.join(tmpdir(), 'demo-video-test-'));

test('config: a typo or a missing baseURL fails loudly instead of recording with defaults', () => {
  assert.throws(() => mergeConfig({}), /"baseURL"/);
  assert.throws(() => mergeConfig({ baseURL: 'http://x', colour: "red" }), /unknown key "colour"/);
  assert.throws(() => mergeConfig({ baseURL: 'http://x', pace: { typeCPS: 20 } }), /unknown key "pace.typeCPS"/);
});

test('config: a partial nested object keeps the sibling defaults (else timings become NaN)', () => {
  const c = mergeConfig({ baseURL: 'http://x', pace: { typeCps: 20 }, phone: { enabled: true } });
  assert.deepEqual(c.pace, { ...DEFAULTS.pace, typeCps: 20 });
  assert.equal(c.phone.width, 390);
  assert.equal(DEFAULTS.pace.typeCps, 14, 'DEFAULTS must not be mutated by a merge');
});

test('init: the template loads as exactly the defaults, and a second init never overwrites', async () => {
  const file = path.join(await tmp(), 'configs', 'app.json');
  assert.equal(await writeTemplate(file), true);
  assert.deepEqual(await readConfigFile(file), { ...structuredClone(DEFAULTS), baseURL: 'http://localhost:3000' });
  await writeFile(file, '{"baseURL":"http://mine"}');
  assert.equal(await writeTemplate(file), false);
  assert.equal(await readFile(file, 'utf8'), '{"baseURL":"http://mine"}');
});

test('tts: picks a real English voice, never a novelty one listed first', () => {
  const listing = [
    'Bad News            en_US    # Hello!',
    'Amélie              fr_CA    # Bonjour!',
    'Daniel              en_GB    # Hello!',
    'Samantha            en_US    # Hello!',
  ].join('\n');
  assert.equal(pickSayVoice(listing), 'Samantha');
  assert.equal(pickSayVoice(`${listing}\nZoe (Premium)       en_US    # Hello!`), 'Zoe (Premium)');
  assert.equal(pickSayVoice('Bad News            en_US    # Hello!'), 'Bad News');
});

test('tts: synth returns the real audio duration, which step holds are sized by', async (t) => {
  const tts = await ttsAvailable();
  if (!tts) return t.skip('no TTS installed');
  const out = path.join(await tmp(), tts.tool === 'say' ? 'n.aiff' : 'n.wav');
  const d = await synth('- Open the settings page.', out);
  assert.ok(d > 0.3, `duration ${d}`);
  assert.ok(Math.abs(d - (await ffprobeDuration(out))) < 0.1);
});

test('doctor: exits 1 naming ffmpeg and its fix when ffmpeg is not on PATH', async () => {
  const cli = path.join(SKILL_ROOT, 'scripts', 'demo.mjs');
  const env = { ...process.env, PATH: '/usr/bin:/bin' };
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [cli, 'doctor'], { env, encoding: 'utf8' });
  if (r.stdout.match(/ok\s+ffmpeg/)) return; // ffmpeg installed in /usr/bin: nothing to prove here
  assert.equal(r.status, 1);
  assert.match(r.stdout, /MISSING\s+ffmpeg.*-> .*install ffmpeg/);
});

test('run: a missing binary rejects with ENOENT; a failing one resolves with its code', async () => {
  await assert.rejects(run('no-such-binary-xyz'), { code: 'ENOENT' });
  assert.equal((await run(process.execPath, ['-e', 'process.exit(3)'])).code, 3);
});
