// Seek-safe motion tokens. Springs are reserved for camera/cursor consumers.
export const clamp01 = t => Math.max(0, Math.min(1, t));
export const EASING = Object.freeze({
  standard: t => { t = clamp01(t); return t * t * (3 - 2 * t); },
  enterOut: t => 1 - (1 - clamp01(t)) ** 3,
  moveInOut: t => { t = clamp01(t); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; },
  exitIn: t => clamp01(t) ** 3,
  springSoft: t => { t = clamp01(t); return (1 - (1 + 8 * t) * Math.exp(-8 * t)) / (1 - 9 * Math.exp(-8)); },
  none: clamp01,
});
export const DURATIONS = Object.freeze({ enter: 0.5, exit: 0.3, move: 0.6 });
// Short clips proportionally shorten both ramps, retaining a faster exit.
export function enterExit(t, start, end, { enter = DURATIONS.enter, exit = DURATIONS.exit, ease = 'enterOut' } = {}) {
  if (t < start || t >= end || end <= start) return { progress: 0, phase: 'off', alpha: 0 };
  const factor = Math.min(1, (end - start) / Math.max(enter + exit, Number.EPSILON));
  enter *= factor; exit *= factor;
  const progress = clamp01((t - start) / (end - start));
  const curve = typeof ease === 'function' ? ease : EASING[ease] ?? EASING.enterOut;
  if (enter > 0 && t < start + enter) return { progress, phase: 'enter', alpha: curve((t - start) / enter) };
  if (exit > 0 && t > end - exit) return { progress, phase: 'exit', alpha: 1 - EASING.exitIn((t - end + exit) / exit) };
  return { progress, phase: 'hold', alpha: 1 };
}
