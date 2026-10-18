// Copies a finished render's outputs from the run's out/ to the deliverables
// folder under the scenario's name, prints the one summary line and reveals
// the video in Finder. The run folder keeps its own working copies.
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { abs } from './paths.mjs';
import { log, run } from './env.mjs';

// out/ name -> deliverables name.
export const deliverNames = (slug) => [
  ['demo.mp4', `${slug}.mp4`],
  ['demo-short.mp4', `${slug}-short.mp4`],
  ['demo.srt', `${slug}.srt`],
  ['demo.vtt', `${slug}.vtt`],
  ['poster.png', `${slug}-poster.png`],
  ['contact-sheet.png', `${slug}-contact-sheet.png`],
];

// 30000/1001 -> 29.97, 60/1 -> 60.
const rate = (r) => { const [n, d] = String(r).split('/').map(Number); return +(d ? n / d : n).toFixed(2); };

export async function probeVideo(file) {
  const { code, stdout, stderr } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,avg_frame_rate:format=duration', '-of', 'json', file]);
  const j = code === 0 ? JSON.parse(stdout) : null;
  const v = j?.streams?.[0];
  if (!v) throw new Error(`ffprobe could not read ${file}: ${stderr.trim().split('\n').pop() || 'no video stream'}`);
  return { duration: Number(j.format.duration), width: v.width, height: v.height, fps: rate(v.avg_frame_rate) };
}

// Under `node --test` without DEMO_VIDEO_DELIVER, a test forgot to redirect
// the deliverables: they go to a temp folder rather than the user's Desktop.
const unredirectedTest = () => Boolean(process.env.NODE_TEST_CONTEXT) && !process.env.DEMO_VIDEO_DELIVER;
export const deliverTarget = (folder) => (unredirectedTest()
  ? path.join(os.tmpdir(), 'demo-video-test-deliver', path.basename(folder)) : abs(folder));

// One deliverables folder per render: once a folder holds a final
// <slug>.mp4, a re-render goes to <folder>-2, -3, ... rather than overwrite a
// video that may already have been sent.
export function freshFolder(folder, slug) {
  let dir = folder;
  for (let n = 2; existsSync(path.join(dir, `${slug}.mp4`)); n++) dir = `${folder}-${n}`;
  return dir;
}

// Reveal is skipped with --no-open, off macOS, and whenever the folder is
// redirected (DEMO_VIDEO_DELIVER: tests and selftest), so no Finder window opens there.
export async function deliver({ outDir, folder, slug, recordlyFps = null, open = true }) {
  folder = deliverTarget(folder);
  await mkdir(folder, { recursive: true });
  for (const [from, to] of deliverNames(slug)) await copyFile(path.join(outDir, from), path.join(folder, to));
  const final = path.join(folder, `${slug}.mp4`);
  const v = await probeVideo(final);
  const line = `Final video: ${final} (${v.duration.toFixed(1)} s, ${v.width}x${v.height}, ${v.fps} fps${recordlyFps ? `; Recordly exported ${recordlyFps} fps` : ''})`;
  log(line);
  if (open && process.platform === 'darwin' && !process.env.DEMO_VIDEO_DELIVER && !unredirectedTest()) await run('open', ['-R', final]).catch(() => {});
  return { folder, final, line, ...v };
}
