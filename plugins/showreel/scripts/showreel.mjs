#!/usr/bin/env node
// Launcher: runs `setup` and the first-run guard before anything that needs Playwright is imported.
// The real command line is cli.mjs.
import { depsInstalled, notSetUpMessage, relink, setupMain } from './lib/setup.mjs';

const args = process.argv.slice(2);
if (args[0] === 'setup') {
  const code = await setupMain(args.slice(1));
  if (code === 0 && !args.includes('--check')) {
    process.argv = [process.argv[0], process.argv[1], 'doctor'];
    await import('./cli.mjs');
  } else process.exitCode = code;
} else {
  if (!depsInstalled()) relink(); // after a plugin update the persistent install is still there: just link it again
  if (!depsInstalled()) {
    console.error(notSetUpMessage);
    process.exitCode = 3;
  } else await import('./cli.mjs');
}
