function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
export const THEMES = freeze({
  clean: {
    name: 'clean', background: { type: 'gradient', angle: 135, colors: ['#eef2f7', '#dbe4f0'] },
    frame: { radiusPx: 14, shadow: { blurPx: 40, offsetYPx: 16, color: 'rgba(17,24,39,0.22)' } },
    cursor: { fill: '#ffffff', stroke: '#111827' }, ripple: { color: '#0f766e' },
    caption: { background: 'rgba(17,24,39,0.86)', color: '#ffffff', fontWeight: 600 },
    card: { background: { type: 'gradient', colors: ['#eef2f7', '#dbe4f0'] }, titleColor: '#111827', subtitleColor: '#4b5563', accent: '#0f766e' }, font: 'Inter',
  },
  dark: {
    name: 'dark', background: { type: 'gradient', angle: 135, colors: ['#0b1220', '#172033'] },
    frame: { radiusPx: 14, shadow: { blurPx: 40, offsetYPx: 16, color: 'rgba(0,0,0,0.45)' } },
    cursor: { fill: '#ffffff', stroke: '#111827' }, ripple: { color: '#2dd4bf' },
    caption: { background: 'rgba(255,255,255,0.14)', color: '#ffffff', fontWeight: 600 },
    card: { background: { type: 'gradient', colors: ['#0b1220', '#172033'] }, titleColor: '#f9fafb', subtitleColor: '#cbd5e1', accent: '#2dd4bf' }, font: 'Inter',
  },
});
