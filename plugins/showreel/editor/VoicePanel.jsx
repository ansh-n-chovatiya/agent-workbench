import { h, Fragment } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Play, Square, Mic, Upload, Volume2, VolumeX, Trash2, Sparkles, RefreshCw, LoaderCircle, Copy, Check, TriangleAlert } from 'lucide-preact';
import { settingFor } from '../scripts/lib/compose/settings-schema.mjs';
import { changeComposition } from '../scripts/lib/compose/composition.mjs';
import { sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { Button } from './ui/button.jsx';
import { Select } from './ui/select.jsx';
import { Switch } from './ui/switch.jsx';
import { Badge } from './ui/badge.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { SettingsCard } from './panels/SettingsCard.jsx';
import { SettingRow } from './panels/SettingRow.jsx';
import { EmptyState } from './panels/EmptyState.jsx';
import { MessageSquareText, Download } from './panels/icons.js';
import { TOPIC_CARDS, cardPaths } from './panel-model.mjs';
import { Recorder } from './Recorder.jsx';
import { useController } from './use-controller.js';
import { convertToWav, MAX_UPLOAD_BYTES } from './audio-wav.js';
import { fixFreeze, fixSlow } from './edit-ops.mjs';
import { scriptRows, needsGenerating, voiceSummary, groupVoices, formatDuration, narrationSteps, STATUS_HELP, INSTALL_COMMAND, MAX_NARRATION_CHARS, SPEED_MIN, SPEED_MAX } from './voice-status.mjs';

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const area = document.createElement('textarea'); area.value = text; area.setAttribute('readonly', ''); area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.append(area); area.select();
    try { return document.execCommand('copy'); } finally { area.remove(); }
  }
}
// The engine-missing state: an illustrated card with the one command to run, never a wall of text.
function EngineCard({ info }) {
  const [copied, setCopied] = useState(false);
  if (info.installed) return null;
  return <EmptyState tone="warn" icon={Download} title="Voice engine not installed" line="Voice-over runs on your computer with a free model (about 100 MB). Run this once in a terminal, then reload the editor."
    action={<>
      <div class="command-row"><code>{INSTALL_COMMAND}</code>
        <Button size="sm" variant="outline" aria-label="Copy install command" onClick={async () => { if (await copyText(INSTALL_COMMAND)) { setCopied(true); setTimeout(() => setCopied(false), 1800); } }}>
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}</Button></div>
      <p class="srow-hint">You can still record your own voice or import audio files without it.</p>
      {info.error && <p class="error">{info.error}</p>}
    </>} />;
}
// One sample button with three unmistakable states: Play, Preparing (spinner, label says so) and Stop (filled, accent).
function SampleButton({ voiceId, name, info, ctl, controller, size = 15, variant }) {
  const sampling = ctl.sampleBusy === voiceId, playing = ctl.playing?.kind === 'sample' && ctl.playing.id === voiceId;
  const label = `${playing ? 'Stop' : sampling ? 'Preparing' : 'Play'} sample${name ? ` of ${name}` : ''}`;
  const tip = !info.installed ? 'Install the voice engine to hear samples' : sampling ? 'Making a sample of this voice (a few seconds)…' : playing ? 'Stop the sample' : 'Hear a short sample of this voice';
  return <Tooltip text={tip}><Button size="icon" variant={variant} class={`sample-btn ${playing ? 'is-playing' : ''} ${sampling ? 'is-busy' : ''}`} aria-label={label} aria-pressed={playing} disabled={!info.installed || !voiceId || (!!ctl.sampleBusy && !sampling)} onClick={() => controller.playSample(voiceId)}>
    {sampling ? <LoaderCircle class="spin" size={size} aria-hidden="true" /> : playing ? <Square size={size} aria-hidden="true" fill="currentColor" /> : <Play size={size} aria-hidden="true" fill="currentColor" />}</Button></Tooltip>;
}
const noticeFor = (ctl, kind, id) => ctl.notice?.kind === kind && ctl.notice.id === id ? ctl.notice.message : '';
function VoicePicker({ id, value, onChange, info, ctl, controller }) {
  const groups = groupVoices(info.voices ?? []);
  const known = (info.voices ?? []).some(v => v.id === value);
  const optionGroups = groups.map(g => ({ label: g.label, options: g.voices.map(v => ({ value: v.id, label: v.label })) }));
  if (!known && value) optionGroups.push({ label: 'Other', options: [{ value, label: value }] });
  const sampling = ctl.sampleBusy === value, playing = ctl.playing?.kind === 'sample' && ctl.playing.id === value, notice = noticeFor(ctl, 'sample', value);
  return <div class="voice-pick-wrap">
    <div class="voice-pick">
      <Select id={id} aria-label="Voice" value={value} onValueChange={onChange} groups={optionGroups} disabled={!info.installed} />
      <SampleButton voiceId={value} info={info} ctl={ctl} controller={controller} variant="outline" />
    </div>
    {(sampling || playing) && <p class="srow-hint play-status" role="status">{sampling ? 'Preparing the sample… it plays when ready.' : 'Playing the sample'}</p>}
    {!!notice && <p class="error" role="alert">{notice}</p>}
  </div>;
}
function VoiceBrowser({ info, ctl, controller, value, onPick }) {
  const groups = groupVoices(info.voices ?? []);
  if (!groups.length) return null;
  return <details class="voice-browse"><summary>Browse all voices</summary>
    <div class="voice-list" role="group" aria-label="All voices">
      {groups.map(group => <div key={group.label}><h4>{group.label}</h4>
        {group.voices.map(voice => {
          const notice = noticeFor(ctl, 'sample', voice.id);
          return <div class="voice-item-wrap" key={voice.id}><div class="voice-item">
            <Button class="voice-use" aria-pressed={value === voice.id} onClick={() => onPick(voice.id)}>{voice.label}</Button>
            <SampleButton voiceId={voice.id} name={voice.label.split(' · ')[0]} info={info} ctl={ctl} controller={controller} size={14} />
          </div>{!!notice && <p class="error" role="alert">{notice}</p>}</div>;
        })}</div>)}
    </div></details>;
}
function ScriptRow({ row, info, ctl, controller, job, warnings, notice, busy, openRecorder, setOpenRecorder, setSteps, fix, pickFile }) {
  const [draft, setDraft] = useState(null);
  const generating = job.running && job.current === row.id;
  const text = draft ?? row.text ?? '';
  const playingClip = ctl.playing?.kind === 'clip' && ctl.playing.id === row.id;
  const generateLabel = row.status === 'own' || row.status === 'file' ? 'Use generated voice' : row.status === 'fresh' || row.status === 'stale' ? 'Update voice' : 'Generate voice';
  const cannotGenerate = !info.installed ? 'Install the voice engine to generate voice-overs' : !row.text ? 'Write some narration first' : row.muted ? 'This step is muted' : job.running ? 'Wait for the current job to finish' : '';
  const rowError = job.errors?.[row.id] ?? (notice?.id === row.id ? notice.message : '') ?? '';
  const playError = noticeFor(ctl, 'clip', row.id);
  return <li class="script-row" aria-label={`Narration step ${row.name}`}>
    <div class="script-head"><strong title={row.name}>{row.name}</strong>
      <Tooltip text={STATUS_HELP[row.status]}><Badge class={`status status-${row.status}`}>{generating ? 'Generating…' : row.label}</Badge></Tooltip></div>
    <textarea class="ui-input narration-text" rows="2" maxLength={MAX_NARRATION_CHARS} aria-label={`Narration for ${row.name}`} value={text}
      placeholder="Write what the narrator says for this step"
      onInput={e => { setDraft(e.currentTarget.value); setSteps(row.id, { text: e.currentTarget.value }); }} onBlur={() => setDraft(null)} />
    <div class="script-meta"><span class="script-note">{row.edited ? 'Edited here. Clear the box to use the written narration again.' : row.written ? 'From the storyboard.' : ''}</span>
      <span class="counter" aria-label={`${text.length} of ${MAX_NARRATION_CHARS} characters`}>{text.length}/{MAX_NARRATION_CHARS}</span>
      {row.durationSec != null && <span class="duration">{formatDuration(row.durationSec)}</span>}</div>
    <div class="row-actions" role="group" aria-label={`Voice-over actions for ${row.name}`}>
      <Tooltip text={row.clipKey ? (playingClip ? 'Stop' : 'Play this voice-over') : 'There is no voice-over to play yet'}>
        <Button size="icon" class={`sample-btn ${playingClip ? 'is-playing' : ''}`} aria-pressed={playingClip} aria-label={`${playingClip ? 'Stop' : 'Play'} clip, ${row.name}`} disabled={!row.clipKey} onClick={() => controller.playClip(row.id, row.clipKey)}>{playingClip ? <Square size={16} aria-hidden="true" fill="currentColor" /> : <Play size={16} aria-hidden="true" fill="currentColor" />}</Button></Tooltip>
      <Tooltip text={cannotGenerate || (row.status === 'own' || row.status === 'file' ? 'Replace your audio with the generated voice' : generateLabel)}>
        <Button size="icon" aria-label={`${generateLabel}, ${row.name}`} disabled={!!cannotGenerate} onClick={() => controller.generate({ stepIds: [row.id], force: row.status === 'own' || row.status === 'file' })}>
          {generating ? <LoaderCircle class="spin" size={16} aria-hidden="true" /> : row.status === 'stale' || row.status === 'fresh' ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}</Button></Tooltip>
      <Tooltip text="Record your own voice for this step"><Button size="icon" aria-label={`Record my voice, ${row.name}`} aria-pressed={openRecorder === row.id} onClick={() => setOpenRecorder(openRecorder === row.id ? null : row.id)}><Mic size={16} aria-hidden="true" /></Button></Tooltip>
      <Tooltip text="Use an audio file you already have"><Button size="icon" aria-label={`Import file, ${row.name}`} disabled={busy === row.id} onClick={() => pickFile(row.id)}>
        {busy === row.id ? <LoaderCircle class="spin" size={16} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}</Button></Tooltip>
      <Tooltip text={row.muted ? 'Turn this step’s voice-over back on' : 'Silence this step'}><Button size="icon" aria-label={`Mute ${row.name}`} aria-pressed={row.muted} onClick={() => setSteps(row.id, { muted: !row.muted })}>{row.muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}</Button></Tooltip>
      <Tooltip text={row.clipKey ? 'Remove the voice-over from this step' : 'There is no voice-over to remove'}><Button size="icon" aria-label={`Remove clip, ${row.name}`} disabled={!row.clipKey} onClick={() => controller.removeClip(row.id)}><Trash2 size={16} aria-hidden="true" /></Button></Tooltip>
    </div>
    {openRecorder === row.id && <Recorder stepName={row.name} onClose={() => setOpenRecorder(null)} onSave={wav => controller.saveClip(row.id, wav, 'own')} />}
    {warnings.map(w => <div class="row-warning" role="status" key={w.code}><p><TriangleAlert size={14} aria-hidden="true" />{w.message}</p>
      {(w.fixes?.length > 0) && <div class="row-actions">
        {w.fixes.includes('freeze') && <Button size="sm" variant="outline" onClick={() => fix('freeze', row, w)}>Freeze last frame</Button>}
        {w.fixes.includes('slow') && <Button size="sm" variant="outline" onClick={() => fix('slow', row, w)}>Slow video to fit</Button>}
      </div>}</div>)}
    {!!(rowError || playError) && <p class="error" role="alert">{rowError || playError}</p>}
  </li>;
}
export function VoicePanel(ctx) {
  const { state, store, controller, values } = ctx;
  const ctl = useController(controller), { project, composition, plan } = state;
  const info = project.voice ?? { installed: false, voices: [] };
  const [openRecorder, setOpenRecorder] = useState(null), [notice, setNotice] = useState(null), [busy, setBusy] = useState(null);
  const file = useRef(), importFor = useRef(null);
  const voiceId = values['audio.voice.voiceId'], speed = values['audio.voice.speed'];
  const rows = scriptRows({ storyboard: project.storyboard, composition, clips: project.clips, voice: voiceId, speed });
  const summary = voiceSummary(rows), todo = needsGenerating(rows), job = ctl.job;
  const warningsFor = id => (plan?.audio.warnings ?? []).filter(w => w.stepId === id);
  const narrator = TOPIC_CARDS.audio.find(c => c.id === 'narrator');
  function setSteps(id, patch, path = 'audio.narration.steps') { store.change(path, narrationSteps(composition, id, patch)); }
  function fix(kind, row, warning) {
    const narration = plan.audio.narration.find(n => n.stepId === row.id);
    const context = { duration: project.record.durationSec, steps: project.events.steps, timemap: plan.timemap,
      narrationStartSrc: narration ? sourceAt(plan.timemap, narration.outStart).t : undefined };
    try { store.setComposition((kind === 'freeze' ? fixFreeze : fixSlow)(composition, row.id, warning.overrunSec, context), 'edits'); setNotice(null); }
    catch (error) { setNotice({ id: row.id, message: error.message }); }
  }
  async function importFile(id, picked) {
    if (!picked) return;
    setBusy(id); setNotice(null);
    try {
      if (picked.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 200 MB.');
      const { wav } = await convertToWav(await picked.arrayBuffer());
      if (wav.length > MAX_UPLOAD_BYTES) throw new Error('That audio is too long to import (over 200 MB as WAV).');
      await controller.saveClip(id, wav, 'file');
    } catch (error) { setNotice({ id, message: error.message }); }
    finally { setBusy(null); }
  }
  const resetNarrator = () => { let c = composition; for (const p of cardPaths(narrator)) c = changeComposition(c, p, undefined, { reset: true }); store.setComposition(c, 'narrator'); };
  return <div class="voice-panel">
    <EngineCard info={info} />
    <SettingsCard id="narrator" title="Narrator" icon={Mic} description={info.installed ? 'Reads each step’s narration aloud' : 'Recording and importing work without the engine'} onReset={resetNarrator}
      advanced={[<SettingRow key="gain" path="audio.voice.gainDb" ctx={ctx} />]}>
      <SettingRow path="audio.voice.enabled" ctx={ctx} render={({ id, value, onChange }) => <Switch id={id} aria-label={settingFor('audio.voice.enabled').label} checked={value ?? project.brief?.voice?.enabled === true} onCheckedChange={onChange} />} />
      <SettingRow path="audio.voice.voiceId" ctx={ctx} stacked render={({ id, value, onChange }) => <VoicePicker id={id} value={value} onChange={onChange} info={info} ctl={ctl} controller={controller} />} />
      <VoiceBrowser info={info} ctl={ctl} controller={controller} value={voiceId} onPick={id => store.change('audio.voice.voiceId', id)} />
      <SettingRow path="audio.voice.speed" ctx={ctx} setting={{ min: SPEED_MIN, max: SPEED_MAX, step: 0.05 }} help="How fast the narrator speaks; one is the natural pace. Changing it makes new voice-overs." />
      <SettingRow path="audio.tighten.enabled" ctx={ctx} />
      <SettingRow path="audio.tighten.pauseSec" ctx={ctx} />
    </SettingsCard>
    <SettingsCard id="script" title="Script" icon={MessageSquareText} badge={<Badge role="status">{summary.total ? `${summary.ready} of ${summary.total} ready` : 'No narration yet'}</Badge>}>
      {rows.length ? <>
        <div class="job-bar">
          {job.running ? <>
            <progress aria-label="Voice-over progress" max={Math.max(1, job.total)} value={job.done + job.failed} />
            <span class="srow-hint" role="status">{job.cancelling ? 'Stopping after this step…' : `Generating ${Math.min(job.total, job.done + job.failed + 1)} of ${job.total}…`}</span>
            <Button size="sm" disabled={job.cancelling} onClick={() => controller.cancel()}>Cancel</Button></>
            : <Tooltip text={!info.installed ? 'Install the voice engine to generate voice-overs' : todo.length ? 'Make voice-overs for every step that needs one' : 'Every step already has an up-to-date voice-over'}>
              <Button variant={todo.length && info.installed ? 'default' : 'outline'} size="sm" disabled={!info.installed || !todo.length} onClick={() => controller.generate({ stepIds: todo.map(r => r.id) })}><Sparkles size={13} aria-hidden="true" />{todo.length ? `Generate all (${todo.length})` : 'Generate all'}</Button></Tooltip>}
        </div>
        {!job.running && job.result && <p class={job.result.error || job.result.failed ? 'error' : 'srow-hint'} role="status">
          {job.result.error ? job.result.error : job.result.kind === 'cancelled' ? `Stopped. ${job.result.done} made.` : job.result.failed ? `${job.result.done} made, ${job.result.failed} could not be made.` : `Done. ${job.result.done} voice-over${job.result.done === 1 ? '' : 's'} ready.`}</p>}
        {ctl.error && <p class="error" role="alert">{ctl.error}</p>}
        <ul class="script-list">{rows.map(row => <ScriptRow key={row.id} row={row} info={info} ctl={ctl} controller={controller} job={job} warnings={warningsFor(row.id)} notice={notice} busy={busy}
          openRecorder={openRecorder} setOpenRecorder={setOpenRecorder} setSteps={setSteps} fix={fix} pickFile={id => { importFor.current = id; file.current.click(); }} />)}</ul>
      </> : <EmptyState compact icon={MessageSquareText} title="No steps to narrate" line="Steps come from the storyboard of this recording." />}
      <input ref={file} class="sr-only" type="file" accept="audio/*" tabIndex="-1" aria-label="Choose an audio file" onChange={e => { const picked = e.currentTarget.files?.[0]; const id = importFor.current; e.currentTarget.value = ''; importFile(id, picked); }} />
    </SettingsCard>
  </div>;
}
