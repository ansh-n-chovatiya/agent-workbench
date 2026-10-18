#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configTemplate, mergeConfig, readConfigFile } from './lib/config.mjs';
import { projectDir, HOME_DIR } from './lib/paths.mjs';
import { recordingCommand } from './lib/record/commands.mjs';
import { doctor, printDoctor } from './lib/doctor.mjs';
import { readProjectFile, writeProjectFile } from './lib/project.mjs';
import { DEFAULT_BRIEF, validateBrief, setPath, questions } from './lib/brief.mjs';
import { draftFromGuide, validateStoryboard } from './lib/storyboard.mjs';
import { buildScenario, validateScenario } from './lib/scenario.mjs';
import { validateComposition, compositionPaths, changeComposition } from './lib/compose/composition.mjs';
import { readFile } from 'node:fs/promises';
import { addGuideStep } from './lib/guide/commands.mjs';

const help = `Usage: showreel <command>

Commands:
  doctor [--json] [--benchmark]    Check the environment and optional capture performance
  init --name <name> --url <URL>    Create a project configuration
  brief <init|show|set|questions> --name <name>    Manage intake
  storyboard <draft|validate> --name <name>       Draft or validate captions
  scenario <build|validate> --name <name>         Build or validate actions
  guide [resolve|add] --name <name>             Capture or resolve a guide
  snapshot --url <URL> [--max <N>]               List visible controls
  record --name <name> [--headed] [--no-rehearsal] [--scale <S>] [--fps <N>]
  login --name <name> [--url <URL>]              Save a browser login session
  runs --name <name>                            List completed recordings
  render --name <name> [--run <ID>] [--size 1080|4k] [--fps 30|60] [--out <FILE>] [--rebuild] [--stills T1,T2]
  composition show --name <name> [--paths]      Inspect settings or list every settable path
  composition validate --name <name>            Validate composition.json
  composition set --name <name> --path a.b.c --value <json-or-string>
  composition reset --name <name> --path a.b     Restore the theme default
  cursor-demo [--headed]                        Compare planned and linear motion
  --help                          Show this help
`;

function parseOptions(flags, allowed, switches = []) {
  const options = {}, pairs = [];
  for (let i = 0; i < flags.length; i++) {
    const flag = flags[i];
    if (!flag.startsWith('--') && allowed.includes('pairs') && flag.includes('=')) { pairs.push(flag); continue; }
    if (!allowed.includes(flag) || Object.hasOwn(options, flag)) throw new Error(`Invalid option: ${flag}`);
    if (switches.includes(flag)) options[flag] = true;
    else {
      if (!flags[i + 1] || flags[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
      options[flag] = flags[++i];
    }
  }
  if (!options['--name']) throw new Error('--name is required');
  projectDir(options['--name']);
  return { options, pairs };
}
function printValidation({ errors, warnings = [], pending = [] }) {
  for (const warning of warnings) console.error(`warning: ${warning}`);
  for (const item of pending) console.error(`pending: ${item}`);   // not an error: the recorder refuses to start until these are supplied
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
}
async function projectCommand(command, flags) {
  const [subcommand, ...rest] = flags;
  const known = { brief: ['init', 'show', 'set', 'questions'], storyboard: ['draft', 'validate'], scenario: ['build', 'validate'] };
  if (!known[command].includes(subcommand)) { console.log(help); process.exitCode = 2; return; }
  const allowed = ['--name'];
  if (command === 'brief' && subcommand === 'init') allowed.push('--url', '--topic');
  if (command === 'brief' && subcommand === 'set') allowed.push('pairs');
  if (command === 'brief' && subcommand === 'questions') allowed.push('--json');
  if (command === 'storyboard' && subcommand === 'draft') allowed.push('--force');
  const { options, pairs } = parseOptions(rest, allowed, ['--json', '--force']);
  const name = options['--name'];
  if (command === 'brief') {
    if (subcommand === 'init') {
      const brief = structuredClone(DEFAULT_BRIEF);
      if (options['--url']) brief.baseURL = options['--url'];
      if (options['--topic']) brief.topic = options['--topic'];
      const result = validateBrief(brief);
      if (!result.ok) throw new Error(result.errors.join('; '));
      console.log(await writeProjectFile(name, 'brief', brief, { overwrite: false }));
      return;
    }
    let brief = await readProjectFile(name, 'brief');
    if (subcommand === 'show') console.log(JSON.stringify(brief, null, 2));
    if (subcommand === 'set') {
      if (!pairs.length) throw new Error('Usage: showreel brief set --name <name> key=value ...');
      for (const pair of pairs) { const split = pair.indexOf('='); brief = setPath(brief, pair.slice(0, split), pair.slice(split + 1)); }
      const result = validateBrief(brief);
      if (!result.ok) throw new Error(result.errors.join('; '));
      await writeProjectFile(name, 'brief', brief);
      console.log('ok');
    }
    if (subcommand === 'questions') {
      const result = questions(brief);
      console.log(options['--json'] ? JSON.stringify(result, null, 2) : result.length ? result.map((q, i) => `${i + 1}. ${q.question}`).join('\n') : 'intake complete');
    }
    return;
  }
  if (command === 'storyboard') {
    const resolvedGuide = await readProjectFile(name, 'resolved');
    if (subcommand === 'draft') {
      const storyboard = draftFromGuide(resolvedGuide);
      const result = validateStoryboard(storyboard, { resolvedGuide });
      if (!result.ok) throw new Error(result.errors.join('; '));
      await writeProjectFile(name, 'storyboard', storyboard, { overwrite: Boolean(options['--force']) });
      console.log(`${storyboard.steps.length} steps`);
    } else {
      const storyboard = await readProjectFile(name, 'storyboard');
      const brief = await readProjectFile(name, 'brief');
      printValidation(validateStoryboard(storyboard, { resolvedGuide, captionsEnabled: brief.captions.enabled }));
    }
    return;
  }
  if (subcommand === 'build') {
    const brief = await readProjectFile(name, 'brief');
    const storyboard = await readProjectFile(name, 'storyboard');
    const resolvedGuide = await readProjectFile(name, 'resolved');
    const validation = validateBrief(brief);
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    const { scenario, warnings } = buildScenario({ brief, storyboard, resolvedGuide });
    await writeProjectFile(name, 'scenario', scenario);
    printValidation({ ...validateScenario(scenario), warnings });
  } else printValidation(validateScenario(await readProjectFile(name, 'scenario')));
}

async function guideCommand(flags) {
  if (flags[0] === 'add') {
    console.log(await addGuideStep(flags.slice(1)));
    return;
  }
  const resolving = flags[0] === 'resolve';
  if (flags[0] && !flags[0].startsWith('--') && !resolving) {
    console.log(help);
    process.exitCode = 2;
    return;
  }
  const { options } = parseOptions(resolving ? flags.slice(1) : flags,
    resolving ? ['--name'] : ['--name', '--url']);
  const name = options['--name'];
  if (resolving) {
    const { resolveGuide } = await import('./lib/guide/resolver.mjs');
    const guide = await readProjectFile(name, 'guide');
    const resolved = await resolveGuide({ guide });
    await writeProjectFile(name, 'resolved', resolved);
    console.log(`${resolved.steps.length}/${guide.steps.length} steps resolved`);
    for (const failure of resolved.failures) console.error(`${failure.i}: ${failure.name}: ${failure.why}`);
    if (resolved.failures.length) process.exitCode = 1;
    return;
  }
  const url = options['--url'] ?? (await readProjectFile(name, 'brief')).baseURL;
  if (!url) throw new Error('A URL is required; set brief.baseURL or pass --url');
  const { recordGuide } = await import('./lib/guide/recorder.mjs');
  const steps = await recordGuide({ url, name });
  console.log(`${steps.length} steps`);
  console.log(path.join(projectDir(name), 'guide.json'));
}

async function snapshotCommand(flags) {
  const options = {};
  for (let i = 0; i < flags.length; i += 2) {
    const flag = flags[i];
    if (!['--url', '--max'].includes(flag) || Object.hasOwn(options, flag)) {
      throw new Error(`Invalid option: ${flag}`);
    }
    if (!flags[i + 1] || flags[i + 1].startsWith('--')) throw new Error(`Missing value for ${flag}`);
    options[flag] = flags[i + 1];
  }
  if (!options['--url']) throw new Error('--url is required');
  const { snapshotPage, formatSnapshot } = await import('./lib/snapshot.mjs');
  const snapshot = await snapshotPage({ url: options['--url'], max: Number(options['--max'] ?? 60) });
  console.log(formatSnapshot(snapshot));
}

async function main(args) {
  const [command, ...flags] = args;
  if (['record', 'login', 'runs', 'cursor-demo'].includes(command)) {
    return recordingCommand(command, flags);
  }
  if (command === 'render') {
    const { options } = parseOptions(flags, ['--name', '--run', '--size', '--fps', '--out', '--rebuild', '--stills'], ['--rebuild']);
    const { renderRun } = await import('./lib/compose/render.mjs');
    return renderRun({ name: options['--name'], runId: options['--run'], size: options['--size'],
      fps: options['--fps'] === undefined ? undefined : Number(options['--fps']), out: options['--out'], rebuild: Boolean(options['--rebuild']),
      stills: options['--stills'] ? options['--stills'].split(',').map(Number) : null });
  }
  if (command === 'composition') {
    const [subcommand, ...rest] = flags;
    if (!['show', 'validate', 'set', 'reset'].includes(subcommand)) throw new Error('Usage: showreel composition <show|validate|set|reset> --name <name>');
    const allowed = ['--name', ...(subcommand === 'show' ? ['--paths'] : []), ...(['set','reset'].includes(subcommand) ? ['--path'] : []), ...(subcommand === 'set' ? ['--value'] : [])];
    const { options } = parseOptions(rest, allowed, ['--paths']);
    const name = options['--name'], file = path.join(projectDir(name), 'composition.json');
    let c;
    try { c = JSON.parse(await readFile(file, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT' || !['set','reset'].includes(subcommand)) throw error;
      const { loadRunComposition } = await import('./lib/compose/render.mjs');
      c = (await loadRunComposition({ name })).composition;
    }
    if (subcommand === 'show') console.log(options['--paths'] ? Object.entries(compositionPaths(c)).map(([p,v]) => `${p} = ${JSON.stringify(v)}`).join('\n') : JSON.stringify(c, null, 2));
    else {
      if (['set','reset'].includes(subcommand)) {
        if (!options['--path'] || (subcommand === 'set' && options['--value'] === undefined)) throw new Error('--path and (for set) --value are required');
        let value = options['--value'];
        try { value = JSON.parse(value); } catch { /* Plain text is a supported value. */ }
        c = changeComposition(c, options['--path'], value, { reset: subcommand === 'reset' });
      }
      const result = validateComposition(c);
      printValidation(result);
      if (result.ok) {
        if (subcommand !== 'validate') {
          const { resolveImageAssets } = await import('./lib/compose/render.mjs');
          await resolveImageAssets(c, projectDir(name));
          await writeFile(file, JSON.stringify(c, null, 2) + '\n');
        }
        console.log('ok');
      }
    }
    return;
  }
  if (command === 'guide') return guideCommand(flags);
  if (command === 'snapshot') return snapshotCommand(flags);
  if (command === '--help' && !flags.length) return console.log(help);
  if (['brief', 'storyboard', 'scenario'].includes(command)) return projectCommand(command, flags);
  if (command === 'doctor') {
    if (new Set(flags).size !== flags.length || flags.some((flag) => !['--json', '--benchmark'].includes(flag))) {
      throw new Error('Usage: showreel doctor [--json] [--benchmark]');
    }
    const result = await doctor();
    if (flags.includes('--benchmark')) {
      const { startFixtureServer } = await import('./lib/fixture-server.mjs');
      const { benchmarkPipeline, recommendScale } = await import('./lib/capture-benchmark.mjs');
      let server;
      try {
        server = await startFixtureServer();
        result.benchmark = await benchmarkPipeline({ url: `${server.url}/index.html`, seconds: 3 });
        result.recommendations.captureScale = recommendScale(result.benchmark);
        await mkdir(HOME_DIR, { recursive: true });
        await writeFile(path.join(HOME_DIR, 'benchmark.json'), JSON.stringify({
          scale: result.recommendations.captureScale, at: new Date().toISOString(),
        }) + '\n');
      } finally { await server?.close(); }
    }
    if (flags.includes('--json')) console.log(JSON.stringify(result, null, 2));
    else {
      printDoctor(result);
      if (result.benchmark) {
        console.table(result.benchmark);
        console.log(`recommended capture scale: ${result.recommendations.captureScale}`);
      }
    }
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  if (command === 'init') {
    const options = {};
    for (let i = 0; i < flags.length; i += 2) {
      const flag = flags[i];
      if (!['--name', '--url'].includes(flag) || !flags[i + 1] || flags[i + 1].startsWith('--') || Object.hasOwn(options, flag)) {
        throw new Error('Usage: showreel init --name <name> --url <baseURL>');
      }
      options[flag] = flags[i + 1];
    }
    if (!options['--name'] || !options['--url']) throw new Error('Usage: showreel init --name <name> --url <baseURL>');
    const dir = projectDir(options['--name']);
    const config = { ...JSON.parse(configTemplate()), baseURL: options['--url'] };
    mergeConfig(config);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, 'config.json');
    try { await writeFile(file, JSON.stringify(config, null, 2) + '\n', { flag: 'wx' }); }
    catch (err) {
      if (err.code === 'EEXIST') throw new Error(`Refusing to overwrite existing config: ${file}`);
      throw err;
    }
    await readConfigFile(file);
    console.log(file);
    return;
  }
  console.log(help);
  process.exitCode = 2;
}

try { await main(process.argv.slice(2)); }
catch (err) { console.error(err.message); process.exitCode = 1; }
