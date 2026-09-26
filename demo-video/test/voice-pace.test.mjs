// Narration pace, measured on real audio: the step floors the fixture and edit
// use, clips synthesized as the fixture does, placed by replanNarration, mixed,
// and the silences between sentences read back with ffmpeg silencedetect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.DEMO_VIDEO_HOME ??= path.join(tmpdir(), 'demo-video-home-test');
process.env.DEMO_VIDEO_DELIVER ??= path.join(tmpdir(), 'demo-video-deliver-test');
const { run } = await import('../scripts/lib/env.mjs');
const { DEFAULTS } = await import('../scripts/lib/config.mjs');
const { ttsAvailable, synth } = await import('../scripts/lib/tts.mjs');
const { stepFloorMs } = await import('../scripts/lib/timeline.mjs');
const { identityMap, replanNarration } = await import('../scripts/lib/timemap.mjs');

// Breaks caught: narration rushed (sentences run into each other or are sped
// up to fit) or padded (dead air between sentences that no action explains).
test('voice pace: 10 narrated steps breathe at least breathMs between sentences, never more than breathMs + 150 ms unless the action was longer, at normal speed', { timeout: 60_000 }, async (t) => {
  const tts = await ttsAvailable();
  if (!tts) return t.skip('no TTS installed');
  const dir = await mkdtemp(path.join(tmpdir(), 'voice-pace-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { pace, voice } = DEFAULTS;
  const titles = [
    'Open the orders page', 'Search for the customer by name', 'Filter to open orders',
    'Open the newest order', 'Check the shipping address', 'Change the delivery date',
    'Save the order', 'Go back to the list', 'Export the list as a spreadsheet', 'Done',
  ];
  // Steps 3 and 7 act for 6 s (a slow save, say), longer than anything they say.
  const actionMs = titles.map((_, i) => (i === 3 || i === 7 ? 6000 : 200));
  const ext = tts.tool === 'say' ? 'aiff' : 'wav';
  const files = titles.map((_, i) => path.join(dir, `${i}.${ext}`));
  const speech = await Promise.all(titles.map((s, i) => synth(s, files[i], { rate: voice.rate, leadMs: pace.voiceLeadMs })));

  // A step lasts its floor or its lead-in plus action, whichever is longer
  // (the fixture's hold is floor minus time already spent).
  let at = 0;
  const clips = titles.map((s, i) => {
    const clip = { index: i, start: at, duration: speech[i], file: files[i] };
    at += Math.max(stepFloorMs(s, pace, speech[i]), pace.captionLeadMs + actionMs[i]) / 1000;
    return clip;
  });
  const placed = replanNarration(clips, identityMap(at), { breathSec: pace.breathMs / 1000 }).voice;
  assert.equal(placed.length, titles.length);
  for (const p of placed) assert.equal(p.tempo, 1, `clip ${p.index} sped up to ${p.tempo}x: its step left no room to breathe`);

  // Mix at the placed starts and list the silences.
  const inputs = placed.flatMap((p) => ['-i', p.file]);
  const delayed = placed.map((p, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=mono,adelay=delays=${Math.round(p.start * 1000)}:all=1[a${i}]`);
  const graph = [...delayed, `${placed.map((_, i) => `[a${i}]`).join('')}amix=inputs=${placed.length}:normalize=0,silencedetect=noise=-40dB:d=0.1`].join(';');
  const { stderr } = await run('ffmpeg', ['-hide_banner', ...inputs, '-filter_complex', graph, '-f', 'null', '-']);
  const silences = [...stderr.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)]
    .map(([, end, d]) => ({ start: +end - +d, end: +end }));

  const lead = pace.voiceLeadMs / 1000, breath = pace.breathMs / 1000;
  for (let k = 1; k < placed.length; k++) {
    // The silence that ends where sentence k begins (its placed start plus the lead).
    const voiceAt = placed[k].start + lead;
    const gap = silences.find((s) => s.start < voiceAt && s.end >= voiceAt - 0.05);
    assert.ok(gap, `no silence before sentence ${k}: it runs into sentence ${k - 1}`);
    const ms = Math.round((gap.end - gap.start) * 1000);
    assert.ok(ms >= pace.breathMs - 20, `only ${ms} ms between sentences ${k - 1} and ${k}`);
    const longAction = actionMs[k - 1] + pace.captionLeadMs > (speech[k - 1] + breath) * 1000;
    if (!longAction) assert.ok(ms <= pace.breathMs + 150, `${ms} ms of dead air between sentences ${k - 1} and ${k}`);
    t.diagnostic(`gap ${k - 1}->${k}: ${ms} ms${longAction ? ' (long action)' : ''}`);
  }
});
