import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkCadence, monoRmsEnvelope, narrationOnsets, checkSync, checkLoudness, parseCaptions, checkCaptions, meanDifference, checkFrozen, allowedFreezeRanges, checkParity, checkContainer, auditPassed, formatAudit } from '../scripts/audit/checks.mjs';
import { startAuditServer, auditCommand } from '../scripts/audit/audit.mjs';
import { measureLoudness } from '../scripts/lib/audio/loudness.mjs';
import { sine } from './audio-helpers.mjs';
import { encodeWav, parseWav } from '../scripts/lib/voice/wav.mjs';
import { estimateTokens, stageFor } from '../scripts/lib/meter.mjs';
const frames = Array.from({ length: 60 }, (_, i) => ({ timestamp: i / 30, duration: 1 / 30 }));
test('cadence catches a dropped frame, irregular duration, leading gap, duplicate timestamp and container drift', () => {
  const check = (f = frames, containerDuration = 2, fps) => checkCadence({ frames: f, containerDuration, fps });
  assert.equal(check().pass, true); assert.equal(check().measured.count, 60);
  assert.equal(check(frames.filter((_, i) => i !== 17)).pass, false);
  assert.equal(check(frames.map((f, i) => i === 9 ? { ...f, duration: 0.05 } : f)).pass, false);
  assert.equal(check(frames.slice(1)).pass, false);
  assert.equal(check([...frames, frames[4]]).pass, false);
  assert.equal(check(frames, 2.101).pass, false);
  assert.equal(check(frames, 2.1).pass, true);
  assert.equal(check(frames, 2, 60).pass, false);
  assert.equal(check([]).pass, false);
});
test('sync separates encoder padding from onset alignment and skips no audio', () => {
  assert.equal(checkSync(25.433, 25.493).pass, true);
  assert.match(checkSync(25.433, 25.493).detail, /onset not checked \(no --project\)/);
  assert.equal(checkSync(180, 180.1).pass, true);
  for (const a of [180.101, 179.899, NaN]) assert.equal(checkSync(180, a).pass, false);
  assert.equal(checkSync(180, null).detail, 'no audio');
  assert.equal(checkSync(2, 2, { narration: [] }).pass, true);
});
const burstEnvelope = (starts, amplitude = 0.1) => {
  const signal = new Float32Array(48000 * 3);
  for (const start of starts) for (let i = Math.round(start * 48000); i < Math.round((start + 0.2) * 48000); i++) signal[i] = amplitude * Math.cos(2 * Math.PI * 1000 * i / 48000);
  return monoRmsEnvelope([signal], 48000);
};
test('5 ms mono RMS envelope downmixes stereo and measures a partial final window', () => {
  assert.deepEqual(monoRmsEnvelope([Float32Array.of(1, 1, 1), Float32Array.of(-1, -1, -1)], 400), { values: [0, 0], stepSec: 0.005 });
  assert.deepEqual(monoRmsEnvelope([Float32Array.of(1, 1, 0)], 400), { values: [1, 0], stepSec: 0.005 });
});
test('narration onset checks every placement, reports worst/mean and tolerates AAC-like 21 ms delay', () => {
  const narration = [{ stepId: 's1', outStart: 0.5 }, { stepId: 's2', outStart: 1.5 }];
  const check = starts => checkSync(3, 3.06, { envelope: burstEnvelope(starts), narration });
  assert.equal(check([0.5, 1.5]).pass, true);
  const delayed = check([0.521, 1.521]);
  assert.equal(delayed.pass, true);
  assert.ok(Math.abs(delayed.measured.worstMs - 20) < 1e-6);
  assert.ok(Math.abs(delayed.measured.meanMs - 20) < 1e-6);
  assert.equal(check([0.54, 1.54]).pass, true);
  for (const starts of [[0.62, 1.62], [0.38, 1.38], [0.5, 1.62], [0.5], [0.9, 1.9]]) assert.equal(check(starts).pass, false);
  assert.equal(checkSync(3, 3, { narration }).pass, false, 'missing envelope fails');
  assert.equal(checkSync(3, 3, { envelope: burstEnvelope([0.5, 1.5], 0.001), narration }).pass, false, 'sub-threshold audio is silent');
  assert.equal(narrationOnsets(burstEnvelope([0]), [{ outStart: 0 }])[0].onset, 0);
  const continuous = { values: Array(600).fill(0.1), stepSec: 0.005 };
  assert.equal(narrationOnsets(continuous, [{ outStart: 1 }])[0].onset, null, 'ongoing audio is not an onset');
  const two = narrationOnsets(burstEnvelope([0.5]), [{ outStart: 0.5 }, { outStart: 0.6 }]);
  assert.equal(two[1].onset, null, 'one burst cannot satisfy two placements');
});
test('loudness uses the existing meter on synthetic 1 kHz sine WAV files', () => {
  const measuredSine = db => measureLoudness(parseWav(encodeWav(sine(1000, db, 1), 48000)).data);
  // Mono 1 kHz sine at -13 dBFS measures approximately -16 LUFS.
  const good = measuredSine(-13);
  assert.ok(Math.abs(good.integratedLufs + 16) < 0.1, JSON.stringify(good));
  assert.equal(checkLoudness(good).pass, true);
  assert.equal(checkLoudness(measuredSine(-19)).pass, false);
  assert.equal(checkLoudness({ ...good, truePeakDb: -0.79 }).pass, false);
  assert.equal(checkLoudness({ integratedLufs: -15, truePeakDb: -0.8 }).pass, true);
  assert.equal(checkLoudness({ integratedLufs: -17, truePeakDb: -1 }).pass, true);
  assert.equal(checkLoudness(measureLoudness([new Float32Array(48000)])).pass, false);
  assert.equal(checkLoudness(null).skipped, true);
});
const cue = (a, b, id = 1) => `${id}\n00:00:${a} --> 00:00:${b}\nCaption\n`;
test('caption parsing validates SRT and VTT, overlap, ordering, length, bounds and malformed input', () => {
  const good = cue('00,000', '00,500') + '\n' + cue('00,500', '01,500', 2);
  assert.equal(checkCaptions(good, 2).pass, true);
  const vtt = 'WEBVTT\n\n' + good.replaceAll(',', '.');
  assert.deepEqual(parseCaptions(vtt), parseCaptions(good));
  assert.equal(checkCaptions('WEBVTT\n\n00:00.000 --> 00:00.700 align:start\nHi', 1).pass, true);
  assert.equal(checkCaptions(cue('00,000', '01,000') + '\n' + cue('00,900', '01,500', 2), 2).pass, false);
  assert.equal(checkCaptions(cue('01,000', '02,000') + '\n' + cue('00,000', '00,800', 2), 2).pass, false);
  assert.equal(checkCaptions(cue('00,000', '00,499'), 2).pass, false);
  assert.equal(checkCaptions(cue('00,000', '02,001'), 2).pass, false);
  for (const text of ['bad', cue('60,000', '61,000'), cue('01,000', '00,000')]) assert.equal(checkCaptions(text, 2).pass, false);
  assert.equal(checkCaptions('', 2).pass, true); // Explicit empty sidecar is valid for an export without cues.
  assert.equal(checkCaptions(null, 2).neededInput, true);
});
const still = seconds => Array.from({ length: Math.round(seconds * 10) + 1 }, (_, i) => ({ time: i / 10, difference: i ? 0.1 : null }));
const frozen = still(2);
test('still moments are informational through 4 s; longer stalls and failed cadence fail', () => {
  const info = checkFrozen(frozen);
  assert.equal(info.pass, true);
  assert.deepEqual(info.measured.stillMoments, [{ start: 0, end: 2 }]);
  assert.equal(info.detail, 'stalls: none; 1 still moments (longest 2.0 s)');
  assert.equal(checkFrozen(still(4)).pass, true);
  assert.equal(checkFrozen(still(4.1)).pass, false);
  assert.deepEqual(checkFrozen(still(4.1)).measured.ranges, [{ start: 0, end: 4.1 }]);
  assert.equal(checkFrozen(still(6), [{ start: 0, end: 6 }]).pass, true);
  assert.equal(checkFrozen(still(6), [{ start: 1, end: 6 }]).pass, true);
  assert.equal(checkFrozen(still(6), [{ start: 4.1, end: 6 }]).pass, false, 'card does not hide an adjacent stall');
  assert.deepEqual(checkFrozen(still(10), [{ start: 4.5, end: 5.5 }]).measured.ranges, [{ start: 0, end: 4.5 }, { start: 5.5, end: 10 }]);
  const moving = frozen.map(s => ({ ...s, difference: 0.2 }));
  assert.equal(checkFrozen(moving).pass, true);
  const badCadence = checkCadence({ frames: frames.filter((_, i) => i !== 17), containerDuration: 2 });
  assert.equal(checkFrozen(moving, [], badCadence.pass).pass, false);
  assert.equal(checkFrozen(still(6), [{ start: 0, end: 6 }], false).pass, false);
  assert.equal(checkFrozen([]).pass, false);
  const map = { titleEnd: 1, outroStart: 5, outputDuration: 6, segments: [{ rate: 0, outputStart: 3, outputEnd: 4 }] };
  assert.deepEqual(allowedFreezeRanges({ timemap: map }), [{ start: 0, end: 1 }, { start: 5, end: 6 }, { start: 3, end: 4 }]);
  assert.deepEqual(allowedFreezeRanges({ timemap: { ...map, titleEnd: 0, outroStart: null }, scenes: [{ outputStart: 10, plan: { timemap: map } }] }), [{ start: 13, end: 14 }]);
});
test('parity uses per-channel MAD and rejects one failed channel or missing comparison', () => {
  assert.deepEqual(meanDifference([0, 10, 20, 10, 20, 30], [2, 6, 26, 8, 24, 24]), [2, 4, 6]);
  assert.throws(() => meanDifference([], []));
  assert.throws(() => meanDifference([0, 0, 0], [0]));
  const values = Array.from({ length: 3 }, (_, i) => ({ time: i, difference: [2, 4, 6] }));
  assert.equal(checkParity(values).pass, true);
  assert.equal(checkParity(values.slice(1)).pass, false);
  assert.equal(checkParity([{ time: 0, difference: [6.01, 0, 0] }, ...values.slice(1)]).pass, false);
  assert.equal(checkParity(null).neededInput, true);
});
test('container checks MP4 and even dimensions, and reports fallback codecs', () => {
  const input = { format: 'mp4', codec: 'avc', width: 1280, height: 720, sizeBytes: 1234 };
  assert.equal(checkContainer(input).pass, true);
  assert.equal(checkContainer({ ...input, codec: 'vp9' }).pass, true);
  for (const changed of [{ format: 'webm' }, { width: 1279 }, { height: 0 }, { sizeBytes: 0 }, { codec: null }]) assert.equal(checkContainer({ ...input, ...changed }).pass, false);
});
test('strict fails missing requested QA inputs but permits no-audio skips; output stays under 700 estimated tokens', () => {
  const checks = [checkCadence({ frames, containerDuration: 2 }), checkSync(2, null), checkLoudness(null), checkCaptions(null, 2), checkFrozen(frozen), checkParity(null), checkContainer({ format: 'mp4', codec: 'avc', width: 1280, height: 720, sizeBytes: 1200 })];
  assert.equal(auditPassed([checkSync(2, null), checkLoudness(null)], true), true);
  assert.equal(auditPassed([checkParity(null)]), true);
  assert.equal(auditPassed([checkParity(null)], true), false);
  assert.equal(auditPassed([checkCaptions(null, 2)], true), false);
  assert.equal(auditPassed([checkFrozen(still(4.1))]), false);
  for (const c of checks) c.detail = 'x'.repeat(10000);
  assert.ok(estimateTokens(formatAudit({ checks, pass: false, strict: true })) <= 700);
  assert.equal(stageFor('audit'), 'edit/render');
});
test('audit CLI rejects invalid/missing options before launching a browser', async () => {
  await assert.rejects(auditCommand([]), /--video is required/);
  await assert.rejects(auditCommand(['--video']), /Missing value/);
  await assert.rejects(auditCommand(['--wat']), /Invalid audit option/);
  await assert.rejects(auditCommand(['--json', '--json']), /Invalid audit option/);
});
test('audit loopback transport serves byte ranges, suffixes, HEAD, invalid ranges and registered routes only', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-audit-server-'));
  let server;
  try {
    const file = path.join(dir, 'video.mp4'); await writeFile(file, '0123456789');
    server = await startAuditServer({ video: file });
    const url = server.url + 'video.mp4';
    for (const [range, expected] of [['bytes=2-5', '2345'], ['bytes=-3', '789'], ['bytes=7-', '789']]) {
      const res = await fetch(url, { headers: { Range: range } }); assert.equal(res.status, 206); assert.equal(await res.text(), expected);
    }
    for (const range of ['bytes=12-', 'bytes=5-2', 'bytes=-0', 'bytes=0-1,4-5', 'bad']) assert.equal((await fetch(url, { headers: { Range: range } })).status, 416);
    const head = await fetch(url, { method: 'HEAD' }); assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
    assert.equal(await (await fetch(url)).text(), '0123456789');
    assert.equal((await fetch(server.url + 'audit-page.js')).status, 200);
    assert.equal((await fetch(server.url + 'not-registered')).status, 404);
    assert.equal((await fetch(new URL('/video.mp4', server.url))).status, 404);
    assert.equal((await fetch(url, { method: 'POST' })).status, 404);
    server.check();
  } finally { await server?.close(); await rm(dir, { recursive: true, force: true }); }
});

test('audit compensates 250 ms clip lead measured from WAV, rejects 120 ms shift and retains legacy clips', async () => {
  const { loadNarrationLeads, loadAuditVoiceClips } = await import('../scripts/audit/audit.mjs');
  const { loadVoiceClips } = await import('../scripts/lib/compose/render.mjs');
  const { mkdir } = await import('node:fs/promises');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-audit-lead-'));
  try {
    await mkdir(path.join(dir, 'voice', 'clips'), { recursive: true });
    const pcm = new Float32Array(24000);
    for (let i = 6000; i < 18000; i++) pcm[i] = 0.1 * Math.cos(2 * Math.PI * 400 * i / 24000);
    await writeFile(path.join(dir, 'voice', 'clips', 'legacy.wav'), encodeWav(pcm, 24000));
    const index = { version: 1, steps: { s1: 'legacy', s2: 'missing' }, clips: {
      legacy: { key: 'legacy', durationSec: 1, source: 'tts' }, missing: { key: 'missing', durationSec: 1, source: 'own' } } };
    await writeFile(path.join(dir, 'voice', 'clips.json'), JSON.stringify(index));
    assert.equal((await loadVoiceClips(dir)).voiceClips.steps.s1, 'legacy', 'legacy audio still renders');
    assert.deepEqual(await loadAuditVoiceClips(dir), index, 'audit keeps unavailable placements');
    const narration = await loadNarrationLeads(dir, [{ stepId: 's1', clipUrl: 'voice/legacy.wav', outStart: 0.5 }]);
    assert.equal(narration[0].leadSilence, 0.25);
    const check = start => checkSync(3, 3.06, { envelope: burstEnvelope([start]), narration });
    assert.equal(check(0.75).pass, true);
    assert.equal(check(0.75).measured.onsets[0].expected, 0.75);
    assert.equal(check(0.87).pass, false);
    assert.equal(check(0.63).pass, false);
    // -45 dBFS on the original clip, not the trimming threshold (-50).
    pcm.fill(0); pcm.fill(0.004, 2400, 4800); pcm.fill(0.1, 6000, 18000);
    await writeFile(path.join(dir, 'voice', 'clips', 'legacy.wav'), encodeWav(pcm, 24000));
    assert.equal((await loadNarrationLeads(dir, narration))[0].leadSilence, 0.25);
    pcm.fill(0);
    await writeFile(path.join(dir, 'voice', 'clips', 'legacy.wav'), encodeWav(pcm, 24000));
    const silent = await loadNarrationLeads(dir, narration);
    const silentResult = checkSync(3, 3, { envelope: burstEnvelope([0.5]), narration: silent });
    assert.equal(silentResult.pass, false, 'an available silent clip cannot use the missing-file fallback');
    assert.doesNotMatch(silentResult.detail, /onset not verified exactly/);
    const missing = await loadNarrationLeads(dir, [{ stepId: 's2', clipUrl: 'voice/missing.wav', outStart: 0.5 }]);
    assert.equal(missing[0].leadSilence, null);
    for (const start of [0.5, 0.75, 0.9]) {
      const result = checkSync(3, 3, { envelope: burstEnvelope([start]), narration: missing });
      assert.equal(result.pass, true); assert.match(result.detail, /onset not verified exactly/);
      assert.equal(result.measured.onsets[0].errorMs, null);
    }
    for (const starts of [[0.495], [0.905], []]) assert.equal(checkSync(3, 3, { envelope: burstEnvelope(starts), narration: missing }).pass, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
