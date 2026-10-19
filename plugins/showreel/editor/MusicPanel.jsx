import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Play, Square, Upload, Trash2, LoaderCircle } from 'lucide-preact';
import { settingFor } from '../scripts/lib/compose/settings-schema.mjs';
import { changeComposition, MUSIC_EXTENSIONS } from '../scripts/lib/compose/composition.mjs';
import { Button } from './ui/button.jsx';
import { Tooltip } from './ui/tooltip.jsx';
import { SettingField } from './SettingField.jsx';
import { useController } from './use-controller.js';
import { editorAudioUrls } from './state.js';
import { baseName, formatDuration, loudnessText, MUSIC_PANEL_PATHS as PATHS } from './voice-status.mjs';

const MAX_MUSIC_BYTES = 200 * 1024 * 1024;
// What each mix setting means in everyday words; shown under the setting's own one-line help.
const MIX_HELP = {
  'audio.loudness.enabled': 'Recommended. Without it, the video is exactly as loud as the recording and music you gave it.',
  'audio.loudness.targetLufs': 'Minus 16 is a good level for online video and podcasts. A smaller number (such as minus 20) is quieter; a bigger one (such as minus 12) is louder.',
  'audio.loudness.truePeakDb': 'Minus 1 leaves a little room under the loudest possible sound so nothing distorts after the video is compressed. Leave it unless you know you need to change it.',
};

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
  return <div class="music-file">
    {value ? <p class="music-name" id={`${id}-name`}><strong title={value}>{baseName(value)}</strong>{seconds != null && <span class="duration"> · {formatDuration(seconds)}</span>}</p>
      : <p class="setting-help" id={`${id}-name`}>No music chosen yet.</p>}
    <div class="row-actions" role="group" id={id} aria-label="Music file">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current.click()}>{busy ? <LoaderCircle class="spin" size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}{value ? 'Replace file' : 'Choose file'}</Button>
      <Tooltip text={value ? 'Listen to the music on its own' : 'Choose a music file first'}><Button size="sm" aria-label={playing ? 'Stop music preview' : 'Play music preview'} disabled={!value} onClick={() => controller.playMusic(url)}>
        {playing ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}{playing ? 'Stop' : 'Play preview'}</Button></Tooltip>
      <Tooltip text={value ? 'Take the music out of the video' : 'There is no music to remove'}><Button size="sm" aria-label="Remove music" disabled={!value} onClick={() => { controller.stopPlayback(); store.setComposition(changeComposition(changeComposition(state.composition, 'audio.music.file', null), 'audio.music.enabled', false), 'audio.music.file'); }}><Trash2 size={14} aria-hidden="true" />Remove</Button></Tooltip>
    </div>
    <input ref={input} class="sr-only" type="file" tabIndex="-1" aria-label="Choose a music file" accept={MUSIC_EXTENSIONS.map(e => `.${e}`).join(',') + ',audio/*'}
      onChange={e => { const picked = e.currentTarget.files?.[0]; e.currentTarget.value = ''; choose(picked); }} />
    {!!error && <p class="error" role="alert">{error}</p>}
  </div>;
}

export function MusicPanel({ state, store, controller, values, defaults }) {
  const ctl = useController(controller), common = { values, defaults, state, store };
  const field = path => <SettingField {...common} key={path} setting={settingFor(path)} />;
  const measured = loudnessText(state.project.lastExport);
  return <div class="music-panel">
    <details class="setting-group" open><summary>Background music</summary>
      {PATHS.music.map(path => path === 'audio.music.file'
        ? <SettingField {...common} key={path} setting={settingFor(path)} render={({ id, value }) => <MusicFile id={id} value={value} state={state} store={store} controller={controller} ctl={ctl} />} />
        : field(path))}
    </details>
    <details class="setting-group" open><summary>Music under the voice</summary>
      {PATHS.ducking.map(field)}
      <details><summary>Advanced</summary>{PATHS.advanced.map(field)}</details>
    </details>
    <details class="setting-group" open><summary>Mix and loudness</summary>
      {PATHS.loudness.map(path => <SettingField {...common} key={path} setting={settingFor(path)} extra={<p class="setting-help">{MIX_HELP[path]}</p>} />)}
      <p class="last-measured" role="status"><strong>Last measured:</strong> {measured ?? 'not yet. Export the video to measure it.'}</p>
      <p class="setting-help">The preview plays the same mix, including the level adjustment, so what you hear is close to what you export.</p>
    </details>
  </div>;
}
