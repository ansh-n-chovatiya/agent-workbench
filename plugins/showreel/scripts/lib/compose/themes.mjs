function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function theme(name, colors, ink, muted, accent, font, weight, radius, size, speed, depth) {
  return { name, background: { type: 'gradient', angle: 135, colors },
    frame: { radiusPx: radius, shadow: { enabled: true, blurPx: radius * 2.8, offsetYPx: radius, opacity: 0.25, color: 'rgba(0,0,0,0.25)' },
      border: { enabled: name !== 'clean', color: accent, widthPx: name === 'bold' ? 4 : 1 } },
    cursor: { fill: name === 'clean' ? '#ffffff' : accent, stroke: name === 'bold' ? '#24124b' : '#111827', sizePct: size },
    ripple: { color: accent },
    caption: { background: name === 'clean' ? 'rgba(17,24,39,0.86)' : name === 'dark' ? '#202b40' : '#24124b', color: '#ffffff', fontWeight: weight },
    card: { background: { type: 'gradient', angle: 135, colors }, titleColor: ink, subtitleColor: muted, accent },
    overlay: { accent, onAccent: name === 'clean' ? '#ffffff' : '#111827', surfaceBorder: name === 'clean' ? '#c2cbd7' : name === 'dark' ? '#0b1220' : '#160b30', surface: name === 'clean' ? '#ffffff' : name === 'dark' ? '#172033' : '#24124b', onSurface: name === 'clean' ? '#111827' : '#ffffff', muted },
    typography: { family: font, weights: { body: 400, display: weight }, captionSizeMultiplier: name === 'bold' ? 1.2 : 1 },
    zoom: { depth, speed }, transition: name === 'bold' ? 'cut' : 'crossfade', font };
}
export const THEMES = freeze({
  clean: theme('clean', ['#eef2f7','#dbe4f0'], '#111827','#4b5563','#0f766e','Inter',600,14,3.4,'normal','medium'),
  dark: theme('dark', ['#0b1220','#172033'], '#f9fafb','#cbd5e1','#2dd4bf','Inter',400,8,3.1,'slow','subtle'),
  bold: theme('bold', ['#6d28d9','#ea3788'], '#ffffff','#f5d0fe','#facc15','Space Grotesk',700,24,4.2,'fast','strong'),
});
export function diffThemes(a, b, prefix = '') {
  return Object.keys(a).flatMap(k => {
    const p = prefix ? `${prefix}.${k}` : k;
    return a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? diffThemes(a[k], b?.[k] ?? {}, p)
      : JSON.stringify(a[k]) === JSON.stringify(b?.[k]) ? [] : [p];
  });
}
