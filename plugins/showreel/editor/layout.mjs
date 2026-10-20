export function readPreference(key, fallback, storage) {
  try { return (storage ?? localStorage).getItem(`showreel:${key}`) ?? fallback; } catch { return fallback; }
}
export function writePreference(key, value, storage) {
  try { (storage ?? localStorage).setItem(`showreel:${key}`, value); } catch { /* Preferences are optional in private or restricted sessions. */ }
}
export function timelineHeight(value, viewportHeight) {
  return Math.max(190, Math.min(viewportHeight * .6, Number.isFinite(value) && value > 0 ? value : viewportHeight * .3));
}
// The contextual panel is resizable between 320 and 560 px; anything else (unset, NaN, 0) means the 400 px default.
export const PANEL_MIN = 320, PANEL_MAX = 560, PANEL_DEFAULT = 400;
export function panelWidth(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.round(number))) : PANEL_DEFAULT;
}
export function fitPreview(width, height, aspect) {
  const w = Math.max(0, width), h = Math.max(0, height);
  if (!w || !h || !aspect) return { width: 0, height: 0 };
  return w / h > aspect ? { width: h * aspect, height: h } : { width: w, height: w / aspect };
}
// Where an info tooltip bubble goes: above its (i) unless the row is at the very top of the window, clamped inside it sideways.
export const TIP_WIDTH = 240;
export function placeTip(rect, viewport, width = TIP_WIDTH, gap = 6, edge = 8) {
  const side = rect.top > 96 ? 'top' : 'bottom', start = viewport.left ?? 0;
  const left = Math.max(start + edge, Math.min(start + viewport.width - width - edge, rect.left + rect.width / 2 - width / 2));
  return { side, left, width, top: side === 'bottom' ? rect.bottom + gap : null, bottom: side === 'top' ? viewport.height - rect.top + gap : null };
}
