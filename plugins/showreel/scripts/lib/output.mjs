import { format } from 'node:util';
import { OUTPUT_CAP_TOKENS } from './meter.mjs';

// Apply presentation limits at console calls; the meter observes unmodified stream writes.
// Reserve space for the truncation notice across stdout and stderr together.
export async function withShortOutput(args, run) {
  if (args.some(a => ['--json', '--verbose', '--paths'].includes(a))) return run();
  const originals = { log: console.log, error: console.error, warn: console.warn };
  let remaining = OUTPUT_CAP_TOKENS * 4 - 100, shortened = false;
  for (const method of Object.keys(originals)) console[method] = (...values) => {
    const text = format(...values), bytes = Buffer.byteLength(text + '\n');
    if (bytes <= remaining) { remaining -= bytes; originals[method](text); return; }
    if (shortened) return;
    const lines = text.split('\n');
    let shown = 0;
    for (const line of lines) {
      const size = Buffer.byteLength(line + '\n');
      if (size > remaining) break;
      remaining -= size; shown++; originals[method](line);
    }
    originals[method](`${lines.length - shown} more items; use --verbose for full output.`);
    shortened = true;
  };
  try { return await run(); }
  finally { Object.assign(console, originals); }
}
