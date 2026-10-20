import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { trimSilence, speechBounds } from '../scripts/lib/voice/trim.mjs';
import { synthesizeToFile } from '../scripts/lib/voice/synthesize.mjs';
import { parseWav, encodeWav } from '../scripts/lib/voice/wav.mjs';
import { convertImport } from '../scripts/lib/voice/import.mjs';
const rate = 24000;
const frames = sec => Math.round(sec * rate);
const tone = (lead, speech, tail, amplitude = 0.2) => {
  const pcm = new Float32Array(frames(lead + speech + tail));
  for (let i = frames(lead); i < frames(lead + speech); i++) pcm[i] = amplitude * Math.cos(2 * Math.PI * 400 * i / rate);
  return parseWav(encodeWav(pcm, rate)).data[0];
};
test('trim keeps 60 ms lead and 180 ms tail and preserves speech samples', () => {
  const pcm = tone(0.25, 0.5, 0.5), original = pcm.slice();
  const [out] = trimSilence([pcm], rate);
  assert.equal(out.length, frames(0.74));
  assert.deepEqual(out.slice(frames(0.06), frames(0.56)), pcm.slice(frames(0.25), frames(0.75)));
  assert.deepEqual(pcm, original, 'pure: input is untouched');
  assert.deepEqual(speechBounds([out], rate), { start: frames(0.06), end: frames(0.56) });
});
test('quiet breaths above -50 dBFS survive at both edges and inside speech', () => {
  const pcm = tone(0.25, 0.7, 0.5);
  const quiet = tone(0, 0.1, 0, 0.005); // RMS about -49 dBFS
  pcm.set(quiet, frames(0.25)); pcm.set(quiet, frames(0.55)); pcm.set(quiet, frames(0.85));
  const [out] = trimSilence([pcm], rate);
  assert.equal(out.length, frames(0.94));
  assert.deepEqual(out.slice(frames(0.06), frames(0.76)), pcm.slice(frames(0.25), frames(0.95)));
});
test('all silence, below-threshold, tight and sub-100 ms clips stay unchanged', () => {
  for (const pcm of [new Float32Array(rate), tone(0.25, 0.5, 0.5, 0.001), tone(0.02, 0.5, 0.03), tone(0, 0.04, 0)]) {
    assert.deepEqual(trimSilence([pcm], rate)[0], pcm);
  }
  const [short] = trimSilence([tone(0.25, 0.005, 0.5)], rate);
  assert.ok(short.length >= frames(0.1));
  assert.equal(speechBounds([new Float32Array(rate)], rate), null);
});
test('10 ms fades reach zero at new cuts without touching detected speech; partial windows remain', () => {
  const pcm = tone(0.25, 0.5, 0.5); pcm.fill(0.001, 0, frames(0.25)); pcm.fill(0.001, frames(0.75));
  const [out] = trimSilence([pcm], rate);
  assert.equal(out[0], 0); assert.equal(out.at(-1), 0);
  assert.ok(out[frames(0.005)] < 0.0006);
  assert.ok(Math.abs(out[frames(0.01)] - pcm[frames(0.2)]) < 1e-8);
  const partial = new Float32Array(frames(0.5) + 1); partial[partial.length - 1] = 0.5;
  assert.equal(speechBounds([partial], rate).end, partial.length);
});
test('synthesis writes trimmed segments and actual duration, preserving explicit pauses; imports retain silence', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'showreel-trim-'));
  try {
    const pcm = tone(0.25, 0.5, 0.5), bytes = encodeWav(pcm, rate);
    const engine = { generate: async ({ out }) => { await writeFile(out, bytes); return { rtf: 0.1 }; } };
    const out = path.join(dir, 'clip.wav');
    const result = await synthesizeToFile({ engine, text: 'One [pause 0.5] Two', voice: 'af_heart', out });
    const wav = parseWav(await readFile(out));
    assert.equal(result.durationSec, 1.98); assert.equal(wav.durationSec, result.durationSec);
    assert.ok(wav.data[0].slice(frames(0.74), frames(1.24)).every(v => v === 0));
    const imported = convertImport(bytes);
    assert.equal(imported.durationSec, 1.25); assert.deepEqual(parseWav(imported.wav).data[0], pcm);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
