import test from 'node:test';
import assert from 'node:assert/strict';
import { voiceStatus, effectiveNarration, scriptRows, voiceSummary, needsGenerating, groupVoices, languageLabel, firstWords, formatDuration, loudnessText, stepName, clampVoiceSpeed } from '../editor/voice-status.mjs';
import { voiceBlocks, musicBar } from '../editor/audio-view.mjs';
import { buildTimeMap } from '../scripts/lib/compose/timemap.mjs';
import { resolveComposition } from '../scripts/lib/compose/composition.mjs';
import { FALLBACK_VOICES } from '../scripts/lib/voice/voices.mjs';

const entry = (over = {}) => ({ key: 'k', text: 'Hello there', voice: 'af_heart', speed: 1, source: 'tts', durationSec: 2, ...over });
test('status mapping covers ready, needs update, not generated, recordings, imports, muted and no narration', () => {
  const base = { text: 'Hello there', voice: 'af_heart', speed: 1 };
  assert.equal(voiceStatus({ ...base, entry: entry() }), 'fresh');
  assert.equal(voiceStatus({ ...base, entry: entry({ text: 'Old words' }) }), 'stale');
  assert.equal(voiceStatus({ ...base, entry: entry({ voice: 'am_adam' }) }), 'stale');
  assert.equal(voiceStatus({ ...base, entry: entry({ speed: 1.1 }) }), 'stale');
  assert.equal(voiceStatus({ ...base, speed: 5, entry: entry({ speed: 1.3 }) }), 'fresh'); // the engine clamps the speed
  assert.equal(voiceStatus({ ...base, entry: null }), 'missing');
  assert.equal(voiceStatus({ ...base, text: null, entry: null }), 'none');
  assert.equal(voiceStatus({ ...base, entry: entry({ source: 'own' }) }), 'own');
  assert.equal(voiceStatus({ ...base, text: null, entry: entry({ source: 'file' }) }), 'file');
  assert.equal(voiceStatus({ ...base, entry: entry(), muted: true }), 'muted');
  assert.equal(clampVoiceSpeed(NaN), 1); assert.equal(clampVoiceSpeed(0.1), 0.7); assert.equal(clampVoiceSpeed(9), 1.3);
});
const storyboard = { steps: [{ id: 's1', caption: 'Open the report', narration: 'Open the report.' }, { id: 's2', name: 'Share', narration: null }, { id: 's3', title: 'Done', narration: 'All done.' }, { id: 's4', narration: 'Muted one.' }] };
test('narration text prefers the editor override and rows describe every step', () => {
  const composition = resolveComposition({ run: { id: 'r' }, audio: { narration: { steps: { s2: { text: 'Share it' }, s3: { text: '   ' }, s4: { muted: true } } } } });
  assert.equal(effectiveNarration(storyboard.steps[0], composition), 'Open the report.');
  assert.equal(effectiveNarration(storyboard.steps[1], composition), 'Share it');
  assert.equal(effectiveNarration(storyboard.steps[2], composition), 'All done.'); // blank override falls back
  const clips = { steps: { s1: 'k1', s3: 'k3' }, clips: { k1: entry({ text: 'Open the report.' }), k3: entry({ text: 'Different', source: 'tts' }) } };
  const rows = scriptRows({ storyboard, composition, clips, voice: 'af_heart', speed: 1 });
  assert.deepEqual(rows.map(r => r.status), ['fresh', 'missing', 'stale', 'muted']);
  assert.deepEqual(rows.map(r => r.label), ['Ready', 'Not generated', 'Needs update', 'Muted']);
  assert.deepEqual(rows.map(r => r.name), ['Open the report', 'Share', 'Done', 's4']);
  assert.equal(rows[0].clipKey, 'k1'); assert.equal(rows[1].clipKey, null); assert.equal(rows[1].edited, true);
  assert.deepEqual(needsGenerating(rows).map(r => r.id), ['s2', 's3']);
  assert.deepEqual(voiceSummary(rows), { ready: 1, total: 3, missing: 2 });
  assert.equal(scriptRows({ storyboard: { steps: [{ id: 'x' }] }, composition, clips: null, voice: 'a', speed: 1 })[0].status, 'none');
});
test('voices group by language in server order with readable labels', () => {
  const groups = groupVoices(FALLBACK_VOICES);
  assert.deepEqual(groups.map(g => g.label), ['English (US)', 'English (UK)']);
  assert.equal(groups.reduce((n, g) => n + g.voices.length, 0), FALLBACK_VOICES.length);
  assert.equal(groups[0].voices[0].label, 'Heart · Female · quality A');
  assert.equal(languageLabel('ja'), 'Japanese'); assert.equal(languageLabel('xx'), 'XX'); assert.equal(languageLabel('unknown'), 'Other');
  assert.deepEqual(groupVoices(undefined), []);
});
test('small formatting helpers', () => {
  assert.equal(firstWords('one two three four five six'), 'one two three four…'); assert.equal(firstWords('  hi there '), 'hi there'); assert.equal(firstWords(null), '');
  assert.equal(formatDuration(2.345), '2.3 s'); assert.equal(formatDuration(75), '1:15'); assert.equal(formatDuration(NaN), '');
  assert.equal(loudnessText({ integratedLufs: -16.04, truePeakDb: -1.23 }), '-16.0 LUFS, true peak -1.2 dBTP'); assert.equal(loudnessText(null), null); assert.equal(loudnessText({ integratedLufs: null }), null);
  assert.equal(stepName({ id: 's9' }), 's9'); assert.equal(stepName(undefined), 'Step');
});
test('timeline voice blocks use output time in Output mode and source time in Source mode', () => {
  const timemap = buildTimeMap({ duration: 10, speeds: [{ start: 2, end: 6, rate: 2 }] });
  const composition = resolveComposition({ run: { id: 'r' } });
  const plan = { timemap, audio: { enabled: true, narration: [{ stepId: 's1', outStart: 1, durationSec: 3, source: 'tts' }, { stepId: 's3', outStart: 5, durationSec: 1, source: 'own' }],
    warnings: [{ stepId: 's3', message: 'Too long.' }], music: null } };
  const out = voiceBlocks({ plan, storyboard, composition, output: true });
  assert.deepEqual(out.map(b => [b.stepId, b.start, b.end]), [['s1', 1, 4], ['s3', 5, 6]]);
  assert.equal(out[0].label, 'Open the report.'); assert.equal(out[0].warning, null); assert.equal(out[1].warning, 'Too long.');
  const source = voiceBlocks({ plan, storyboard, composition, output: false });
  assert.deepEqual(source.map(b => [b.start, b.end]), [[1, 6], [7, 8]]);
  assert.deepEqual(voiceBlocks({ plan: { timemap, audio: { narration: [] } }, storyboard, composition, output: true }), []);
  assert.deepEqual(voiceBlocks({ plan: null, storyboard, composition, output: true }), []);
});
test('music bar spans the output and reports fade lengths in display seconds', () => {
  const timemap = buildTimeMap({ duration: 10, trims: [{ start: 0, end: 2 }] });
  const plan = { timemap, audio: { music: { url: '/media/music/music/a.mp3', fadeInSec: 1, fadeOutSec: 2, loop: true } } };
  assert.deepEqual(musicBar({ plan, output: true }), { start: 0, end: 8, fadeIn: 1, fadeOut: 2, url: '/media/music/music/a.mp3', loop: true });
  const source = musicBar({ plan, output: false });
  assert.equal(source.start, 2); assert.equal(source.end, 10); assert.equal(source.fadeIn, 1); assert.equal(source.fadeOut, 2);
  assert.equal(musicBar({ plan: { timemap, audio: { music: null } }, output: true }), null);
});

import { narrationSteps } from '../editor/voice-status.mjs';
test('narration edits keep composition.json tidy', () => {
  const c = resolveComposition({ run: { id: 'r' }, audio: { narration: { steps: { s1: { text: 'Hi', muted: true } } } } });
  assert.deepEqual(narrationSteps(c, 's1', { text: 'Hello ' }), { s1: { text: 'Hello ', muted: true } }); // trailing space survives while typing
  assert.deepEqual(narrationSteps(c, 's1', { text: '   ' }), { s1: { muted: true } });
  assert.deepEqual(narrationSteps(c, 's1', { text: '', muted: false }), {});
  assert.deepEqual(narrationSteps(c, 's2', { muted: true }), { s1: { text: 'Hi', muted: true }, s2: { muted: true } });
  assert.equal(narrationSteps(c, 's2', { text: 'x'.repeat(400) }).s2.text.length, 280);
  assert.deepEqual(c.audio.narration.steps, { s1: { text: 'Hi', muted: true } }); // input untouched
  assert.deepEqual(narrationSteps(undefined, 's1', { text: 'A' }), { s1: { text: 'A' } });
});

import { VOICE_PANEL_PATHS, MUSIC_PANEL_PATHS } from '../editor/voice-status.mjs';
import { SETTINGS } from '../scripts/lib/compose/settings-schema.mjs';
test('the Voice and Music panels together show every audio setting exactly once', () => {
  const shown = [...VOICE_PANEL_PATHS, ...Object.values(MUSIC_PANEL_PATHS).flat()].sort();
  assert.deepEqual(shown, SETTINGS.filter(s => s.group === 'audio').map(s => s.path).sort());
  assert.equal(new Set(shown).size, shown.length);
});
