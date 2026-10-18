// recaption [runDir] [--no-voice] [--no-phone] [--no-recordly] [--no-open]:
// re-render from the (hand-edited) edit/<clip>/captions.json without
// re-cutting or a new Recordly pass; the last render's Recordly export is
// reused while it is newer than the cut and Recordly is on. It encodes with a
// fast x264 preset (same crf, so the same quality in a larger file) to stay
// well under half a minute for a one-minute video; `render` makes the compact
// final. Its outputs are delivered like render's.
import { log } from './env.mjs';
import { renderRun, parseArgs, resolveRunDir } from './render.mjs';

export async function main(argv, ctx) {
  const opts = parseArgs(argv);
  const ignored = [opts.recordlyExport && '--recordly-export', opts.reEdit && '--re-edit'].filter(Boolean);
  if (ignored.length) log(`recaption ignores ${ignored.join(', ')}: it reuses the last cut and Recordly export (use render for those).`);
  const runDir = await resolveRunDir(ctx, opts.runDir);
  await renderRun(runDir, { ...opts, recordlyExport: null, reEdit: false, edit: false, reuseExport: true, preset: 'veryfast' }, ctx);
  return 0;
}
