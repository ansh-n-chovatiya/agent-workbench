#!/usr/bin/env node
// CLI entry. Run from the project being demoed, or from anywhere with
// --config; relative paths in the config resolve against the current directory.
import { spawn } from 'node:child_process';
import { existsSync, openSync, closeSync } from 'node:fs';
import { chmod, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SKILL_ROOT, run, log, warn, playwrightCli, ensureGitignore } from './lib/env.mjs';
import { writeTemplate, CONFIG_FILE } from './lib/config.mjs';
import { HOME_DIR, abs, resolveProject, deliverFolder } from './lib/paths.mjs';
import { doctor, printDoctor, requireReady } from './lib/doctor.mjs';

const HELP = `Usage: node demo.mjs [--config <file>] <command> [args]

  --config <file>      use this config file (also DEMO_VIDEO_CONFIG); otherwise
                       ./${CONFIG_FILE}, then ~/.demo-video/configs/<folder name>.json
  doctor               check Node, ffmpeg, Playwright, Chromium, Recordly and TTS
  init [--here]        write the config template to ~/.demo-video/configs/<folder name>.json,
                       or with --here to ./${CONFIG_FILE} (never overwrites)
  login                open a browser to log in by hand and save the session
  codegen <out.ts>     record clicks in a browser into a Playwright test file
  record <scenario> [--grep <title>] [--show] [--voice] [--no-rehearse] [--allow-hooks] [--no-recordly] [--detach]
                       rehearse the Playwright test fast, then record it as a human-paced demo
                       (--voice speaks each caption; narration is timed while recording)
  edit <runDir>        cut waits and derive captions and the cursor log (render runs it too)
  render [runDir] [--recordly] [--no-recordly] [--recordly-export <file>] [--no-voice]
         [--no-phone] [--no-open] [--re-edit] [--detach]
                       make the videos from the newest recording (or runDir) and copy them to
                       ~/Desktop/Demo Videos/<scenario>-<date>/. Recordly is offered only from a
                       terminal; an agent or CI run uses it only with --recordly
  recaption [runDir] [--no-voice] [--no-phone] [--no-recordly] [--no-open]
                       re-render fast from an edited edit/<clip>/captions.json
  status [runDir]      whether the newest (or runDir's) --detach job still runs, and its log's end
  selftest             run the whole pipeline on a bundled local page

  --detach (record, render) runs the command in the background, logging to
  <runDir or runs folder>/<command>-<time>.log, so it outlives this terminal
  or agent session; check it with "status".`;

// Commands implemented in scripts/lib/<command>.mjs as `main(argv, ctx)`.
const STAGES = ['record', 'edit', 'render', 'recaption', 'selftest'];

async function playwright(args, cwd) {
  const { code } = await run(process.execPath, [playwrightCli(), ...args], { cwd, quiet: false });
  return code;
}

const commands = {
  async doctor(_argv, { cwd, configFlag }) {
    const result = await doctor();
    printDoctor(result);
    await printPlaces(cwd, configFlag);
    return result.ok ? 0 : 1;
  },

  async status([runDir], { cwd, configFlag }) {
    const dirs = runDir ? [path.resolve(cwd, runDir)] : await (async () => {
      const { runsDir } = await resolveProject({ cwd, configFlag });
      const subs = await readdir(runsDir, { withFileTypes: true }).catch(() => []);
      return [runsDir, ...subs.filter((d) => d.isDirectory()).map((d) => path.join(runsDir, d.name))];
    })();
    const logs = [];
    for (const d of dirs) {
      for (const f of await readdir(d).catch(() => [])) {
        if (/^(record|render)-.+\.log$/.test(f)) logs.push({ file: path.join(d, f), t: (await stat(path.join(d, f))).mtimeMs });
      }
    }
    const newest = logs.sort((a, b) => b.t - a.t)[0]?.file;
    if (!newest) { log(`No --detach job found in ${dirs[0]}.`); return 1; }
    const pid = Number(await readFile(newest.replace(/\.log$/, '.pid'), 'utf8').catch(() => ''));
    const lines = (await readFile(newest, 'utf8')).split('\n').filter(Boolean);
    const running = pid > 0 && alive(pid);
    log(`${newest}\n${running ? `running (pid ${pid})` : 'finished'}; last lines:`);
    log(lines.slice(-15).map((l) => `  ${l}`).join('\n'));
    if (!running) {
      const end = lines.findLast((l) => l.startsWith('Final video: ')) ?? lines.findLast((l) => l.startsWith('error: '));
      if (end) log(end);
    }
    return 0;
  },

  async init(argv, { cwd, configFlag }) {
    const file = configFlag ? path.resolve(cwd, configFlag)
      : argv.includes('--here') ? path.join(cwd, CONFIG_FILE)
      : path.join(HOME_DIR, 'configs', `${path.basename(cwd)}.json`);
    log(await writeTemplate(file)
      ? `Created ${file}; set "baseURL" to your app's address.`
      : `Kept the existing ${file}; nothing was overwritten.`);
    return 0;
  },

  // The user types credentials into the real browser; only the resulting
  // cookies/storage are saved, never a password.
  async login(_argv, { cwd, configFlag }) {
    const { config, authFile: state } = await resolveProject({ cwd, configFlag });
    // The session holds cookies: readable by the user only, and when the
    // config puts it inside the project, git-ignored or flagged.
    // undefined when the folder already existed; only a new one gets a `*` .gitignore.
    const created = (await mkdir(path.dirname(state), { recursive: true, mode: 0o700 })) !== undefined;
    const dir = path.dirname(state), rel = path.relative(cwd, dir);
    if (dir === path.resolve(cwd)) warn(`${state} will hold login cookies; add it to .gitignore`);
    else if (!rel.startsWith('..') && !path.isAbsolute(rel)) await ensureGitignore(dir, { created, file: state });
    log('Log in in the browser window that opens, then close it to save the session.');
    const code = await playwright(['codegen', `--save-storage=${state}`, config.baseURL], cwd);
    if (code === 0 && existsSync(state)) {
      await chmod(state, 0o600);
      log(`Session saved to ${state}.`);
    }
    return code;
  },

  async codegen([out], { cwd, configFlag }) {
    if (!out) { log('Usage: node demo.mjs codegen <out.spec.ts>'); return 2; }
    const { config, authFile: state } = await resolveProject({ cwd, configFlag });
    const args = ['codegen', '--target', 'playwright-test'];
    if (existsSync(state)) args.push(`--load-storage=${state}`);
    args.push('-o', path.resolve(cwd, out), config.baseURL);
    log(`Click through the feature in the browser; close it to write ${out}.`);
    return playwright(args, cwd);
  },
};

// True while process `pid` exists (EPERM: it exists but belongs to another user).
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; }
}

// Re-runs this command without --detach as a background process that outlives
// this one: output to <runDir or runs folder>/<command>-<time>.log, its pid
// beside it in .pid for `status`.
async function detach(cmd, argv, ctx) {
  // render's run folder is its one positional argument (--recordly-export takes a value).
  const runDir = cmd === 'render' && argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--recordly-export');
  const dir = runDir ? path.resolve(ctx.cwd, runDir) : (await resolveProject(ctx)).runsDir;
  await mkdir(dir, { recursive: true });
  const d = new Date(), p = (n) => String(n).padStart(2, '0'); // local time, as run folders are named
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const file = path.join(dir, `${cmd}-${stamp}.log`);
  const fd = openSync(file, 'a');
  const args = [process.argv[1], ...(ctx.configFlag ? ['--config', ctx.configFlag] : []), cmd, ...argv];
  const child = spawn(process.execPath, args, { cwd: ctx.cwd, detached: true, stdio: ['ignore', fd, fd] });
  closeSync(fd);
  await writeFile(file.replace(/\.log$/, '.pid'), String(child.pid));
  child.unref();
  log(`Running ${cmd} in the background (pid ${child.pid}); log: ${file}`);
  log(`Check it with: node ${process.argv[1]}${ctx.configFlag ? ` --config ${ctx.configFlag}` : ''} status${runDir ? ` ${dir}` : ''}`);
  return 0;
}

// Where this config sends runs, login state and deliverables, and a warning
// when outDir or storageState still points inside the project (the layout
// from before ~/.demo-video). Silent when no config is found.
async function printPlaces(cwd, configFlag) {
  let p;
  try { p = await resolveProject({ cwd, configFlag }); } catch (err) {
    if (err.code === 'NO_CONFIG') return;
    throw err;
  }
  log(`Config ${p.configFile}\n  runs:         ${p.runsDir}\n  login state:  ${p.authFile}\n  deliverables: ${path.join(path.dirname(deliverFolder(p.config, 'x')), '<scenario>-<date>')}`);
  for (const [key, dir] of [['outDir', p.runsDir], ['storageState', p.authFile]]) {
    const rel = path.relative(path.resolve(cwd), dir);
    if (p.config[key] && !rel.startsWith('..') && !path.isAbsolute(rel)) {
      warn(`${key} ${dir} is inside the project folder (the old layout); remove "${key}" from ${p.configFile} to use ~/.demo-video`);
    }
  }
}

async function stage(name, argv, ctx) {
  const file = path.join(SKILL_ROOT, 'scripts', 'lib', `${name}.mjs`);
  if (!existsSync(file)) { log(`${name} is not built yet`); return 2; }
  const mod = await import(pathToFileURL(file).href);
  return (await mod.main(argv, ctx)) ?? 0;
}

// Takes a global `--config <file>` (or `--config=<file>`) out of argv.
function takeConfigFlag(argv) {
  const rest = [];
  let configFlag;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') {
      configFlag = argv[++i];
      if (!configFlag) throw new Error('--config needs a file path');
    } else if (argv[i].startsWith('--config=')) configFlag = argv[i].slice(9);
    else rest.push(argv[i]);
  }
  return { rest, configFlag: configFlag && abs(configFlag) };
}

async function main(args) {
  const { rest: [cmd, ...argv], configFlag } = takeConfigFlag(args);
  // Stages that still call loadConfig(cwd) see the flag through the env var.
  // `~` is expanded here once, so every command (init included) reads the same
  // file; zsh leaves `~` unexpanded after `--config=`.
  if (configFlag) process.env.DEMO_VIDEO_CONFIG = abs(configFlag);
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') { log(HELP); return cmd ? 0 : 2; }
  if (!(cmd in commands) && !STAGES.includes(cmd)) { log(`Unknown command "${cmd}".\n\n${HELP}`); return 2; }
  const ctx = { cwd: process.cwd(), configFlag };
  if (cmd !== 'doctor' && cmd !== 'status') ctx.doctor = await requireReady();
  if (argv.includes('--detach')) {
    if (cmd !== 'record' && cmd !== 'render') throw new Error('--detach works with record and render only');
    return detach(cmd, argv.filter((a) => a !== '--detach'), ctx);
  }
  return cmd in commands ? commands[cmd](argv, ctx) : stage(cmd, argv, ctx);
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code ?? 0),
  (err) => { console.error(process.env.DEBUG ? err.stack : `error: ${err.message}`); process.exit(1); },
);
