// Timeline geometry for the Voice and Music tracks. Pure: plan and mode in, display seconds out.
// Display seconds are output seconds in Output mode and source seconds in Source mode, like every other track.
import { sourceAt } from '../scripts/lib/compose/timemap.mjs';
import { firstWords, effectiveNarration } from './voice-status.mjs';

export function voiceBlocks({ plan, storyboard, composition, output }) {
  const map = plan?.timemap;
  if (!map || !plan.audio?.narration?.length) return [];
  const toDisplay = t => output ? t : sourceAt(map, t).t;
  return plan.audio.narration.map(n => {
    const step = storyboard?.steps?.find(s => s.id === n.stepId), text = effectiveNarration(step, composition);
    const warnings = (plan.audio.warnings ?? []).filter(w => w.stepId === n.stepId);
    return { stepId: n.stepId, outStart: n.outStart, outEnd: n.outStart + n.durationSec, start: toDisplay(n.outStart), end: toDisplay(n.outStart + n.durationSec),
      label: firstWords(text) || n.stepId, source: n.source ?? 'tts',
      warning: warnings.length ? warnings.map(w => w.message).join(' ') : null };
  });
}
export function musicBar({ plan, output }) {
  const map = plan?.timemap, music = plan?.audio?.music;
  if (!map || !music) return null;
  const toDisplay = t => output ? t : sourceAt(map, t).t;
  const start = toDisplay(0), end = toDisplay(map.outputDuration);
  return { start, end, fadeIn: Math.max(0, toDisplay(Math.min(music.fadeInSec, map.outputDuration)) - start), fadeOut: Math.max(0, end - toDisplay(Math.max(0, map.outputDuration - music.fadeOutSec))),
    url: music.url, loop: music.loop };
}
