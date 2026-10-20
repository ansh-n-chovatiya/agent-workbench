// Browser integration test: authored for Phase 9 Q1; must be run outside the Codex sandbox.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const directory = await mkdtemp(path.join(os.tmpdir(), 'showreel-audit-browser-'));
process.env.SHOWREEL_HOME = path.join(directory, 'home');
const { syntheticRun } = await import('./helpers/synthetic-run.mjs');
const { renderRun } = await import('../scripts/lib/compose/render.mjs');
const { buildComposition } = await import('../scripts/lib/compose/composition.mjs');
const { auditVideo } = await import('../scripts/audit/audit.mjs');
const { toSrt } = await import('../scripts/lib/compose/captions.mjs');
const { sine, noise } = await import('../test/audio-helpers.mjs');

function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(48000, 24); b.writeUInt32LE(96000, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + 2 * i));
  return b;
}
test('audit passes a synthetic narration/music export and rejects an altered export with broken captions', { timeout: 300000 }, async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    // Larger moving marker stays above the audit's 0.2-level threshold after downscaling to 160×90.
    const run = await syntheticRun(browser, { name: 'audit-fixture', duration: 4, motionSize: 160 });
    await browser.close(); browser = null;
    await mkdir(path.join(run.dir, 'voice', 'clips'), { recursive: true });
    await mkdir(path.join(run.dir, 'music'), { recursive: true });
    // Sine narration gives plenty of peak headroom after normalization and lossy encoding.
    await writeFile(path.join(run.dir, 'voice', 'clips', 'k1.wav'), wav(sine(1000, -18, 2.5)));
    await writeFile(path.join(run.dir, 'voice', 'clips.json'), JSON.stringify({ version: 1, clips: { k1: { durationSec: 2.5, source: 'file' } }, steps: { s1: 'k1' } }));
    await writeFile(path.join(run.dir, 'music', 'bed.wav'), wav(noise(1.5, -28)));
    const composition = buildComposition({ ...run, overrides: {
      output: { width: 1280, height: 720, fps: 30 }, zoom: { enabled: false },
      audio: { voice: { enabled: true }, music: { enabled: true, file: 'music/bed.wav', gainDb: -60, fadeInSec: 0.3, fadeOutSec: 0.5 } },
    } });
    await writeFile(path.join(run.dir, 'composition.json'), JSON.stringify(composition));
    const good = await renderRun({ name: run.name, exportDir: path.join(directory, 'exports'), log: () => {} });
    assert.ok(good.audio);
    const srt = path.join(directory, 'good.srt'); await writeFile(srt, toSrt(good.plan.cues, good.plan.timemap));
    const report = await auditVideo({ video: good.finalFile, srt, project: run.name, strict: true });
    assert.equal(report.checks.length, 7);
    assert.equal(report.pass, true, JSON.stringify(report, null, 2));
    assert.ok(report.checks.every(c => c.pass && !c.skipped));
    const sync = report.checks.find(c => c.id === 'av-sync');
    if (good.audio.codec === 'aac') {
      assert.match(sync.detail, /edit list present: media_time 2112/);
      assert.ok(sync.measured.durationDifferenceMs <= 10);
    }
    assert.equal(sync.measured.onsets.length, good.plan.audio.narration.length);
    assert.ok(sync.measured.onsets.every(o => o.errorMs !== null && o.errorMs <= 40));
    assert.ok(sync.measured.worstMs <= 40);
    assert.match(report.checks.find(c => c.id === 'frozen').detail, /stalls: none; \d+ still moments/);

    composition.audio.voice.enabled = false; composition.audio.music.enabled = false;
    await writeFile(path.join(run.dir, 'composition.json'), JSON.stringify(composition));
    const silent = await renderRun({ name: run.name, exportDir: path.join(directory, 'silent'), log: () => {} });
    const corrupted = path.join(directory, 'corrupted.mp4'); await copyFile(silent.finalFile, corrupted);
    const broken = path.join(directory, 'broken.vtt');
    await writeFile(broken, 'WEBVTT\n\n00:00.000 --> 00:02.000\nOne\n\n00:01.500 --> 00:09.000\nOverlapping and past end\n');
    const cli = fileURLToPath(new URL('../scripts/showreel.mjs', import.meta.url));
    let failure;
    try { await promisify(execFile)(process.execPath, [cli, 'audit', '--video', corrupted, '--srt', broken, '--project', run.name, '--json', '--strict'], { env: { ...process.env, SHOWREEL_METER: '0' }, timeout: 120000 }); }
    catch (error) { failure = error; }
    assert.equal(failure?.code, 1, failure?.stderr);
    const bad = JSON.parse(failure.stdout);
    assert.equal(bad.pass, false);
    assert.deepEqual(bad.checks.filter(c => !c.pass).map(c => c.id), ['captions']);
    assert.match(bad.checks.find(c => c.id === 'captions').detail, /overlapping/);
    assert.match(bad.checks.find(c => c.id === 'captions').detail, /beyond video/);
    for (const id of ['av-sync', 'loudness']) assert.equal(bad.checks.find(c => c.id === id).detail, 'no audio');
  } finally { await browser?.close(); await rm(directory, { recursive: true, force: true }); }
});

// Authored without launching a browser: checks the decoded 10 Hz still-frame scan end to end.
test('audit treats a short static page as information and a long unplanned still as a stall', { timeout: 180000 }, async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    for (const duration of [4, 6]) {
      const run = await syntheticRun(browser, { name: `audit-still-${duration}`, duration, motionSize: 0 });
      try {
        const report = await auditVideo({ video: run.rawFile });
        const frozen = report.checks.find(c => c.id === 'frozen');
        assert.equal(frozen.pass, duration === 4, JSON.stringify(frozen));
        if (duration === 4) {
          assert.equal(frozen.measured.stillMoments.length, 1);
          assert.match(frozen.detail, /stalls: none; 1 still moments/);
        } else assert.equal(frozen.measured.ranges.length, 1);
      } finally { await rm(run.dir, { recursive: true, force: true }); }
    }
  } finally { await browser?.close(); }
});
