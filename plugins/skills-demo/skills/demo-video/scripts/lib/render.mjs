// render [runDir] [--recordly | --no-recordly] [--recordly-export <file>]
//        [--no-voice] [--no-phone] [--no-open] [--re-edit]
// edit/ (+ optional Recordly export) -> out/: demo.mp4, demo-short.mp4,
// demo.srt, demo.vtt, poster.png, contact-sheet.png, run.json; then the
// human-facing files are copied to the deliverables folder (deliver.mjs).
// The clips rendered are the ones recorded (record.json), and recorded
// narration is included unless --no-voice.
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SKILL_ROOT, run, log, ffprobeDuration } from './env.mjs';
import { mergeConfig } from './config.mjs';
import { resolveProject, deliverFolder, scenarioSlug } from './paths.mjs';
import readline from 'node:readline';
import { recordlyStatus, recordlyTip, recordlyPaths, handoff, projectPlaces } from './recordly.mjs';
import { findProject, parseProject } from './recordly-project.mjs';
import { alignExport } from './align.mjs';
import { mapFromEdits, mapFromPoints, identityMap, replanCaptions, replanNarration, mapCursor } from './timemap.mjs';
import { stepFloorMs } from './timeline.mjs';
import { deliver, deliverTarget, freshFolder, probeVideo } from './deliver.mjs';
import { renderCards } from './cards.mjs';
import { toSrt, toVtt } from './subtitles.mjs';
import { buildNarration } from './voice.mjs';
import { composeDemo, shortVersion, poster, contactSheet, layout, piecewise, TITLE_SEC, END_SEC, XFADE_SEC } from './compose.mjs';
import { freezeCheck, captionSync, doubleCaptions, cursorStill, outsidePauses, formatSpans, FREEZE } from './checks.mjs';
import { captionBand, OVERLAY } from './cards.mjs';

// Recordly's own projects folder; projectPlaces() may name an older guess.
const RECORDLY_PROJECTS = path.join(os.homedir(), 'Library', 'Application Support', 'Recordly', 'recordings', 'Projects');
// A project's predicted length must match the export's this closely to be
// trusted: Recordly can export a saved project with different speeds than it
// shows (its loader normalises them), and the frames then disagree.
export const PROJECT_TRUST_SEC = 0.3;
export const MIN_CONFIDENCE = 0.8;
// An aligned caption that may be further off than this can visibly miss
// its moment: it is named, and the alignment treated like a low-confidence
// one. A run that cannot ask still uses it when no caption may be further
// off than MAX_UNSURE_SEC.
export const UNSURE_SEC = 0.35;
export const MAX_UNSURE_SEC = 0.6;

const OUTPUTS = ['demo.mp4', 'demo-short.mp4', 'demo.srt', 'demo.vtt', 'poster.png', 'contact-sheet.png', 'run.json'];

const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (err) {
    if (err.code === 'ENOENT' && fallback !== undefined) return fallback;
    throw new Error(`cannot read ${file}: ${err.message}`);
  }
};

// A stage module from a sibling unit, or null when it is not installed.
async function optional(name) {
  const file = path.join(SKILL_ROOT, 'scripts', 'lib', `${name}.mjs`);
  return existsSync(file) ? import(pathToFileURL(file).href) : null;
}

// "checkout-flow.spec.ts" -> "Checkout flow".
export function humanize(scenario) {
  const base = path.basename(String(scenario)).replace(/(\.(spec|test))?\.[cm]?[jt]sx?$/i, '').replace(/^\d{4}-\d{2}-\d{2}-(\d{6}-)?/, '');
  const words = base.replace(/[-_.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Demo';
}

// opts.recordly: true (--recordly), false (--no-recordly, which wins over
// --recordly) or null (decided by recordlyWanted).
export function parseArgs(argv) {
  const opts = { runDir: null, voice: true, recordly: null, recordlyExport: null, reEdit: false, phone: true, open: true };
  let noRecordly = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--voice') log('--voice is ignored here: narration is timed while recording (record --voice); recorded narration is included unless --no-voice.');
    else if (a === '--no-voice') opts.voice = false;
    else if (a === '--no-phone') opts.phone = false;
    else if (a === '--no-open') opts.open = false;
    else if (a === '--recordly') opts.recordly = true;
    else if (a === '--no-recordly') noRecordly = true;
    else if (a === '--re-edit') opts.reEdit = true;
    else if (a === '--recordly-export') { opts.recordlyExport = argv[++i]; if (!opts.recordlyExport) throw new Error('--recordly-export needs a file'); }
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else if (!opts.runDir) opts.runDir = a;
    else throw new Error(`unexpected argument "${a}"`);
  }
  if (noRecordly) opts.recordly = false;
  return opts;
}

// Whether to hand the clip to Recordly, installed or not: --no-recordly (or
// record's) never, --recordly always, otherwise only when a person is at the
// terminal and the config allows it. An agent or CI run therefore never waits
// on a click unless --recordly was passed.
export function recordlyWanted({ flag, record, config, interactive }) {
  if (flag === false) return false;
  if (flag === true) return true;
  return !record.noRecordly && Boolean(interactive) && config.recordly !== false;
}

// The project's config when one is found, else the copy saved with the
// recording. Only a MISSING config falls back: a broken one (bad JSON, unknown
// key) must stop the render rather than quietly use the old settings.
async function configFor(ctx, record) {
  try {
    return (await resolveProject({ cwd: ctx.cwd, configFlag: ctx.configFlag })).config;
  } catch (err) {
    if (err.code !== 'NO_CONFIG' || !record.config) throw err;
    return mergeConfig(record.config);
  }
}

// Most recently recorded run under the project's runs folder when none is
// named, by record.json's startedAt: a folder's mtime also moves when an older
// run is re-rendered.
export async function resolveRunDir(ctx, runDir) {
  if (runDir) return path.resolve(ctx.cwd, runDir);
  const { runsDir: outDir } = await resolveProject({ cwd: ctx.cwd, configFlag: ctx.configFlag });
  const dirs = [];
  for (const d of await readdir(outDir, { withFileTypes: true }).catch(() => [])) {
    const file = path.join(outDir, d.name, 'record.json');
    // A failed recording has nothing to render; skip it rather than pick it.
    if (d.name.endsWith('-failed') || existsSync(path.join(outDir, d.name, 'failed.json'))) continue;
    // A record.json without startedAt is the one written before rehearsal of a
    // run that never finished recording.
    const t = d.isDirectory() && existsSync(file) ? Date.parse((await readJson(file, {})).startedAt) : NaN;
    if (!Number.isNaN(t)) dirs.push({ d: path.dirname(file), t });
  }
  if (!dirs.length) throw new Error(`no recording found in ${outDir}; run "demo.mjs record <scenario>" first`);
  return dirs.sort((a, b) => b.t - a.t)[0].d;
}

async function toolVersions() {
  const first = async (cmd, args) => (await run(cmd, args).catch(() => ({ stdout: '' }))).stdout.split('\n')[0].trim() || null;
  const pw = await readJson(path.join(SKILL_ROOT, 'node_modules', '@playwright', 'test', 'package.json'), {});
  return { node: process.version, ffmpeg: await first('ffmpeg', ['-version']), playwright: pw.version ?? null };
}

// A 240 px window centred on the drawn cursor. A full-frame freezedetect
// cannot see a cursor, or text typed where it rests (each changes <0.1% of
// the pixels); this window can.
const FOLLOW = 240;
function followCursor(pts) {
  const at = (key) => `'${piecewise(pts, key, 4)}-${FOLLOW / 2}'`;
  return { w: FOLLOW, h: FOLLOW, x: at('x'), y: at('y') };
}

// The laptop part is frozen only where the page AND the cursor both hold
// still: the intersection of the video's still spans with the cursor's.
export function stillBoth(whole, hand, minSec = FREEZE.minSec) {
  const spans = [];
  for (const [s, d] of whole.spans) {
    for (const [hs, hd] of hand.spans) {
      const a = Math.max(s, hs), b = Math.min(s + d, hs + hd);
      if (b - a >= minSec - 1e-3) spans.push([+a.toFixed(3), +(b - a).toFixed(3)]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  return { ok: spans.length === 0, spans };
}

// Where a saved project is looked for. DEMO_RECORDLY_FAKE ({projectDirs,
// recentFile}) replaces the user's folders in tests and selftest.
function projectSearch(fake) {
  if (fake) return { dirs: fake.projectDirs ?? [], recentFile: fake.recentFile ?? null };
  const places = projectPlaces();
  return { dirs: [...new Set([...places.dirs, RECORDLY_PROJECTS])], recentFile: places.recentFile };
}

const hasAudio = async (file) => (await run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file])).stdout.trim() !== '';

// y/N question on the terminal.
async function askTty(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { return /^y/i.test(await new Promise((r) => rl.question(question, r))); } finally { rl.close(); }
}

// What the user changed, from the map: cuts (kept parts that do not follow
// on from the one before, including a trimmed start or end), the speed of
// each piece that is not 1x, and the export's shape when it differs from the
// recorded clip's (`clipSize`); from `facts` (the saved
// project's extras, or run.json's edits when reused, plus `audio`: the export
// has an audio track) per-clip speeds, a crop, added audio, Recordly's own
// captions, annotations and a webcam.
export function describeEdits(map, sourceSec, size, facts = {}, clipSize = size) {
  const segs = map.segments;
  let cuts = segs.length && segs[0].srcStart > 0.05 ? 1 : 0;
  for (let k = 1; k < segs.length; k++) if (segs[k].srcStart - segs[k - 1].srcEnd > 0.05) cuts++;
  if (segs.length && sourceSec - segs.at(-1).srcEnd > 0.05) cuts++;
  // Alignment speeds are measured, so near-1x pieces are noise.
  const speeds = segs.map((s) => Math.round(s.speed * 100) / 100).filter((v) => Math.abs(v - 1) > (map.source === 'project' ? 1e-3 : 0.08));
  const g = (a, b) => (b ? g(b, a % b) : a);
  const aspect = size ? `${size.w / g(size.w, size.h)}:${size.h / g(size.w, size.h)}` : null;
  const x = (v) => `${v}x`;
  const more = {
    clipSpeeds: facts.clipSpeeds ?? [], crop: Boolean(facts.crop), audio: Boolean(facts.audio),
    autoCaptions: Boolean(facts.autoCaptions), annotations: facts.annotations ?? 0, webcam: Boolean(facts.webcam),
  };
  const parts = [
    cuts && `${cuts} cut${cuts > 1 ? 's' : ''}`,
    speeds.some((v) => v > 1) && `speed-up (${[...new Set(speeds.filter((v) => v > 1))].map(x).join(', ')})`,
    speeds.some((v) => v < 1) && `slow-down (${[...new Set(speeds.filter((v) => v < 1))].map(x).join(', ')})`,
    more.clipSpeeds.length && `clip speed (${more.clipSpeeds.map(x).join(', ')})`,
    more.crop && 'crop',
    aspect && Math.abs(size.w / size.h / (clipSize.w / clipSize.h) - 1) > 0.01 && `shape ${aspect}`,
    more.audio && 'audio added',
    more.autoCaptions && 'Recordly captions',
    more.annotations && `${more.annotations} annotation${more.annotations > 1 ? 's' : ''}`,
    more.webcam && 'webcam',
  ].filter(Boolean);
  return { cuts, speeds, aspect, ...more, summary: parts.length ? parts.join(', ') : 'no timing changes' };
}

// The map from the laptop clip's time to the Recordly export's: the saved
// project when it predicts the export's length (exact), else alignment by
// frames when confident (or the user accepts it), else none. `captions` are
// the clip's (source seconds): each one's mapped start and how far off it
// may be go into info.captions, and an alignment that may put one more than
// UNSURE_SEC off is treated like a low-confidence one. Returns {map
// (null: render without the export), info (run.json's render.timeMap),
// project (parseProject's result for a readable project naming the clip,
// kept even when its timing is not trusted: its look settings still describe
// the export; else null)}.
export async function chooseMap({ source, exportFile, project, clipName, captions = [], interactive = false, ask = askTty, print = log }) {
  const [srcSec, expSec] = [await ffprobeDuration(source), await ffprobeDuration(exportFile)];
  const why = [];
  let facts = null;
  if (project) {
    const text = await readFile(project, 'utf8').catch((e) => { why.push(`project unreadable (${e.code ?? e.message})`); return null; });
    const parsed = text === null ? null : parseProject(text, { clipName });
    if (parsed?.error) why.push(`project ignored: ${parsed.error}`);
    else if (parsed && !parsed.references) why.push(`project ignored: it does not open ${clipName}`);
    else if (parsed) {
      facts = parsed;
      const m = mapFromEdits({ duration: srcSec, trims: parsed.trims, speeds: parsed.speeds });
      if (Math.abs(m.duration - expSec) <= PROJECT_TRUST_SEC) {
        const same = !parsed.trims.length && parsed.speeds.every((r) => r.speed === 1);
        const map = same ? identityMap(expSec) : m;
        return { map, project: facts, info: { ...info(map, `from the saved project ${project}${same ? ' (no cuts or speed changes)' : ''}`), captions: certainty(map, captions) } };
      }
      why.push(`project predicts ${m.duration.toFixed(2)} s but the export is ${expSec.toFixed(2)} s, so it does not describe this export`);
    }
  } else why.push('no saved project');
  const a = await alignExport({ source, exportFile, fps: 10 });
  const reason = [...why, a.reason].join('; ');
  const placed = certainty(a, captions);
  const unsure = placed.filter((c) => c.uncertainty > UNSURE_SEC);
  const worst = Math.max(0, ...placed.map((c) => c.uncertainty));
  const matched = a.confidence >= MIN_CONFIDENCE;
  const frames = a.confidence;
  // A share of captions that may be off takes that share off the confidence.
  if (placed.length) a.confidence = Math.round(a.confidence * (1 - unsure.length / placed.length) * 100) / 100;
  const text = new Map(captions.map((c) => [c.index, c.text]));
  const warning = unsure.length ? `${unsure.length} caption${unsure.length > 1 ? 's' : ''} may be up to ${worst} s off (${unsure.map((c) => `"${text.get(c.index)}"`).join(', ')}): the page shows no change there; save the Recordly project (Cmd+S) for exact timing.` : null;
  const use = (why2) => ({ map: a, project: facts, info: { ...info(a, why2), captions: placed, ...(warning ? { warning } : {}) } });
  if (matched && !unsure.length) return use(reason);
  const low = matched ? warning.replace(/\.$/, '') : `alignment confidence ${frames} is below ${MIN_CONFIDENCE}`;
  if (interactive) {
    const question = matched ? `${warning} Use the Recordly export anyway? (No renders without it.) [y/N] `
      : `The Recordly export could not be matched to the recording with confidence (${frames}); captions may drift. Use it anyway? [y/N] `;
    if (await ask(question)) return use(`${reason}; ${low}; used on request`);
  } else if (matched && worst <= MAX_UNSURE_SEC) return use(`${reason}; ${low}; used: none more than ${MAX_UNSURE_SEC} s`);
  const beyond = matched && !interactive ? `, more than the ${MAX_UNSURE_SEC} s a run without questions accepts` : '';
  print(`Rendering without the Recordly export: ${low}${beyond}${matched ? '' : ', so captions could land on the wrong moments'}.`);
  return { map: null, project: facts, info: { source: 'none', confidence: a.confidence, segments: [], captions: placed, reason: `${reason}; ${low}${beyond}` } };
}
const info = (map, reason) => ({ source: map.source, confidence: map.confidence, segments: map.segments, duration: map.duration, reason });

// Each caption's start on the export (as the map alone places it) and how
// far off it may be: 0 where the map is exact. Captions cut whole are left
// out. One the map keeps only a sliver of (under half its time, and less
// than its end may be off) may be a step that was cut whole, where a cut
// landed on a still page: it may be off by as much as its end.
function certainty(map, captions) {
  const from = new Map(captions.map((c) => [c.index, c]));
  return replanCaptions(captions, map).captions.map((c) => {
    if (!map.uncertainty) return { index: c.index, start: c.start, uncertainty: 0 };
    const o = from.get(c.index);
    const atEnd = map.uncertainty(o.end);
    const sliver = c.end - c.start < Math.min(atEnd, (o.end - o.start) / 2);
    return { index: c.index, start: c.start, uncertainty: Math.max(map.uncertainty(o.start), sliver ? atEnd : 0) };
  });
}

// A map stored in run.json, rebuilt so recaption places captions exactly as
// the render did without re-reading the project or re-aligning.
export function storedMap(t) {
  if (!t?.segments?.length || !['project', 'alignment', 'identity'].includes(t.source)) return null;
  const pts = t.segments.flatMap((s) => [[s.srcStart, s.expStart], [s.srcEnd, s.expStart + (s.srcEnd - s.srcStart) / s.speed]]);
  return mapFromPoints(pts, t.duration ?? pts.at(-1)[1], { source: t.source, confidence: t.confidence });
}

// Final pass over re-planned captions and narration (both export seconds,
// in order): a narration clip never starts before its caption nor within
// `breath` of the previous clip's end, a caption never ends before its
// narration, and captions never overlap. Anything moved is pushed later,
// keeping its length; nothing is added where the rules already hold. Nothing
// runs past `end` (the export's length): a clip pushed there gets a breath
// down to `minBreath`, else is dropped; a caption is cut short at the end,
// or dropped (with its clip) when that leaves it less than floorFor(text).
export function settle(captions, voice, breath, { end = Infinity, minBreath = 0.2, floorFor = () => 0 } = {}) {
  const byIndex = new Map(voice.map((v) => [v.index, { ...v }]));
  const r = (t) => Math.round(t * 1000) / 1000;
  let capEnd = 0;
  let voiceEnd = -Infinity;
  const caps = [];
  for (const c of captions) {
    const shift = Math.max(0, capEnd - c.start);
    const start = c.start + shift;
    let stop = c.end + shift;
    const n = byIndex.get(c.index);
    if (n) {
      const len = n.end - n.start;
      let s = Math.max(n.start, start, voiceEnd + breath);
      if (s + len > end) s = Math.max(n.start, start, voiceEnd + minBreath);
      if (s + len > end + 1e-3) byIndex.delete(c.index);
      else {
        n.end = r(s + len);
        n.start = r(s);
        stop = Math.max(stop, n.end);
        voiceEnd = n.end;
      }
    }
    if (stop > end) {
      if (end - start < Math.max(floorFor(c.text), 1e-3)) { byIndex.delete(c.index); continue; }
      stop = end;
    }
    capEnd = stop;
    caps.push({ ...c, start: r(start), end: r(stop) });
  }
  return { captions: caps, voice: voice.map((v) => byIndex.get(v.index)).filter((v) => v && caps.some((c) => c.index === v.index)) };
}

// Pauses [from, to] in source seconds onto the export: the export span of
// whatever part of each was kept; wholly cut pauses vanish.
function mapPauses(pauses, map) {
  const out = [];
  for (const [a, b] of pauses) {
    const ts = map.segments.flatMap((s) => {
      const lo = Math.max(a, s.srcStart), hi = Math.min(b, s.srcEnd);
      return hi > lo ? [s.expStart + (lo - s.srcStart) / s.speed, s.expStart + (hi - s.srcStart) / s.speed] : [];
    });
    if (ts.length) out.push([Math.min(...ts), Math.max(...ts)]);
  }
  return out;
}

async function loadClip(runDir, name) {
  const dir = path.join(runDir, 'edit', name);
  if (!existsSync(path.join(dir, 'clip.mp4'))) return null;
  return {
    name,
    video: path.join(dir, 'clip.mp4'),
    cursor: path.join(dir, 'cursor.json'),
    captions: await readJson(path.join(dir, 'captions.json')),
    timeline: await readJson(path.join(dir, 'timeline.json'), {}),
  };
}

// One line per stage with the seconds since the render started, and the
// main encode's percentage at most once a second.
function progress(print = log) {
  const t0 = Date.now();
  let last = 0;
  const at = () => `[${((Date.now() - t0) / 1000).toFixed(1)} s]`;
  return {
    stage: (name) => print(`${at()} ${name}`),
    pct: (name, pct) => {
      if (Date.now() - last < 1000) return;
      last = Date.now();
      print(`${at()} ${name} ${Math.round(pct)}%`);
    },
  };
}

// The shared core of render and recaption.
// opts: {edit, recordly, recordlyExport, reuseExport, voice, phone, open, preset}
export async function renderRun(runDir, opts, ctx) {
  const step = progress();
  const record = await readJson(path.join(runDir, 'record.json'), {});
  const config = await configFor(ctx, record);
  const outDir = path.join(runDir, 'out');
  const previous = await readJson(path.join(outDir, 'run.json'), {});
  const slug = scenarioSlug(record.scenario ?? path.basename(runDir));
  // The root is decided now, not at record time: a folder picked after the
  // recording (DEMO_VIDEO_DELIVER, or deliverDir in the current config) wins
  // over the one record.json froze, which beats the default. The name keeps
  // the recording's date: record.json's folder name, or startedAt for runs
  // made before record wrote one. Picked before the Recordly handoff, so its
  // for-recordly/ pair lands beside the render that uses it.
  const name = path.basename(record.deliver ?? deliverFolder(config, slug, record.startedAt ? new Date(record.startedAt) : undefined));
  const chosen = process.env.DEMO_VIDEO_DELIVER || config.deliverDir || !record.deliver;
  const root = chosen ? path.dirname(deliverFolder(config, slug)) : path.dirname(record.deliver);
  const folder = freshFolder(deliverTarget(path.join(root, name)), slug);

  // edit/ is built from raw/ for the clips that have no clip.mp4 yet, keeping
  // any captions.json there; only --re-edit redoes every clip and rewrites
  // captions.json, discarding caption edits. A hand-made edit/ without raw/
  // is always rendered as it stands.
  const unedited = (record.clips ?? []).map((c) => c.name).filter((n) => !existsSync(path.join(runDir, 'edit', n, 'clip.mp4')));
  if (opts.edit && (opts.reEdit || unedited.length) && existsSync(path.join(runDir, 'raw'))) {
    const edit = await optional('edit');
    if (!edit) throw new Error('the edit stage (scripts/lib/edit.mjs) is not installed');
    step.stage('edit');
    await edit.editRun(runDir, opts.reEdit ? {} : { only: unedited, keepCaptions: true });
  }
  const laptop = await loadClip(runDir, 'laptop');
  if (!laptop) throw new Error(`no edit/laptop/clip.mp4 in ${runDir}; record it first`);
  // A hand-made run without record.clips renders whatever edit/ holds.
  const recorded = record.clips?.map((c) => c.name) ?? ['laptop', 'phone'];
  const phone = opts.phone !== false && recorded.includes('phone') ? await loadClip(runDir, 'phone') : null;

  let laptopVideo = laptop.video;
  let recordlyExport = null;
  let project = null;
  let stored = null;
  // The saved project's extras (see describeEdits), or the last render's.
  let facts = null;
  // Project files older than this belong to an earlier handoff.
  let projectSince = (await stat(laptop.video)).mtimeMs;
  const fake = process.env.DEMO_RECORDLY_FAKE ? JSON.parse(process.env.DEMO_RECORDLY_FAKE) : null;
  const clipName = `${slug}.mp4`;
  if (opts.recordlyExport) {
    recordlyExport = path.resolve(ctx.cwd, opts.recordlyExport);
    if (!existsSync(recordlyExport)) throw new Error(`Recordly export not found: ${recordlyExport}`);
  } else if (opts.reuseExport) {
    // Only the export the last good render finished on, and only if it was
    // made after the current cut: an older one shows a different edit.
    const prev = previous.render?.recordlyExport;
    const newer = async (f) => (await stat(f)).mtimeMs > (await stat(laptop.video)).mtimeMs;
    const on = opts.recordly !== false && !record.noRecordly && config.recordly !== false;
    if (on && prev && existsSync(prev) && await newer(prev)) {
      recordlyExport = prev;
      stored = storedMap(previous.render?.timeMap);
      facts = previous.render?.edits ?? null;
    }
  } else if (recordlyWanted({ flag: opts.recordly, record, config, interactive: process.stdin.isTTY })) {
    // DEMO_RECORDLY_FAKE (JSON {openCmd, watch, pollMs, settleMs, timeoutMs})
    // is set only by selftest and tests: it stands in for an installed
    // Recordly so the handoff runs without launching the app. openCmd runs in
    // place of opening Recordly; "{clip}" and "{export}" in it become the
    // placed clip and the suggested export path.
    if (fake || (await recordlyStatus()).installed) {
      step.stage('Recordly');
      const where = recordlyPaths(folder, slug);
      const stand = fake && {
        dirs: fake.watch ?? [], pollMs: fake.pollMs, settleMs: fake.settleMs,
        notify: async () => {},
        open: async (args) => (args[0] === '-a' && fake.openCmd
          ? run(fake.openCmd[0], fake.openCmd.slice(1).map((a) => a.replaceAll('{clip}', where.clip).replaceAll('{export}', where.suggested)))
          : { code: 0 }),
      };
      projectSince = Date.now();
      const search = projectSearch(fake);
      const got = await handoff({
        clip: laptop.video, cursor: laptop.cursor, folder, slug,
        timeoutMs: fake?.timeoutMs ?? config.recordlyTimeoutMin * 60_000,
        withProject: true, projectDirs: search.dirs, recentFile: search.recentFile,
        ...(fake?.projectWaitMs != null ? { projectWaitMs: fake.projectWaitMs } : {}),
        ...stand,
      });
      recordlyExport = got?.export ?? null;
      project = got?.project ?? null;
    } else {
      recordlyTip();
    }
  }
  // The time map from the recorded clip to the export: every caption,
  // narration clip, pause and cursor sample is moved through it.
  let map = null;
  let timeMap = { source: 'none', confidence: null, segments: [], reason: 'no Recordly export' };
  if (recordlyExport && stored) {
    map = stored;
    timeMap = { ...previous.render.timeMap, reason: `${previous.render.timeMap.reason} (reused from the last render)` };
  } else if (recordlyExport) {
    step.stage('time map');
    // Once more at render: the user may have saved the project after the
    // handoff stopped looking.
    if (!project) {
      const search = projectSearch(fake);
      project = await findProject({ dirs: [recordlyPaths(folder, slug).dir, ...search.dirs], since: projectSince, clipName, recentFile: search.recentFile });
    }
    const chosen = await chooseMap({ source: laptop.video, exportFile: recordlyExport, project, clipName, captions: laptop.captions, interactive: Boolean(process.stdin.isTTY) });
    map = chosen.map;
    timeMap = chosen.info;
    facts = chosen.project;
    if (!map) recordlyExport = null;
  }
  let edits = null;
  let exportAudio = false;
  if (map) {
    laptopVideo = recordlyExport;
    const v = await probeVideo(recordlyExport);
    const clip = await probeVideo(laptop.video);
    exportAudio = await hasAudio(recordlyExport);
    edits = describeEdits(map, await ffprobeDuration(laptop.video), { w: v.width, h: v.height }, { ...facts, audio: exportAudio }, { w: clip.width, h: clip.height });
    log(`Recordly edits (${map.source}, confidence ${map.confidence}): ${edits.summary}; captions re-timed.${timeMap.warning ? ` ${timeMap.warning}` : ''}`);
  }
  // Recordly burned its own captions into the export, so ours would sit over
  // them. Rather than leave an empty band under the picture, the video goes
  // full-frame with nothing of ours burned in and no soft track (a player
  // would show that by default, doubling Recordly's). That holds for the
  // phone part too; the .srt/.vtt and the narration stay as they are.
  const recordlyCaptions = Boolean(edits?.autoCaptions);
  if (recordlyCaptions) log('Recordly captions are on: ours are left out of the picture (demo.srt and demo.vtt still written, narration kept).');
  // The recording's caption layout; runs made before bands used overlay pills.
  const lay = recordlyCaptions ? { mode: 'off', band: 0 } : record.layout ?? OVERLAY;
  const recordlyFps = recordlyExport ? (await probeVideo(recordlyExport)).fps : null;

  // Outputs are written to out/.new/ and moved into out/ only once every check
  // passes, so a failed render never replaces the last good one.
  const staging = path.join(outDir, '.new');
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  const work = await mkdtemp(path.join(os.tmpdir(), 'demo-render-'));
  try {
    const title = config.title.text ?? humanize(record.scenario ?? path.basename(runDir));
    const when = record.startedAt ? new Date(record.startedAt) : new Date();
    const subtitle = config.title.subtitle ?? when.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    // Captions and narration on the laptop part's own timeline: moved through
    // the map onto the export, or as recorded. Each narration clip starts
    // with its caption as captions.json has it now, so a hand-moved caption
    // takes its narration along and a deleted one drops it.
    const breath = (config.pace?.breathMs ?? 450) / 1000;
    const resolve = (f) => (path.isAbsolute(f) ? f : path.resolve(runDir, f));
    const voicedClips = async (clip, captions) => {
      if (opts.voice === false) return [];
      const starts = new Map(captions.map((c) => [c.index, c.start]));
      const list = (clip.timeline.narration ?? []).filter((n) => starts.has(n.index));
      return Promise.all(list.map(async (n) => ({ index: n.index, file: resolve(n.file), start: starts.get(n.index), duration: await ffprobeDuration(resolve(n.file)) })));
    };
    let lapCaptions = laptop.captions;
    let lapVoice;
    let dropped = [];
    let voiced;
    // The laptop part ends here: its narration and captions never run into
    // the phone part or the end card.
    const lapSec = await ffprobeDuration(laptopVideo);
    if (map) {
      const floorFor = (text) => stepFloorMs(text, config.pace) / 1000;
      // A step cut entirely loses its caption and with it its narration.
      dropped = replanCaptions(laptop.captions, map, { floorFor }).dropped;
      const kept = laptop.captions.filter((c) => !dropped.includes(c.index));
      voiced = await voicedClips(laptop, kept);
      const { voice } = replanNarration(voiced, map, { maxTempo: 1.1, breathSec: breath, end: lapSec });
      const settled = settle(replanCaptions(kept, map, { floorFor, narration: voice, end: lapSec }).captions, voice, breath, { end: lapSec, floorFor });
      lapCaptions = settled.captions;
      lapVoice = settled.voice;
      if (dropped.length) log(`Captions dropped with their cut steps: ${laptop.captions.filter((c) => dropped.includes(c.index)).map((c) => `"${c.text}"`).join(', ')}.`);
    } else {
      voiced = await voicedClips(laptop, lapCaptions);
      lapVoice = replanNarration(voiced, identityMap(await ffprobeDuration(laptop.video)), { maxTempo: 1.1, breathSec: breath, end: lapSec }).voice;
    }
    // Steps kept but left too little time before the end (a trimmed end, a
    // heavy speed-up) for their narration or caption.
    const lostVoice = voiced.filter((v) => !lapVoice.some((x) => x.index === v.index)).map((v) => v.index);
    const lostCaptions = laptop.captions.filter((c) => !dropped.includes(c.index) && !lapCaptions.some((x) => x.index === c.index)).map((c) => c.index);
    if (lostVoice.length || lostCaptions.length) {
      const names = (ids) => ids.map((i) => `"${laptop.captions.find((c) => c.index === i)?.text}"`).join(', ');
      const n = (k, one, many) => `${k} ${k > 1 ? many : one}`;
      log(`${[lostVoice.length && `${n(lostVoice.length, 'step', 'steps')} lost their narration (${names(lostVoice)})`,
        lostCaptions.length && `${n(lostCaptions.length, 'caption', 'captions')} dropped (${names(lostCaptions)})`].filter(Boolean).join(' and ')}: your edits left too little time.`);
    }
    const phoneVoice = phone ? (await voicedClips(phone, phone.captions)).map((c) => ({ ...c, tempo: 1 })) : [];
    step.stage('captions/cards');
    const cards = await renderCards({
      dir: work, config, title, subtitle, endText: config.end.text, layout: lay,
      laptopCaptions: lapCaptions,
      phoneCaptions: phone?.captions ?? null,
      // The shape the phone clip was recorded at: a config changed since
      // then would squash it into a different screen.
      phone: phone ? (record.clips?.find((c) => c.name === 'phone') ?? config.phone) : null,
    });

    const phoneSec = phone ? await ffprobeDuration(phone.video) : null;
    const at = layout(lapSec, phoneSec);

    const clips = [
      ...lapVoice.map((c) => ({ ...c, start: c.start + at.laptop, end: c.end + at.laptop })),
      ...phoneVoice.map((c) => ({ ...c, start: c.start + at.phone, end: c.start + at.phone + c.duration })),
    ];
    // Audio the user added in Recordly plays under the narration.
    const bed = exportAudio ? { file: laptopVideo, delay: at.laptop } : null;
    const narration = clips.length || bed ? await buildNarration(clips, path.join(work, 'narration.m4a'), { duration: at.total, bed }) : null;

    step.stage('compose');
    const demo = await composeDemo({
      outFile: path.join(staging, 'demo.mp4'),
      workDir: work,
      laptop: { video: laptopVideo, captions: lapCaptions, cursor: recordlyExport ? null : await readJson(laptop.cursor, null) },
      phone: phone ? { video: phone.video, captions: phone.captions, cursor: await readJson(phone.cursor, null) } : null,
      cards, narration, preset: opts.preset, layout: lay, softSubtitles: !recordlyCaptions,
      onProgress: (stage, pct) => step.pct(stage, pct),
    });
    step.stage('checks');
    // Across the laptop-to-phone crossfade two burned captions overlap; the
    // embedded mov_text track ('off' mode) ends a cue where the next one
    // starts, so the .srt/.vtt do the same and all three stay identical.
    const cues = demo.burned.map((c, i, all) => ({ ...c, end: Math.min(c.end, all[i + 1]?.start ?? Infinity) }));
    const srt = toSrt(cues);
    const vtt = toVtt(cues);
    await writeFile(path.join(staging, 'demo.srt'), srt);
    await writeFile(path.join(staging, 'demo.vtt'), vtt);
    const first = map ? lapCaptions[0] : (laptop.timeline.steps?.[0] ?? laptop.captions[0]);
    // All run side by side; the first to fail stops the others rather than
    // leaving them encoding.
    const abort = new AbortController();
    const { signal } = abort;
    const lapEnd = phone ? at.phone + XFADE_SEC : null;
    const still = { skipStart: TITLE_SEC, skipEnd: END_SEC, signal };
    const [, , , whole, hand, phoneStill, sync, doubled] = await Promise.all([
      shortVersion(demo.file, path.join(staging, 'demo-short.mp4'), { preset: opts.preset, signal }),
      poster(demo.file, first ? at.laptop + (first.start + first.end) / 2 : demo.duration / 2, path.join(staging, 'poster.png'), { signal }),
      contactSheet(demo.file, demo.duration, path.join(staging, 'contact-sheet.png'), { signal }),
      // The laptop part (up to the end of the crossfade into the phone).
      freezeCheck(demo.file, { ...still, regions: [{ from: 0, to: lapEnd }] }),
      demo.cursor && freezeCheck(demo.file, { ...still, regions: [{ from: 0, to: lapEnd, crop: followCursor(demo.cursor) }] }),
      // The phone recording itself: in demo.mp4 its slow push-in always moves.
      phone && freezeCheck(phone.video, { signal }),
      recordlyCaptions ? { ok: true, cues: cues.length, detail: 'Recordly captions on the picture; ours only in demo.srt/demo.vtt' }
        : captionSync(demo.file, srt, vtt, captionBand(config.caption.position, lay), { signal }),
      doubleCaptions(demo.file, lay.mode ?? 'overlay', { signal }),
    ].map((job) => Promise.resolve(job).catch((err) => { abort.abort(); throw err; })));
    // A still laptop page counts only while the cursor rests too: the drawn
    // cursor's window, or where Recordly draws it, its log.
    const cursorLog = map ? mapCursor(await readJson(laptop.cursor, null), map) : await readJson(laptop.cursor, null);
    const lapStill = stillBoth(whole, hand ?? { spans: cursorStill(cursorLog?.samples ?? [], lapSec).map(([s, d]) => [s + at.laptop, d]) });
    // Typing with the cursor resting on the field changes too few pixels to
    // read as motion; the fixture logs it (and its settle) as a pause, which
    // explains a laptop still span the same way it does on the phone.
    const lapPauses = (map ? mapPauses(laptop.timeline.pauses ?? [], map) : laptop.timeline.pauses ?? []).map(([a, b]) => [a + at.laptop, b + at.laptop]);
    const lapFrozen = outsidePauses(lapStill.spans, lapPauses);
    // On the phone, where nothing points, a still page is expected only in the
    // fixture's own pauses (caption lead, settle, hold).
    const phoneFrozen = phoneStill ? outsidePauses(phoneStill.spans, phone.timeline.pauses ?? []).map(([s, d]) => [+(s + at.phone).toFixed(3), d]) : [];
    const spans = [...lapFrozen, ...phoneFrozen];
    const freeze = { ok: spans.length === 0, spans };
    const outputs = {};
    for (const f of OUTPUTS.slice(0, -1)) outputs[f] = (await stat(path.join(staging, f))).size;
    const summary = (c) => c && { duration: c.timeline.duration ?? null, cuts: c.timeline.cuts ?? [], steps: c.timeline.steps ?? [], captions: c.captions };
    const runJson = {
      ...record,
      edit: { laptop: summary(laptop), ...(phone ? { phone: summary(phone) } : {}) },
      render: {
        freeze, sync, doubleCaptions: doubled, outputs,
        durations: { demo: demo.duration, short: await ffprobeDuration(path.join(staging, 'demo-short.mp4')), laptop: lapSec, phone: phoneSec },
        layout: demo.layout,
        captions: demo.burned,
        voice: clips.length > 0,
        recordlyExport,
        recordlyFps,
        timeMap,
        edits,
        droppedCaptions: [...dropped, ...lostCaptions],
        droppedNarration: lostVoice,
        narration: clips.map(({ index, start, end, tempo }) => ({ index, start: +start.toFixed(3), end: +end.toFixed(3), tempo })),
        deliver: folder,
        cursorDrawn: Boolean(demo.cursor),
        preset: opts.preset,
        tools: await toolVersions(),
      },
    };
    // The delivered video is the export (or clip) in full plus the cards: a
    // shorter file lost frames the user kept, a longer one holds on a still.
    const delivered = await ffprobeDuration(demo.file);
    const lengthOk = Math.abs(delivered - at.total) <= 0.1;
    runJson.render.durations.delivered = delivered;
    const problem = !lengthOk ? `demo.mp4 is ${delivered.toFixed(2)} s but the ${recordlyExport ? 'export' : 'clip'} plus the cards is ${at.total.toFixed(2)} s`
      : !doubled.ok ? doubled.detail
      : !freeze.ok ? `frozen video in demo.mp4 at ${formatSpans(freeze.spans)}; the recording holds still there`
      : !sync.ok ? `subtitles out of step with the burned captions: ${sync.detail}` : null;
    if (problem) {
      // Kept for a look, under names that are never taken for the real thing.
      await writeFile(path.join(outDir, 'run.failed.json'), JSON.stringify(runJson, null, 2) + '\n');
      await rename(demo.file, path.join(outDir, 'demo.failed.mp4'));
      throw new Error(`${problem} (kept as out/demo.failed.mp4; earlier outputs untouched)`);
    }
    await writeFile(path.join(staging, 'run.json'), JSON.stringify(runJson, null, 2) + '\n');
    for (const f of OUTPUTS) await rename(path.join(staging, f), path.join(outDir, f));
    for (const f of ['demo.failed.mp4', 'run.failed.json']) await rm(path.join(outDir, f), { force: true });
    step.stage('deliver');
    await deliver({ outDir, folder, slug, recordlyFps, open: opts.open });
    return runJson;
  } finally {
    await rm(work, { recursive: true, force: true });
    await rm(staging, { recursive: true, force: true });
  }
}

export async function main(argv, ctx) {
  const opts = parseArgs(argv);
  const runDir = await resolveRunDir(ctx, opts.runDir);
  await renderRun(runDir, { ...opts, edit: true, reuseExport: false, preset: 'slow' }, ctx);
  return 0;
}
