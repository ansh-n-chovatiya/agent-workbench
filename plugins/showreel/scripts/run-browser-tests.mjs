#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = new URL('../test-browser/', import.meta.url);
const files = (await readdir(directory)).filter((file) => file.endsWith('.browser.mjs')).sort()
  .map((file) => fileURLToPath(new URL(file, directory)));
if (!files.length) throw new Error('No browser tests found');
const child = spawn(process.execPath, ['--test', '--test-concurrency=1', ...files], { stdio: 'inherit' }) // one file at a time: real-time recording tests starve on small CI runners when run in parallel;
child.once('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.once('exit', (code) => { process.exitCode = code ?? 1; });
