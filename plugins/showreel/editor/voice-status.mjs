// Pure helpers behind the Voice panel, the timeline voice track and the export checklist. No DOM, no network.
import { SPEED_MIN, SPEED_MAX, MAX_NARRATION_CHARS, clampVoiceSpeed, stepName, effectiveNarration } from '../scripts/lib/voice/narration.mjs';
export { SPEED_MIN, SPEED_MAX, MAX_NARRATION_CHARS, clampVoiceSpeed, stepName, effectiveNarration };
export const firstWords = (text, count = 4) => {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  return words.length > count ? `${words.slice(0, count).join(' ')}…` : words.join(' ');
};

// ready: the saved clip matches the current words, voice and speed. stale: it does not. missing: no clip yet.
export function voiceStatus({ text, entry, muted = false, voice, speed }) {
  if (muted) return 'muted';
  if (entry && (entry.source === 'own' || entry.source === 'file')) return entry.source;
  if (!text) return 'none';
  if (!entry) return 'missing';
  return entry.text === text && entry.voice === voice && Number(entry.speed) === clampVoiceSpeed(speed) ? 'fresh' : 'stale';
}
export const STATUS_LABELS = { fresh: 'Ready', stale: 'Needs update', missing: 'Not generated', own: 'Your recording', file: 'Imported file', muted: 'Muted', none: 'No narration' };
export const STATUS_HELP = {
  fresh: 'The voice-over matches the words, voice and speed.', stale: 'The words, voice or speed changed since this voice-over was made.',
  missing: 'No voice-over has been made for this step yet.', own: 'Your own recording is used for this step.', file: 'An imported audio file is used for this step.',
  muted: 'This step is silent.', none: 'Write narration for this step to give it a voice-over.',
};
// Rows for the script list, one per storyboard step.
export function scriptRows({ storyboard, composition, clips, voice, speed }) {
  return (storyboard?.steps ?? []).map(step => {
    const text = effectiveNarration(step, composition), key = clips?.steps?.[step.id], entry = key ? clips?.clips?.[key] ?? null : null;
    const muted = composition?.audio?.narration?.steps?.[step.id]?.muted === true;
    const status = voiceStatus({ text, entry, muted, voice, speed });
    return { id: step.id, name: stepName(step), text, written: step.narration ?? null, edited: typeof composition?.audio?.narration?.steps?.[step.id]?.text === 'string',
      status, label: STATUS_LABELS[status], clipKey: entry ? key : null, durationSec: entry?.durationSec ?? null, source: entry?.source ?? null, muted };
  });
}
// Steps the next "Generate" would work on: those with words and no usable clip (or a stale one), skipping muted and own/imported audio.
export const needsGenerating = rows => rows.filter(row => row.status === 'missing' || row.status === 'stale');
export function voiceSummary(rows) {
  const wanted = rows.filter(row => row.status !== 'none' && row.status !== 'muted');
  const ready = wanted.filter(row => ['fresh', 'own', 'file'].includes(row.status));
  return { ready: ready.length, total: wanted.length, missing: needsGenerating(rows).length };
}

const LANGUAGES = { 'en-us': 'English (US)', 'en-gb': 'English (UK)', ja: 'Japanese', zh: 'Chinese', es: 'Spanish', fr: 'French', hi: 'Hindi', it: 'Italian', 'pt-br': 'Portuguese (Brazil)' };
export const languageLabel = code => LANGUAGES[String(code).toLowerCase()] ?? (code && code !== 'unknown' ? String(code).toUpperCase() : 'Other');
export const voiceLabel = voice => `${voice.name}${voice.gender && voice.gender !== 'unknown' ? ` · ${voice.gender}` : ''}${voice.grade ? ` · quality ${voice.grade}` : ''}`;
// Voices grouped by language in the order given (the server already puts American and British English first).
export function groupVoices(voices) {
  const groups = [];
  for (const voice of voices ?? []) {
    const label = languageLabel(voice.language);
    let group = groups.find(g => g.label === label);
    if (!group) groups.push(group = { label, voices: [] });
    group.voices.push({ id: voice.id, label: voiceLabel(voice) });
  }
  return groups;
}
export const INSTALL_COMMAND = 'showreel voice install --yes';
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '';
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}
export const loudnessText = measured => Number.isFinite(measured?.integratedLufs)
  ? `${measured.integratedLufs.toFixed(1)} LUFS, true peak ${Number.isFinite(measured.truePeakDb) ? measured.truePeakDb.toFixed(1) : '?'} dBTP` : null;
export const baseName = file => String(file ?? '').split('/').pop();
// The narration map after changing one step: empty text, `false` mute and empty entries are removed, so composition.json stays tidy.
export function narrationSteps(composition, stepId, patch) {
  const steps = { ...(composition?.audio?.narration?.steps ?? {}) }, entry = { ...(steps[stepId] ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === false || (key === 'text' && !String(value).trim())) delete entry[key];
    else entry[key] = key === 'text' ? String(value).slice(0, MAX_NARRATION_CHARS) : value;
  }
  if (Object.keys(entry).length) steps[stepId] = entry; else delete steps[stepId];
  return steps;
}

// Which panel shows each audio setting. A test keeps this equal to the settings schema so none can go missing.
export const VOICE_PANEL_PATHS = ['audio.voice.enabled', 'audio.voice.voiceId', 'audio.voice.speed', 'audio.voice.gainDb'];
export const MUSIC_PANEL_PATHS = {
  music: ['audio.music.enabled', 'audio.music.file', 'audio.music.gainDb', 'audio.music.loop', 'audio.music.fadeInSec', 'audio.music.fadeOutSec'],
  ducking: ['audio.music.duck.enabled', 'audio.music.duck.depthDb'], advanced: ['audio.music.duck.attackMs', 'audio.music.duck.releaseMs'],
  loudness: ['audio.loudness.enabled', 'audio.loudness.targetLufs', 'audio.loudness.truePeakDb'],
};
