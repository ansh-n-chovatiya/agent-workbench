import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineDir, modelDir } from './paths.mjs';
import { isFakeEngine, REQUEST_TIMEOUT_MS } from './pins.mjs';
import { NOT_INSTALLED } from './engine-state.mjs';

const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'worker.mjs');

// One worker process, serial queue, restart once on crash, per-request timeout.
export class VoiceClient {
  constructor({ timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    this.timeoutMs = timeoutMs; this.child = null; this.pending = new Map(); this.nextId = 1; this.queue = Promise.resolve(); this.onProgress = null; this.stderrTail = '';
  }
  async startEngine() {
    if (this.child) return;
    if (!isFakeEngine()) {
      try { await access(path.join(engineDir(), 'node_modules', 'kokoro-js', 'package.json')); }
      catch { throw new Error(NOT_INSTALLED); }
    }
    const cwd = isFakeEngine() ? process.cwd() : engineDir();
    const child = spawn(process.execPath, [WORKER], { cwd, stdio: ['pipe', 'pipe', 'pipe'], shell: false, windowsHide: true, env: { ...process.env, SHOWREEL_VOICE_MODEL_DIR: modelDir() } });
    this.child = child;
    child.stderr.on('data', (d) => { this.stderrTail = (this.stderrTail + d).slice(-2000); });
    readline.createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', (line) => {
      let msg; try { msg = JSON.parse(line); } catch { return; }
      if (msg.event === 'progress') { this.onProgress?.(msg); return; }
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id); clearTimeout(p.timer);
      msg.ok ? p.resolve(msg) : p.reject(new Error(msg.error || 'voice worker error'));
    });
    const dead = (err) => {
      if (this.child === child) this.child = null;
      for (const [id, p] of this.pending) { clearTimeout(p.timer); p.reject(err); this.pending.delete(id); }
    };
    child.on('error', (e) => dead(new Error(`Cannot start voice worker: ${e.message}`)));
    child.on('exit', (code, sig) => dead(Object.assign(new Error(`Voice worker exited (${sig ?? code})${this.stderrTail ? `: ${this.stderrTail.trim().split('\n').slice(-3).join(' | ')}` : ''}`), { crashed: true })));
    child.stdin.on('error', () => {});
  }
  _request(msg, timeoutMs = this.timeoutMs) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Object.assign(new Error(`Voice worker timed out after ${Math.round(timeoutMs / 1000)} s`), { timedOut: true }));
        this._kill();
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ ...msg, id }) + '\n');
    });
  }
  _kill() { const c = this.child; this.child = null; if (c) { c.removeAllListeners('exit'); c.kill(); for (const [id, p] of this.pending) { clearTimeout(p.timer); p.reject(new Error('Voice worker stopped')); this.pending.delete(id); } } }
  _serial(fn) { const run = this.queue.then(fn, fn); this.queue = run.catch(() => {}); return run; }
  call(msg, opts = {}) {
    return this._serial(async () => {
      for (let attempt = 0; ; attempt++) {
        await this.startEngine();
        try { return await this._request(msg, opts.timeoutMs); }
        catch (err) {
          if (err.crashed && attempt === 0) { this.child = null; continue; }   // restart once
          throw err;
        }
      }
    });
  }
  async generate({ text, voice, speed = 1, out }) { const r = await this.call({ op: 'generate', text, voice, speed, out }); return { durationSec: r.durationSec, sampleRate: r.sampleRate, rtf: r.rtf }; }
  async voices() { return (await this.call({ op: 'voices' }, { timeoutMs: Math.max(this.timeoutMs, 180000) })).voices; }
  ping() { return this.call({ op: 'ping' }); }
  warmup(onProgress) { this.onProgress = onProgress ?? null; return this.call({ op: 'warmup' }, { timeoutMs: 30 * 60 * 1000 }).finally(() => { this.onProgress = null; }); }
  async stop() {
    const c = this.child;
    if (!c) return;
    await new Promise((resolve) => {
      const t = setTimeout(() => { c.kill(); }, 2000);
      c.once('close', () => { clearTimeout(t); resolve(); });
      try { c.removeAllListeners('exit'); c.stdin.end(JSON.stringify({ op: 'quit', id: 0 }) + '\n'); } catch { c.kill(); }
    });
    this.child = null;
  }
}
let shared = null;
export const getClient = () => (shared ??= new VoiceClient());
export const startEngine = () => getClient().startEngine();
export const generate = (o) => getClient().generate(o);
export const voices = () => getClient().voices();
export const stop = async () => { if (shared) { await shared.stop(); shared = null; } };
