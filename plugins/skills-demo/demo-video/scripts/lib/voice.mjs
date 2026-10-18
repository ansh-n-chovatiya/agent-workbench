// One narration track from the per-step clips synthesized at record time,
// mixed over the Recordly export's own audio when it has any.
import { run } from './env.mjs';
import { balancedSum } from './compose.mjs';

// How far the export's audio drops while narration plays, and how long it
// takes to get there and back (a hard step clicks).
export const DUCK = { db: -10, rampSec: 0.15 };

// Volume expression of t: 1, falling to DUCK.db over each [start, end]
// window, ramping in the rampSec before it and out the rampSec after.
// Narration clips sit at least a breath apart, so neighbouring ramps never
// add up past the full duck.
function duckVolume(windows) {
  const r = DUCK.rampSec;
  const n = (x) => x.toFixed(3);
  const each = windows.map(({ start, end }) => `clip(min((t-${n(start - r)})/${r},(${n(end + r)}-t)/${r}),0,1)`);
  return `1-${(1 - 10 ** (DUCK.db / 20)).toFixed(4)}*min(1,${balancedSum(each)})`;
}

// clips: [{file, start, end, tempo?}] with start/end in seconds on the final
// video's timeline (the title card offset already added); a tempo other than
// 1 speeds the clip up with atempo (pitch kept) so it ends before the next.
// bed: {file, delay} or null, the export's audio and where its first sample
// lands on that timeline; it plays as exported, ducked by DUCK.db only while
// a clip speaks. Writes AAC 160k of exactly `duration` seconds to outFile,
// the narration loudness-normalized at full level.
export async function buildNarration(clips, outFile, { duration, bed = null }) {
  if (!clips.length && !bed) throw new Error('no narration clips to mix');
  const fit = `aformat=channel_layouts=stereo,apad,atrim=0:${duration.toFixed(3)}`;
  const inputs = clips.flatMap((c) => ['-i', c.file]);
  const graph = clips.map((c, i) => `[${i}:a]aresample=48000,aformat=channel_layouts=mono,${c.tempo && c.tempo !== 1 ? `atempo=${c.tempo},` : ''}adelay=delays=${Math.round(c.start * 1000)}:all=1[a${i}]`);
  if (clips.length) {
    graph.push(`${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,`
      + `loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,${fit}[${bed ? 'nar' : 'out'}]`);
  }
  if (bed) {
    inputs.push('-i', bed.file);
    const duck = clips.length ? `volume='${duckVolume(clips)}':eval=frame,` : '';
    graph.push(`[${clips.length}:a:0]aresample=48000,adelay=delays=${Math.round(bed.delay * 1000)}:all=1,${duck}${fit}[${clips.length ? 'bed' : 'out'}]`);
    // The user's audio adds to the narration's peaks, so a limiter keeps loud
    // music under full scale instead of letting the mix clip.
    if (clips.length) graph.push('[bed][nar]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=false[out]');
  }
  const { code, stderr } = await run('ffmpeg', ['-y', '-v', 'error', ...inputs,
    '-filter_complex', graph.join(';'), '-map', '[out]', '-ac', '2', '-c:a', 'aac', '-b:a', '160k', outFile]);
  if (code !== 0) throw new Error(`narration mix failed: ${stderr.trim().split('\n').pop()}`);
  return outFile;
}
