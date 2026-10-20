// Output size presets for the Export settings panel and the export dialog. Pure: no DOM.
import { presetOutput } from '../scripts/lib/compose/layout.mjs';

export const SIZE_PRESETS = [
  { id: '720', label: '720p', hint: 'Small and quick' },
  { id: '1080', label: '1080p', hint: 'Full HD, the usual choice' },
  { id: '1440', label: '1440p', hint: 'Sharper on large screens' },
  { id: '4k', label: '4K', hint: 'Largest file' },
];
// landscape, vertical or square: the saved format, or whatever the width and height imply.
export const orientationOf = output => output?.preset ?? (output?.height > output?.width ? 'vertical' : output?.height === output?.width ? 'square' : 'landscape');
export function sizeForPreset(id, output) {
  const { width, height } = presetOutput(orientationOf(output), id);
  return { width, height };
}
// The preset id matching the saved width and height exactly, or 'custom'.
export function presetForSize(output) {
  const orientation = orientationOf(output);
  return SIZE_PRESETS.find(p => { const s = presetOutput(orientation, p.id); return s.width === output.width && s.height === output.height; })?.id ?? 'custom';
}
export const sizeLabel = output => `${output.width} × ${output.height}`;
