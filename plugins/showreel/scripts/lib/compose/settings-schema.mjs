import { compositionPaths, SETTING_RANGES, SETTING_ENUMS } from './composition.mjs';

export const SETTINGS_VERSION = 1;
export const EXCLUDED = [
  { path: 'version', reason: 'Composition format version; managed by Showreel.' },
  { path: 'run.id', reason: 'Recording identity; selected when opening the project.' },
  { path: 'edits.trims', reason: 'Edited on the timeline.' },
  { path: 'edits.speeds', reason: 'Edited on the timeline.' },
  { path: 'zoom.regions', reason: 'Edited on the timeline and preview.' },
  { path: 'captions.cues', reason: 'Source-time caption overrides edited on the timeline.' },
  { path: 'cursor.custom', reason: 'Container; use the individual image and hotspot settings.' },
  ...['arrow','hand','text'].flatMap(shape => ['', '.hotspot'].map(suffix => ({
    path: `cursor.custom.${shape}${suffix}`, reason: 'Container; use the individual image and hotspot settings.',
  }))),
  ...['title','outro'].map(k => ({ path: `cards.${k}.logo`, reason: 'Container; use logo image and height settings.' })),
];
const excluded = new Set(EXCLUDED.map(s => s.path));
const names = {
  theme: 'Theme', width: 'Width', height: 'Height', fps: 'Frame rate', quality: 'Quality',
  paddingXPct: 'Horizontal padding', paddingYPct: 'Vertical padding', paddingPct: 'Padding on both axes', radiusPx: 'Corner radius',
  enabled: 'Enabled', blurPx: 'Blur', offsetYPx: 'Vertical offset', opacity: 'Opacity', color: 'Colour', widthPx: 'Width',
  type: 'Style', colors: 'Gradient colours', angle: 'Gradient angle', image: 'Image', visible: 'Show cursor', style: 'Style',
  sizePct: 'Cursor size', fill: 'Fill colour', stroke: 'Outline colour', shadow: 'Show cursor shadow', scaleWithZoom: 'Scale with zoom',
  hideWhenIdleSec: 'Hide after idle', pressScale: 'Size while pressed', autoShape: 'Match cursor to target', distancePx: 'Travel distance',
  durationSec: 'Duration', startAfterClickSec: 'Delay after click', microCorrection: 'Subtle cursor correction', entrance: 'Animate cursor entrance',
  sizeMult: 'Effect size', depth: 'Zoom depth', autoSuggest: 'Suggest zoom regions', speed: 'Camera movement', holdAfterClickSec: 'Hold after click',
  leadInSec: 'Delay before zoom', onlyKinds: 'Zoom trigger types', mode: 'Caption layout', position: 'Caption position', bandHeightPct: 'Caption band height',
  fontSizePct: 'Text size', fontWeight: 'Text weight', background: 'Background colour', maxLines: 'Maximum lines', align: 'Text alignment',
  title: 'Title text', text: 'Outro text', subtitle: 'Subtitle text', titleSizePct: 'Title size', subtitleSizePct: 'Subtitle size',
  titleColor: 'Title colour', subtitleColor: 'Subtitle colour', shape: 'Accent shape', widthPct: 'Accent width', heightPct: 'Height', fade: 'Transition duration', transition: 'Transition style',
  x: 'Horizontal hotspot', y: 'Vertical hotspot',
};
const sections = { shadow: 'Frame shadow', border: 'Frame border', background: 'Background', followThrough: 'Cursor follow through',
  clickEffect: 'Click effect', accent: 'Accent', logo: 'Logo', arrow: 'Arrow cursor', hand: 'Hand cursor', text: 'Text cursor' };
const labelFor = path => {
  const parts = path.split('.'), leaf = parts.at(-1), parent = parts.at(-2);
  if (parent === 'hotspot') return `${sections[parts.at(-3)]} ${names[leaf].toLowerCase()}`;
  if (leaf === 'enabled') return ({ zoom: 'Enable zoom', captions: 'Show captions', title: 'Show title card', outro: 'Show outro card',
    shadow: 'Show frame shadow', border: 'Show frame border', followThrough: 'Enable follow through', accent: 'Show accent' })[parent];
  if (path === 'cursor.clickEffect.sizeMult') return 'Click effect size';
  if (path === 'cursor.custom.heightPct') return 'Custom cursor height';
  if (path === 'cursor.style') return 'Cursor style';
  if (path === 'cursor.clickEffect.style') return 'Show click effect';
  const prefix = sections[parent];
  return prefix && ['style','color','widthPx','type','colors','angle','image','durationSec','sizeMult','heightPct','x','y'].includes(leaf)
    ? `${prefix} ${names[leaf].toLowerCase()}` : names[leaf];
};
const unitFor = path => /Pct$/.test(path) ? '%' : /Px$|output\.(width|height)$/.test(path) ? 'px'
  : /Sec$|cards.fade$/.test(path) ? 's' : /Mult$|pressScale$|zoom.depth$/.test(path) ? 'x' : undefined;
const helpFor = (path,label) => ({
  'zoom.onlyKinds': 'Enter a JSON list of click and fill actions that should trigger a suggested zoom.',
  'zoom.depth': 'Choose how much to magnify the recording during a zoom region.',
  'frame.paddingXPct': 'Set the space on the left and right as a percentage of the output width.',
  'frame.paddingYPct': 'Set the space above and below as a percentage of the output height.',
  'cursor.clickEffect.style': 'Choose a ripple or pulse to highlight clicks, or none to hide the effect.',
  'cursor.hideWhenIdleSec': 'Hide the cursor after this many seconds without movement.',
  'zoom.autoSuggest': 'Generate zoom regions from recorded clicks and typing when no regions are saved.',
}[path] ?? (unitFor(path) === '%' ? `Adjust ${label.toLowerCase()} as a percentage of the containing frame.`
  : unitFor(path) === 's' ? `Set ${label.toLowerCase()} in seconds.`
  : unitFor(path) === 'px' ? `Set ${label.toLowerCase()} in output pixels.`
  : unitFor(path) === 'x' ? `Set the multiplier for ${label.toLowerCase()}.`
  : `Choose ${label.toLowerCase()} for the ${path.startsWith('cards.title') ? 'title card' : path.startsWith('cards.outro') ? 'outro card' : path.split('.')[0] === 'frame' ? 'video frame' : path.split('.')[0]} settings.`));
export const SETTINGS = Object.entries(compositionPaths({})).filter(([path]) => !excluded.has(path)).map(([path,value]) => {
  const group = /^(frame\.|theme$)/.test(path) ? 'look' : path.split('.')[0];
  const options = SETTING_ENUMS[path];
  const range = SETTING_RANGES[path];
  const control = options ? 'select' : range ? 'number' : typeof value === 'boolean' ? 'toggle'
    : path.endsWith('.colors') ? 'gradient' : path.endsWith('.image') ? 'image'
      : /(?:color|Color|fill|stroke|captions.background)$/.test(path) ? 'color' : 'text';
  return { path, group, section: path.startsWith('cards.') ? `${path.split('.')[1]} card · ${sections[path.split('.')[2]] ?? 'Text and timing'}` : sections[path.split('.')[1]] ?? 'General', label: labelFor(path),
    help: helpFor(path, labelFor(path)), unit: unitFor(path),
    control, ...(range ?? {}), ...(options ? { options } : {}),
    advanced: /custom|hotspot|followThrough|pressScale|microCorrection|paddingPct/.test(path),
  };
});
const byPath = new Map(SETTINGS.map(s => [s.path,s]));
export const settingFor = path => byPath.get(path);
