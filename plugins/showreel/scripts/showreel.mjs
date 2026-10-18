#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configTemplate, mergeConfig, readConfigFile } from './lib/config.mjs';
import { projectDir } from './lib/paths.mjs';
import { doctor, printDoctor } from './lib/doctor.mjs';
import { readProjectFile, writeProjectFile } from './lib/project.mjs';
import { DEFAULT_BRIEF, validateBrief, setPath, questions } from './lib/brief.mjs';
import { draftFromGuide, validateStoryboard } from './lib/storyboard.mjs';
import { buildScenario, validateScenario } from './lib/scenario.mjs';

const help = `Usage: showreel <command>

Commands:
  doctor [--json] [--benchmark]    Check the environment and optional capture performance
  init --name <name> --url <URL>    Create a project configuration
  brief <init|show|set|questions> --name <name>    Manage intake
  storyboard <draft|validate> --name <name>       Draft or validate captions
  scenario <build|validate> --name <name>         Build or validate actions
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

async function main(args) {
  const [command, ...flags] = args;
  if (command === '--help' && !flags.length) return console.log(help);
  if (['brief', 'storyboard', 'scenario'].includes(command)) return projectCommand(command, flags);
  if (command === 'doctor') {
    if (new Set(flags).size !== flags.length || flags.some((flag) => !['--json', '--benchmark'].includes(flag))) {
      throw new Error('Usage: showreel doctor [--json] [--benchmark]');
    }
    const result = await doctor();
    if (flags.includes('--benchmark')) {
      const { startFixtureServer } = await import('./lib/fixture-server.mjs');
      const { benchmarkCapture, recommendScale } = await import('./lib/capture-benchmark.mjs');
      let server;
      try {
        server = await startFixtureServer();
        result.benchmark = await benchmarkCapture({ url: `${server.url}/index.html`, seconds: 3 });
        result.recommendations.captureScale = recommendScale(result.benchmark);
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
