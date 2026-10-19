// Pure narration helpers shared by the editor (Voice panel, timeline, export checklist) and the editor server (generation).
export const SPEED_MIN = 0.7, SPEED_MAX = 1.3, MAX_NARRATION_CHARS = 280;
export const clampVoiceSpeed = speed => Number.isFinite(speed) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed)) : 1;
export const stepName = step => step?.name ?? step?.title ?? step?.caption ?? step?.id ?? 'Step';
// The text the narrator reads: the editor's own wording if there is one, otherwise what the storyboard says.
export function effectiveNarration(step, composition) {
  const own = composition?.audio?.narration?.steps?.[step?.id]?.text;
  const text = typeof own === 'string' && own.trim() ? own : step?.narration;
  return typeof text === 'string' && text.trim() ? text : null;
}
// A storyboard whose narration is what the editor currently shows, ready for wantedClips().
export const effectiveStoryboard = (storyboard, composition) =>
  ({ ...storyboard, steps: (storyboard?.steps ?? []).map(step => ({ ...step, narration: effectiveNarration(step, composition) })) });
