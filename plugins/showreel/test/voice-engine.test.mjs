import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import readline from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-voice-'));
process.env.SHOWREEL_HOME = home;
process.env.SHOWREEL_VOICE_ENGINE = 'fake';
after(() => rm(home, { recursive: true, force: true }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const worker = path.join(root, 'scripts/lib/voice/worker.mjs');
const cliFile = path.join(root, 'scripts/showreel.mjs');
const { parseWav, encodeWav } = await import('../scripts/lib/voice/wav.mjs');
const { VoiceClient } = await import('../scripts/lib/voice/client.mjs');
const { npmCommand, npmExecutable, enginePackageJson } = await import('../scripts/lib/voice/install.mjs');
const cli = (args, env = {}) => spawnSync(process.execPath, [cliFile, ...args], { encoding: 'utf8', cwd: home, env: { ...process.env, SHOWREEL_HOME: home, ...env } });
const ok = (...args) => { const r = cli(args); assert.equal(r.status, 0, r.stderr); return r; };

test('worker protocol: ping, voices, generate with deterministic duration; stdout is protocol only', async () => {
  const child = spawn(process.execPath, [worker], { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, SHOWREEL_VOICE_ENGINE: 'fake' } });
  const lines = []; readline.createInterface({ input: child.stdout }).on('line', (l) => lines.push(l));
  const out = path.join(home, 'w.wav');
  child.stdin.write('{"id":1,"op":"ping"}\n{"id":2,"op":"voices"}\nnot json\n' + JSON.stringify({ id: 3, op: 'generate', text: 'one two three', voice: 'af_heart', speed: 1, out }) + '\n{"id":4,"op":"generate","text":""}\n{"id":5,"op":"bogus"}\n');
  child.stdin.end();
  await new Promise((r) => child.on('close', r));
  const msgs = lines.map((l) => JSON.parse(l));   // throws if any non-protocol line leaked
  assert.equal(msgs.length, 6);
  assert.equal(msgs[0].ok, true); assert.ok(msgs[1].voices.length > 20); assert.equal(msgs[2].ok, false);
  assert.ok(Math.abs(msgs[3].durationSec - (0.32 * 3 + 0.4)) < 1e-3); assert.equal(msgs[3].sampleRate, 24000);
  assert.equal(msgs[4].ok, false); assert.match(msgs[5].error, /unknown op/);
  const wav = parseWav(await readFile(out)); assert.equal(wav.channels, 1); assert.ok(Math.abs(wav.durationSec - msgs[3].durationSec) < 1e-3);
});
test('fake engine is deterministic and voice dependent', async () => {
  const c = new VoiceClient();
  try {
    await c.generate({ text: 'same words', voice: 'af_heart', out: path.join(home, 'a.wav') });
    await c.generate({ text: 'same words', voice: 'af_heart', out: path.join(home, 'b.wav') });
    await c.generate({ text: 'same words', voice: 'am_adam', out: path.join(home, 'c.wav') });
  } finally { await c.stop(); }
  const [a, b, d] = await Promise.all(['a', 'b', 'c'].map((n) => readFile(path.join(home, `${n}.wav`))));
  assert.deepEqual(a, b); assert.notDeepEqual(a, d);
});
test('client runs requests serially on one worker, restarts once after a crash, then reports failure', async () => {
  const c = new VoiceClient({ timeoutMs: 5000 });
  try {
    const results = await Promise.all([1, 2, 3].map((i) => c.generate({ text: `n ${i}`, voice: 'af_heart', out: path.join(home, `s${i}.wav`) })));
    assert.equal(results.length, 3);
    const pid1 = c.child.pid;
    await assert.rejects(c.generate({ text: '__crash__ x', voice: 'af_heart', out: path.join(home, 'x.wav') }), /exited/);   // crash, restart, crash again
    const r = await c.generate({ text: 'after', voice: 'af_heart', out: path.join(home, 'y.wav') });
    assert.ok(r.durationSec > 0); assert.notEqual(c.child.pid, pid1);
  } finally { await c.stop(); }
});
test('client times out a hung request and recovers', async () => {
  const c = new VoiceClient({ timeoutMs: 400 });
  try {
    await assert.rejects(c.generate({ text: '__hang__', voice: 'af_heart', out: path.join(home, 'h.wav') }), /timed out/);
    assert.ok((await c.generate({ text: 'ok', voice: 'af_heart', out: path.join(home, 'h2.wav') })).durationSec > 0);
  } finally { await c.stop(); }
});
test('engine absent gives the install hint', async () => {
  const saved = process.env.SHOWREEL_VOICE_ENGINE; delete process.env.SHOWREEL_VOICE_ENGINE;
  try { await assert.rejects(new VoiceClient().generate({ text: 'x', voice: 'af_heart', out: path.join(home, 'z.wav') }), /Voice engine is not installed\. Run: showreel voice install/); }
  finally { process.env.SHOWREEL_VOICE_ENGINE = saved; }
});
test('install --check works offline, reports not installed; install without --yes refuses', () => {
  const r = cli(['voice', 'install', '--check'], { SHOWREEL_VOICE_ENGINE: '' });
  assert.equal(r.status, 1); assert.match(r.stdout, /not installed/); assert.match(r.stdout, /kokoro-js: missing \(pinned 1\.2\.1\)/);
  const n = cli(['voice', 'install'], { SHOWREEL_VOICE_ENGINE: '' });
  assert.equal(n.status, 1); assert.match(n.stderr, /--yes/);
  assert.deepEqual(enginePackageJson(), { name: 'showreel-kokoro-engine', private: true, version: '0.0.0', type: 'module', dependencies: { 'kokoro-js': '1.2.1' } });
});
test('npm invocation is a fixed argv with no shell and the right executable per platform', () => {
  assert.equal(npmExecutable('win32'), 'npm.cmd'); assert.equal(npmExecutable('linux'), 'npm');
  const posix = npmCommand({ platform: 'linux' });
  assert.deepEqual(posix, { file: 'npm', args: ['install', '--omit=dev', '--no-audit', '--no-fund'] });
  const win = npmCommand({ platform: 'win32', execPath: 'C:\\node\\node.exe', exists: () => true });
  assert.equal(win.file, 'C:\\node\\node.exe'); assert.match(win.args[0], /npm-cli\.js$/);
  assert.equal(npmCommand({ platform: 'win32', execPath: 'C:\\node\\node.exe', exists: () => false }).file, 'npm.cmd');
});
test('voice list and usage', () => {
  const list = ok('voice', 'list', '--json'); const voices = JSON.parse(list.stdout);
  assert.equal(voices[0].id, 'af_heart'); assert.ok(voices.every((v) => v.id && v.name && v.language && v.gender));
  assert.match(ok('voice', 'list').stdout, /recommended default \(af_heart\)/);
  assert.equal(cli(['voice']).status, 2); assert.equal(cli(['voice', 'generate']).status, 1); assert.equal(cli(['voice', 'list', '--bogus']).status, 1);
});
test('voice samples are generated once per key and cached', async () => {
  const first = ok('voice', 'samples', '--voice', 'af_bella').stdout.trim();
  assert.equal(first, path.join(home, 'voice-samples', 'af_bella.wav'));
  const meta = JSON.parse(await readFile(path.join(home, 'voice-samples', 'af_bella.json'), 'utf8'));
  assert.ok(meta.durationSec > 2); assert.match(ok('voice', 'samples', '--voice', 'af_bella').stdout, /\(cached\)/);
  const all = ok('voice', 'samples', '--all').stdout.trim().split('\n');
  assert.ok(all.length > 20); assert.equal(cli(['voice', 'samples', '--voice', 'x', '--all']).status, 1);
});
test('generate, status, import and clean end to end', async () => {
  const name = 'demo', dir = path.join(home, 'projects', name);
  const steps = [{ id: 's1', narration: 'Welcome to the dashboard.' }, { id: 's2', narration: null }, { id: 's3', narration: 'Click Save [pause 0.5] and wait.' }];
  const sb = { version: 1, title: null, outro: null, steps: steps.map((s) => ({ ...s, caption: 'c', guideSteps: [0], zoom: 'auto', highlight: false, holdMs: null })) };
  await (await import('node:fs/promises')).mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'storyboard.json'), JSON.stringify(sb));
  let st = JSON.parse(ok('voice', 'status', '--name', name, '--json').stdout);
  assert.deepEqual(st.steps.map((s) => s.status), ['missing', 'none', 'missing']);
  const g1 = ok('voice', 'generate', '--name', name).stdout; assert.match(g1, /s1\s+missing -> fresh.*generated/); assert.match(g1, /s2\s+none/);
  st = JSON.parse(ok('voice', 'status', '--name', name, '--json').stdout);
  assert.deepEqual(st.steps.map((s) => s.status), ['fresh', 'none', 'fresh']);
  assert.match(ok('voice', 'generate', '--name', name).stdout, /s1\s+fresh\s+\S+\s+cache/);
  const idx = JSON.parse(await readFile(path.join(dir, 'voice', 'clips.json'), 'utf8'));
  assert.equal(idx.version, 1); assert.equal(Object.keys(idx.clips).length, 2);
  assert.ok(Math.abs(idx.clips[idx.steps.s3].durationSec - (0.32 * 2 + 0.4 + 0.5 + 0.32 * 2 + 0.4)) < 0.01);
  // pronunciations change the prepared text, so the clip becomes stale, then regenerates
  await writeFile(path.join(dir, 'voice', 'pronunciations.json'), JSON.stringify({ dashboard: 'dash board' }));
  await writeFile(path.join(dir, 'storyboard.json'), JSON.stringify({ ...sb, steps: sb.steps.map((s) => (s.id === 's1' ? { ...s, narration: 'Welcome to the new dashboard.' } : s)) }));
  st = JSON.parse(ok('voice', 'status', '--name', name, '--json').stdout); assert.equal(st.steps[0].status, 'stale');
  ok('voice', 'generate', '--name', name, '--step', 's1');
  assert.equal(JSON.parse(ok('voice', 'status', '--name', name, '--json').stdout).steps[0].status, 'fresh');
  // import: own clip survives generate, bad files are rejected
  const imp = path.join(home, 'own.wav'); await writeFile(imp, encodeWav(new Float32Array(48000).fill(0.1), 48000));
  assert.match(ok('voice', 'import', '--name', name, '--step', 's3', '--file', imp, '--as', 'own').stdout, /1\.00 s at 48000 Hz as own/);
  assert.match(ok('voice', 'generate', '--name', name).stdout, /s3\s+own.*kept/);
  const bad = path.join(home, 'bad.mp3'); await writeFile(bad, 'x');
  const r = cli(['voice', 'import', '--name', name, '--step', 's3', '--file', bad]); assert.equal(r.status, 1); assert.match(r.stderr, /\.wav|editor converts/);
  const trunc = path.join(home, 't.wav'); await writeFile(trunc, (encodeWav(new Float32Array(1000), 24000)).subarray(0, 60));
  assert.equal(cli(['voice', 'import', '--name', name, '--step', 's3', '--file', trunc]).status, 1);
  assert.equal(cli(['voice', 'import', '--name', name, '--step', 's9', '--file', imp]).status, 1);
  // clean removes the replaced and orphaned clips only
  assert.match(ok('voice', 'clean', '--name', name).stdout, /removed [1-9]\d* clip/);
  const files = await readdir(path.join(dir, 'voice', 'clips'));
  assert.equal(files.length, 2); assert.ok(!files.some((f) => f.endsWith('.tmp')));
  assert.equal(JSON.parse(ok('voice', 'status', '--name', name, '--json').stdout).steps[2].status, 'own');
});
test('doctor voice section reports items with the fake engine', async () => {
  const { voiceDoctor, rtfAdvice } = await import('../scripts/lib/voice/doctor.mjs');
  const items = await voiceDoctor({ benchmark: true });
  assert.deepEqual(items.map((i) => i.id), ['voice-engine', 'voice-model', 'voice-hash', 'voice-benchmark']);
  assert.match(items[3].detail, /RTF/); assert.equal(rtfAdvice(1.2).level, 'warn'); assert.equal(rtfAdvice(0.4).level, 'ok');
});
