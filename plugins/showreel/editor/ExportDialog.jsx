import { h, Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { changeComposition } from '../scripts/lib/compose/composition.mjs';
import { request } from './state.js';
import { createSSEParser } from './helpers.mjs';

export function ExportDialog({ store, onClose }) {
  const initial = store.getState().composition.output;
  const [size, setSize] = useState(initial.height > 1080 ? '4k' : '1080'), [fps, setFps] = useState(initial.fps);
  const [job, setJob] = useState({ event: 'idle', data: {} }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [eta, setEta] = useState(null), dialog = useRef(), started = useRef(0), stream = useRef(null);
  const running = busy || ['started', 'progress', 'log'].includes(job.event);
  useEffect(() => {
    dialog.current.showModal();
    watch();
    return () => stream.current?.abort();
  }, []);
  async function watch() {
    stream.current?.abort();
    const controller = new AbortController(); stream.current = controller;
    if (!started.current) started.current = performance.now();
    try {
      const response = await fetch('/api/export/events', { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok || !response.body) throw new Error('Cannot connect to export progress');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      const parse = createSSEParser(message => {
        setJob(previous => ({ ...message, data: message.event === 'log' ? { ...previous.data, ...message.data } : message.data }));
        if (message.event === 'started') { started.current = performance.now(); setEta(null); }
        if (message.event === 'progress' && message.data.frame > 0) setEta(Math.max(0, Math.round((performance.now() - started.current) / 1000 / message.data.frame * (message.data.total - message.data.frame))));
        if (['complete', 'error', 'cancelled'].includes(message.event)) controller.abort();
      });
      while (true) { const { value, done } = await reader.read(); if (done) break; parse(decoder.decode(value, { stream: true })); }
      if (!controller.signal.aborted) throw new Error('Export progress connection closed. Reconnect to check the job.');
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
  }
  async function start() {
    setError(''); setBusy(true);
    try {
      let composition = store.getState().composition;
      for (const [path, value] of [['output.width', size === '4k' ? 3840 : 1920], ['output.height', size === '4k' ? 2160 : 1080], ['output.fps', fps]]) composition = changeComposition(composition, path, value);
      store.setComposition(composition, 'output'); await store.save();
      await request('/api/export', { method: 'POST' });
      started.current = performance.now(); setJob({ event: 'started', data: {} }); watch();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function cancel() {
    try { await request('/api/export/cancel', { method: 'POST' }); }
    catch (e) { setError(e.message); }
  }
  return <dialog ref={dialog} onCancel={e => { if (running) e.preventDefault(); else onClose(); }} aria-labelledby="export-title">
    <div class="dialog-heading"><h2 id="export-title">Export composition</h2><button disabled={running} aria-label="Close export" onClick={onClose}>×</button></div>
    <div class="export-options"><label>Size <select disabled={running} value={size} onChange={e => setSize(e.currentTarget.value)}><option value="1080">1080p</option><option value="4k">4K</option></select></label>
      <label>Frame rate <select disabled={running} value={fps} onChange={e => setFps(+e.currentTarget.value)}><option value="30">30 fps</option><option value="60">60 fps</option></select></label></div>
    <div aria-live="polite"><p>{job.event === 'idle' ? 'Ready to export' : job.event}</p>
      {running && <><progress aria-label="Export progress" max={job.data.total ?? 1} value={job.data.frame ?? 0} /><p>{job.data.frame ?? 0} / {job.data.total ?? '…'} frames{eta !== null ? ` · ETA ${eta}s` : ''}</p></>}
      {job.event === 'complete' && <><p class="output-path">{job.data.finalFile}</p><button onClick={() => request('/api/reveal', { method: 'POST' }).catch(e => setError(e.message))}>Reveal</button></>}
      {job.event === 'error' && <p class="error">{job.data.message}</p>}
    </div>
    {error && <p role="alert" class="error">{error}</p>}
    <div class="dialog-actions">{running ? <><button onClick={cancel}>Cancel export</button>{error && <button onClick={() => { setError(''); watch(); }}>Reconnect progress</button>}</> : <button class="primary" onClick={start}>Start export</button>}</div>
  </dialog>;
}
