import os from 'node:os';
import { access, mkdir, mkdtemp, rm, statfs } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { HOME_DIR } from './paths.mjs';

const GB = 1024 ** 3;
const supportedNode = (version) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [, major, minor] = match.map(Number);
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22;
};

export function evaluate({ totalmem, cpus, freeBytes, nodeVersion, platform = 'unknown', arch = 'unknown' }) {
  const items = [
    { id: 'node', level: supportedNode(nodeVersion) ? 'ok' : 'fail', detail: nodeVersion, ...(!supportedNode(nodeVersion) && { fix: 'Install Node ^20.19.0 || >=22.12.0' }) },
    { id: 'platform', level: 'ok', detail: `${platform} ${arch}` },
    { id: 'memory', level: totalmem < 8 * GB ? 'warn' : 'ok', detail: `${(totalmem / GB).toFixed(1)} GB total RAM` },
    { id: 'cpu', level: cpus < 4 ? 'warn' : 'ok', detail: `${cpus} logical cores` },
    { id: 'disk', level: freeBytes < GB ? 'fail' : freeBytes < 5 * GB ? 'warn' : 'ok', detail: `${(freeBytes / GB).toFixed(1)} GB free`, ...(freeBytes < 5 * GB && { fix: 'Free at least 5 GB on the state volume' }) },
  ];
  return {
    ok: !items.some((item) => item.level === 'fail'),
    items,
    recommendations: { voiceTier: totalmem >= 8 * GB && cpus >= 4 ? 'kokoro' : 'kokoro-low-priority' },
  };
}

export async function doctor() {
  let freeBytes = 0;
  let diskError;
  try {
    await mkdir(HOME_DIR, { recursive: true });
    const stats = await statfs(HOME_DIR);
    freeBytes = Number(stats.bavail) * Number(stats.bsize);
  } catch (err) { diskError = err; }
  const result = evaluate({ totalmem: os.totalmem(), cpus: os.cpus().length, freeBytes, nodeVersion: process.versions.node, platform: os.platform(), arch: os.arch() });
  if (diskError) result.items.find((item) => item.id === 'disk').detail = `Cannot check free space: ${diskError.message}`;
  let probe;
  try {
    probe = await mkdtemp(path.join(HOME_DIR, '.doctor-'));
    await rm(probe, { recursive: true });
    result.items.push({ id: 'home-writable', level: 'ok', detail: 'State directory is writable' });
  } catch (err) {
    result.items.push({ id: 'home-writable', level: 'fail', detail: err.message, fix: 'Set SHOWREEL_HOME to a writable directory' });
  } finally {
    if (probe) await rm(probe, { recursive: true, force: true }).catch(() => {});
  }
  try {
    await access(chromium.executablePath());
    result.items.push({ id: 'browser', level: 'ok', detail: 'Playwright Chromium is installed' });
  } catch {
    result.items.push({ id: 'browser', level: 'fail', detail: 'Playwright Chromium is missing', fix: 'showreel setup' });
  }
  result.ok = !result.items.some((item) => item.level === 'fail');
  return result;
}

export function printDoctor(result) {
  for (const { id, level, detail, fix } of result.items) console.log(`${level.padEnd(4)} ${id.padEnd(13)} ${detail}${fix ? ` -> ${fix}` : ''}`);
}
