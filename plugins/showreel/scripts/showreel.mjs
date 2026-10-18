#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { configTemplate, mergeConfig, readConfigFile } from './lib/config.mjs';
import { projectDir } from './lib/paths.mjs';
import { doctor, printDoctor } from './lib/doctor.mjs';

const help = `Usage: showreel <command>

Commands:
  doctor [--json] [--benchmark]    Check the environment and optional capture performance
  init --name <name> --url <URL>    Create a project configuration
  --help                          Show this help
`;

async function main(args) {
  const [command, ...flags] = args;
  if (command === '--help' && !flags.length) return console.log(help);
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
