import { buildTimeMap, sourceAt } from './timemap.mjs';
import { planCamera, cameraAt } from './camera.mjs';
import { cursorAt, pressAmount, rippleAt } from './cursor-track.mjs';
import { cuesFromRun, captionAlpha } from './captions.mjs';
import { validateComposition } from './composition.mjs';
import { layoutFor } from './layout.mjs';
import { THEMES } from './themes.mjs';
import { maxSharpZoom, validateRegions } from './zoom.mjs';

export function planRender({ composition, brief, storyboard, events, record, sourceSize }) {
  void brief;
  const validation = validateComposition(composition);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));
  if (![sourceSize.width, sourceSize.height, record.scale.used].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Invalid source size or capture scale');
  const { output, cards } = composition;
  const layout = layoutFor({ output, source: sourceSize, composition });
  const timemap = buildTimeMap({ duration: record.durationSec, ...composition.edits,
    lead: cards.title.enabled ? cards.title.duration : 0,
    tail: cards.outro.enabled ? cards.outro.duration : 0, fade: cards.fade });
  const regions = composition.zoom.enabled ? composition.zoom.regions : [];
  const regionValidation = validateRegions(regions, { duration: record.durationSec,
    maxSharp: maxSharpZoom({ sourceWidthPx: sourceSize.width, frameWidthPx: layout.frame.w }) });
  if (!regionValidation.ok) throw new Error(regionValidation.errors.join('\n'));
  const cssSource = { width: sourceSize.width / record.scale.used, height: sourceSize.height / record.scale.used };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  return { output: clone(output), layout, theme: THEMES[composition.theme], timemap,
    camera: planCamera({ regions, duration: record.durationSec, source: cssSource }),
    cues: cuesFromRun({ storyboard, events, captionsEnabled: composition.captions.enabled }),
    captions: clone(composition.captions),
    cursor: { samples: clone(events.cursor), sizePx: output.height * composition.cursor.sizePct / 100,
      color: THEMES[composition.theme].cursor.fill, ...composition.cursor },
    clicks: clone(events.clicks), ripples: clone(events.clicks), sourceSize: { ...sourceSize },
    viewport: { ...events.viewport }, scale: record.scale.used,
    warnings: [...(record.warnings ?? []), ...regionValidation.warnings], cards: clone(cards) };
}
export function stateAt(plan, tOut) {
  const mapped = sourceAt(plan.timemap, tOut), t = mapped.t;
  const events = { cursor: plan.cursor.samples, clicks: plan.clicks, viewport: plan.viewport };
  const cue = plan.cues.find((c) => t >= c.start && t <= c.end);
  return { section: mapped.section, alphaTitle: mapped.alphaTitle, alphaOutro: mapped.alphaOutro,
    sourceT: t, camera: cameraAt(plan.camera, t),
    cursor: { ...cursorAt(events, t), press: pressAmount(events, t) },
    ripple: plan.cursor.clickEffect ? rippleAt(events, t) : null,
    caption: cue ? { text: cue.text, alpha: captionAlpha(cue, t) } : null };
}
