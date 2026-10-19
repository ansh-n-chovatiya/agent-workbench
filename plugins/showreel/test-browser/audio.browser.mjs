import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-audio-browser-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
const { syntheticRun } = await import('./helpers/synthetic-run.mjs');
const { renderRun } = await import('../scripts/lib/compose/render.mjs');
const { buildComposition } = await import('../scripts/lib/compose/composition.mjs');
const { speechLike, noise } = await import('../test/audio-helpers.mjs');

function wav(samples, rate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples.length * 2, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return buffer;
}
const measurer = async () => (await build({ stdin: { resolveDir: fileURLToPath(new URL('../', import.meta.url)), contents: `
  import { measureLoudness } from './scripts/lib/audio/loudness.mjs';
  window.measureFile = async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const decoded = await new OfflineAudioContext(2, 48000, 48000).decodeAudioData(bytes.buffer);
    const channels = [0, 1].map((i) => Float32Array.from(decoded.getChannelData(Math.min(i, decoded.numberOfChannels - 1))));
    return { ...measureLoudness(channels), seconds: decoded.duration, rate: decoded.sampleRate };
  };` }, write: false, bundle: true, format: 'iife', platform: 'browser' })).outputFiles[0].text;

test('export with narration and music: audio track, loudness within 0.5 LU of -16, true peak under -1 dBTP', { timeout: 300000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const run = await syntheticRun(browser, { name: 'synthetic-audio' });
    await mkdir(path.join(run.dir, 'voice', 'clips'), { recursive: true }); await mkdir(path.join(run.dir, 'music'), { recursive: true });
    const voice = speechLike(2.5, 21, 0.5);
    await writeFile(path.join(run.dir, 'voice', 'clips', 'k1.wav'), wav(voice, 48000));
    await writeFile(path.join(run.dir, 'voice', 'clips.json'), JSON.stringify({ version: 1, clips: { k1: { key: 'k1', durationSec: 2.5, source: 'file' } }, steps: { s1: 'k1' } }));
    await writeFile(path.join(run.dir, 'music', 'bed.wav'), wav(noise(1.5, -28), 48000));
    const composition = buildComposition({ ...run, overrides: { audio: { voice: { enabled: true }, music: { enabled: true, file: 'music/bed.wav', fadeInSec: 0.3, fadeOutSec: 0.5 } } } });
    await writeFile(path.join(run.dir, 'composition.json'), JSON.stringify(composition, null, 2) + '\n');
    const logs = [];
    const result = await renderRun({ name: run.name, log: (line) => logs.push(line) });
    assert.ok(result.audio, 'render reports audio'); assert.ok(['aac', 'opus'].includes(result.audio.codec));
    assert.ok(Math.abs(result.audio.measured.integratedLufs + 16) <= 0.5, JSON.stringify(result.audio.measured));
    assert.ok(result.audio.measured.truePeakDb <= -0.95, JSON.stringify(result.audio.measured));
    assert.ok(logs.some((line) => /^Loudness: -1[5-7]\.\d LUFS, true peak -\d+\.\d dBTP$/.test(line)), logs.join('\n'));
    assert.equal(result.plan.audio.narration.length, 1);
    const page = await browser.newPage();
    try {
      await page.addScriptTag({ content: await measurer() });
      const measured = await page.evaluate((base64) => window.measureFile(base64), (await readFile(result.finalFile)).toString('base64'));
      assert.equal(measured.rate, 48000);
      assert.ok(Math.abs(measured.seconds - result.plan.timemap.outputDuration) < 0.15, `${measured.seconds}`);
      assert.ok(Math.abs(measured.integratedLufs + 16) <= 1.0, JSON.stringify(measured));
      assert.ok(measured.truePeakDb <= -0.5, JSON.stringify(measured));
    } finally { await page.close(); }
  } finally { await browser.close(); }
});
