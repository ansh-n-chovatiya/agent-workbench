#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from './run-claude.mjs';
import { redact, summarize, marginalFreshTokens } from './metrics.mjs';

const number = (n, digits = 0) => typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : '—';
const dollars = (n) => typeof n === 'number' ? `$${number(n, 4)}` : '—';
const seconds = (n) => typeof n === 'number' ? `${number(n / 1000, 1)} s` : '—';
const cell = (s) => String(s).replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
export const delta = (value, baseline) => typeof value === 'number' && typeof baseline === 'number' && baseline > 0
  ? `${number((value - baseline) / baseline * 100, 1)}%` : '—';
const metrics = [
  ['floorFreshTokens', 'Floor fresh tokens', number],
  ['freshTokens', 'Fresh tokens (total)', number],
  ['marginalFreshTokens', 'Marginal fresh tokens', number],
  ['costUsd', 'Cost', dollars],
  ['cacheReadTokens', 'Cache-read tokens', number],
  ['turns', 'Turns', number],
  ['durationMs', 'Wall time', seconds],
];
const known = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
export function budgetPass(median, budget) {
  return Boolean(median && Object.entries(budget).every(([key, limit]) => known(median[key]) && median[key] <= limit));
}
// Older report files lack marginal usage. Never borrow a different skill's floor.
function measuredRuns(report) {
  return report.runs.map((run) => {
    const floorFreshTokens = run.floorFreshTokens ?? report.floor?.freshTokens ?? null;
    return { ...run, floorFreshTokens, cacheReadTokens: run.cacheReadTokens ?? run.cacheRead,
      marginalFreshTokens: run.marginalFreshTokens ?? marginalFreshTokens(run.freshTokens, floorFreshTokens) };
  });
}
export function renderReport(reports, scenarios) {
  const lines = ['# Showreel benchmark', '',
    'How to read this: each headless Claude session carries an environment floor for the system prompt, plugins and skill list. Skill activation also re-injects the full user skill list (about 9.7k cache-creation tokens in the observed trace); both skills pay this overhead. Fresh tokens = input + output + cache creation. The runner measures “Invoke the {{skill}} skill, do nothing else, then reply with the single word OK.” once per invocation with the same model, plugin and permission flags, using showreel or the old skill name demo-video, and stores that skill-activation floor in the JSON report. An empty-session floor omits activation overhead; rerun older measurements for comparison. Marginal fresh tokens = max(0, run fresh − floor fresh); only marginal tokens have a token budget. Cost, cache reads, turns and wall time are whole-run measurements. Cache reads are a proxy for conversation repetition. Turns use Claude num_turns when available; surface-command fallback is partial and excludes the harness query. Missing measurements stay unknown.', '',
    'Medians include successful videos only (exit success, valid usage, and `Final video:` or a nonempty exported MP4). Even samples average the two central values. Each metric uses available successful measurements; unavailable metrics remain PENDING. Step counts are requested, not independently verified. Baseline deltas are (measured − baseline) / baseline; negative is better. Baseline verdicts require a strict reduction. Historical marginal usage is unknown without its own same-environment floor.', ''];
  for (const scenario of scenarios) {
    const matching = reports.filter((r) => r.scenario === scenario.id);
    lines.push(`## ${scenario.id} (${scenario.expectedSteps} steps)`, '');
    for (const report of matching.length ? matching : [null]) {
      const runs = report ? measuredRuns(report) : [];
      const med = summarize(runs);
      const old = report ? matching.filter((r) => r.skill === 'demo-video' && r.model === report.model).flatMap(measuredRuns) : [];
      const measuredBaseline = summarize(old);
      const baseline = measuredBaseline ?? scenario.baseline;
      lines.push(`### ${report ? `${cell(report.skill)} / ${cell(report.model)}` : 'Unmeasured'}`, '',
        `Passing videos: ${runs.filter((r) => r.ok).length}/${runs.length}. Budget result: ${!med ? 'PENDING' : budgetPass(med, scenario.budget) ? 'PASS' : 'FAIL'}.`, '',
        `Baseline: ${measuredBaseline ? 'old skill measured from supplied files (same model)' : baseline ? 'historical B0 (different target URL; fixture comparison still needed)' : 'unmeasured; run the old skill on this fixture'}.`, '',
        '| Metric | Median (passing) | Budget | vs budget | Baseline | Delta | vs baseline |',
        '|---|---:|---:|---|---:|---:|---|');
      for (const [key, label, format] of metrics) {
        const value = med?.[key], limit = scenario.budget[key], base = baseline?.[key];
        const verdict = !known(limit) ? '—' : !known(value) ? 'PENDING' : value <= limit ? 'PASS' : 'FAIL';
        const below = !known(value) || !known(base) ? 'PENDING' : value < base ? 'PASS' : 'FAIL';
        lines.push(`| ${label} | ${format(value)} | ${format(limit)} | ${verdict} | ${format(base)} | ${delta(value, base)} | ${below} |`);
      }
      if (!report) { lines.push(''); continue; }
      lines.push('', `Batch wall time: ${seconds(report.wallTimeMs)}. Auth preflight and floor are excluded.`, '',
        '| Run | Result | Input | Output | Cache creation | Cache read | Fresh | Floor fresh | Marginal fresh | Cost | Turns | Turns source | Wall | Claude duration | API duration | Failure |',
        '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|');
      for (const r of runs) lines.push(`| ${r.index} | ${r.ok ? 'PASS' : 'FAIL'} | ${number(r.input)} | ${number(r.output)} | ${number(r.cacheCreate)} | ${number(r.cacheReadTokens)} | ${number(r.freshTokens)} | ${number(r.floorFreshTokens)} | ${number(r.marginalFreshTokens)} | ${dollars(r.costUsd)} | ${number(r.turns)} | ${cell(r.turnsSource ?? 'unavailable')} | ${seconds(r.durationMs)} | ${seconds(r.claudeDurationMs)} | ${seconds(r.apiDurationMs)} | ${cell(r.failure ?? '')} |`);
      lines.push('', 'Surface meter totals (raw `showreel tokens --json`, per project; unavailable values are never treated as zero):', '', '| Run | Status | Project | Totals |', '|---|---|---|---|');
      for (const r of runs) {
        if (!r.surface?.projects?.length) lines.push(`| ${r.index} | ${cell(r.surface?.status ?? 'unavailable')} | — | — |`);
        for (const p of r.surface?.projects ?? []) lines.push(`| ${r.index} | ${cell(p.status)} | ${cell(p.name)} | ${cell(p.totals ? JSON.stringify(p.totals) : p.reason)} |`);
      }
      lines.push('');
    }
  }
  lines.push('## How to reproduce', '', 'From `plugins/showreel`, with dependencies already installed, network access and a logged-in Claude Code:', '', '```sh',
    'node scripts/benchmark/run-claude.mjs --scenario simple --runs 3 --model sonnet --out simple.json',
    'node scripts/benchmark/run-claude.mjs --scenario hard --runs 3 --model sonnet --out hard.json',
    'node scripts/benchmark/run-claude.mjs --scenario hard --runs 3 --skill demo-video --model sonnet --out hard-old.json',
    'node scripts/benchmark/report.mjs simple.json hard.json hard-old.json --write-doc', '```', '',
    'Use the same model and environment for both skills. Run `--scenario simple --skill demo-video` for a fixture-matched simple baseline too. Historical B0 used a public portfolio site, rather than this deterministic fixture. Comparisons use old-skill runs with the same model; other models are never pooled into a measured baseline.', '',
    'The runner discovers local Claude permission flags through `claude --help`; it prefers `dontAsk` with explicit Bash/Read/Write/Edit/Skill allowances. If unavailable, permission bypass requires `BENCH_ALLOW_SKIP_PERMS=1`, is restricted to a generated temporary working directory, and prints a warning. The directory restriction is not an OS sandbox.', '',
    'The hard login command currently opens a browser and waits for a person to log in and close it (both skills). An unattended hard run may time out; do not replace this with fabricated auth. Recording is headless. The harness supplies a disposable `SHOWREEL_SECRET_S2` unless provided by the caller; do not print it. Submitted fixture values are discarded. Transcripts are never copied into reports. Claude may retain its own session logs outside this report.', '',
    'Current CLI gaps may also prevent the hard auto flow: guide resolution does not load saved auth, and guide add exposes neither sensitive fills nor scroll actions. The benchmark records failures rather than patching plugin code or weakening the requested scenario.', '',
    'Each run gets isolated SHOWREEL_HOME, DEMO_VIDEO_HOME and exports, retained in a temporary showreel-bench directory for inspection. No real measurement runs in unit tests or CI. Missing Phase 8 T1 surface-meter support is recorded as unavailable. Failed runs remain in per-run tables and never contribute to medians. A budget PASS alone does not establish improvement over an unmeasured baseline.', '');
  return redact(lines.join('\n'));
}
export async function main(args) {
  let out, writeDoc = false;
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--write-doc') writeDoc = true;
    else if (args[i] === '--out' && args[i + 1]) out = args[++i];
    else if (args[i].startsWith('--')) throw new Error('Usage: report.mjs [run.json ...] [--out report.md] [--write-doc]');
    else files.push(args[i]);
  }
  const reports = await Promise.all(files.map(async (file) => {
    const report = JSON.parse(await readFile(file, 'utf8'));
    if (!['simple', 'hard'].includes(report.scenario) || !['showreel', 'demo-video'].includes(report.skill) || !Array.isArray(report.runs)) throw new Error('Invalid benchmark report');
    return report;
  }));
  const content = renderReport(reports, await Promise.all(['simple', 'hard'].map(loadScenario)));
  const targets = [out && path.resolve(out), writeDoc && fileURLToPath(new URL('../../../../docs/54-showreel-benchmark.md', import.meta.url))].filter(Boolean);
  for (const file of new Set(targets)) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, content); }
  if (!targets.length) process.stdout.write(content);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv.slice(2)); }
  catch (err) { console.error(redact(err.message)); process.exitCode = 1; }
}
