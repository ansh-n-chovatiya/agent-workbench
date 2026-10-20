import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants, createReadStream } from 'node:fs';
import { access, appendFile, stat } from 'node:fs/promises';
import { defaultExportDir, getExportDir, setExportDir, validateExportDir } from '../export-dir.mjs';
import { HOME_DIR } from '../paths.mjs';
import { loadRunComposition } from '../compose/render.mjs';
import { readBody } from './body.mjs';
import { parseRange } from './http.mjs';
const execute = promisify(execFile);
async function installed(command) {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    try { await access(path.join(dir, command), constants.X_OK); return true; } catch { /* next PATH entry */ }
  }
  return false;
}
export async function chooserCommand(platform = process.platform, has = installed) {
  if (platform === 'darwin') return ['osascript', ['-e', 'POSIX path of (choose folder with prompt "Choose where to save your videos")']];
  if (platform === 'win32') return ['powershell.exe', ['-NoProfile', '-STA', '-Command', '[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding; Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = "Choose where to save your videos"; if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($dialog.SelectedPath) }']];
  if (await has('zenity')) return ['zenity', ['--file-selection', '--directory', '--title=Choose where to save your videos']];
  if (await has('kdialog')) return ['kdialog', ['--getexistingdirectory', os.homedir(), '--title', 'Choose where to save your videos']];
  return null;
}
export async function chooseFolder({ platform = process.platform, run = execute, has = installed } = {}) {
  const command = await chooserCommand(platform, has);
  if (!command) throw Object.assign(new Error('No native folder chooser is installed. Type the folder path instead.'), { statusCode: 501 });
  try {
    const { stdout } = await run(...command, { timeout: 120000, encoding: 'utf8', maxBuffer: 65536, windowsHide: true });
    const dir = stdout.trim(); return dir ? { dir } : { cancelled: true };
  } catch (error) {
    if ((platform === 'darwin' && /\(-128\)/.test(error.stderr ?? '')) || (platform === 'linux' && error.code === 1 && !error.killed && !(error.stderr ?? '').trim())) return { cancelled: true };
    if (error.code === 'ENOENT') throw Object.assign(new Error('No native folder chooser is available. Type the folder path instead.'), { statusCode: 501 });
    throw new Error(error.killed ? 'The folder window timed out. Try again.' : 'Could not open the folder window. Try again.');
  }
}
export function exportOpenerArgs(file, action, platform = process.platform) {
  if (action === 'reveal') {
    if (platform === 'darwin') return ['open', ['-R', file]];
    if (platform === 'win32') return ['explorer.exe', [`/select,${file}`]];
    return ['xdg-open', [path.dirname(file)]];
  }
  if (platform === 'darwin') return ['open', [file]];
  // Invoke the file association without passing the path through a command shell.
  if (platform === 'win32') return ['rundll32.exe', ['url.dll,FileProtocolHandler', file]];
  return ['xdg-open', [file]];
}
export async function exportOpener(file, action) {
  if (process.env.SHOWREEL_OPENER === 'noop') {
    await appendFile(process.env.SHOWREEL_OPENER_LOG ?? path.join(HOME_DIR, 'opener.jsonl'), JSON.stringify({ action, file }) + '\n'); return;
  }
  await execute(...exportOpenerArgs(file, action), { timeout: 15000, windowsHide: true });
}
async function body(request) {
  const bytes = await readBody(request);
  if (!bytes.length) return {};
  try { const data = JSON.parse(bytes.toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw new Error('Invalid JSON object'); }
}
// Called only after the editor's token, Host and Origin checks. No client path is used for file actions.
export async function handleExportApi({ request, response, route, method, send, exports, project, name, closing, opener = exportOpener, choose = chooseFolder }) {
  const last = exports.lastResult;
  if (method === 'GET' && route === '/api/export/settings') {
    send(200, { exportDir: await getExportDir(), defaultDir: defaultExportDir(), homeDir: os.homedir(), platform: process.platform, canChoose: !!await chooserCommand(), lastExport: last }); return true;
  }
  if (method === 'POST' && route === '/api/export/folder') { send(200, { dir: await setExportDir((await body(request)).dir) }); return true; }
  if (method === 'POST' && route === '/api/export/choose-folder') {
    const result = await choose();
    if (result.dir) result.dir = await setExportDir(result.dir);
    send(200, result); return true;
  }
  if (method === 'POST' && route === '/api/export') {
    const data = await body(request), exportDir = await validateExportDir(data.dir ?? await getExportDir());
    const current = await loadRunComposition({ name, runId: project.runId });
    const output = current.composition.output;
    const format = output.preset ?? (output.height > output.width ? 'vertical' : output.width === output.height ? 'square' : 'landscape');
    if (closing || !exports.start({ name, runId: project.runId, exportDir, format })) send(409, { error: 'An export is already running' });
    else send(202, { ok: true });
    return true;
  }
  if (!((method === 'POST' && ['/api/reveal', '/api/open'].includes(route)) || (method === 'GET' && ['/api/export/download', '/api/export/poster'].includes(route)))) return false;
  if (!last?.finalFile) { send(404, { error: 'Export a video first' }); return true; }
  // Verify existence on every action, rather than opening a stale path in an external application.
  const file = route === '/api/export/poster' ? path.join(last.renderDir, 'poster.png') : last.finalFile;
  const info = await stat(file);
  if (!info.isFile()) throw new Error('The exported file is no longer available');
  if (method === 'POST') { await opener(file, route === '/api/reveal' ? 'reveal' : 'open'); send(200, { ok: true }); return true; }
  const poster = route === '/api/export/poster', range = poster ? null : parseRange(request.headers.range, info.size);
  if (range === false) { response.writeHead(416, { 'content-range': `bytes */${info.size}` }); response.end(); return true; }
  const { start, end } = range ?? { start: 0, end: info.size - 1 };
  response.writeHead(range ? 206 : 200, { 'content-type': poster ? 'image/png' : 'video/mp4', 'content-length': Math.max(0, end - start + 1),
    ...(!poster ? { 'accept-ranges': 'bytes', 'content-disposition': `attachment; filename="video.mp4"; filename*=UTF-8''${encodeURIComponent(last.fileName).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}` } : {}),
    ...(range ? { 'content-range': `bytes ${start}-${end}/${info.size}` } : {}) });
  if (!info.size) response.end();
  else { const stream = createReadStream(file, { start, end }); stream.on('error', error => response.destroy(error)); response.on('close', () => stream.destroy()); stream.pipe(response); }
  return true;
}
