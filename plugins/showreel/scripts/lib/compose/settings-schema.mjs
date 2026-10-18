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
const labelFor = path => path.split('.').map(s => s.replace(/([a-z])([A-Z])/g, '$1 $2')).join(' › ');
export const SETTINGS = Object.entries(compositionPaths({})).filter(([path]) => !excluded.has(path)).map(([path,value]) => {
  const group = /^(frame\.|theme$)/.test(path) ? 'look' : path.split('.')[0];
  const options = SETTING_ENUMS[path];
  const range = SETTING_RANGES[path];
  const control = options ? 'select' : range ? 'number' : typeof value === 'boolean' ? 'toggle'
    : path.endsWith('.colors') ? 'gradient' : path.endsWith('.image') ? 'image'
      : /(?:color|Color|fill|stroke|captions.background)$/.test(path) ? 'color' : 'text';
  return { path, group, label: labelFor(path),
    help: path === 'zoom.depth' ? 'Zoom factor from 1.05 to 4; also accepts subtle, medium or strong.'
      : path === 'zoom.onlyKinds' ? 'JSON array containing click and/or fill.'
        : `Set ${labelFor(path).toLowerCase()}.${path.endsWith('Pct') ? ' Measured as a percentage.' : path.endsWith('Sec') ? ' Measured in seconds.' : ''}`,
    control, ...(range ?? {}), ...(options ? { options } : {}),
    advanced: /custom|hotspot|followThrough|pressScale|microCorrection|paddingPct/.test(path),
  };
});
const byPath = new Map(SETTINGS.map(s => [s.path,s]));
export const settingFor = path => byPath.get(path);
