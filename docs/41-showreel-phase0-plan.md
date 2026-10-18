# Showreel Phase 0 Implementation Plan

> **Progress 2026-10-18:** Tasks 0, 1 (B0), 2 (S1) and 3 (S2) are done; results are in `docs/42-showreel-spike-findings.md`. Corrections found while running: S1 must serve its page from `http://127.0.0.1` (WebCodecs needs a secure context, `about:blank` fails); S2 must not use `waitUntil: 'networkidle'`; B0 must resolve the plugin path from the script's own location and count only runs that print `Final video:`; the acceptance URL has no hyphen. Added follow-up **S2b** (2x capture) after S2. Tasks 5 to 9 still contain steps that describe code instead of showing it (Task 6 steps 3 and 4, Task 7 step 5, Task 9 step 1); write those out in full before running them.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure the old skill's per-video token cost and answer spikes S1 to S8 of the showreel design with evidence, so Phase 1 starts from facts and a go/no-go decision.

**Architecture:** Throwaway spike code lives in `spikes/showreel/<spike>/` (never in `plugins/`, never in the marketplace). Each spike prints measurements to `spikes/showreel/results/<id>.json` and the findings are written up in `docs/42-showreel-spike-findings.md`. The spec is then updated with go/no-go results.

**Tech Stack:** Node (the skill's floor: `^20.19.0 || >=22.12.0`), Playwright 1.63.0, esbuild, mediabunny (MPL-2.0), kokoro-js (Apache-2.0), vitest-free plain `node --test`.

**Spec:** `docs/40-showreel-design.md` (sections 4, 7, 8, 16, 17, 21).

## Global Constraints

- Node `^20.19.0 || >=22.12.0`; Playwright `1.63.0` (same as `plugins/skills-demo/skills/demo-video/package.json`).
- Runs on Mac, Windows and Linux; a spike that is macOS-only must say so in its result.
- No GPL, AGPL or GSAP dependency. No Recordly code. Copy OpenScreen **code only**, never its images or fonts.
- Free forever: no accounts, API keys or paid services. The only local model is text-to-speech.
- Acceptance subject: `https://anshchovatiya.vercel.app/` (public, read-only).
- Nothing personal in committed files (no home paths, usernames or emails); run `python3 scripts/scan-personal-data.py` before every commit.
- Commits use the existing identity and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- **Operating model (owner's rule, 2026-10-18):** Claude plans, reviews and owns quality and consistency (specs, task briefs, diff review, independent verification of numbers, write-ups, go/no-go). Codex and Gemini do the implementation tasks (see the division of labour below). Every delegated task gets an exact brief and acceptance check from Claude, and Claude reviews the diff and re-runs the check before anything is committed.
- **Commit hygiene:** stage first, then run `python3 scripts/scan-personal-data.py` (it reads staged files; running it before `git add` skips new files). Results files must contain no home paths: scripts sanitise `~` at the source.
- Token stop rule: each task has a budget below. If a task passes its budget, stop and ask the owner.
- Codex (`codex exec -s workspace-write`) may write throwaway spike code from the exact spec in a task; the owner reviews diffs. Judgement calls and write-ups stay with Claude. **Codex's sandbox cannot launch browsers** (verified 2026-10-18: every launch failed and its results were discarded). **Gemini CLI 0.64.0 is also configured and has an unsandboxed shell** (verified: it launched Chromium and ran a Playwright script), so it can run browser, network and timing spikes (`gemini -p "<prompt>" --approval-mode yolo`, scoped to `spikes/`), and its large context suits reading a whole repo (S3). Division of labour: Codex writes pure-logic code and tests from exact specs (S6 loudness, S3 scanner); Gemini runs browser and network spikes and long-context reading (S2b, S7, S8, S3 analysis); Claude decides, reviews and writes up. Never trust a delegate's numbers: re-run or spot-check every measurement before it goes into the findings doc.

## File Structure

```
spikes/showreel/
  README.md                 what this folder is (throwaway) and how to run each spike
  package.json              shared spike dependencies
  results/                  one JSON per spike (git-tracked, small)
  b0-baseline/measure-run.mjs
  s1-export/{page.js,run.mjs}
  s2-capture/run.mjs
  s3-extract/scan.mjs
  s4-guide/{guide.mjs,replay.mjs}
  s5-tts/{kokoro.mjs,kitten.mjs}
  s6-loudness/{lufs.mjs,lufs.test.mjs,mix.mjs}
  s7-sync/{page.html,run.mjs}
  s8-memory/run.mjs
docs/42-showreel-spike-findings.md      written in Task 10
```

---

### Task 0: Spike workspace (budget 40k tokens)

**Files:**
- Create: `spikes/showreel/README.md`, `spikes/showreel/package.json`, `spikes/showreel/results/.gitkeep`
- Modify: `.gitignore` (ignore `spikes/showreel/node_modules/`, `spikes/showreel/scratch/`)

**Interfaces:**
- Produces: `spikes/showreel/package.json` with `playwright@1.63.0`, `esbuild`, `mediabunny`, `kokoro-js`, and a `scratch/` convention for large outputs that are never committed.

- [ ] **Step 1: Create the files**

`spikes/showreel/package.json`:
```json
{
  "name": "showreel-spikes",
  "private": true,
  "type": "module",
  "engines": { "node": "^20.19.0 || >=22.12.0" },
  "dependencies": {
    "playwright": "1.63.0",
    "mediabunny": "^1.40.1",
    "kokoro-js": "^1.2.1",
    "esbuild": "^0.25.0"
  }
}
```

`spikes/showreel/README.md`:
```markdown
# Showreel spikes (throwaway)

Evidence-gathering code for docs/41-showreel-phase0-plan.md. Nothing here ships.
Run `npm install` here, then each spike's `run.mjs` (see the plan). Results land in `results/*.json`.
Large outputs go in `scratch/` (git-ignored).
```

Append to `.gitignore`:
```
spikes/showreel/node_modules/
spikes/showreel/scratch/
```

- [ ] **Step 2: Install and verify**

Run: `cd spikes/showreel && npm install && node -e "import('playwright').then(m=>console.log('playwright ok', !!m.chromium))"`
Expected: `playwright ok true`

- [ ] **Step 3: Commit**

```bash
python3 scripts/scan-personal-data.py
git add spikes .gitignore
git commit -m "chore(showreel): spike workspace" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: B0, baseline token cost of the old skill (budget 300k tokens)

**Files:**
- Create: `spikes/showreel/b0-baseline/measure-run.mjs`, `spikes/showreel/results/b0-baseline.json`

**Interfaces:**
- Produces: `results/b0-baseline.json` shaped `{ runs: [{ input, output, cacheRead, cacheCreate, costUsd, durationMs, models }], median: {...} }`. Phase 8 compares against `median.input + median.output`.

The old skill must still be intact (it is: `plugins/skills-demo`). A run asks Claude to produce one demo video of the portfolio with the old skill, headless, so every token is counted from the CLI's own JSON result.

- [ ] **Step 1: Check the CLI flags exist**

Run: `claude -p --help | grep -E "output-format|plugin-dir|allowedTools|model"`
Expected: all four flags listed. If one is missing, adapt the script and note it in the results file.

- [ ] **Step 2: Write the measurement script**

`spikes/showreel/b0-baseline/measure-run.mjs`:
```js
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RUNS = Number(process.argv[2] ?? 3);
const plugin = resolve('../../plugins/skills-demo');
const prompt = `Use the demo-video skill to make a demo video of https://anshchovatiya.vercel.app/ : ` +
  `scroll the home page and open two sections, 5 steps, no voice, no Recordly. ` +
  `Do not ask me questions; use ~/Desktop/Demo Videos as the deliverables folder. ` +
  `When the render finishes, reply with the single line it prints beginning "Final video:".`;

const runs = [];
for (let i = 0; i < RUNS; i++) {
  const cwd = mkdtempSync(join(tmpdir(), 'b0-'));
  const t0 = Date.now();
  const r = spawnSync('claude', [
    '-p', prompt, '--plugin-dir', plugin, '--model', 'sonnet',
    '--output-format', 'json', '--allowedTools', 'Bash,Read,Write,Edit',
  ], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let out = {};
  try { out = JSON.parse(r.stdout); } catch { out = { parseError: r.stdout.slice(0, 500) }; }
  const u = out.usage ?? {};
  runs.push({
    input: u.input_tokens ?? 0, output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0, cacheCreate: u.cache_creation_input_tokens ?? 0,
    costUsd: out.total_cost_usd ?? null, durationMs: Date.now() - t0,
    models: Object.keys(out.modelUsage ?? {}), isError: !!out.is_error, result: String(out.result ?? '').slice(0, 200),
  });
  console.log(`run ${i + 1}/${RUNS}`, runs[i]);
}
const med = (k) => [...runs.map((x) => x[k])].sort((a, b) => a - b)[Math.floor(runs.length / 2)];
const result = { runs, median: { input: med('input'), output: med('output'), cacheRead: med('cacheRead'), cacheCreate: med('cacheCreate') } };
mkdirSync('../results', { recursive: true });
writeFileSync('../results/b0-baseline.json', JSON.stringify(result, null, 2));
console.log('median', result.median);
```

- [ ] **Step 3: Run once to check it works**

Run: `cd spikes/showreel/b0-baseline && node measure-run.mjs 1`
Expected: one run object with `isError: false` and a non-zero `input`. If it errors, read `result` and fix the prompt (for example `doctor` prerequisites) before the full run.

- [ ] **Step 4: Run three times**

Run: `node measure-run.mjs 3`
Expected: `../results/b0-baseline.json` with three runs and a median. Record `median.input + median.output` as **the baseline**.

- [ ] **Step 5: Commit**

```bash
git add spikes/showreel/b0-baseline spikes/showreel/results/b0-baseline.json
git commit -m "chore(showreel): baseline token cost of the old skill" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: S1, H.264 export in browsers (budget 400k tokens)

**Question:** Does WebCodecs H.264 encoding and MP4 muxing work in Chromium, Chrome, Edge, WebKit and Firefox, and what is the fallback?

**Files:**
- Create: `spikes/showreel/s1-export/page.js`, `spikes/showreel/s1-export/run.mjs`, `spikes/showreel/results/s1-export.json`

**Interfaces:**
- Produces: `results/s1-export.json` shaped `{ engines: { [name]: { avc: bool, vp9: bool, av1: bool, mp4Bytes: number|null, error: string|null } } }`.

- [ ] **Step 1: Write the page script**

`spikes/showreel/s1-export/page.js` (bundled into the page by esbuild):
```js
import { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } from 'mediabunny';

window.runExport = async () => {
  const res = { avc: false, vp9: false, av1: false, mp4Bytes: null, error: null };
  try {
    res.avc = await canEncodeVideo('avc');
    res.vp9 = await canEncodeVideo('vp9');
    res.av1 = await canEncodeVideo('av1');
    if (!res.avc) return res;
    const canvas = new OffscreenCanvas(1280, 720);
    const ctx = canvas.getContext('2d');
    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
    const source = new CanvasSource(canvas, { codec: 'avc', bitrate: 8_000_000 });
    output.addVideoTrack(source);
    await output.start();
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `hsl(${i * 4}, 70%, 50%)`;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#fff'; ctx.font = '64px sans-serif';
      ctx.fillText(`frame ${i}`, 80 + i * 6, 360);
      await source.add(i / 30, 1 / 30);
    }
    await output.finalize();
    res.mp4Bytes = output.target.buffer.byteLength;
  } catch (e) { res.error = String(e && e.message || e); }
  return res;
};
```

- [ ] **Step 2: Write the runner**

`spikes/showreel/s1-export/run.mjs`:
```js
import { build } from 'esbuild';
import { chromium, webkit, firefox } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

await build({ entryPoints: ['page.js'], bundle: true, format: 'iife', outfile: '../scratch/s1-page.js', logLevel: 'error' });
mkdirSync('../results', { recursive: true });

const targets = {
  'chromium-bundled': () => chromium.launch(),
  'chrome-installed': () => chromium.launch({ channel: 'chrome' }),
  'msedge-installed': () => chromium.launch({ channel: 'msedge' }),
  'webkit-playwright': () => webkit.launch(),
  'firefox-playwright': () => firefox.launch(),
};
const engines = {};
for (const [name, launch] of Object.entries(targets)) {
  try {
    const browser = await launch();
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.addScriptTag({ path: '../scratch/s1-page.js' });
    engines[name] = await page.evaluate(() => window.runExport());
    await browser.close();
  } catch (e) { engines[name] = { error: 'launch failed: ' + String(e.message).split('\n')[0] }; }
  console.log(name, engines[name]);
}
writeFileSync('../results/s1-export.json', JSON.stringify({ engines }, null, 2));
```

- [ ] **Step 3: Run it**

Run: `cd spikes/showreel/s1-export && mkdir -p ../scratch && node run.mjs`
Expected: one line per engine. If an engine is not installed (for example `msedge-installed`), the line says `launch failed`; that is a valid result. If `mediabunny` exports a name differently from the code above, correct the import against `node_modules/mediabunny` typings and rerun.

- [ ] **Step 4: Validate one produced file**

Add to `run.mjs` after `finalize` results are returned: in the page return the bytes for `chromium-bundled` via `Array.from(new Uint8Array(buffer))`, write `../scratch/s1.mp4`, then run `ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate ../scratch/s1.mp4`.
Expected: `codec_name=h264`, `1280x720`, `30/1`. (ffprobe is allowed in the spike only, to verify; the product never calls it.)

- [ ] **Step 5: Record the decision inputs and commit**

Fill the **S1** table in the findings doc in Task 10 from `results/s1-export.json`: which engines support `avc`, and what the headless fallback is (`vp9` in MP4, or WebM).

```bash
git add spikes/showreel/s1-export spikes/showreel/results/s1-export.json
git commit -m "chore(showreel): S1 browser H.264 export results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: S2, capture quality and disk (budget 600k tokens)

**Question:** Which capture method gives smooth, sharp frames, at what fps and bytes per minute?

**Files:**
- Create: `spikes/showreel/s2-capture/run.mjs`, `spikes/showreel/results/s2-capture.json`

**Interfaces:**
- Produces: `results/s2-capture.json` shaped `{ methods: { [name]: { fps, framesDropped, bytesPerMinute, width, height } } }`.

- [ ] **Step 1: Write the runner** (compares CDP screencast at two qualities with Playwright's built-in video)

`spikes/showreel/s2-capture/run.mjs`:
```js
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs';

const URL = 'https://anshchovatiya.vercel.app/';
const SECONDS = 15;
mkdirSync('../scratch/s2', { recursive: true });
const methods = {};

async function scrollFor(page, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) { await page.mouse.wheel(0, 40); await page.waitForTimeout(16); }
}

for (const [name, quality] of [['screencast-jpeg-90', 90], ['screencast-jpeg-100', 100]]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  const cdp = await ctx.newCDPSession(page);
  let frames = 0, bytes = 0, w = 0, h = 0; const stamps = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames++; bytes += Buffer.byteLength(f.data, 'base64'); w = f.metadata.deviceWidth; h = f.metadata.deviceHeight;
    stamps.push(f.metadata.timestamp);
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1 });
  await scrollFor(page, SECONDS);
  await cdp.send('Page.stopScreencast');
  const span = stamps.length > 1 ? stamps.at(-1) - stamps[0] : SECONDS;
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
  methods[name] = { fps: +(frames / span).toFixed(1), framesDropped: gaps.filter((g) => g > 0.05).length,
    bytesPerMinute: Math.round((bytes / span) * 60), width: w, height: h };
  console.log(name, methods[name]);
  await browser.close();
}

{ // Playwright built-in video for comparison
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: '../scratch/s2', size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await scrollFor(page, SECONDS);
  await ctx.close(); await browser.close();
  const f = readdirSync('../scratch/s2').find((x) => x.endsWith('.webm'));
  const size = statSync('../scratch/s2/' + f).size;
  methods['playwright-recordVideo'] = { fps: null, framesDropped: null, bytesPerMinute: Math.round((size / SECONDS) * 60), width: 1920, height: 1080 };
  console.log('playwright-recordVideo', methods['playwright-recordVideo']);
}
mkdirSync('../results', { recursive: true });
writeFileSync('../results/s2-capture.json', JSON.stringify({ methods }, null, 2));
```

- [ ] **Step 2: Run it**

Run: `cd spikes/showreel/s2-capture && node run.mjs`
Expected: three lines. A screencast `fps` near 60 with few dropped frames means real-time capture can meet the 60 fps target; around 25–30 means the default must be 30 fps (a spec change).

- [ ] **Step 3: Look at sharpness**

Extract one screencast frame to `../scratch/s2/frame.jpg` (add a line saving the first frame's base64) and one frame from the Playwright webm (`ffmpeg -i <webm> -frames:v 1 ../scratch/s2/pw.png`), open both and compare text sharpness. Write one sentence in the findings doc.

- [ ] **Step 4: Commit**

```bash
git add spikes/showreel/s2-capture spikes/showreel/results/s2-capture.json
git commit -m "chore(showreel): S2 capture quality results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: S3, OpenScreen extractability (budget 1,000k tokens; Codex may write the scanner)

**Question:** How much of OpenScreen's exporter, cursor renderer, timeline and zoom code can be borrowed without Electron, GSAP or its assets?

**Files:**
- Create: `spikes/showreel/s3-extract/scan.mjs`, `spikes/showreel/results/s3-extract.json`

**Interfaces:**
- Produces: `results/s3-extract.json` shaped `{ commit, files: [{ path, loc, electron, gsap, window_api, externalImports: string[] }], assets: [{ path, bytes }] }` and the findings paragraph naming which files are borrowable as is, borrowable with edits, or not borrowable.

- [ ] **Step 1: Clone a pinned snapshot into scratch (never into the repo)**

Run: `git clone --depth 1 https://github.com/siddharthvaddem/openscreen spikes/showreel/scratch/openscreen && git -C spikes/showreel/scratch/openscreen rev-parse HEAD`
Expected: a 40-character commit hash. Record it.

- [ ] **Step 2: Write the scanner**

`spikes/showreel/s3-extract/scan.mjs`:
```js
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const root = '../scratch/openscreen';
const focus = ['src/lib/exporter', 'src/lib/cursor', 'src/lib/captioning', 'src/components/video-editor/timeline',
  'src/components/video-editor/videoPlayback', 'src/lib/compositeLayout.ts', 'src/components/video-editor/types.ts'];

function walk(p) {
  if (statSync(p).isFile()) return [p];
  return readdirSync(p).flatMap((n) => walk(join(p, n)));
}
const files = [];
for (const f of focus) {
  let full; try { full = join(root, f); statSync(full); } catch { continue; }
  for (const p of walk(full).filter((x) => /\.(ts|tsx)$/.test(x) && !/\.test\./.test(x))) {
    const src = readFileSync(p, 'utf8');
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((i) => !i.startsWith('.') && !i.startsWith('@/'));
    files.push({
      path: relative(root, p), loc: src.split('\n').length,
      electron: (src.match(/electron/gi) || []).length, gsap: (src.match(/gsap/gi) || []).length,
      window_api: (src.match(/window\.electronAPI/g) || []).length, externalImports: [...new Set(imports)],
    });
  }
}
const assets = readdirSync(join(root, 'public')).map((n) => ({ path: 'public/' + n, bytes: statSync(join(root, 'public', n)).size }));
const commit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
writeFileSync('../results/s3-extract.json', JSON.stringify({ commit, files, assets }, null, 2));
const clean = files.filter((f) => !f.electron && !f.gsap && !f.window_api);
console.log(`${files.length} files, ${files.reduce((a, f) => a + f.loc, 0)} lines; ${clean.length} files with no electron/gsap/window.electronAPI reference`);
console.log('external packages used:', [...new Set(files.flatMap((f) => f.externalImports))].sort().join(', '));
```

- [ ] **Step 3: Run it and read the licences**

Run: `cd spikes/showreel/s3-extract && node scan.mjs`
Then read `../scratch/openscreen/LICENSE`, `package.json` dependency licences for each external package listed (`npm view <pkg> license`), and the licence note of any file under `public/` (wallpapers, fonts) before deciding they may be reused. Write the answer for each file group: borrowable as is / with edits / not borrowable.

- [ ] **Step 4: Try the smallest useful extraction**

Create `../scratch/extract-test/` containing a copy of only `src/lib/exporter/videoExporter.ts` and its relative imports, then try `npx esbuild videoExporter.ts --bundle --platform=browser --outfile=out.js`. Record whether it bundles without Electron and what must be stubbed. This is the evidence for "borrow the exporter".

- [ ] **Step 5: Commit**

```bash
git add spikes/showreel/s3-extract spikes/showreel/results/s3-extract.json
git commit -m "chore(showreel): S3 OpenScreen extractability results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: S4, Guide mode selector capture (budget 500k tokens)

**Question:** Can an injected recorder produce selectors that each resolve to exactly one element when replayed?

**Files:**
- Create: `spikes/showreel/s4-guide/guide.mjs`, `spikes/showreel/s4-guide/replay.mjs`, `spikes/showreel/results/s4-guide.json`

**Interfaces:**
- Produces: `guide.json` shaped `{ url, steps: [{ action: 'click'|'fill', selector, candidates: string[], name, url, value? }] }` and `results/s4-guide.json` `{ steps, uniqueOnReplay, failures: [...] }`.

- [ ] **Step 1: Write the recorder**

`spikes/showreel/s4-guide/guide.mjs`:
```js
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'https://anshchovatiya.vercel.app/';
const steps = [];
const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.exposeBinding('__sr_event', async ({ page }, ev) => {
  // keep only selectors that are unique on the page right now
  const unique = [];
  for (const c of ev.candidates) { if ((await page.locator(c).count()) === 1) unique.push(c); }
  steps.push({ action: ev.action, selector: unique[0] ?? null, candidates: unique, name: ev.name, url: page.url(), value: ev.value });
  console.log(steps.length, ev.action, unique[0] ?? '(no unique selector)');
});
await ctx.addInitScript(() => {
  const accName = (el) => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const role = (el) => el.getAttribute('role') || ({ A: 'link', BUTTON: 'button', INPUT: 'textbox', TEXTAREA: 'textbox', SELECT: 'combobox' })[el.tagName] || '';
  const cssPath = (el) => {
    const parts = [];
    while (el && el.nodeType === 1 && parts.length < 4) {
      let p = el.tagName.toLowerCase();
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); break; }
      const sib = [...el.parentElement.children].filter((s) => s.tagName === el.tagName);
      if (sib.length > 1) p += `:nth-of-type(${sib.indexOf(el) + 1})`;
      parts.unshift(p); el = el.parentElement;
    }
    return parts.join(' > ');
  };
  const candidates = (el) => {
    const out = []; const n = accName(el); const r = role(el);
    const tid = el.getAttribute('data-testid'); if (tid) out.push(`[data-testid="${tid}"]`);
    if (r && n) out.push(`role=${r}[name="${n.replace(/"/g, '\\"')}"i]`);
    if (el.id) out.push('#' + CSS.escape(el.id));
    const lbl = el.getAttribute('aria-label'); if (lbl) out.push(`[aria-label="${lbl}"]`);
    if (n) out.push(`text="${n.replace(/"/g, '\\"')}"`);
    out.push(cssPath(el)); return out;
  };
  addEventListener('click', (e) => {
    const el = e.target.closest('a,button,[role],input,select,textarea,summary,label') || e.target;
    window.__sr_event({ action: 'click', candidates: candidates(el), name: accName(el) });
  }, true);
  addEventListener('change', (e) => {
    const el = e.target; window.__sr_event({ action: 'fill', candidates: candidates(el), name: accName(el), value: el.value });
  }, true);
});
const page = await ctx.newPage();
await page.goto(url);
console.log('Click through your flow, then close the browser window.');
await new Promise((res) => browser.on('disconnected', res));
writeFileSync('../scratch/guide.json', JSON.stringify({ url, steps }, null, 2));
console.log('saved', steps.length, 'steps');
```

- [ ] **Step 2: Write the replay check**

`spikes/showreel/s4-guide/replay.mjs`:
```js
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const guide = JSON.parse(readFileSync('../scratch/guide.json', 'utf8'));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(guide.url, { waitUntil: 'networkidle' });
let unique = 0; const failures = [];
for (const [i, s] of guide.steps.entries()) {
  if (!s.selector) { failures.push({ i, why: 'no unique selector at capture' }); continue; }
  if (s.url !== page.url()) await page.goto(s.url, { waitUntil: 'networkidle' });
  const n = await page.locator(s.selector).count();
  if (n === 1) { unique++; try { if (s.action === 'click') await page.locator(s.selector).click({ timeout: 4000 }); else await page.locator(s.selector).fill(s.value ?? ''); } catch (e) { failures.push({ i, why: 'action failed: ' + String(e.message).split('\n')[0] }); } }
  else failures.push({ i, why: `selector matched ${n}` });
}
await browser.close();
writeFileSync('../results/s4-guide.json', JSON.stringify({ steps: guide.steps.length, uniqueOnReplay: unique, failures }, null, 2));
console.log({ steps: guide.steps.length, unique, failures });
```

- [ ] **Step 3: Run it (needs the owner for about two minutes)**

Run: `cd spikes/showreel/s4-guide && node guide.mjs` — ask the owner to click through five interactions on the portfolio (open a section, a link, a menu) and close the window. Then `node replay.mjs`.
Expected: `uniqueOnReplay` equals `steps` and `failures` is empty. If some steps have no unique selector, improve `candidates` (for example add a parent-scoped selector) and rerun; record what was needed.

- [ ] **Step 4: Write down what `guide.json` needs**

In the findings doc, list the fields that proved necessary (selector, candidates, name, url, value) and any extra field the failures called for.

- [ ] **Step 5: Commit**

```bash
git add spikes/showreel/s4-guide spikes/showreel/results/s4-guide.json
git commit -m "chore(showreel): S4 Guide mode selector capture results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: S5, voice models (budget 600k tokens; Codex may write the harness)

**Question:** How fast and how big is Kokoro on a modest CPU, and can the Kitten lightweight models run in Node?

**Files:**
- Create: `spikes/showreel/s5-tts/kokoro.mjs`, `spikes/showreel/s5-tts/kitten.mjs`, `spikes/showreel/results/s5-tts.json`

**Interfaces:**
- Produces: `results/s5-tts.json` shaped `{ kokoro: { rtf, peakRssMb, downloadMb, seconds }, kitten: { works: bool, rtf?, peakRssMb?, error? }, textWords }`; WAV files in `scratch/s5/` for a blind listen.

- [ ] **Step 1: Kokoro harness**

`spikes/showreel/s5-tts/kokoro.mjs`:
```js
import { KokoroTTS } from 'kokoro-js';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const text = 'This dashboard shows every deployment at a glance. Click a service to see its latest build, its owner, and whether anything needs your attention today.';
mkdirSync('../scratch/s5', { recursive: true });
const t0 = Date.now();
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
const loadS = (Date.now() - t0) / 1000;
let peak = process.memoryUsage().rss;
const iv = setInterval(() => { peak = Math.max(peak, process.memoryUsage().rss); }, 100);
const t1 = Date.now();
const audio = await tts.generate(text, { voice: 'af_heart' });
const genS = (Date.now() - t1) / 1000;
clearInterval(iv);
audio.save('../scratch/s5/kokoro.wav');
const seconds = audio.audio.length / audio.sampling_rate;
const out = { rtf: +(genS / seconds).toFixed(3), loadSeconds: +loadS.toFixed(1), peakRssMb: Math.round(peak / 1048576), seconds: +seconds.toFixed(1), textWords: text.split(' ').length };
console.log(out);
const prev = existsSync('../results/s5-tts.json') ? JSON.parse(readFileSync('../results/s5-tts.json', 'utf8')) : {};
writeFileSync('../results/s5-tts.json', JSON.stringify({ ...prev, kokoro: out }, null, 2));
```
Expected: `rtf` below 1.0 means faster than real time. Note the model download size from the cache directory (`du -sh` of the Hugging Face cache for this model) and write it as `downloadMb` by hand.

- [ ] **Step 2: Limit threads to imitate a weak PC**

Run again with `OMP_NUM_THREADS=2 node kokoro.mjs` and record the RTF as `kokoroTwoThreads` in the results file. Expected: report both; a 2-thread RTF above 1.5 means the tiny tier is needed on such machines.

- [ ] **Step 3: Kitten in Node**

`spikes/showreel/s5-tts/kitten.mjs`:
```js
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
mkdirSync('../scratch/s5', { recursive: true });
const res = { works: false };
try {
  const mod = await import('kitten-tts-js');
  console.log('exports:', Object.keys(mod));
  // Adjust to the actual API shown by the line above, then synthesise the same sentence as Kokoro
  // with the nano int8 model, timing it exactly as kokoro.mjs does.
  res.works = false; res.error = 'API not yet exercised: read the exports line and fill the call';
} catch (e) { res.error = String(e.message).split('\n')[0]; }
const prev = existsSync('../results/s5-tts.json') ? JSON.parse(readFileSync('../results/s5-tts.json', 'utf8')) : {};
writeFileSync('../results/s5-tts.json', JSON.stringify({ ...prev, kitten: res }, null, 2));
console.log(res);
```
- [ ] **Step 4: Make it real**

Run: `npm install kitten-tts-js` in `spikes/showreel`, run `node kitten.mjs`, read the printed exports and the package README (`npm view kitten-tts-js readme`), then replace the placeholder block above with the real call using the nano int8 model and the same sentence, writing `../scratch/s5/kitten.wav` and filling `rtf` and `peakRssMb`. If the package cannot run in Node, set `works: false` with the error and stop; that is a valid answer (the tiny tier then falls back to Kokoro at its lowest-cost setting).

- [ ] **Step 5: Blind listening and voice licences**

Ask the owner to listen to `kokoro.wav` and `kitten.wav` (names hidden by renaming to `a.wav` and `b.wav`) and say which sounds better. Check the licence note on the Kokoro voices (model card for `hexgrad/Kokoro-82M`) and write the result.

- [ ] **Step 6: Commit**

```bash
git add spikes/showreel/s5-tts spikes/showreel/results/s5-tts.json
git commit -m "chore(showreel): S5 voice model results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: S6, loudness and offline mixing (budget 300k tokens; Codex may write this)

**Question:** Can we measure and normalise loudness (BS.1770 / EBU R128) in plain JavaScript and mix music under narration offline?

**Files:**
- Create: `spikes/showreel/s6-loudness/lufs.mjs`, `spikes/showreel/s6-loudness/lufs.test.mjs`, `spikes/showreel/s6-loudness/mix.mjs`, `spikes/showreel/results/s6-loudness.json`

**Interfaces:**
- Produces: `integratedLufs(channels: Float32Array[], sampleRate: number): number` and `gainToTarget(measured: number, target: number): number` (linear gain). Phase 6 reuses these.

- [ ] **Step 1: Write the failing tests**

`spikes/showreel/s6-loudness/lufs.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { integratedLufs, gainToTarget } from './lufs.mjs';

const sine = (hz, dbfs, seconds, sr = 48000) => {
  const a = 10 ** (dbfs / 20), out = new Float32Array(seconds * sr);
  for (let i = 0; i < out.length; i++) out[i] = a * Math.sin((2 * Math.PI * hz * i) / sr);
  return out;
};

test('stereo 1 kHz sine at -23 dBFS reads about -23 LUFS (EBU Tech 3341 reference)', () => {
  const ch = sine(1000, -23, 20);
  assert.ok(Math.abs(integratedLufs([ch, ch], 48000) - -23) < 0.15);
});
test('a quieter signal reads lower', () => {
  const a = sine(1000, -23, 20), b = sine(1000, -33, 20);
  assert.ok(integratedLufs([a, a], 48000) - integratedLufs([b, b], 48000) > 9.5);
});
test('silence is below the absolute gate', () => {
  const z = new Float32Array(48000 * 5);
  assert.equal(integratedLufs([z, z], 48000), -Infinity);
});
test('gainToTarget scales to -16 LUFS', () => {
  assert.ok(Math.abs(20 * Math.log10(gainToTarget(-23, -16)) - 7) < 1e-9);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `cd spikes/showreel/s6-loudness && node --test lufs.test.mjs`
Expected: FAIL (module `lufs.mjs` not found).

- [ ] **Step 3: Implement BS.1770-4**

`spikes/showreel/s6-loudness/lufs.mjs`:
```js
// ITU-R BS.1770-4 K-weighting (48 kHz coefficients) and gated integrated loudness.
const SHELF = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
const HIPASS = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };

function biquad(x, { b, a }) {
  const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const kWeight = (x) => biquad(biquad(x, SHELF), HIPASS);

export function integratedLufs(channels, sampleRate) {
  if (sampleRate !== 48000) throw new Error('spike supports 48 kHz only; resample first');
  const w = channels.map(kWeight);
  const block = Math.round(0.4 * sampleRate), hop = Math.round(0.1 * sampleRate);
  const energies = [];
  for (let s = 0; s + block <= w[0].length; s += hop) {
    let sum = 0;
    for (const ch of w) { let e = 0; for (let i = s; i < s + block; i++) e += ch[i] * ch[i]; sum += e / block; }
    energies.push(sum);
  }
  const lufs = (z) => -0.691 + 10 * Math.log10(z);
  const abs = energies.filter((z) => z > 0 && lufs(z) > -70);
  if (!abs.length) return -Infinity;
  const mean = (a) => a.reduce((p, c) => p + c, 0) / a.length;
  const relGate = lufs(mean(abs)) - 10;
  const rel = abs.filter((z) => lufs(z) > relGate);
  return rel.length ? lufs(mean(rel)) : -Infinity;
}
export const gainToTarget = (measured, target) => 10 ** ((target - measured) / 20);
```

- [ ] **Step 4: Run to see them pass**

Run: `node --test lufs.test.mjs`
Expected: 4 passing. If the first test is off by more than 0.15 LU, check the filter coefficients against the BS.1770-4 table before changing the test.

- [ ] **Step 5: Offline mix with ducking (in a browser)**

`spikes/showreel/s6-loudness/mix.mjs` runs Chromium via Playwright, builds an `OfflineAudioContext(2, 48000*20, 48000)` with a narration buffer (a 220 Hz tone burst pair standing for two clips), a music buffer (a 110 Hz tone), a `GainNode` for the music with `setValueAtTime`/`linearRampToValueAtTime` ducking to 25% during narration, renders it, returns the channel data to Node, then calls `integratedLufs` and `gainToTarget(measured, -16)`, applies the gain, re-measures, and writes `{ measured, afterGain, withinOneLU: Math.abs(afterGain + 16) <= 1 }` to `../results/s6-loudness.json`. Write the file in full, following the structure of `s1-export/run.mjs` for the Playwright part.
Expected: `withinOneLU: true`, and music level during narration measurably lower than between clips (also record that in the results).

- [ ] **Step 6: Commit**

```bash
git add spikes/showreel/s6-loudness spikes/showreel/results/s6-loudness.json
git commit -m "chore(showreel): S6 loudness and offline mix results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: S7, A/V sync of the editor preview (budget 400k tokens)

**Question:** Does a single audio clock keep a video element and scheduled narration in sync over a long run?

**Files:**
- Create: `spikes/showreel/s7-sync/page.html`, `spikes/showreel/s7-sync/run.mjs`, `spikes/showreel/results/s7-sync.json`

**Interfaces:**
- Produces: `results/s7-sync.json` shaped `{ seconds, maxDriftMs, p95DriftMs, resyncs }`.

- [ ] **Step 1: Write the page**

`spikes/showreel/s7-sync/page.html` (uses the MP4 from S1 saved at `../scratch/s1.mp4`, served by the runner):
```html
<!doctype html><video id="v" src="/s1.mp4" muted playsinline loop style="width:640px"></video>
<script>
const v = document.getElementById('v');
window.start = async () => {
  const ac = new AudioContext(); await ac.resume();
  const t0 = ac.currentTime; const drift = []; let resyncs = 0;
  // schedule a click track so audio has a known timeline
  for (let t = 1; t < 180; t += 1) { const o = ac.createOscillator(); o.connect(ac.destination); o.start(t0 + t); o.stop(t0 + t + 0.05); }
  await v.play();
  const dur = v.duration;
  return new Promise((resolve) => {
    const tick = () => {
      const master = (ac.currentTime - t0) % dur;          // the single clock
      const d = v.currentTime - master;
      const wrapped = Math.abs(d) > dur / 2 ? Math.abs(Math.abs(d) - dur) : Math.abs(d);
      drift.push(wrapped * 1000);
      if (wrapped > 1 / 30) { v.currentTime = master; resyncs++; }   // correct if more than one frame off
      if (ac.currentTime - t0 < window.__seconds) requestAnimationFrame(tick); else resolve({ drift, resyncs });
    };
    requestAnimationFrame(tick);
  });
};
</script>
```

- [ ] **Step 2: Write the runner**

`spikes/showreel/s7-sync/run.mjs`:
```js
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';

const SECONDS = Number(process.argv[2] ?? 180);
const server = createServer((req, res) => {
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end(readFileSync('page.html')); }
  else if (req.url === '/s1.mp4') { res.setHeader('content-type', 'video/mp4'); res.end(readFileSync('../scratch/s1.mp4')); }
  else { res.statusCode = 404; res.end(); }
}).listen(0, '127.0.0.1');
const port = server.address().port;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.addInitScript((s) => { window.__seconds = s; }, SECONDS);
await page.goto(`http://127.0.0.1:${port}/`);
const { drift, resyncs } = await page.evaluate(() => window.start());
await browser.close(); server.close();
const sorted = [...drift].sort((a, b) => a - b);
const out = { seconds: SECONDS, maxDriftMs: +Math.max(...drift).toFixed(1), p95DriftMs: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1), resyncs };
writeFileSync('../results/s7-sync.json', JSON.stringify(out, null, 2));
console.log(out);
```

- [ ] **Step 3: Run it**

Run: `cd spikes/showreel/s7-sync && node run.mjs 180`
Expected: `p95DriftMs` under 40 (the spec's target). A high `resyncs` count with low drift means correction works but may be visible as stutter; note it.

- [ ] **Step 4: Commit**

```bash
git add spikes/showreel/s7-sync spikes/showreel/results/s7-sync.json
git commit -m "chore(showreel): S7 preview A/V sync results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: S8, 4K export memory (budget 300k tokens; Codex may write this)

**Question:** Does a 4K, 60 fps, 60 second export stay within a sane memory ceiling, and does encoder backpressure work?

**Files:**
- Create: `spikes/showreel/s8-memory/run.mjs`, `spikes/showreel/results/s8-memory.json`

**Interfaces:**
- Produces: `results/s8-memory.json` shaped `{ width, height, fps, seconds, encodedBytes, peakJsHeapMb, peakBrowserRssMb, maxEncodeQueue, completed }`.

- [ ] **Step 1: Write the runner**

`spikes/showreel/s8-memory/run.mjs` reuses the esbuild bundling pattern of `s1-export/run.mjs` with a page function `window.run4k(seconds)` that:
1. creates an `OffscreenCanvas(3840, 2160)` and a mediabunny `Output`/`CanvasSource` with `codec: 'avc'`;
2. draws a changing gradient plus text each frame for `seconds * 60` frames;
3. before each `source.add(...)`, awaits the add promise (mediabunny applies backpressure) and tracks `peakQueue` if it exposes `encodeQueueSize`, otherwise leaves `maxEncodeQueue` null;
4. returns `{ encodedBytes, completed }`.
The Node side samples, every 500 ms while the page runs, the JS heap via `cdp.send('Runtime.getHeapUsage')` and the browser process tree RSS with `ps -o rss= -p <pid>` summed over `pgrep -P <chromium pid>` children (macOS and Linux; note Windows as untested), and writes the peaks to `../results/s8-memory.json`. Start with `run4k(10)`, then `run4k(60)` only if 10 s stays under 2 GB.
Expected: `completed: true`. If the browser crashes or RSS passes about 4 GB, record the failure: it means a proxy and chunked export are required in Phase 4.

- [ ] **Step 2: Commit**

```bash
git add spikes/showreel/s8-memory spikes/showreel/results/s8-memory.json
git commit -m "chore(showreel): S8 4K export memory results" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Findings, go/no-go and Phase 1 gate (budget 200k tokens)

**Files:**
- Create: `docs/42-showreel-spike-findings.md`
- Modify: `docs/40-showreel-design.md` (spike table: add a Result column; adjust any spec statement a spike contradicted), `docs/00-README.md` (index row), `docs/41-showreel-phase0-plan.md` (tick the boxes)

- [ ] **Step 1: Write the findings doc**

One section per spike (B0, S1 to S8) with: the question, the measured numbers copied from `spikes/showreel/results/*.json`, a one-paragraph interpretation, and a **verdict** of `go`, `go with change` (stating the change) or `no-go` (stating the alternative). Include the baseline `median.input + median.output` and propose the Phase 8 token budget as a number.

- [ ] **Step 2: Apply decisions to the spec**

For each `go with change` or `no-go`, edit the matching spec section in the same commit (for example 30 fps default, a different tiny voice tier, a different exporter fallback) and list the edits at the end of the findings doc.

- [ ] **Step 3: Phase 1 gate**

End the findings doc with a table: each Phase 1 to 9 phase, its budget re-estimated from what the spikes revealed, and **Go / No-go for Phase 1** for the owner to answer.

- [ ] **Step 4: Scan, commit, push**

```bash
python3 scripts/scan-personal-data.py
git add docs spikes
git commit -m "docs(showreel): Phase 0 findings and go/no-go" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 5: Stop and ask the owner**

Present the verdicts, the baseline, the revised full-build estimate and the Phase 1 go/no-go. Do not start Phase 1 without an explicit yes.
