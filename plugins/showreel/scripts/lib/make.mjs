import path from 'node:path';
import { access, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { assertPlan, MINIMAL_PLAN, briefFromPlan, guideFromPlan } from './make-plan.mjs';
import { configTemplate, mergeConfig } from './config.mjs';
import { listRuns } from './record/commands.mjs';
import { projectDir } from './paths.mjs';
import { writeProjectFile, PROJECT_FILES } from './project.mjs';
import { validateBrief } from './brief.mjs';
import { draftFromGuide, validateStoryboard } from './storyboard.mjs';
import { buildScenario, validateScenario } from './scenario.mjs';

async function optional(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function exists(file) { try { await access(file); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
async function save(name, key, value) {
  const file = path.join(projectDir(name), PROJECT_FILES[key]);
  if (JSON.stringify(await optional(file)) !== JSON.stringify(value)) await writeProjectFile(name, key, value);
}
function valid(v) { if (!v.ok) throw new Error(v.errors.join('; ')); }
export function parseMakeOptions(flags) {
  const opts = {};
  const allowed = ['--name','--plan','--record','--render','--format','--theme','--profile','--to','--json'];
  for (let i = 0; i < flags.length; i++) {
    const k = flags[i];
    if (!allowed.includes(k) || Object.hasOwn(opts, k.slice(2))) throw new Error('Invalid option: ' + k);
    if (['--record','--render','--json'].includes(k)) opts[k.slice(2)] = true;
    else {
      if (!flags[i + 1] || flags[i + 1].startsWith('--')) throw new Error('Missing value for ' + k);
      opts[k.slice(2)] = flags[++i];
    }
  }
  if (!opts.name || !opts.plan) throw new Error('Usage: showreel make --name N --plan plan.json [--record] [--render] [--to FOLDER]');
  projectDir(opts.name);
  for (const [k, values] of Object.entries({ format: ['landscape','vertical'], theme: ['clean','dark','bold'], profile: ['desktop','phone'] })) {
    if (opts[k] !== undefined && !values.includes(opts[k])) throw new Error('--' + k + ' must be ' + values.join('|'));
  }
  return opts;
}
export async function makeProject({ name, plan, record = false, render = false, profile, format = 'landscape', theme, to }, deps = {}) {
  const report = { ok: false, stages: [], selectors: 0 };
  let stage = 'plan';
  const ok = detail => report.stages.push({ stage, status: 'ok', ...(detail ? { detail } : {}) });
  try {
    assertPlan(plan);
    profile ??= plan.profile ?? (format === 'vertical' ? 'phone' : 'desktop');
    const warnings = [];
    const brief = briefFromPlan(plan, warning => warnings.push(warning));
    if (warnings.length) report.warnings = warnings;
    if (theme) brief.theme = theme;
    valid(validateBrief(brief)); ok();
    const dir = projectDir(name), stateFile = path.join(dir, 'make.state.json');
    const prior = await optional(stateFile);
    const hash = createHash('sha256').update(JSON.stringify({ plan, brief, profile })).digest('hex');
    const state = prior?.hash === hash ? prior : { hash };
    stage = 'project';
    if (!await exists(path.join(dir, 'config.json'))) {
      const config = { ...JSON.parse(configTemplate()), baseURL: plan.url };
      mergeConfig(config);
      await writeProjectFile(name, 'config', config, { overwrite: false });
    }
    ok();
    stage = 'brief'; await save(name, 'brief', brief); ok();
    stage = 'guide';
    const { guide, groups } = guideFromPlan(plan, profile);
    await save(name, 'guide', guide); ok();
    stage = 'resolve';
    let resolved = state.resolved ? await optional(path.join(dir, 'guide.resolved.json')) : null;
    if (!resolved) {
      const resolve = deps.resolveGuide ?? (await import('./guide/resolver.mjs')).resolveGuide;
      resolved = await resolve({ guide, headless: true, storageState: await exists(path.join(dir, 'auth.json')) ? path.join(dir, 'auth.json') : undefined });
      if (resolved.failures.length) {
        const failure = resolved.failures[0], group = groups.findIndex(g => g.includes(failure.i));
        throw new Error(`step ${group + 1}, action ${groups[group]?.indexOf(failure.i) + 1}: ${failure.why}. Fix plan.steps[${group}].do and rerun make.`);
      }
      await save(name, 'resolved', resolved); state.resolved = true;
    }
    report.selectors = resolved.steps.filter(s => s.selector).length; ok();
    stage = 'storyboard';
    const board = draftFromGuide(resolved);
    board.steps = plan.steps.map((s, i) => ({ ...board.steps[0], id: 's' + (i + 1), caption: s.caption, narration: s.narration ?? null, guideSteps: groups[i] }));
    await save(name, 'storyboard', board); ok();
    stage = 'storyboard validate'; valid(validateStoryboard(board, { resolvedGuide: resolved, captionsEnabled: brief.captions.enabled })); ok();
    stage = 'scenario';
    const { scenario } = buildScenario({ brief, storyboard: board, resolvedGuide: resolved });
    await save(name, 'scenario', scenario); ok();
    stage = 'scenario validate'; valid(validateScenario(scenario)); ok();
    await writeFile(stateFile, JSON.stringify(state) + '\n');
    if (record) {
      stage = 'record';
      if (!state.runId || !await exists(path.join(dir, 'runs', state.runId, 'record.json'))) {
        const recorder = deps.recordScenario ?? (await import('./record/recorder.mjs')).recordScenario;
        const result = await recorder({ name, profile, headless: true, log: () => {} });
        state.runId = result.record.runId;
        state.durationSec = result.record.durationSec;
        await writeFile(stateFile, JSON.stringify(state) + '\n');
      }
      report.durationSec = state.durationSec;
      report.videoFile = path.join(dir, 'runs', state.runId, 'raw.mp4');
      ok();
    }
    if (render) {
      stage = 'render';
      if (!state.runId) {
        state.runId = (await listRuns(name)).filter(r => r.profile === profile).at(-1)?.id;
        if (!state.runId) throw new Error('No completed ' + profile + ' recording. Rerun make with --record --render.');
      }
      const composition = await optional(path.join(dir, 'composition.json'));
      const rebuild = prior?.hash !== hash || Boolean(composition && (composition.run?.id !== state.runId || composition.theme !== brief.theme));
      const exportKey = async () => JSON.stringify({ runId: state.runId, format, to, composition: await optional(path.join(dir, 'composition.json')), voice: await optional(path.join(dir, 'voice', 'clips.json')) });
      const renderKey = await exportKey();
      if (state.renderKey === renderKey && state.export?.finalFile && await exists(state.export.finalFile)) Object.assign(report, state.export);
      else {
        const renderer = deps.renderRun ?? (await import('./compose/render.mjs')).renderRun;
        const result = await renderer({ name, runId: state.runId, format, exportDir: to, rebuild, log: () => {} });
        state.export = { finalFile: result.finalFile, durationSec: result.durationSec, loudness: result.audio?.measured ?? null };
        state.renderKey = await exportKey();
        Object.assign(report, state.export);
        await writeFile(stateFile, JSON.stringify(state) + '\n');
      }
      ok();
    }
    report.ok = true;
  } catch (e) {
    report.stages.push({ stage, status: 'failed' });
    report.error = e.message + (stage === 'plan' || e.message.includes('Fix plan.steps') ? '' : `
Fix the ${stage} failure above, then rerun make with the same plan${stage === 'render' ? ' (add --record if no run exists)' : ''}.`);
  }
  return report;
}
export function formatMakeReport(report) {
  const lines = [...(report.warnings ?? []), ...report.stages.map(s => `${s.status} ${s.stage}`)];
  lines.push(`Resolved selectors: ${report.selectors}`);
  if (!report.finalFile && report.videoFile) lines.push(`Video: ${report.videoFile} (${report.durationSec.toFixed(2)} s)`);
  if (report.finalFile) lines.push(`Final video: ${report.finalFile} (${report.durationSec.toFixed(2)} s)`);
  if (report.loudness) lines.push(`Loudness: ${report.loudness.integratedLufs.toFixed(1)} LUFS, true peak ${report.loudness.truePeakDb.toFixed(1)} dBTP`);
  if (report.error) lines.push(report.error);
  const text = lines.join('\n');
  if (Buffer.byteLength(text + '\n') <= 2300) return text;
  const example = report.stages[0]?.status === 'failed' ? '\nMinimal valid example:\n' + JSON.stringify(MINIMAL_PLAN) : '';
  // JSON retains every validation error; normal output stays within 600 estimated tokens.
  const suffix = '\nMore details: rerun with --json.' + example;
  let short = '';
  for (const ch of text) { if (Buffer.byteLength(short + ch + suffix + '\n') > 2300) break; short += ch; }
  return short + suffix;
}
export async function makeCommand(flags) {
  let report, opts;
  try {
    opts = parseMakeOptions(flags);
    let plan;
    try { plan = JSON.parse(await readFile(opts.plan, 'utf8')); }
    catch { throw new Error('Cannot read plan JSON; fix --plan to point to a readable valid JSON file.\nMinimal valid example:\n' + JSON.stringify(MINIMAL_PLAN)); }
    report = await makeProject({ ...opts, plan });
  } catch (e) {
    report = { ok: false, stages: [{ stage: 'plan', status: 'failed' }], selectors: 0, error: e.message };
  }
  console.log(flags.includes('--json') ? JSON.stringify(report, null, 2) : formatMakeReport(report));
  if (!report.ok) process.exitCode = 1;
}
