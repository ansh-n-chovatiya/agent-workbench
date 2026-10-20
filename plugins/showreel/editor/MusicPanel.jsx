import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Play, Square, Upload, Trash2, LoaderCircle } from 'lucide-preact';
import { changeComposition, MUSIC_EXTENSIONS } from '../scripts/lib/compose/composition.mjs';
import { Button } from './ui/button.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { SettingsCard } from './panels/SettingsCard.jsx';
import { SettingRow } from './panels/SettingRow.jsx';
import { EmptyState } from './panels/EmptyState.jsx';
import { Music, AudioLines, Gauge } from './panels/icons.js';
import { TOPIC_CARDS, cardPaths } from './panel-model.mjs';
import { useController } from './use-controller.js';
import { editorAudioUrls } from './state.js';
import { baseName, formatDuration, loudnessText } from './voice-status.mjs';

const MAX_MUSIC_BYTES = 200 * 1024 * 1024;
// What each mix setting means in everyday words; joined onto the setting's tooltip.
const MIX_HELP = {
  'audio.loudness.enabled': 'Recommended. Without it, the video is exactly as loud as the recording and music you gave it.',
  'audio.loudness.targetLufs': 'Minus 16 is a good level for online video and podcasts. A smaller number (such as minus 20) is quieter; a bigger one (such as minus 12) is louder.',
  'audio.loudness.truePeakDb': 'Minus 1 leaves a little room under the loudest possible sound so nothing distorts after the video is compressed. Leave it unless you know you need to change it.',
};
const ICONS = { music: Music, ducking: AudioLines, loudness: Gauge };
function useDuration(url) {
  const [seconds, setSeconds] = useState(null);
  useEffect(() => {
    setSeconds(null);
    if (!url) return undefined;
    const probe = new Audio(); probe.preload = 'metadata';
    probe.onloadedmetadata = () => setSeconds(Number.isFinite(probe.duration) ? probe.duration : null);
    probe.src = url;
    return () => { probe.onloadedmetadata = null; probe.removeAttribute('src'); };
  }, [url]);
  return seconds;
}
function MusicFile({ id, value, state, store, controller, ctl }) {
  const input = useRef(), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const url = value ? editorAudioUrls.music(value) : '', seconds = useDuration(url), playing = ctl.playing?.kind === 'music';
  async function choose(file) {
    if (!file) return;
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!MUSIC_EXTENSIONS.includes(ext)) { setError(`Choose a ${MUSIC_EXTENSIONS.map(e => e.toUpperCase()).join(', ')} file.`); return; }
    if (file.size > MAX_MUSIC_BYTES) { setError('That file is larger than 200 MB.'); return; }
    setBusy(true);
    try {
      const { file: stored } = await controller.saveMusic(file);
      store.setComposition(changeComposition(changeComposition(state.composition, 'audio.music.file', stored), 'audio.music.enabled', true), 'audio.music.file');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const chooseButton = <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current.click()}>{busy ? <LoaderCircle class="spin" size={13} aria-hidden="true" /> : <Upload size={13} aria-hidden="true" />}{value ? 'Replace file' : 'Choose file'}</Button>;
  return <div class="music-file" id={id} role="group" aria-label="Music file">
    {value ? <div class="music-current">
      <div class="music-meta"><strong title={value}>{baseName(value)}</strong><span>{seconds != null ? formatDuration(seconds) : 'in the project'}</span></div>
      <div class="row-actions">
        <Tooltip text={playing ? 'Stop' : 'Listen to the music on its own'}><Button size="sm" variant="outline" aria-label={playing ? 'Stop music preview' : 'Play music preview'} onClick={() => controller.playMusic(url)}>{playing ? <Square size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}{playing ? 'Stop' : 'Preview'}</Button></Tooltip>
        {chooseButton}
        <Tooltip text="Take the music out of the video"><Button size="sm" aria-label="Remove music" onClick={() => { controller.stopPlayback(); store.setComposition(changeComposition(changeComposition(state.composition, 'audio.music.file', null), 'audio.music.enabled', false), 'audio.music.file'); }}><Trash2 size={13} aria-hidden="true" />Remove</Button></Tooltip>
      </div>
    </div> : <EmptyState compact icon={Music} title="No music yet" line="WAV, MP3, M4A or OGG · up to 200 MB" action={chooseButton} />}
    <input ref={input} class="sr-only" type="file" tabIndex="-1" aria-label="Choose a music file" accept={MUSIC_EXTENSIONS.map(e => `.${e}`).join(',') + ',audio/*'}
      onChange={e => { const picked = e.currentTarget.files?.[0]; e.currentTarget.value = ''; choose(picked); }} />
    {!!error && <p class="error" role="alert">{error}</p>}
  </div>;
}
export function MusicPanel(ctx) {
  const { state, store, controller } = ctx, ctl = useController(controller);
  const measured = loudnessText(state.project.lastExport);
  const row = (path, extra = {}) => <SettingRow key={path} path={path} ctx={ctx} help={MIX_HELP[path] ? `${ctx.values ? '' : ''}${MIX_HELP[path]}` : undefined} {...extra} />;
  const resetAll = card => () => { let c = state.composition; for (const p of cardPaths(card)) c = changeComposition(c, p, undefined, { reset: true }); store.setComposition(c, card.id); };
  const cards = TOPIC_CARDS.audio.filter(c => c.tab === 'music');
  return <div class="music-panel">
    {cards.map(card => <SettingsCard key={card.id} id={card.id} title={card.title} icon={ICONS[card.id]} onReset={resetAll(card)} advanced={card.advanced?.length ? card.advanced.map(p => row(p)) : null}
      description={card.id === 'ducking' ? 'Turns the music down while the narrator speaks' : card.id === 'loudness' ? 'Every export equally loud' : undefined}>
      {card.primary.map(path => path === 'audio.music.file'
        ? row(path, { stacked: true, render: ({ id, value }) => <MusicFile id={id} value={value} state={state} store={store} controller={controller} ctl={ctl} /> })
        : row(path))}
      {card.id === 'loudness' && <p class="last-measured srow-hint" role="status"><strong>Last measured:</strong> {measured ?? 'not yet. Export the video to measure it.'}</p>}
    </SettingsCard>)}
  </div>;
}
