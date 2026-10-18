import { buildTimeMap, sourceAt } from './timemap.mjs';
import { planCamera, cameraAt } from './camera.mjs';
import { directCursor } from './cursor-director.mjs';
import { cursorAt, pressAmount, rippleAt } from './cursor-track.mjs';
import { cuesFromRun, captionAlpha } from './captions.mjs';
import { validateComposition, resolveComposition, zoomOptions } from './composition.mjs';
import { layoutFor } from './layout.mjs';
import { THEMES } from './themes.mjs';
import { maxSharpZoom, validateRegions, suggestZoomRegions } from './zoom.mjs';

export function planRender({ composition, brief, storyboard, events, record, sourceSize, assetWarnings = [] }) {
  void brief;
  const validation = validateComposition(composition, { duration: record.durationSec });
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  if (![sourceSize.width, sourceSize.height, record.scale.used].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Invalid source size or capture scale');
  composition = resolveComposition(composition);
  const { output, cards } = composition;
  const layout = layoutFor({ output, source: sourceSize, composition });
  const timemap = buildTimeMap({ duration: record.durationSec, ...composition.edits,
    lead: cards.title.enabled ? cards.title.durationSec : 0,
    tail: cards.outro.enabled ? cards.outro.durationSec : 0, fade: cards.transition === 'cut' ? 0 : cards.fade });
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
  return { output: clone(output), layout, theme: THEMES[composition.theme], frame: clone(composition.frame), timemap,
    camera: planCamera({ regions, duration: record.durationSec, source: cssSource, omega: { slow: 5, normal: 7, fast: 10 }[composition.zoom.speed] }),
    cues: !composition.captions.enabled ? [] : composition.captions.cues !== undefined ? clone(composition.captions.cues) : cuesFromRun({ storyboard, events, captionsEnabled: true }),
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
    sourceT: t, camera: cameraAt(plan.camera, t),
    cursor: { ...cursorAt(events, t), press, alpha, shape: shapeKey?.shape ?? 'arrow', pop },
    ripple,
    caption: cue ? { text: cue.text, alpha: captionAlpha(cue, t) } : null };
}
