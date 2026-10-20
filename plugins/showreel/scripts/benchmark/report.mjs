#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from './run-claude.mjs';
import { redact, summarize } from './metrics.mjs';

const number = (n, digits = 0) => typeof n === 'number' && Number.isFinite(n) ? n.toFixed(digits) : '—';
const dollars = (n) => typeof n === 'number' ? `$${number(n, 4)}` : '—';
const seconds = (n) => typeof n === 'number' ? `${number(n / 1000, 1)} s` : '—';
const cell = (s) => String(s).replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
export const delta = (value, baseline) => typeof value === 'number' && typeof baseline === 'number' && baseline > 0
  ? `${number((value - baseline) / baseline * 100, 1)}%` : '—';
export function budgetPass(median, budget) {
  return Boolean(median && median.freshTokens <= budget.freshTokens && median.costUsd <= budget.costUsd);
}
export function renderReport(reports, scenarios) {
  const lines = ['# Showreel benchmark', '', 'Manual Claude Code measurements. Fresh tokens = input + output + cache creation; cache reads are reported separately. Medians use passing videos only (exit success, valid usage, and `Final video:` or a nonempty exported MP4). Even-sized samples use the mean of the two central values. Step counts are requested, not independently verified.', ''];
  for (const scenario of scenarios) {
    lines.push(`## ${scenario.id} (${scenario.expectedSteps} steps)`, '');
    const matching = reports.filter((r) => r.scenario === scenario.id);
    const oldRuns = matching.filter((r) => r.skill === 'demo-video').flatMap((r) => r.runs);
    const measuredBaseline = summarize(oldRuns);
    const baseline = measuredBaseline ?? scenario.baseline;
    lines.push(`Baseline: ${measuredBaseline ? 'old skill measured from supplied files' : baseline ? 'historical B0 (different target URL; fixture comparison still needed)' : 'unmeasured; run the old skill on this fixture'}.`, '',
      '| Skill / model | Passing | Fresh tokens | Budget | Baseline | Delta | Cost | Budget | Baseline | Delta | Wall median | Wall baseline | Budget result | Below baseline |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|');
    if (!matching.length) lines.push(`| Unmeasured | 0 | — | ${scenario.budget.freshTokens} | ${number(baseline?.freshTokens)} | — | — | ${dollars(scenario.budget.costUsd)} | ${dollars(baseline?.costUsd)} | — | — | ${seconds(baseline?.durationMs)} | PENDING | PENDING |`);
    for (const report of matching) {
      const med = summarize(report.runs), pass = budgetPass(med, scenario.budget);
      const baseline = summarize(matching.filter((r) => r.skill === 'demo-video' && r.model === report.model).flatMap((r) => r.runs)) ?? scenario.baseline;
      const below = !med || !baseline ? 'PENDING' : med.freshTokens < baseline.freshTokens && med.costUsd < baseline.costUsd ? 'PASS' : 'FAIL';
      lines.push(`| ${cell(report.skill)} / ${cell(report.model)} | ${report.runs.filter((r) => r.ok).length}/${report.runs.length} | ${number(med?.freshTokens)} | ${scenario.budget.freshTokens} | ${number(baseline?.freshTokens)} | ${delta(med?.freshTokens, baseline?.freshTokens)} | ${dollars(med?.costUsd)} | ${dollars(scenario.budget.costUsd)} | ${dollars(baseline?.costUsd)} | ${delta(med?.costUsd, baseline?.costUsd)} | ${seconds(med?.durationMs)} | ${seconds(baseline?.durationMs)} | ${pass ? 'PASS' : 'FAIL'} | ${below} |`);
    }
    for (const report of matching) {
      const med = summarize(report.runs);
      lines.push('', `### ${cell(report.skill)} / ${cell(report.model)}: per-run results`, '', `Batch wall time: ${seconds(report.wallTimeMs)}. Auth preflight is excluded.`, '',
        '| Run | Result | Input | Output | Cache creation | Cache read | Fresh | Cost | Wall | Claude duration | API duration | Failure |',
        '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|');
      for (const r of report.runs) lines.push(`| ${r.index} | ${r.ok ? 'PASS' : 'FAIL'} | ${number(r.input)} | ${number(r.output)} | ${number(r.cacheCreate)} | ${number(r.cacheRead)} | ${number(r.freshTokens)} | ${dollars(r.costUsd)} | ${seconds(r.durationMs)} | ${seconds(r.claudeDurationMs)} | ${seconds(r.apiDurationMs)} | ${cell(r.failure ?? '')} |`);
      lines.push(`| Median (passing) | | ${number(med?.input)} | ${number(med?.output)} | ${number(med?.cacheCreate)} | ${number(med?.cacheRead)} | ${number(med?.freshTokens)} | ${dollars(med?.costUsd)} | ${seconds(med?.durationMs)} | ${seconds(med?.claudeDurationMs)} | ${seconds(med?.apiDurationMs)} | |`, '',
        'Surface meter totals (raw `showreel tokens --json`, per project; unavailable values are never treated as zero):', '', '| Run | Status | Project | Totals |', '|---|---|---|---|');
      for (const r of report.runs) {
        if (!r.surface?.projects?.length) lines.push(`| ${r.index} | ${cell(r.surface?.status ?? 'unavailable')} | — | — |`);
        for (const p of r.surface?.projects ?? []) lines.push(`| ${r.index} | ${cell(p.status)} | ${cell(p.name)} | ${cell(p.totals ? JSON.stringify(p.totals) : p.reason)} |`);
      }
      lines.push('');
    }
    lines.push('');
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
