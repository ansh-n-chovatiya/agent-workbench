import { h, Fragment } from 'preact';
import { Folder, LoaderCircle, CircleCheck, Clock } from 'lucide-preact';
import { ExportResult } from './ExportResult.jsx';
import { shortPath, exportFileName, loadExportSettings, exportRequestBody } from './export-model.mjs';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Dialog } from './ui/dialog.jsx';
import { Select } from './ui/select.jsx';
import { Label } from './ui/label.jsx';
import { Button } from './ui/button.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { changeComposition, resolveComposition } from '../scripts/lib/compose/composition.mjs';
import { request } from './state.js';
import { createSSEParser } from './helpers.mjs';
import { useController } from './use-controller.js';
import { scriptRows, voiceSummary, needsGenerating } from './voice-status.mjs';
import { SIZE_PRESETS, presetForSize, sizeForPreset, sizeLabel, orientationOf } from './size-presets.mjs';

// What the exported video will sound like, from the clips the editor already knows about.
export function VoiceChecklist({ state, controller }) {
  const ctl = useController(controller), { project, composition, plan } = state;
  if (!composition) return null;
  const voice = resolveComposition(composition).audio.voice;
  if (!(voice.enabled ?? project.brief?.voice?.enabled === true)) return null;
  const rows = scriptRows({ storyboard: project.storyboard, composition, clips: project.clips, voice: voice.voiceId, speed: voice.speed });
  const summary = voiceSummary(rows), todo = needsGenerating(rows), warnings = plan?.audio.warnings ?? [], job = ctl.job;
  if (!summary.total) return null;
  return <ul class="export-checklist" aria-label="Voice-over checklist">
    <li class={todo.length ? 'warn' : 'ok'}><span class="check-badge" aria-hidden="true">{todo.length ? <Clock size={14}/> : <CircleCheck size={14}/>}</span><span class="check-text">Voice-over: <strong>{summary.ready} of {summary.total}</strong> steps ready</span>
      {!!todo.length && <> <span class="setting-help">The rest will be silent or use out-of-date audio.</span>
        {project.voice?.installed ? <Button size="sm" variant="outline" disabled={job.running} onClick={() => controller.generate({ stepIds: todo.map(r => r.id) })}>{job.running ? `Generating ${Math.min(job.total, job.done + job.failed + 1)} of ${job.total}…` : 'Generate missing'}</Button>
          : <span class="setting-help">Install the voice engine to make them (see the Voice tab).</span>}</>}
      {ctl.error && <span class="error">{ctl.error}</span>}</li>
    {!!warnings.length && <li class="warn"><span>{warnings.length} narration timing {warnings.length === 1 ? 'warning' : 'warnings'}. Review {warnings.length === 1 ? 'it' : 'them'} in the Voice tab before exporting.</span></li>}
  </ul>;
}

export function ExportDialog({ store, voice, onClose }) {
  const [state, setState] = useState(store.getState());
  useEffect(() => store.subscribe(setState), [store]);
  const voiceJob = useController(voice).job;
  const initial = store.getState().composition.output;
  const [size, setSize] = useState(presetForSize(initial)), [fps, setFps] = useState(initial.fps);
  const [job, setJob] = useState({ event: 'idle', data: {} }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(null), [choosing, setChoosing] = useState(false), [manual, setManual] = useState(false), [folderInput, setFolderInput] = useState('');
  const [date, setDate] = useState(() => new Date()), [showResult, setShowResult] = useState(true);
  const [eta, setEta] = useState(null), started = useRef(0), stream = useRef(null);
  const running = busy || ['started', 'progress', 'log'].includes(job.event);
  const sizeOptions = [...SIZE_PRESETS.map(p => ({ value: p.id, label: p.label })), ...(presetForSize(initial) === 'custom' ? [{ value: 'custom', label: `Custom (${sizeLabel(initial)})` }] : [])];
  useEffect(() => {
    loadSettings();
    watch(true);
    return () => stream.current?.abort();
  }, []);
  async function loadSettings() {
    const data = await loadExportSettings(request);
    setSettings(data); setFolderInput(data.exportDir);
  }
  async function watch(ignorePrevious = false) {
    let firstMessage = true;
    stream.current?.abort();
    const controller = new AbortController(); stream.current = controller;
    if (!started.current) started.current = performance.now();
    try {
      const response = await fetch('/api/export/events', { credentials: 'same-origin', signal: controller.signal });
      if (!response.ok || !response.body) throw new Error('Cannot connect to export progress');
      const reader = response.body.getReader(), decoder = new TextDecoder();
      const parse = createSSEParser(message => {
        const snapshot = firstMessage; firstMessage = false;
        if (ignorePrevious && snapshot && ['complete', 'error', 'cancelled'].includes(message.event)) { controller.abort(); return; }
        setJob(previous => ({ ...message, data: message.event === 'log' ? { ...previous.data, ...message.data } : message.data }));
        if (message.event === 'started') { started.current = performance.now(); setEta(null); }
        if (message.event === 'complete') store.setProject({ lastExport: message.data.audio ?? null });
        if (message.event === 'progress' && message.data.frame > 0) setEta(Math.max(0, Math.round((performance.now() - started.current) / 1000 / message.data.frame * (message.data.total - message.data.frame))));
        if (['complete', 'error', 'cancelled'].includes(message.event)) controller.abort();
      });
      while (true) { const { value, done } = await reader.read(); if (done) break; parse(decoder.decode(value, { stream: true })); }
      if (!controller.signal.aborted) throw new Error('Export progress connection closed. Reconnect to check the job.');
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
  }
  async function start() {
    setError(''); setBusy(true); setShowResult(true); setJob({ event: 'started', data: {} });
    try {
      let composition = store.getState().composition;
      const changes = [['output.fps', fps]];
      if (size !== 'custom') { const { width, height } = sizeForPreset(size, composition.output); changes.unshift(['output.width', width], ['output.height', height]); }
      for (const [path, value] of changes) composition = changeComposition(composition, path, value);
      store.setComposition(composition, 'output'); await store.save();
      await request('/api/export', { method: 'POST', body: JSON.stringify(exportRequestBody(settings)) });
      started.current = performance.now(); setJob({ event: 'started', data: {} }); watch();
    } catch (e) { setError(e.message); setJob({ event: 'error', data: {} }); }
    finally { setBusy(false); }
  }
  async function cancel() {
    try { await request('/api/export/cancel', { method: 'POST' }); }
    catch (e) { setError(e.message); }
  }
  async function choose() {
    if (!settings.canChoose) { setManual(true); return; }
    setChoosing(true); setError('');
    try {
      const response = await fetch('/api/export/choose-folder', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json();
      if (response.status === 501) { setManual(true); setSettings(previous => ({ ...previous, canChoose: false })); return; }
      if (!response.ok) throw new Error(data.error ?? 'Could not choose a folder');
      if (data.dir) { setSettings(previous => ({ ...previous, exportDir: data.dir })); setFolderInput(data.dir); }
    } catch (e) { setError(e.message); }
    finally { setChoosing(false); }
  }
  async function saveFolder() {
    try { const data = await request('/api/export/folder', { method: 'POST', body: JSON.stringify({ dir: folderInput }) }); setSettings(previous => ({ ...previous, exportDir: data.dir })); setManual(false); setError(''); }
    catch (e) { setError(e.message); }
  }
  const result = showResult && job.event === 'complete' ? job.data : null;
  const percent = Math.min(100, Math.round((job.data.frame ?? 0) / (job.data.total || 1) * 100));
  const preview = exportFileName({ projectName: state.project.name, date, format: orientationOf(initial), size });
  return <Dialog title="Export video" description="Save your edited video as an MP4 file." onClose={onClose} locked={running || choosing} className="export-dialog">
    {result ? <ExportResult result={result} homeDir={settings?.homeDir} onError={setError} onAgain={() => { setShowResult(false); setDate(new Date()); setJob({ event: 'idle', data: {} }); setError(''); }} /> : <>
      <div class="export-options"><Label>Size <Select aria-label="Size" disabled={running || choosing} value={size} onValueChange={setSize} options={sizeOptions} /></Label>
        <Label>Frame rate <Select aria-label="Frame rate" disabled={running || choosing} value={fps} onValueChange={next => setFps(+next)} options={[{value:30,label:'30 fps'},{value:60,label:'60 fps'}]} /></Label></div>
      <div class="export-destination"><span class="export-save-label">Save to</span><div class="export-folder-row"><Folder size={18} aria-hidden="true" /><span title={settings?.exportDir} class="export-folder">{settings ? shortPath(settings.exportDir, settings.homeDir) : 'Loading folder…'}</span><Button variant="outline" disabled={!settings || settings.fallback || running || choosing} onClick={choose}>Change…</Button></div>
        {settings?.fallback && <p class="setting-help">Could not load export settings. Restart the editor if this keeps happening.</p>}
        {choosing && <p role="status" class="export-wait"><LoaderCircle size={14} aria-hidden="true" />Waiting for the folder window…</p>}
        {manual && <form class="export-manual" onSubmit={e => { e.preventDefault(); saveFolder(); }}><Label htmlFor="export-folder-input">Folder path</Label><input id="export-folder-input" value={folderInput} onInput={e => setFolderInput(e.currentTarget.value)} placeholder="Absolute folder path" /><Button variant="outline" onClick={saveFolder}>Save</Button></form>}
        <p class="export-preview">Will be saved as: <strong>{preview}</strong></p>
      </div>
      {!running && <VoiceChecklist state={state} controller={voice} />}
      <div aria-live="polite">{running && <div class="export-progress" role="progressbar" aria-label="Export progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
          <div class="progress-head"><span><LoaderCircle size={14} class="spin" aria-hidden="true"/> Rendering your video</span><strong>{percent}%</strong></div>
          <div class="progress-track"><div class="progress-fill" style={{width:`${Math.max(2,Math.min(100,percent))}%`}}/></div>
          <p class="progress-eta">{eta !== null ? `About ${eta < 60 ? `${eta} s` : `${Math.floor(eta/60)} min ${eta%60} s`} left` : 'Estimating time left…'}</p></div>}
        {job.event === 'cancelled' && <p>Export cancelled. You can try again.</p>}
        {job.event === 'error' && job.data.message && <p role="alert" class="error">{job.data.message}</p>}
      </div>
      <div class="dialog-actions">{running ? <><Button variant="outline" onClick={cancel}>Cancel</Button>{error && <Button onClick={() => { setError(''); watch(); }}>Reconnect progress</Button>}</> : <Tooltip text={voiceJob.running ? 'Wait for the voice-over to finish' : 'Render the video'}><Button variant="default" disabled={voiceJob.running || !settings || choosing || manual} onClick={start}>{job.event === 'error' || error ? 'Retry' : 'Export'}</Button></Tooltip>}</div>
    </>}
    {error && <p role="alert" class="error">{error}</p>}
  </Dialog>;
}
