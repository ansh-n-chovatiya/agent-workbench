import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PLUGIN_ROOT } from '../scripts/lib/env.mjs';
import { readConfigFile } from '../scripts/lib/config.mjs';

async function setup(t) {
  const home = await mkdtemp(path.join(os.tmpdir(), 'showreel-cli-'));
  const cwd = path.join(home, 'demoed-project');
  const { mkdir } = await import('node:fs/promises');
  await mkdir(cwd);
  t.after(() => rm(home, { recursive: true, force: true }));
  const cli = (...args) => spawnSync(process.execPath, [path.join(PLUGIN_ROOT, 'scripts/showreel.mjs'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, SHOWREEL_HOME: path.join(home, 'state') } });
  return { home, cwd, cli };
}

test('help succeeds and unknown commands print help with exit 2', async (t) => {
  const { cli } = await setup(t);
  const help = cli('--help');
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: showreel/);
  for (const args of [['unknown'], []]) {
    const result = cli(...args);
    assert.equal(result.status, 2);
    assert.match(result.stdout, /Usage: showreel/);
  }
});

test('init creates validated state, refuses overwrite and leaves the demoed project alone', async (t) => {
  const { home, cwd, cli } = await setup(t);
  const result = cli('init', '--name', 'My App', '--url', 'https://example.com');
  assert.equal(result.status, 0, result.stderr);
  const file = path.join(home, 'state', 'projects', 'my-app', 'config.json');
  assert.equal(result.stdout.trim(), file);
  assert.equal((await readConfigFile(file)).baseURL, 'https://example.com');
  const original = await readFile(file, 'utf8');
  const second = cli('init', '--name', 'My App', '--url', 'https://other.test');
  assert.equal(second.status, 1);
  assert.match(second.stderr, /Refusing to overwrite/);
  assert.equal(await readFile(file, 'utf8'), original);
  assert.deepEqual(await readdir(cwd), []);
});

test('invalid init arguments cannot create configuration files', async (t) => {
  const { home, cli } = await setup(t);
  for (const args of [[], ['--name', 'a'], ['--name', '../x', '--url', 'http://localhost'], ['--name', 'a', '--url', 'file:///tmp'], ['--name', 'a', '--url', 'http://localhost', '--extra', 'x'], ['--name', 'a', '--name', 'b', '--url', 'http://localhost']]) {
    const result = cli('init', ...args);
    assert.equal(result.status, 1, result.stdout);
    assert.ok(result.stderr.trim());
  }
  assert.deepEqual((await readdir(home)).sort(), ['demoed-project']);
});

test('doctor JSON is parseable and exit status reflects failed checks', async (t) => {
  const { cli } = await setup(t);
  const result = cli('doctor', '--json');
  const parsed = JSON.parse(result.stdout);
  assert.equal(result.status, parsed.ok ? 0 : 1, result.stderr);
  assert.equal(typeof parsed.ok, 'boolean');
  assert.equal(parsed.items.length, 7);
  assert.ok(['kokoro', 'kokoro-low-priority'].includes(parsed.recommendations.voiceTier));
  assert.equal(cli('doctor', '--unsupported').status, 1);
});

test('composition set creates from newest run, show paths, reset and rejected writes stay atomic', async (t) => {
  const { home, cli } = await setup(t);
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { DEFAULT_BRIEF } = await import('../scripts/lib/brief.mjs');
  const dir = path.join(home,'state','projects','settings');
  const runDir = path.join(dir,'runs','20261018-120000'); await mkdir(runDir,{recursive:true});
  const brief = { ...structuredClone(DEFAULT_BRIEF), topic:'Report', theme:'dark' };
  for (const [file,data] of Object.entries({brief,storyboard:{steps:[]}})) await writeFile(path.join(dir,`${file}.json`),JSON.stringify(data));
  const events = { viewport:{width:1280,height:720}, targets:[], clicks:[], keys:[], cursor:[], steps:[] };
  for (const [file,data] of Object.entries({ events, record:{runId:'20261018-120000',durationSec:4,scale:{used:1}} })) await writeFile(path.join(runDir,`${file}.json`),JSON.stringify(data));
  await writeFile(path.join(runDir,'raw.mp4'),'placeholder');
  const set = (p,v) => cli('composition','set','--name','settings','--path',p,'--value',v);
  let result = set('cursor.style','ring'); assert.equal(result.status,0,result.stderr);
  const file = path.join(dir,'composition.json');
  assert.equal(JSON.parse(await readFile(file,'utf8')).cursor.style,'ring');
  result = cli('composition','show','--name','settings','--paths'); assert.equal(result.status,0,result.stderr);
  for (const p of ['frame.paddingXPct = 8','cursor.style = "ring"','cards.title.logo.image = null','output.quality = "standard"']) assert.ok(result.stdout.includes(p),p);
  assert.match(result.stdout,/frame.paddingXPct = 8 \[look\] frame › padding XPct/);
  result = set('cards.title.titleColor','#123456'); assert.equal(result.status,0,result.stderr);
  result = cli('composition','reset','--name','settings','--path','cards.title.titleColor'); assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(await readFile(file,'utf8')).cards.title.titleColor,'#f9fafb');
  result = set('frame.paddingPct','12'); assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(await readFile(file,'utf8')).frame.paddingXPct,12);
  const before = await readFile(file,'utf8');
  for (const [p,v] of [['cursor.sizePct','9'],['cursor.extra','true'],['__proto__.polluted','true'],['frame.background','{"type":"image","image":"../outside.png"}']]) {
    result = set(p,v); assert.equal(result.status,1,`${p}: ${result.stdout}`); assert.equal(await readFile(file,'utf8'),before);
  }
  result = cli('composition','validate','--name','settings'); assert.equal(result.status,0,result.stderr);
});
