// selftest: the whole pipeline on the bundled local page, run as a user would
// run it (separate `demo.mjs` processes from a project folder that holds only
// the scenarios), inside a temp HOME so the real Desktop, Downloads and
// ~/.demo-video are never touched. Prints PASS/FAIL per check and the temp
// folder so it can be inspected.
//
// Order: two scenarios that must fail in rehearsal (a broken locator; a
// blocked save followed by a failing assertion), the real recording, a render
// with no run named (so it must find the newest run itself), checks on what
// was delivered, a Recordly handoff with a stand-in app whose only "export"
// is a copy of the clip (rejected; the render falls back to its drawn cursor
// after a short timeout), and last a user-edited Recordly export built with
// ffmpeg, rendered with its saved project and again without it.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SKILL_ROOT, run, log, ffprobeDuration } from './env.mjs';
import { ttsAvailable } from './tts.mjs';
import { recordlyPaths } from './recordly.mjs';
import { parseCues } from './subtitles.mjs';
import { mapFromEdits } from './timemap.mjs';
import { MAX_UNSURE_SEC } from './render.mjs';
import { TITLE_SEC, END_SEC, XFADE_SEC } from './compose.mjs';
import { DEFAULTS } from './config.mjs';

const CLI = path.join(SKILL_ROOT, 'scripts', 'demo.mjs');
const SPEC = path.join(SKILL_ROOT, 'templates', 'selftest', 'selftest.spec.ts');
const PROJECT = 'selftest-app';
const SLUG = 'selftest';
const DELIVERED = (s) => [`${s}.mp4`, `${s}-short.mp4`, `${s}.srt`, `${s}.vtt`, `${s}-poster.png`, `${s}-contact-sheet.png`];
const SHORT_MB_PER_MIN = 8;
const REHEARSAL_LIMIT_SEC = 15;

const readJson = async (f) => JSON.parse(await readFile(f, 'utf8'));

// Every file under `root` that is not inside one of `allowed` (absolute
// folders). Empty when everything landed where it should.
export async function strayFiles(root, allowed) {
  const inside = (f) => allowed.some((a) => f === a || f.startsWith(a + path.sep));
  const out = [];
  for (const e of await readdir(root, { withFileTypes: true, recursive: true })) {
    const f = path.join(e.parentPath ?? e.path, e.name);
    if (!e.isDirectory() && !inside(f)) out.push(f);
  }
  return out;
}

// Playwright looks for its browsers under HOME; the temp HOME has none, so
// children are pointed at the real download folder.
function browsersPath() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Caches', 'ms-playwright');
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA ?? home, 'ms-playwright');
  return path.join(process.env.XDG_CACHE_HOME ?? path.join(home, '.cache'), 'ms-playwright');
}

// Runs `demo.mjs <args>` in `cwd` with `env`; stdin is not a terminal, as for
// an agent. Resolves {code, out, sec}; out is stdout and stderr together.
function cli(args, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const child = spawn(process.execPath, [CLI, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, out, sec: (performance.now() - t0) / 1000 }));
  });
}

async function probe(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration', '-of', 'json', file]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const [n, d] = v.r_frame_rate.split('/').map(Number);
  return { ...v, fps: n / d, audio: j.streams.find((s) => s.codec_type === 'audio')?.codec_name ?? null,
    subtitle: j.streams.find((s) => s.codec_type === 'subtitle')?.codec_name ?? null, duration: +j.format.duration };
}

// One frame of `file` at `t` s, cropped (`w:h:x:y`), as 8-bit gray bytes.
function gray(file, t, crop) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `crop=${crop},format=gray`, '-f', 'rawvideo', '-']);
    const chunks = [];
    child.stdout.on('data', (d) => chunks.push(d));
    child.on('error', reject);
    child.on('close', () => resolve(Buffer.concat(chunks)));
  });
}
const meanDiff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const countDiff = (a, b, over) => { let n = 0; for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > over) n++; return n; };

export async function main() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'demo-selftest-'));
  const home = path.join(dir, 'home');
  const dataDir = path.join(home, '.demo-video');
  const deliverRoot = path.join(home, 'Desktop', 'Demo Videos');
  const project = path.join(dir, PROJECT);
  const scratch = path.join(dir, 'scratch');
  const runsDir = path.join(dataDir, 'runs', PROJECT);
  const env = { ...process.env, HOME: home, DEMO_VIDEO_HOME: dataDir, DEMO_VIDEO_DELIVER: deliverRoot, PLAYWRIGHT_BROWSERS_PATH: browsersPath() };
  delete env.DEMO_VIDEO_CONFIG;
  delete env.DEMO_RECORDLY_FAKE;

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
  };
  const tail = (out) => out.trim().split('\n').slice(-6).join(' | ');

  log(`Selftest folder: ${dir}`);
  for (const d of [project, scratch, path.join(dataDir, 'configs')]) await mkdir(d, { recursive: true });
  // The project holds only scenarios; its config lives in the home folder.
  const spec = await readFile(SPEC, 'utf8');
  const variants = {
    'selftest.spec.ts': spec,
    'broken-locator.spec.ts': spec.replace("getByLabel('In stock only')", "getByLabel('In stock only (renamed)')"),
    'blocked-save.spec.ts': spec.replace("'Save blocked: nothing was changed'", "'List saved'"),
  };
  for (const [name, text] of Object.entries(variants)) {
    if (name !== 'selftest.spec.ts' && text === spec) throw new Error(`selftest: could not derive ${name}; templates/selftest/selftest.spec.ts changed`);
    await writeFile(path.join(project, name), text);
  }
  await writeFile(path.join(dataDir, 'configs', `${PROJECT}.json`), JSON.stringify({ baseURL: 'http://127.0.0.1:9', phone: { enabled: true } }, null, 2));
  const projectBefore = (await readdir(project)).sort();
  const opts = { cwd: project, env };

  // 1. Rehearsal stops a broken locator fast, naming the step.
  const broken = await cli(['record', 'broken-locator.spec.ts'], opts);
  check(`rehearsal stops a broken locator in under ${REHEARSAL_LIMIT_SEC} s, naming the step`,
    broken.code !== 0 && broken.sec < REHEARSAL_LIMIT_SEC && /rehearsal failed in step "Keep only what is in stock"/.test(broken.out) && !/^Recording /m.test(broken.out),
    `exit ${broken.code} after ${broken.sec.toFixed(1)} s; ${tail(broken.out)}`);

  // 2. A failure after a blocked write exits non-zero with the allowWrites fix.
  const blocked = await cli(['record', 'blocked-save.spec.ts'], opts);
  const failedDir = (await readdir(runsDir).catch(() => [])).find((n) => n.endsWith('blocked-save-failed'));
  const failed = failedDir ? await readJson(path.join(runsDir, failedDir, 'failed.json')) : null;
  check('a failed recording exits non-zero and names the blocked address with an allowWrites fix',
    blocked.code !== 0 && blocked.out.includes('"allowWrites": ["/save"]') && /server actions/.test(blocked.out)
      && !!failed?.blocked?.some((b) => b.method === 'POST' && b.path === '/save') && failed.hints?.length > 0,
    `exit ${blocked.code}; ${failed ? `failed.json blocked ${JSON.stringify(failed.blocked)}` : `no failed.json; ${tail(blocked.out)}`}`);

  // 3. The real recording, then a render that must find it unnamed.
  const voice = !!(await ttsAvailable());
  const rec = await cli(['record', 'selftest.spec.ts', ...(voice ? ['--voice'] : [])], opts);
  check('record', rec.code === 0, rec.code === 0 ? `${rec.sec.toFixed(1)} s, voice ${voice ? 'on' : 'off (no TTS)'}` : `exit ${rec.code}; ${tail(rec.out)}`);
  if (rec.code !== 0) return finish(results, dir);
  const runDir = path.join(runsDir, (await readdir(runsDir)).find((n) => !n.endsWith('-failed') && n.endsWith(SLUG)));
  const ren = await cli(['render'], opts);
  check('render with no run named finds the newest recording (failed runs skipped)', ren.code === 0 && existsSync(path.join(runDir, 'out', 'run.json')),
    ren.code === 0 ? `${ren.sec.toFixed(1)} s` : `exit ${ren.code}; ${tail(ren.out)}`);
  if (ren.code !== 0) return finish(results, dir);

  const finals = ren.out.split('\n').filter((l) => l.startsWith('Final video: '));
  const m = finals.length === 1 && /^Final video: (\/.+\.mp4) \((\d+\.\d) s, (\d+)x(\d+), ([\d.]+) fps\)$/.exec(finals[0]);
  check('exactly one summary line: Final video: <absolute path> (<s> s, 1920x1080, 60 fps)',
    !!m && existsSync(m[1]) && m[1].startsWith(deliverRoot + path.sep) && m[3] === '1920' && m[4] === '1080' && m[5] === '60', finals.join(' | ') || 'none');
  const quiet = ['captions/cards', 'compose', 'checks', 'deliver'].filter((s) => !ren.out.split('\n').some((l) => new RegExp(`^\\[\\d+\\.\\d s\\] ${s}$`).test(l)));
  check('render prints one line per stage with elapsed seconds', !quiet.length, quiet.length ? `missing ${quiet.join(', ')}` : 'captions/cards, compose, checks, deliver');

  const folders = await readdir(deliverRoot).catch(() => []);
  const folder = folders.length === 1 ? path.join(deliverRoot, folders[0]) : null;
  const missing = folder ? DELIVERED(SLUG).filter((f) => !existsSync(path.join(folder, f))) : DELIVERED(SLUG);
  check('deliverables in one folder <slug>-<YYYY-MM-DD-HHMM> with readable names', !!folder && /^selftest-\d{4}-\d\d-\d\d-\d{4}$/.test(folders[0]) && !missing.length,
    folder ? (missing.length ? `missing ${missing.join(', ')}` : `${folder}: ${DELIVERED(SLUG).join(', ')}`) : `${folders.length} folders in ${deliverRoot}`);

  const stray = await strayFiles(home, [dataDir, deliverRoot]);
  const projectAfter = (await readdir(project)).sort();
  check('files only under ~/.demo-video and the deliverables folder; nothing in the project',
    !stray.length && JSON.stringify(projectAfter) === JSON.stringify(projectBefore),
    stray.length ? `stray: ${stray.slice(0, 5).join(', ')}` : `project holds ${projectAfter.join(', ')}`);
  if (!folder || missing.length) return finish(results, dir);

  const runJson = await readJson(path.join(runDir, 'out', 'run.json'));
  const r = runJson.render ?? {};
  const final = path.join(folder, `${SLUG}.mp4`);
  const d = await probe(final);
  check(`final video 1920x1080 60 fps h264${voice ? ' with narration' : ''}`,
    d.width === 1920 && d.height === 1080 && Math.abs(d.fps - 60) < 0.01 && d.codec_name === 'h264' && (!voice || d.audio === 'aac'),
    `${d.width}x${d.height} ${d.fps} fps ${d.codec_name}, audio ${d.audio ?? 'none'}, ${d.duration.toFixed(1)} s`);
  const s = await probe(path.join(folder, `${SLUG}-short.mp4`));
  const mb = (await stat(path.join(folder, `${SLUG}-short.mp4`))).size / 1e6;
  const cap = SHORT_MB_PER_MIN * Math.max(1, d.duration / 60);
  check('short version <= 720p and under the size cap', s.height <= 720 && mb <= cap, `${s.width}x${s.height}, ${mb.toFixed(2)} MB (cap ${cap.toFixed(1)} MB)`);

  // Band mode burns the captions, so an embedded track would be drawn over
  // them as well; the cues ship only as .srt/.vtt.
  const srt = parseCues(await readFile(path.join(folder, `${SLUG}.srt`), 'utf8'));
  check('band mode embeds no subtitle track; the .srt carries every cue', d.subtitle === null && srt.length > 0 && srt.length === (r.captions?.length ?? -1),
    `track ${d.subtitle ?? 'none'}, ${srt.length} cue(s) in .srt, ${r.captions?.length ?? '?'} caption(s) burned`);
  check('captions appear where the subtitles start', r.sync?.ok === true, r.sync?.detail ?? 'no result');
  check('freeze check clean (laptop and phone segment)', r.freeze?.ok === true && r.layout?.phone != null,
    `${r.freeze?.spans?.length ?? '?'} frozen span(s), phone segment ${r.layout?.phone != null ? `from ${r.layout.phone.toFixed(2)} s` : 'missing'}`);
  const posts = (runJson.blocked ?? []).filter((b) => b.method === 'POST');
  check('the save POST was blocked in every clip', posts.length > 0 && runJson.clips.every((c) => posts.some((b) => b.clip === c.name)),
    posts.map((b) => `${b.clip} ${b.method} ${b.url}`).join('; ') || 'none');

  // Band layout: the recording fills the frame above the band edge to edge
  // and a caption changes only the band. Compared with the edited clip at the
  // same instant mid-caption, where the drawn cursor is the only other change.
  const band = runJson.layout?.band ?? 0;
  const uiH = 1080 - band;
  const clip = path.join(runDir, 'edit', 'laptop', 'clip.mp4');
  const size = await probe(clip);
  const caption = (await readJson(path.join(runDir, 'edit', 'laptop', 'captions.json')))[1];
  const clipT = (caption.start + caption.end) / 2;
  const t = r.layout.laptop + clipT;
  const changed = countDiff(await gray(final, t, `1920:${uiH}:0:0`), await gray(clip, clipT, `1920:${uiH}:0:0`), 60);
  let edgeDiff = 0;
  for (const x of [0, 1912]) edgeDiff = Math.max(edgeDiff, meanDiff(await gray(final, t, `8:${uiH}:${x}:0`), await gray(clip, clipT, `8:${uiH}:${x}:0`)));
  const lit = countDiff(await gray(final, t, `1920:${band}:0:${uiH}`), await gray(final, r.layout.laptop + caption.start - 0.15, `1920:${band}:0:${uiH}`), 100);
  check('band layout: UI area free of caption pixels, no side margins, caption in the band',
    band > 0 && size.width === 1920 && size.height === uiH && changed < 1500 && edgeDiff < 3 && lit > 2000,
    `band ${band} px, clip ${size.width}x${size.height}; ${changed} UI pixels differ from the recording (the cursor), edge columns differ by ${edgeDiff.toFixed(1)}, ${lit} caption pixels in the band`);

  // 4. Recordly handoff with a stand-in app, on a copy of the run delivering
  // to its own folder so the deliverables above stay as they are. Its only
  // "export" is a copy of the clip, which must be rejected; the short timeout
  // then falls back to the drawn cursor.
  const fb = await runCopy(runDir, '-recordly', path.join(deliverRoot, `${SLUG}-recordly-fallback`));
  const fake = { openCmd: ['sh', '-c', 'cp "{clip}" "{export}"'], watch: [], pollMs: 100, settleMs: 200, timeoutMs: 4000, projectDirs: [], recentFile: null, projectWaitMs: 0 };
  const hand = await cli(['render', fb.dir, '--recordly', '--no-phone', '--no-voice', '--no-open'], { cwd: project, env: { ...env, DEMO_RECORDLY_FAKE: JSON.stringify(fake) } });
  const where = recordlyPaths(fb.folder, SLUG);
  const fbRun = existsSync(path.join(fb.dir, 'out', 'run.json')) ? (await readJson(path.join(fb.dir, 'out', 'run.json'))).render : {};
  check('Recordly handoff: pair placed in for-recordly/, a copy of the clip rejected, drawn cursor after a short timeout',
    hand.code === 0 && existsSync(where.clip) && existsSync(`${where.clip}.cursor.json`) && /Not the export: .* is a copy of the clip given to Recordly/.test(hand.out)
      && /rendering with the drawn cursor instead/.test(hand.out) && fbRun.cursorDrawn === true && fbRun.recordlyExport === null && existsSync(path.join(fb.folder, `${SLUG}.mp4`)),
    `exit ${hand.code} after ${hand.sec.toFixed(1)} s; cursor drawn ${fbRun.cursorDrawn}; ${hand.out.split('\n').find((l) => l.startsWith('No Recordly export')) ?? tail(hand.out)}`);

  // 5. A user-edited Recordly export: built here with ffmpeg from the clip
  // (a cut step, a 4x and a 0.5x section, a 110% zoom, added audio) with the
  // project Recordly would save for it, rendered once with the project and
  // once without it (the edits then come from aligning frames).
  const edited = await recordlyEdits({ runDir, scratch, deliverRoot, project, env, check, tail, voice });

  const strayEnd = await strayFiles(home, [dataDir, deliverRoot]);
  check('still nothing outside ~/.demo-video and the deliverables folder', !strayEnd.length, strayEnd.slice(0, 5).join(', ') || 'clean');
  log(`Timings: rehearsal failures ${broken.sec.toFixed(1)} s and ${blocked.sec.toFixed(1)} s, record ${rec.sec.toFixed(1)} s, render ${ren.sec.toFixed(1)} s, Recordly fallback render ${hand.sec.toFixed(1)} s, edited-export renders ${edited.map((s) => `${s.toFixed(1)} s`).join(' and ')}.`);
  log(`Delivered: ${folder}`);
  return finish(results, dir);
}

// A copy of the run (record.json, edit/ and the narration clips) that
// delivers to `folder`, so a second render leaves the first one's files be.
async function runCopy(runDir, suffix, folder) {
  const dir = `${runDir}${suffix}`;
  await mkdir(dir, { recursive: true });
  for (const f of ['record.json', 'edit', 'voice']) if (existsSync(path.join(runDir, f))) await cp(path.join(runDir, f), path.join(dir, f), { recursive: true });
  await writeFile(path.join(dir, 'record.json'), JSON.stringify({ ...(await readJson(path.join(dir, 'record.json'))), deliver: folder }));
  return { dir, folder };
}

// Mean loudness in dB of `file` over [from, to] s.
async function loudness(file, from, to) {
  const { stderr } = await run('ffmpeg', ['-v', 'info', '-ss', from.toFixed(3), '-t', (to - from).toFixed(3), '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-']);
  return Number(/mean_volume: (-?[\d.]+) dB/.exec(stderr)?.[1] ?? -Infinity);
}

// Spec 14: returns the two render times.
async function recordlyEdits({ runDir, scratch, deliverRoot, project, env, check, tail, voice }) {
  const clip = path.join(runDir, 'edit', 'laptop', 'clip.mp4');
  const srcSec = await ffprobeDuration(clip);
  const caps = await readJson(path.join(runDir, 'edit', 'laptop', 'captions.json'));
  // Step 2 is cut whole; step 1 partly plays at 4x, step 3 partly at 0.5x.
  const [c1, c2, c3] = [caps[1], caps[2], caps[3]];
  const r3 = (t) => Math.round(t * 1000) / 1000;
  const trims = [{ start: c2.start, end: c2.end }];
  const speeds = [{ start: r3(c1.start + 0.4), end: r3(c1.end - 0.2), speed: 4 }, { start: r3(c3.start + 0.3), end: r3(c3.start + 1.3), speed: 0.5 }];
  const truth = mapFromEdits({ duration: srcSec, trims, speeds });

  // The export: the kept pieces at their speeds, zoomed to 110% (a centre
  // crop scaled back up), at 30 fps like Recordly's, with a quiet 220 Hz
  // tone standing in for audio the user added.
  const exportFile = path.join(scratch, 'recordly-export', `${SLUG}-recordly.mp4`);
  await mkdir(path.dirname(exportFile), { recursive: true });
  const { width, height } = await probe(clip);
  const segs = truth.segments;
  const graph = segs.map((s, k) => `[0:v]trim=${s.srcStart}:${s.srcEnd},setpts=(PTS-STARTPTS)/${s.speed}[p${k}]`).join(';')
    + `;${segs.map((_, k) => `[p${k}]`).join('')}concat=n=${segs.length}:v=1:a=0,crop=iw/1.1:ih/1.1,scale=${width}:${height},fps=30,format=yuv420p[v]`;
  const built = await run('ffmpeg', ['-y', '-v', 'error', '-i', clip, '-f', 'lavfi', '-i', `sine=frequency=220:sample_rate=48000,volume=0.3`,
    '-filter_complex', graph, '-map', '[v]', '-map', '1:a', '-t', truth.duration.toFixed(3), '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', exportFile]);
  if (built.code !== 0) throw new Error(`selftest: could not build the synthetic Recordly export: ${built.stderr.trim().split('\n').pop()}`);
  const expSec = await ffprobeDuration(exportFile);
  const cards = TITLE_SEC + END_SEC - 2 * XFADE_SEC;
  const clipName = `${SLUG}.mp4`;

  // The project, shaped like Recordly 1.4's save: source-time milliseconds.
  const projects = path.join(scratch, 'recordly-projects');
  await mkdir(projects, { recursive: true });
  const ms = (t) => Math.round(t * 1000);
  const withProject = await runCopy(runDir, '-recordly-project', path.join(deliverRoot, `${SLUG}-recordly-project`));
  await writeFile(path.join(projects, `${SLUG}.recordly`), JSON.stringify({
    version: 2, projectId: 'selftest-project', videoPath: path.join(withProject.folder, 'for-recordly', clipName),
    editor: {
      trimRegions: trims.map((t, i) => ({ id: `trim-${i}`, startMs: ms(t.start), endMs: ms(t.end) })),
      speedRegions: speeds.map((s, i) => ({ id: `speed-${i}`, startMs: ms(s.start), endMs: ms(s.end), speed: s.speed })),
      clipRegions: [{ id: 'clip-0', startMs: 0, endMs: ms(srcSec), speed: 1 }],
      zoomRegions: [], cropRegion: { x: 0.0455, y: 0.0455, width: 0.909, height: 0.909 },
    },
  }, null, 2));

  const renderEdited = (copy, projectDirs) => cli(['render', copy.dir, '--recordly-export', exportFile, '--no-phone', '--no-open'], {
    cwd: project, env: { ...env, DEMO_RECORDLY_FAKE: JSON.stringify({ projectDirs, recentFile: null, projectWaitMs: 0 }) },
  });
  const renderJson = async (copy) => (existsSync(path.join(copy.dir, 'out', 'run.json')) ? (await readJson(path.join(copy.dir, 'out', 'run.json'))).render : {});

  const a = await renderEdited(withProject, [projects]);
  const r = await renderJson(withProject);
  check('edited export with its saved project: rendered on the project\'s map',
    a.code === 0 && r.timeMap?.source === 'project' && r.recordlyExport === exportFile,
    a.code === 0 ? `${a.sec.toFixed(1)} s; ${a.out.split('\n').find((l) => l.startsWith('Recordly edits')) ?? 'no edits line'}` : `exit ${a.code}; ${tail(a.out)}`);
  if (a.code !== 0) return [a.sec];

  const lap = r.layout.laptop;
  const inLaptop = (r.captions ?? []).map((c) => ({ ...c, start: c.start - lap, end: c.end - lap }));
  const narr = (r.narration ?? []).map((n) => ({ ...n, start: n.start - lap, end: n.end - lap }));
  const kept = caps.filter((c) => c.index !== c2.index);
  // Each caption starts where the map puts its step, unless the caption
  // before it or its narration still runs: then it follows those.
  const bad = [];
  let prevEnd = 0;
  kept.forEach((c, k) => {
    const got = inLaptop[k];
    const n = narr.find((v) => v.index === c.index);
    const want = Math.max(truth.map(c.start), prevEnd, n ? n.start : 0);
    if (!got || got.text !== c.text || Math.abs(got.start - want) > 0.05) bad.push(`"${c.text}" at ${got?.start?.toFixed(2)} s, expected ${want.toFixed(2)} s`);
    prevEnd = got?.end ?? prevEnd;
  });
  check('captions appear at the re-planned times on the edited timeline',
    inLaptop.length === kept.length && !bad.length && r.sync?.ok === true,
    bad.join('; ') || `${inLaptop.map((c) => `${c.start.toFixed(2)}-${c.end.toFixed(2)}`).join(', ')} s; ${r.sync?.detail}`);
  const srt = await readFile(path.join(withProject.folder, `${SLUG}.srt`), 'utf8');
  check('the cut step\'s caption and narration are dropped',
    JSON.stringify(r.droppedCaptions) === JSON.stringify([c2.index]) && !srt.includes(c2.text) && !inLaptop.some((c) => c.text === c2.text) && !narr.some((n) => n.index === c2.index),
    `dropped ${JSON.stringify(r.droppedCaptions)} ("${c2.text}")`);
  const overlaps = inLaptop.slice(1).filter((c, k) => c.start < inLaptop[k].end - 1e-3);
  check('no caption overlaps another', !overlaps.length, overlaps.map((c) => `"${c.text}" at ${c.start.toFixed(2)} s`).join('; ') || `${inLaptop.length} captions in order`);

  const breath = DEFAULTS.pace.breathMs / 1000;
  const gaps = narr.slice(1).map((n, k) => n.start - narr[k].end);
  const tempos = narr.map((n) => n.tempo);
  const late = narr.filter((n) => (inLaptop.find((c) => c.index === n.index)?.end ?? Infinity) < n.end - 0.01);
  check(`narration never overlaps, leaves >= ${breath} s between clips, plays at <= 1.1x, and no caption ends before its narration`,
    (!voice || narr.length === kept.length) && gaps.every((g) => g >= breath - 1e-3) && tempos.every((t) => t <= 1.1 + 1e-9) && !late.length,
    `${narr.length} clip(s); gaps ${gaps.map((g) => g.toFixed(2)).join(', ') || 'none'} s; tempo ${tempos.join(', ') || 'none'}${late.length ? `; caption ends before narration ${late.map((n) => n.index).join(', ')}` : ''}`);

  // The tone added "in Recordly" must be heard where no narration plays.
  const final = path.join(withProject.folder, `${SLUG}.mp4`);
  const quietest = gaps.length ? gaps.indexOf(Math.max(...gaps)) : -1;
  const [g0, g1] = quietest >= 0 ? [narr[quietest].end, narr[quietest + 1].start] : [0.2, Math.min(1.5, expSec)];
  const bedDb = await loudness(final, lap + g0 + 0.05, lap + g1 - 0.05);
  check('audio added in Recordly survives under the narration', bedDb > -40, `mean ${bedDb.toFixed(1)} dB between ${(lap + g0).toFixed(2)} and ${(lap + g1).toFixed(2)} s`);
  const delivered = r.durations?.delivered ?? 0;
  check('delivered duration = the export + the cards', Math.abs(delivered - (expSec + cards)) <= 0.1,
    `${delivered.toFixed(2)} s = ${expSec.toFixed(2)} s export + ${cards.toFixed(2)} s cards (project predicted ${truth.duration.toFixed(2)} s)`);
  check('edited render: freeze check, caption sync and no double captions clean', r.freeze?.ok === true && r.sync?.ok === true && r.doubleCaptions?.ok === true,
    `${r.freeze?.spans?.length ?? '?'} frozen span(s); ${r.doubleCaptions?.detail ?? ''}`);

  // The same export without the project: the map comes from the frames,
  // with how far off each caption may be. Where the page shows no change
  // (this export's cut lands on one, its 0.5x section sits on one) no
  // alignment can place a caption, so what must hold is that the certainty
  // is honest: a caption reported within 0.2 s is within 0.2 s of the true
  // map, so one further off (or kept for the cut step) is reported
  // uncertain. A run without questions uses the alignment only if no
  // caption may be more than MAX_UNSURE_SEC off.
  const aligned = await runCopy(runDir, '-recordly-aligned', path.join(deliverRoot, `${SLUG}-recordly-aligned`));
  const emptyDir = path.join(scratch, 'no-projects');
  await mkdir(emptyDir, { recursive: true });
  const b = await renderEdited(aligned, [emptyDir]);
  const rb = await renderJson(aligned);
  const placed = rb.timeMap?.captions ?? [];
  const off = placed.map((c) => ({ ...c, e: Math.abs(c.start - (truth.map(caps.find((k) => k.index === c.index).start) ?? Infinity)) }));
  const worst = Math.max(0, ...placed.map((c) => c.uncertainty));
  const expected = worst <= MAX_UNSURE_SEC ? 'alignment' : 'none';
  check(`without the project: every caption reported certain (<= 0.2 s) is within 0.2 s of the true map and every one further off is reported uncertain; the export is used only if none may be more than ${MAX_UNSURE_SEC} s off`,
    b.code === 0 && kept.every((k) => placed.some((c) => c.index === k.index)) && off.every((o) => o.uncertainty > 0.2 || o.e <= 0.2) && rb.timeMap.source === expected,
    b.code === 0 ? `${rb.timeMap?.source} (expected ${expected}), confidence ${rb.timeMap?.confidence}; error / uncertainty per caption ${off.map((o) => `${o.e.toFixed(2)} / ${o.uncertainty} s`).join(', ') || rb.timeMap?.reason}; ${b.sec.toFixed(1)} s` : `exit ${b.code}; ${tail(b.out)}`);
  return [a.sec, b.sec];
}

function finish(results, dir) {
  const failed = results.filter((ok) => !ok).length;
  log(failed ? `Selftest FAILED (${failed} check(s)); see ${dir}` : `Selftest passed; outputs in ${dir}`);
  return failed ? 1 : 0;
}
