export function readPreference(key, fallback, storage) {
  try { return (storage ?? localStorage).getItem(`showreel:${key}`) ?? fallback; } catch { return fallback; }
}
export function writePreference(key, value, storage) {
  try { (storage ?? localStorage).setItem(`showreel:${key}`, value); } catch { /* Preferences are optional in private or restricted sessions. */ }
}
export function timelineHeight(value, viewportHeight) {
  return Math.max(190, Math.min(viewportHeight * .6, Number.isFinite(value) && value > 0 ? value : viewportHeight * .3));
}
export function fitPreview(width, height, aspect) {
  const w = Math.max(0, Math.min(width, height * aspect));
  return { width:w, height:w / aspect };
}
