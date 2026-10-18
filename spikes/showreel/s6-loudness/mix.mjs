import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { integratedLufs, gainToTarget } from './lufs.mjs';

const SR = 48000, SECS = 20;
const server = createServer((q, r) => { r.setHeader('content-type', 'text/html'); r.end('<!doctype html><title>s6</title>'); }).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const browser = await chromium.launch();
let out;
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const render = (withNarration) => page.evaluate(async ({ SR, SECS, withNarration }) => {
    const ac = new OfflineAudioContext(2, SR * SECS, SR);
    const clips = [[2.0, 5.5], [9.0, 13.0]];
    const music = ac.createGain(); music.gain.value = 1; music.connect(ac.destination);
    for (const f of [110, 220]) { const o = ac.createOscillator(); o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.05; o.connect(g).connect(music); o.start(0); }   // -26 dBFS each
    for (const [a, b] of clips) {   // duck to 25 percent: 150 ms attack, 400 ms release
      music.gain.setValueAtTime(1, a - 0.15); music.gain.linearRampToValueAtTime(0.25, a);
      music.gain.setValueAtTime(0.25, b); music.gain.linearRampToValueAtTime(1, b + 0.4);
    }
    if (withNarration) for (const [a, b] of clips) {
      const o = ac.createOscillator(); o.frequency.value = 220; const g = ac.createGain();
      g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.1, a + 0.03); g.gain.setValueAtTime(0.1, b - 0.03); g.gain.linearRampToValueAtTime(0, b);   // -20 dBFS, 30 ms fades
      o.connect(g).connect(ac.destination); o.start(a); o.stop(b);
    }
    const buf = await ac.startRendering();
    const enc = (ch) => { const u = new Uint8Array(buf.getChannelData(ch).buffer.slice(0)); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768)); return btoa(s); };
    return [enc(0), enc(1)];
  }, { SR, SECS, withNarration });
  const dec = (b64) => new Float32Array(Buffer.from(b64, 'base64').buffer.slice(0));
  const [mixL, mixR] = (await render(true)).map(dec);
  const [musL] = (await render(false)).map(dec);
  const measured = integratedLufs([mixL, mixR], SR);
  const gain = gainToTarget(measured, -16);
  const after = integratedLufs([mixL.map((x) => x * gain), mixR.map((x) => x * gain)], SR);
  const rms = (a, from, to) => { let s = 0, n = 0; for (let i = Math.floor(from * SR); i < Math.floor(to * SR); i++) { s += a[i] * a[i]; n++; } return Math.sqrt(s / n); };
  const duringDb = 20 * Math.log10(rms(musL, 3.0, 5.0)), betweenDb = 20 * Math.log10(rms(musL, 6.5, 8.5));
  out = { measuredLufs: +measured.toFixed(2), gainDb: +(20 * Math.log10(gain)).toFixed(2), afterGainLufs: +after.toFixed(2), withinOneLU: Math.abs(after + 16) <= 1,
    musicDuringNarrationDb: +duringDb.toFixed(2), musicBetweenClipsDb: +betweenDb.toFixed(2), duckingDepthDb: +(betweenDb - duringDb).toFixed(2) };
} catch (e) { out = { error: String(e.message).split('\n')[0] }; }
finally { await browser.close().catch(() => {}); server.close(); }
writeFileSync('../results/s6-loudness.json', JSON.stringify(out, null, 2)); console.log(out);
process.exit(0);
