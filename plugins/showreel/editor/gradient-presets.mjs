// Gradient presets behind the visual gradient picker. Pure: no DOM.
export const GRADIENT_PRESETS = [
  { id: 'mist', name: 'Mist', colors: ['#eef2f7', '#dbe4f0'], angle: 135 },
  { id: 'midnight', name: 'Midnight', colors: ['#0b1220', '#172033'], angle: 135 },
  { id: 'berry', name: 'Berry', colors: ['#6d28d9', '#ea3788'], angle: 135 },
  { id: 'sunset', name: 'Sunset', colors: ['#f97316', '#db2777'], angle: 120 },
  { id: 'ocean', name: 'Ocean', colors: ['#0ea5e9', '#1e3a8a'], angle: 160 },
  { id: 'forest', name: 'Forest', colors: ['#14b8a6', '#134e4a'], angle: 145 },
  { id: 'peach', name: 'Peach', colors: ['#fde68a', '#fca5a5'], angle: 135 },
  { id: 'graphite', name: 'Graphite', colors: ['#3f3f46', '#18181b'], angle: 180 },
];
export const MIN_STOPS = 2, MAX_STOPS = 4;
export const gradientCss = (colors = [], angle = 135) => colors.length > 1 ? `linear-gradient(${angle}deg, ${colors.join(', ')})` : colors[0] ?? 'transparent';
export function matchGradientPreset(colors, angle) {
  if (!Array.isArray(colors)) return 'custom';
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  return GRADIENT_PRESETS.find(p => p.angle === angle && p.colors.length === colors.length && p.colors.every((c, i) => same(c, colors[i])))?.id ?? 'custom';
}
export const addStop = colors => colors.length >= MAX_STOPS ? colors : [...colors, colors.at(-1) ?? '#ffffff'];
export const removeStop = (colors, index) => colors.length <= MIN_STOPS ? colors : colors.filter((_, i) => i !== index);
export const COLOR_PRESETS = [
  ['White', '#ffffff'], ['Black', '#000000'], ['Ink', '#111827'], ['Slate', '#64748b'], ['Teal', '#0f766e'], ['Mint', '#2dd4bf'],
  ['Blue', '#2563eb'], ['Violet', '#7c3aed'], ['Pink', '#ec4899'], ['Red', '#dc2626'], ['Amber', '#f59e0b'], ['Yellow', '#facc15'],
].map(([name, hex]) => ({ name, hex }));
export const isHex = value => /^#[\da-f]{6}$/i.test(String(value ?? ''));
