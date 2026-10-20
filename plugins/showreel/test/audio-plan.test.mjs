import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
import { buildComposition, validateComposition, resolveComposition, changeComposition, safeMusicPath } from '../scripts/lib/compose/composition.mjs';
import { planRender } from '../scripts/lib/compose/plan.mjs';
import { resolveAudioRoute, loadVoiceClips, startRenderServer } from '../scripts/lib/compose/render.mjs';
import { renderBundleInputs } from '../scripts/lib/record/bundle-hash.mjs';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';

function run(overrides = {}, briefPatch = {}) {
  const brief = { ...structuredClone(DEFAULT_BRIEF), topic: 'Open a report', ...briefPatch };
  const storyboard = { steps: [{ id: 's1', caption: 'Open report', guideSteps: [0] }, { id: 's2', caption: 'Share it', guideSteps: [1] }] };
  const events = { viewport: { width: 1280, height: 720 }, scale: 1,
    steps: [{ id: 's1', tStart: 0, holdStart: 2, tEnd: 3 }, { id: 's2', tStart: 3, holdStart: 5, tEnd: 6 }],
    targets: [], cursor: [{ t: 0, x: 100, y: 100 }], clicks: [], keys: [] };
  const record = { runId: '20261018-120000', durationSec: 7, scale: { used: 1 } };
  const composition = buildComposition({ brief, storyboard, events, record, overrides });
  return { brief, storyboard, events, record, sourceSize: { width: 1280, height: 720 }, composition };
}
const voiceClips = { version: 1, clips: { k1: { key: 'k1', durationSec: 4.5, source: 'tts' }, k2: { key: 'k2', durationSec: 2, source: 'own' } }, steps: { s1: 'k1', s2: 'k2' } };

test('audio defaults resolve, old compositions stay valid and bad values are rejected by name', () => {
  const c = resolveComposition({});
  assert.deepEqual(c.audio.voice, { enabled: null, voiceId: 'af_heart', speed: 1, gainDb: 0 });
  assert.deepEqual(c.audio.loudness, { enabled: true, targetLufs: -16, truePeakDb: -1 });
  assert.equal(c.audio.music.gainDb, -18); assert.equal(c.audio.music.duck.depthDb, 12);
  const old = run().composition; delete old.audio;
  assert.ok(validateComposition(old).ok);
  const bad = (patch) => validateComposition({ ...run().composition, audio: patch }).errors.join('\n');
  assert.match(bad({ voice: { gainDb: 13 } }), /audio\.voice\.gainDb/);
  assert.match(bad({ voice: { voiceId: '../x' } }), /audio\.voice\.voiceId/);
  assert.match(bad({ loudness: { targetLufs: -7 } }), /audio\.loudness\.targetLufs/);
  assert.match(bad({ loudness: { truePeakDb: 1 } }), /audio\.loudness\.truePeakDb/);
  assert.match(bad({ music: { file: 'song.flac' } }), /audio\.music\.file/);
  assert.match(bad({ music: { file: '../song.mp3' } }), /audio\.music\.file/);
  assert.match(bad({ music: { file: '/etc/song.mp3' } }), /audio\.music\.file/);
  assert.match(bad({ music: { loop: 'yes' } }), /audio\.music\.loop/);
  assert.match(bad({ music: { duck: { depthDb: 31 } } }), /depthDb/);
  assert.match(bad({ nope: 1 }), /audio\.nope/);
  assert.match(bad({ narration: { steps: { s1: { text: 'x'.repeat(281) } } } }), /text/);
  assert.match(bad({ narration: { steps: { s1: { muted: 'yes' } } } }), /muted/);
  assert.match(bad({ narration: { steps: { s1: { volume: 1 } } } }), /volume/);
  assert.match(bad({ narration: { steps: JSON.parse('{"__proto__":{}}') } }), /step ID|unknown/);
  assert.ok(validateComposition({ ...run().composition, audio: { music: { enabled: true, file: 'music/Bed.MP3' }, narration: { steps: { s1: { text: 'Hello', muted: false }, s2: { muted: true } } } } }).ok);
  assert.ok(safeMusicPath('a/b.ogg') && safeMusicPath('x.m4a') && safeMusicPath('x.wav') && !safeMusicPath('x.png') && !safeMusicPath(null));
});
test('audio settings are documented, grouped and editable', () => {
  const audio = SETTINGS.filter((s) => s.group === 'audio');
  assert.ok(audio.length >= 15);
  for (const s of audio) { assert.ok(s.label.trim() && s.help.endsWith('.')); assert.equal(s.help.split(/\.\s/).length, 1, s.path); }
  const c = changeComposition(run().composition, 'audio.music.gainDb', -12);
  assert.equal(c.audio.music.gainDb, -12);
  assert.equal(changeComposition(c, 'audio.music.gainDb', null, { reset: true }).audio.music.gainDb, -18);
});
test('a brief that chose a music file seeds the composition', () => {
  const c = run({}, { music: { mode: 'file', file: 'music/bed.mp3' }, voice: { enabled: true, tier: 'auto', name: 'bf_emma', language: 'en' } }).composition;
  assert.equal(c.audio.music.enabled, true); assert.equal(c.audio.music.file, 'music/bed.mp3'); assert.equal(c.audio.voice.voiceId, 'bf_emma');
  assert.equal(run().composition.audio.music.enabled, false);
});
test('without voice clips the plan has no audio and everything else is unchanged', () => {
  const input = run(), plan = planRender(input);
  assert.equal(plan.audio.enabled, false); assert.deepEqual(plan.audio.narration, []); assert.equal(plan.audio.music, null);
  const { audio, ...rest } = plan, silent = planRender({ ...input, voiceClips: { version: 1, clips: {}, steps: {} } });
  assert.deepEqual(JSON.parse(JSON.stringify({ ...silent, audio: 0 })), JSON.parse(JSON.stringify({ ...rest, audio: 0 })));
  const off = planRender({ ...input, voiceClips });
  assert.equal(off.audio.enabled, false, 'voice is off until the brief or composition turns it on');
});
test('narration is placed on the output clock, captions grow to cover it and urls follow the caller', () => {
  const input = run({ audio: { voice: { enabled: true, gainDb: 2 }, music: { enabled: true, file: 'music/bed.mp3' } }, cards: { title: { enabled: false }, outro: { enabled: false } } });
  const plan = planRender({ ...input, voiceClips });
  assert.equal(plan.audio.enabled, true); assert.equal(plan.audio.sampleRate, 48000);
  assert.deepEqual(plan.audio.narration.map((n) => [n.stepId, n.clipUrl, n.gainDb, n.durationSec]), [['s1', 'voice/k1.wav', 2, 4.5], ['s2', 'voice/k2.wav', 2, 2]]);
  assert.ok(Math.abs(plan.audio.narration[0].outStart - 0.15) < 1e-9);
  // s1's voice (4.5 s) overruns the 3 s step and pushes s2's narration later.
  assert.ok(plan.audio.warnings.some((w) => w.stepId === 's2' && w.code === 'overlap-shifted'));
  assert.ok(plan.audio.narration[1].outStart >= plan.audio.narration[0].outStart + 4.5);
  assert.deepEqual(plan.audio.music, { url: 'music/music/bed.mp3', gainDb: -18, loop: true, fadeInSec: 1, fadeOutSec: 2, startSec: 0, endSec: plan.timemap.outputDuration });
  assert.equal(plan.audio.duck.depthDb, 12);
  const [c1, c2] = plan.cues;
  assert.ok(c1.end >= plan.audio.narration[0].outStart + 4.5 - 1e-9, `${c1.end}`);
  assert.ok(c1.end - c1.start > 3 - 0.25, 'the cue never shrinks');
  assert.ok(c2.start >= c1.end && c2.end >= plan.audio.narration[1].outStart + 2 - 1e-9, `${c2.start} ${c2.end}`);
  const editor = planRender({ ...input, voiceClips, audioUrls: { clip: (k) => `/media/voice/${k}.wav`, music: (f) => `/media/${f}` } });
  assert.equal(editor.audio.narration[0].clipUrl, '/media/voice/k1.wav'); assert.equal(editor.audio.music.url, '/media/music/bed.mp3');
  assert.deepEqual(JSON.parse(JSON.stringify(plan.audio)), plan.audio);
});
test('muted steps, brief voice and per-step cuts', () => {
  const input = run({ audio: { narration: { steps: { s2: { muted: true } } } }, cards: { title: { enabled: false } } }, { voice: { enabled: true, tier: 'auto', name: null, language: 'en' } });
  const plan = planRender({ ...input, voiceClips });
  assert.deepEqual(plan.audio.narration.map((n) => n.stepId), ['s1']);
  const cut = run({ audio: { voice: { enabled: true } }, edits: { trims: [{ start: 3, end: 6 }] } });
  cut.composition.edits = { trims: [{ start: 3, end: 6 }], speeds: [] };
  const planCut = planRender({ ...cut, voiceClips });
  assert.deepEqual(planCut.audio.narration.map((n) => n.stepId), ['s1']);
  assert.ok(planCut.audio.warnings.some((w) => w.code === 'step-removed' && w.stepId === 's2'));
});
test('audio routes serve only the project\'s clips and music inside the project', async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'showreel-audio-')), dir = path.join(base, 'project'), outside = path.join(base, 'secret.wav');
  try {
    await mkdir(path.join(dir, 'voice', 'clips'), { recursive: true }); await mkdir(path.join(dir, 'music'), { recursive: true });
    await writeFile(path.join(dir, 'voice', 'clips', 'abc.wav'), 'x'); await writeFile(path.join(dir, 'music', 'Bed.mp3'), 'x'); await writeFile(outside, 'x'); await writeFile(path.join(dir, 'notes.txt'), 'x');
    assert.equal((await resolveAudioRoute(dir, 'voice/abc.wav')).type, 'audio/wav');
    assert.equal((await resolveAudioRoute(dir, 'music/music/Bed.mp3')).type, 'audio/mpeg');
    for (const bad of ['voice/missing.wav', 'voice/../notes.txt', 'voice/%2e%2e%2fnotes.txt', 'voice/abc.mp3', 'music/notes.txt', 'music/../secret.wav', 'music/%2e%2e/secret.wav', 'music/', 'other/abc.wav', 'voice/a%00.wav', 'voice/%E0%A4%A.wav'])
      assert.equal(await resolveAudioRoute(dir, bad), null, bad);
    await symlink(outside, path.join(dir, 'voice', 'clips', 'link.wav')); await symlink(outside, path.join(dir, 'music', 'link.wav'));
    assert.equal(await resolveAudioRoute(dir, 'voice/link.wav'), null); assert.equal(await resolveAudioRoute(dir, 'music/music/link.wav'), null);
    assert.deepEqual(await loadVoiceClips(dir), { voiceClips: null, warnings: [] });
    await writeFile(path.join(dir, 'voice', 'clips.json'), JSON.stringify({ version: 1, clips: { abc: { durationSec: 1 }, gone: { durationSec: 1 } }, steps: { s1: 'abc', s2: 'gone' } }));
    const loaded = await loadVoiceClips(dir);
    assert.deepEqual(loaded.voiceClips.steps, { s1: 'abc' }); assert.match(loaded.warnings[0], /step s2/);
    await writeFile(path.join(dir, 'voice', 'clips.json'), '{"version":2}');
    await assert.rejects(loadVoiceClips(dir), /unsupported/);
  } finally { await rm(base, { recursive: true, force: true }); }
});
test('the render bundle hash covers the audio sources', () => {
  for (const name of ['decode.js', 'loudness.mjs', 'duck.mjs', 'mix.mjs', 'retime.mjs']) assert.ok(renderBundleInputs.includes(`scripts/lib/audio/${name}`), name);
});
test('the render server serves project audio only through safe routes', async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), 'showreel-audio-server-')), dir = path.join(base, 'project');
  let server;
  try {
    await mkdir(path.join(dir, 'voice', 'clips'), { recursive: true }); await mkdir(path.join(dir, 'music'), { recursive: true });
    await writeFile(path.join(dir, 'voice', 'clips', 'k1.wav'), 'RIFFdata'); await writeFile(path.join(dir, 'music', 'bed.mp3'), 'mp3data');
    await writeFile(path.join(base, 'secret.wav'), 'secret'); await writeFile(path.join(base, 'raw.mp4'), 'raw');
    server = await startRenderServer({ rawFile: path.join(base, 'raw.mp4'), outFile: path.join(base, 'out.mp4'), projectDir: dir });
    const get = (route) => fetch(server.url + route);
    const clip = await get('voice/k1.wav'); assert.equal(clip.status, 200); assert.equal(clip.headers.get('content-type'), 'audio/wav'); assert.equal(await clip.text(), 'RIFFdata');
    const music = await get('music/music/bed.mp3'); assert.equal(music.status, 200); assert.equal(await music.text(), 'mp3data');
    for (const bad of ['voice/nope.wav', 'voice/..%2fsecret.wav', 'music/..%2fsecret.wav', 'music/music/bed.png', 'voice/k1.wav/extra']) assert.equal((await get(bad)).status, 404, bad);
    const without = await startRenderServer({ rawFile: path.join(base, 'raw.mp4'), outFile: path.join(base, 'out2.mp4') });
    try { assert.equal((await fetch(without.url + 'voice/k1.wav')).status, 404); } finally { await without.close(); }
  } finally { await server?.close(); await rm(base, { recursive: true, force: true }); }
});

test('narration that would run past the end of the video holds the last frame instead of being cut off', () => {
  const input = run({ audio: { voice: { enabled: true } }, cards: { title: { enabled: false }, outro: { enabled: false } } });
  const longClips = { version: 1, clips: { k1: { key: 'k1', durationSec: 2, source: 'tts' }, k2: { key: 'k2', durationSec: 6, source: 'tts' } }, steps: { s1: 'k1', s2: 'k2' } };
  const plan = planRender({ ...input, voiceClips: longClips });
  const end = Math.max(...plan.audio.narration.map((n) => n.outStart + n.durationSec));
  assert.ok(plan.timemap.outputDuration >= end, `video ${plan.timemap.outputDuration} must cover narration end ${end}`);
  assert.ok(plan.audio.warnings.some((w) => w.code === 'tail-hold'), 'a tail-hold notice is reported');
  assert.equal(plan.audio.durationSec, plan.timemap.outputDuration);
  // Narration that fits needs no tail hold; disable tightening to check the original length.
  input.composition.audio.tighten.enabled = false;
  const fits = planRender({ ...input, voiceClips: { ...longClips, clips: { ...longClips.clips, k2: { key: 'k2', durationSec: 2, source: 'tts' } } } });
  assert.ok(!fits.audio.warnings.some((w) => w.code === 'tail-hold'));
  assert.equal(fits.timemap.outputDuration, 7);
});

test('tightening defaults and validation preserve old audio documents', () => {
  const c = run().composition; delete c.audio.tighten;
  assert.ok(validateComposition(c).ok);
  assert.deepEqual(resolveComposition(c).audio.tighten, {enabled:true,pauseSec:0.4});
  for (const tighten of [{enabled:'yes'}, {pauseSec:0.09}, {pauseSec:2.01}, {pauseSec:NaN}, null])
    assert.match(validateComposition({...c,audio:{...c.audio,tighten}}).errors.join('\n'), /audio.tighten/);
  const enabled = SETTINGS.find(s => s.path === 'audio.tighten.enabled'), pause = SETTINGS.find(s => s.path === 'audio.tighten.pauseSec');
  assert.equal(enabled.label, 'Trim waiting after narration'); assert.equal(enabled.control, 'toggle');
  assert.equal(pause.label, 'Pause after each sentence');
  assert.deepEqual([pause.min,pause.max,pause.step,pause.unit], [0.1,2,0.05,'s']);
});
