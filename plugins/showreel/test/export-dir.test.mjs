import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
const temp = await mkdtemp(path.join(os.tmpdir(), 'showreel-export-dir-'));
process.env.SHOWREEL_HOME = path.join(temp, 'home');
const { defaultExportDir, validateExportDir, getExportDir, setExportDir, exportFileName, uniqueName } = await import('../scripts/lib/export-dir.mjs');
const { shortPath, formatSize, formatDuration, loadExportSettings, exportRequestBody } = await import('../editor/export-model.mjs');
test.after(() => rm(temp, { recursive: true, force: true }));
test('default export folders use the user home and OS media folder', () => {
  assert.equal(defaultExportDir('darwin', temp), path.join(temp, 'Movies', 'Showreel'));
  for (const platform of ['linux','win32']) assert.equal(defaultExportDir(platform, temp), path.join(temp, 'Videos', 'Showreel'));
});
test('destination preferences are normalized, atomic and validated through symlinks', async () => {
  const home = process.env.SHOWREEL_HOME;
  assert.equal(await getExportDir(), defaultExportDir());
  const SYS = process.platform === 'win32' ? (process.env.SystemRoot || 'C:\\Windows') : '/System';
  for (const dir of ['relative', '', path.parse(process.cwd()).root, SYS, path.join(SYS, 'Library'), path.join(home, 'projects', 'p')]) await assert.rejects(validateExportDir(dir));
  const folder = path.join(temp, 'exports');
  assert.equal(await setExportDir(folder + path.sep + '.'), folder);
  assert.equal(await getExportDir(), folder);
  assert.deepEqual(JSON.parse(await readFile(path.join(home, 'preferences.json'), 'utf8')), { exportDir: folder });
  await validateExportDir(folder, { create: true });
  const file = path.join(temp, 'file'); await writeFile(file, 'x');
  await assert.rejects(setExportDir(file), /folder/);
  await mkdir(path.join(home, 'projects'), { recursive: true });
  await symlink(path.join(home, 'projects'), path.join(temp, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(setExportDir(path.join(temp, 'alias', 'new')), /outside/);
  assert.equal(await getExportDir(), folder);
});
test('readable names are cross-platform safe, bounded, and include orientation and size', () => {
  const date = new Date(2026, 9, 20, 12, 57);
  assert.equal(exportFileName({projectName:'portfolio', date}), 'portfolio 2026-10-20 12.57.mp4');
  assert.equal(exportFileName({projectName:'portfolio', date, format:'vertical',size:'4k'}), 'portfolio 2026-10-20 12.57 (vertical) 4K.mp4');
  for (const name of ['CON', 'con.txt', 'LPT1', 'NUL.', 'aux']) assert.match(exportFileName({ projectName:name,date }), /^_/);
  assert.equal(exportFileName({projectName:' a/\\:*?"<>|\x01  b... ',date}), 'a b 2026-10-20 12.57.mp4');
  assert.ok(exportFileName({projectName:'a'.repeat(200),date,size:'4k',format:'vertical'}).length <= 80);
  assert.match(exportFileName({projectName:'...',date}), /^Video /);
});
test('uniqueName never overwrites existing files or dangling links', async () => {
  const dir = path.join(temp, 'unique'); await mkdir(dir);
  await writeFile(path.join(dir, 'Video.mp4'), 'original');
  await symlink(path.join(dir, 'missing'), path.join(dir, 'Video (2).mp4'));
  assert.equal(await uniqueName(dir, 'Video', '.mp4'), path.join(dir, 'Video (3).mp4'));
  assert.equal(await readFile(path.join(dir, 'Video.mp4'), 'utf8'), 'original');
});
test('display helpers abbreviate only home boundaries and format export metadata', () => {
  assert.equal(shortPath('/data/example/Videos', '/data/example'), '~/Videos');
  assert.equal(shortPath('/data/example', '/data/example/'), '~');
  assert.equal(shortPath('/data/usrx/Videos', '/data/usr'), '/data/usrx/Videos');
  assert.equal(shortPath('C:\\Users\\Me\\Videos', 'c:\\users\\me'), '~\\Videos');
  assert.equal(formatSize(1250000), '1.3 MB'); assert.equal(formatSize(0), '0.0 MB');
  assert.equal(formatSize(null), 'Size unavailable'); assert.equal(formatDuration(65), '1:05');
});

test('settings failures show a platform default and leave export destination to the server', async () => {
  for (const error of [new Error('Not found'), new TypeError('Failed to fetch')]) {
    for (const [platform, folder] of [['MacIntel', 'Movies'], ['Win32', 'Videos'], ['Linux x86_64', 'Videos'], ['', 'Videos']]) {
      const settings = await loadExportSettings(async url => {
        assert.equal(url, '/api/export/settings'); throw error;
      }, platform);
      assert.deepEqual(settings, { exportDir: `~/${folder}/Showreel`, canChoose: false, fallback: true });
      assert.deepEqual(exportRequestBody(settings), {});
    }
  }
  const actual = { exportDir: '/chosen/folder', homeDir: '/home/user', canChoose: true };
  assert.equal(await loadExportSettings(async () => actual, 'MacIntel'), actual);
  assert.deepEqual(exportRequestBody(actual), { dir: '/chosen/folder' });
});
