import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RUNS = Number(process.argv[2] ?? 3);
const plugin = fileURLToPath(new URL('../../../plugins/skills-demo', import.meta.url));
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
    models: Object.keys(out.modelUsage ?? {}), isError: !!out.is_error, result: String(out.result ?? '').split(homedir()).join('~').slice(0, 200),
    ok: String(out.result ?? '').startsWith('Final video:'),
  });
  console.log(`run ${i + 1}/${RUNS}`, runs[i]);
}
const good = runs.filter((x) => x.ok);
if (good.length === 0) { console.error('no run produced a video; not writing a baseline'); process.exit(1); }
const med = (k) => [...good.map((x) => x[k])].sort((a, b) => a - b)[Math.floor(good.length / 2)];
const result = { okRuns: good.length, runs, median: { input: med('input'), output: med('output'), cacheRead: med('cacheRead'), cacheCreate: med('cacheCreate') } };
mkdirSync('../results', { recursive: true });
writeFileSync('../results/b0-baseline.json', JSON.stringify(result, null, 2));
console.log('median', result.median);
