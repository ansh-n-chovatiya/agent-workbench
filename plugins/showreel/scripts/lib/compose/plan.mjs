import { buildTimeMap, sourceAt } from './timemap.mjs';
import { planCamera, cameraAt } from './camera.mjs';
import { directCursor } from './cursor-director.mjs';
import { cursorAt, pressAmount, rippleAt } from './cursor-track.mjs';
import { cuesFromRun, captionAlpha } from './captions.mjs';
import { validateComposition, resolveComposition, zoomOptions } from './composition.mjs';
import { layoutFor } from './layout.mjs';
import { THEMES } from './themes.mjs';
import { placeNarration, extendCues } from '../audio/retime.mjs';
import { maxSharpZoom, validateRegions, suggestZoomRegions } from './zoom.mjs';

// Export serves clips as voice/<key>.wav and music as music/<project path>; the editor passes its own /media/ builders.
export const exportAudioUrls = {
  clip: (key) => `voice/${key}.wav`,
  music: (file) => `music/${file.split('/').map(encodeURIComponent).join('/')}`,
};
export function planAudio({ composition, brief, events, timemap, cues, voiceClips = null, audioUrls = exportAudioUrls }) {
  const { voice, music, loudness } = composition.audio, urls = { ...exportAudioUrls, ...audioUrls };
  const voiceEnabled = voice.enabled ?? brief?.voice?.enabled === true;
  const clips = {};
  if (voiceEnabled) for (const step of events.steps ?? []) {
    const key = voiceClips?.steps?.[step.id], clip = key ? voiceClips.clips?.[key] : null;
    if (clip && Number.isFinite(clip.durationSec) && clip.durationSec > 0) clips[step.id] = { durationSec: clip.durationSec, source: clip.source ?? 'tts', key };
  }
  const muted = Object.fromEntries(Object.entries(composition.audio.narration.steps).filter(([, v]) => v?.muted === true).map(([id]) => [id, true]));
  const placed = placeNarration({ steps: events.steps ?? [], clips, timemap, cues, muted, fps: composition.output.fps });
  const narration = placed.placements.map((p) => ({ stepId: p.stepId, clipUrl: urls.clip(clips[p.stepId].key), outStart: p.outStart,
    durationSec: clips[p.stepId].durationSec, gainDb: voice.gainDb, source: clips[p.stepId].source }));
  const musicPlan = music.enabled && music.file ? { url: urls.music(music.file), gainDb: music.gainDb, loop: music.loop,
    fadeInSec: music.fadeInSec, fadeOutSec: music.fadeOutSec, startSec: 0, endSec: timemap.outputDuration } : null;
  return { enabled: narration.length > 0 || musicPlan !== null, sampleRate: 48000, durationSec: timemap.outputDuration, narration, music: musicPlan,
    duck: { ...music.duck }, loudness: { ...loudness }, warnings: placed.warnings, captionSpans: placed.captionSpans };
}

export function planRender({ composition, brief, storyboard, events, record, sourceSize, assetWarnings = [], voiceClips = null, audioUrls }) {
  const validation = validateComposition(composition, { duration: record.durationSec });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  if (![sourceSize.width, sourceSize.height, record.scale.used].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Invalid source size or capture scale');
  composition = resolveComposition(composition);
  const { output, cards } = composition;
  const layout = layoutFor({ output, source: sourceSize, composition });
  const timeArgs = (extraHold) => ({ duration: record.durationSec, ...composition.edits,
    holds: extraHold ? [...(composition.edits.holds ?? []), extraHold] : composition.edits.holds,
    lead: cards.title.enabled ? cards.title.durationSec : 0,
    tail: cards.outro.enabled ? cards.outro.durationSec : 0, fade: cards.transition === 'cut' ? 0 : cards.fade });
  let timemap = buildTimeMap(timeArgs(null));
  const savedRegions = validateRegions(composition.zoom.regions, { duration: record.durationSec });
  if (!savedRegions.ok) throw new Error(savedRegions.errors.join('\n'));
  const auto = composition.zoom.autoSuggest && composition.zoom.regions.every((r) => r.source === 'auto');
  const regions = !composition.zoom.enabled ? [] : auto
    ? suggestZoomRegions({ events, record, options: zoomOptions(composition.zoom) }) : composition.zoom.regions;
  const regionValidation = validateRegions(regions, { duration: record.durationSec,
    maxSharp: maxSharpZoom({ sourceWidthPx: sourceSize.width, frameWidthPx: layout.frame.w }) });
  if (!regionValidation.ok) throw new Error(regionValidation.errors.join('\n'));
  const cssSource = { width: sourceSize.width / record.scale.used, height: sourceSize.height / record.scale.used };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  let cues = !composition.captions.enabled ? [] : composition.captions.cues !== undefined ? clone(composition.captions.cues) : cuesFromRun({ storyboard, events, captionsEnabled: true });
  let audio = planAudio({ composition, brief, events, timemap, cues, voiceClips, audioUrls });
  // Narration that would run past the end of the video is never cut off: hold the last frame until the voice has finished.
  const narrationEnd = Math.max(0, ...audio.narration.map((n) => n.outStart + n.durationSec));
  if (narrationEnd > timemap.mainEnd + 0.05) {
    const extra = +(narrationEnd - timemap.mainEnd + 0.3).toFixed(3), last = timemap.segments.filter((x) => x.rate > 0).at(-1);
    try {
      const held = buildTimeMap(timeArgs({ t: Math.max(last.start, last.end - 1 / composition.output.fps), duration: extra }));
      const retimed = planAudio({ composition, brief, events, timemap: held, cues, voiceClips, audioUrls });
      timemap = held; audio = retimed;
      audio.warnings = [...audio.warnings, { stepId: null, code: 'tail-hold', message: `The last frame is held for ${extra.toFixed(1)} s so the narration can finish.`, overrunSec: extra, fixes: [] }];
    } catch { /* an existing hold or edit blocks an automatic hold: the overrun warnings already tell the person */ }
  }
  if (audio.captionSpans.length) cues = extendCues(cues, audio.captionSpans, timemap);
  return { output: clone(output), layout, theme: THEMES[composition.theme], frame: clone(composition.frame), timemap,
    regions: clone(regions),
    camera: planCamera({ regions, duration: record.durationSec, source: cssSource, omega: { slow: 5, normal: 7, fast: 10 }[composition.zoom.speed] }),
    cues, audio,
    captions: clone(composition.captions),
    cursor: { ...directCursor({ events, options: { ...composition.cursor, durationSec: record.durationSec } }), sizePx: output.height * (composition.cursor.style === 'custom' ? composition.cursor.custom?.heightPct ?? composition.cursor.sizePct : composition.cursor.sizePct) / 100,
      color: THEMES[composition.theme].cursor.fill, ...composition.cursor },
    clicks: clone(events.clicks), ripples: clone(events.clicks), sourceSize: { ...sourceSize },
    viewport: { ...events.viewport }, scale: record.scale.used,
    warnings: [...assetWarnings, ...(record.warnings ?? []), ...regionValidation.warnings, ...(composition.captions.mode === 'overlay' ? ['overlay captions can cover the video'] : [])], cards: clone(cards) };
}
export function stateAt(plan, tOut) {
  const mapped = sourceAt(plan.timemap, tOut), t = mapped.t;
  const events = { cursor: plan.cursor.samples, clicks: plan.clicks, viewport: plan.viewport };
  const cue = plan.cues.find((c) => t >= c.start && t <= c.end);
  const press = 1 - (1 - pressAmount(events, t)) / 0.14 * (1 - plan.cursor.pressScale);
  const frames = plan.cursor.alpha ?? [{ t: 0, a: 1 }];
  let lo = 0, hi = frames.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (frames[mid].t <= t) lo = mid + 1; else hi = mid; }
  const index = Math.max(0, lo - 1);
  const a = frames[index], b = frames[index + 1];
  const alpha = b ? a.a + (b.a - a.a) * Math.max(0, (t - a.t) / (b.t - a.t)) : a.a;
  const shapeKey = plan.cursor.shapes?.findLast((k) => k.t <= t);
  const age = t - (shapeKey?.t ?? -Infinity);
  const pop = shapeKey && shapeKey !== plan.cursor.shapes[0] && age < 0.12
    ? 1 + 0.12 * Math.sin(Math.PI * age / 0.12) : 1;
  const effect = plan.cursor.clickEffect;
  const ripple = effect.style !== 'none' ? rippleAt(events, t, effect.durationSec) : null;
  return { section: mapped.section, alphaTitle: mapped.alphaTitle, alphaOutro: mapped.alphaOutro,
    sourceT: t, rate: mapped.rate, camera: cameraAt(plan.camera, t),
    cursor: { ...cursorAt(events, t), press, alpha, shape: shapeKey?.shape ?? 'arrow', pop },
    ripple,
    caption: cue ? { text: cue.text, alpha: captionAlpha(cue, t) } : null };
}
