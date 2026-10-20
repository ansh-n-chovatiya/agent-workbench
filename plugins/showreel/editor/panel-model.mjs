// Curation of the topic panels: which settings are primary, which sit under Advanced, and how each card is titled.
// Pure data; a test keeps every schema path reachable exactly once.
import { VOICE_PANEL_PATHS, MUSIC_PANEL_PATHS } from './voice-status.mjs';

export const PANEL_META = {
  zoom: { title: 'Zoom', subtitle: 'How the camera moves in closer' },
  cursor: { title: 'Cursor', subtitle: 'The pointer and its clicks' },
  appearance: { title: 'Appearance', subtitle: 'Theme, background, frame and cards' },
  captions: { title: 'Captions', subtitle: 'Step text shown on the video' },
  audio: { title: 'Audio', subtitle: 'Voice-over and background music' },
  brand: { title: 'Brand', subtitle: 'Logo, colours, fonts and watermark' },
  output: { title: 'Export settings', subtitle: 'Size, frame rate and quality' },
};
// Shorter labels inside their card; the schema label stays the long, searchable one.
export const LABELS = {
  'zoom.enabled': 'Show zooms', 'zoom.autoSuggest': 'Auto zoom', 'zoom.depth': 'Default depth', 'zoom.speed': 'Camera speed', 'zoom.onlyKinds': 'Triggers',
  'zoom.holdAfterClickSec': 'Hold after click', 'zoom.leadInSec': 'Lead-in',
  'cursor.visible': 'Show pointer', 'cursor.style': 'Style', 'cursor.fill': 'Fill', 'cursor.stroke': 'Outline', 'cursor.shadow': 'Shadow',
  'cursor.scaleWithZoom': 'Scale with zoom', 'cursor.hideWhenIdleSec': 'Hide when idle', 'cursor.autoShape': 'Match target shape', 'cursor.entrance': 'Entrance animation',
  'cursor.pressScale': 'Size while pressed', 'cursor.microCorrection': 'Natural micro-moves',
  'cursor.clickEffect.style': 'Effect', 'cursor.clickEffect.color': 'Colour', 'cursor.clickEffect.sizeMult': 'Size', 'cursor.clickEffect.durationSec': 'Duration',
  'cursor.followThrough.enabled': 'Glide after clicks', 'cursor.followThrough.distancePx': 'Distance', 'cursor.followThrough.durationSec': 'Duration', 'cursor.followThrough.startAfterClickSec': 'Delay',
  'cursor.custom.heightPct': 'Image height',
  ...Object.fromEntries(['arrow', 'hand', 'text'].flatMap(shape => {
    const name = shape[0].toUpperCase() + shape.slice(1);
    return [[`cursor.custom.${shape}.image`, `${name} image`], [`cursor.custom.${shape}.hotspot.x`, `${name} hotspot across`], [`cursor.custom.${shape}.hotspot.y`, `${name} hotspot down`]];
  })),
  'frame.paddingXPct': 'Side padding', 'frame.paddingYPct': 'Top and bottom padding', 'frame.radiusPx': 'Corner radius', 'frame.shadow.enabled': 'Shadow',
  'frame.shadow.blurPx': 'Shadow softness', 'frame.shadow.offsetYPx': 'Shadow offset', 'frame.shadow.opacity': 'Shadow strength',
  'frame.border.enabled': 'Border', 'frame.border.color': 'Border colour', 'frame.border.widthPx': 'Border width', 'frame.paddingPct': 'Padding on all sides', 'frame.background.type': 'Background',
  'captions.enabled': 'Show captions', 'captions.mode': 'Layout', 'captions.position': 'Position', 'captions.fontSizePct': 'Text size', 'captions.color': 'Text colour', 'captions.background': 'Background',
  'captions.bandHeightPct': 'Band height', 'captions.fontWeight': 'Weight', 'captions.maxLines': 'Max lines', 'captions.align': 'Alignment',
  ...Object.fromEntries(['title', 'outro'].flatMap(card => [[`cards.${card}.enabled`, card === 'title' ? 'Show intro card' : 'Show outro card'], [`cards.${card}.${card === 'title' ? 'title' : 'text'}`, card === 'title' ? 'Title' : 'Message'],
    [`cards.${card}.subtitle`, 'Subtitle'], [`cards.${card}.durationSec`, 'Duration'], [`cards.${card}.align`, 'Alignment'], [`cards.${card}.titleSizePct`, 'Title size'], [`cards.${card}.subtitleSizePct`, 'Subtitle size'],
    [`cards.${card}.titleColor`, 'Title colour'], [`cards.${card}.subtitleColor`, 'Subtitle colour'], [`cards.${card}.background.type`, 'Background'], [`cards.${card}.accent.enabled`, 'Accent mark'],
    [`cards.${card}.accent.color`, 'Accent colour'], [`cards.${card}.accent.shape`, 'Accent shape'], [`cards.${card}.accent.widthPct`, 'Accent width'], [`cards.${card}.logo.image`, 'Logo'], [`cards.${card}.logo.heightPct`, 'Logo height']])),
  'cards.fade': 'Fade duration', 'cards.transition': 'Transition',
  'output.fps': 'Frame rate', 'output.quality': 'Quality', 'output.width': 'Width', 'output.height': 'Height',
};
// Paths folded into another path's control: the gradient, solid colour and image live inside the Background control.
export const ABSORBED = Object.fromEntries(['frame.background', 'cards.title.background', 'cards.outro.background'].flatMap(base => ['colors', 'angle', 'image'].map(leaf => [`${base}.${leaf}`, `${base}.type`])));
// Control overrides where the schema's generic control is the wrong tool.
export const CONTROLS = { 'zoom.onlyKinds': 'chips', 'zoom.depth': 'depth', 'frame.background.type': 'background', 'cards.title.background.type': 'background', 'cards.outro.background.type': 'background',
  'output.width': 'stepper', 'output.height': 'stepper' };
export const CHIP_OPTIONS = { 'zoom.onlyKinds': [{ value: 'click', label: 'Clicks' }, { value: 'fill', label: 'Typing' }] };
const OPTION_LABELS = { 'captions.mode': { band: 'Band', overlay: 'On video' }, 'captions.fontWeight': { 400: 'Regular', 600: 'Semibold', 700: 'Bold' }, 'output.fps': { 30: '30 fps', 60: '60 fps' },
  'cards.transition': { crossfade: 'Crossfade', cut: 'Cut' }, 'captions.align': { center: 'Centre', left: 'Left' }, 'cards.title.align': { center: 'Centre', left: 'Left' }, 'cards.outro.align': { center: 'Centre', left: 'Left' } };
export const optionLabel = (path, value) => OPTION_LABELS[path]?.[value] ?? String(value).replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

const cardStyle = card => [`cards.${card}.align`, `cards.${card}.titleSizePct`, `cards.${card}.subtitleSizePct`, `cards.${card}.titleColor`, `cards.${card}.subtitleColor`, `cards.${card}.background.type`,
  `cards.${card}.accent.enabled`, `cards.${card}.accent.color`, `cards.${card}.accent.shape`, `cards.${card}.accent.widthPct`, `cards.${card}.logo.image`, `cards.${card}.logo.heightPct`];
export const TOPIC_CARDS = {
  zoom: [
    { id: 'auto-zoom', title: 'Auto zoom', icon: 'ZoomIn', description: 'Zooms follow clicks and typing', primary: ['zoom.enabled', 'zoom.autoSuggest', 'zoom.depth', 'zoom.speed', 'zoom.onlyKinds'] },
    { id: 'zoom-timing', title: 'Timing', icon: 'Timer', advanced: ['zoom.holdAfterClickSec', 'zoom.leadInSec'] },
  ],
  cursor: [
    { id: 'pointer', title: 'Pointer', icon: 'MousePointer2', primary: ['cursor.visible', 'cursor.style', 'cursor.sizePct', 'cursor.fill', 'cursor.stroke', 'cursor.shadow'],
      advanced: ['cursor.scaleWithZoom', 'cursor.autoShape', 'cursor.hideWhenIdleSec', 'cursor.pressScale', 'cursor.entrance', 'cursor.microCorrection'] },
    { id: 'click-effect', title: 'Click effect', icon: 'CircleDot', description: 'Highlight every click', primary: ['cursor.clickEffect.style', 'cursor.clickEffect.color', 'cursor.clickEffect.sizeMult'], advanced: ['cursor.clickEffect.durationSec'] },
    { id: 'motion-after-clicks', title: 'Motion after clicks', icon: 'Move', advanced: ['cursor.followThrough.enabled', 'cursor.followThrough.distancePx', 'cursor.followThrough.durationSec', 'cursor.followThrough.startAfterClickSec'] },
    { id: 'custom-pointer', title: 'Custom pointer images', icon: 'ImagePlus', advanced: ['cursor.custom.heightPct', ...['arrow', 'hand', 'text'].flatMap(s => [`cursor.custom.${s}.image`, `cursor.custom.${s}.hotspot.x`, `cursor.custom.${s}.hotspot.y`])] },
  ],
  appearance: [
    { id: 'theme', title: 'Theme', icon: 'Palette', description: 'See this moment in another look', special: 'theme' },
    { id: 'background', title: 'Background', icon: 'Image', primary: ['frame.background.type'] },
    { id: 'frame', title: 'Frame', icon: 'Frame', description: 'The recording inside the video', primary: ['frame.paddingXPct', 'frame.paddingYPct', 'frame.radiusPx', 'frame.shadow.enabled'],
      advanced: ['frame.shadow.blurPx', 'frame.shadow.offsetYPx', 'frame.shadow.opacity', 'frame.border.enabled', 'frame.border.color', 'frame.border.widthPx', 'frame.paddingPct'] },
    { id: 'intro', title: 'Intro card', icon: 'Clapperboard', primary: ['cards.title.enabled', 'cards.title.title', 'cards.title.subtitle', 'cards.title.durationSec'], advanced: cardStyle('title') },
    { id: 'outro', title: 'Outro card', icon: 'Flag', primary: ['cards.outro.enabled', 'cards.outro.text', 'cards.outro.subtitle', 'cards.outro.durationSec'], advanced: cardStyle('outro') },
    { id: 'transitions', title: 'Transitions', icon: 'Blend', advanced: ['cards.transition', 'cards.fade'] },
  ],
  captions: [
    { id: 'captions', title: 'Captions', icon: 'Captions', primary: ['captions.enabled', 'captions.mode', 'captions.position', 'captions.fontSizePct'], advanced: ['captions.bandHeightPct', 'captions.maxLines'] },
    { id: 'caption-style', title: 'Text style', icon: 'Type', primary: ['captions.color', 'captions.background'], advanced: ['captions.fontWeight', 'captions.align'] },
  ],
  audio: [
    { id: 'narrator', title: 'Narrator', icon: 'Mic', tab: 'voice', primary: VOICE_PANEL_PATHS.slice(0, 5), advanced: VOICE_PANEL_PATHS.slice(5) },
    { id: 'script', title: 'Script', icon: 'MessageSquareText', tab: 'voice', special: 'script' },
    { id: 'music', title: 'Background music', icon: 'Music', tab: 'music', primary: MUSIC_PANEL_PATHS.music.slice(0, 3), advanced: MUSIC_PANEL_PATHS.music.slice(3) },
    { id: 'ducking', title: 'Music under the voice', icon: 'AudioLines', tab: 'music', primary: MUSIC_PANEL_PATHS.ducking, advanced: MUSIC_PANEL_PATHS.advanced },
    { id: 'loudness', title: 'Loudness', icon: 'Gauge', tab: 'music', primary: MUSIC_PANEL_PATHS.loudness.slice(0, 2), advanced: MUSIC_PANEL_PATHS.loudness.slice(2) },
  ],
  brand: [
    { id: 'brand', title: 'Brand', icon: 'BadgeCheck', special: 'brand' },
    { id: 'watermark', title: 'Watermark', icon: 'Droplet', special: 'watermark' },
  ],
  output: [
    { id: 'recording', title: 'Recording', icon: 'Film', special: 'recording' },
    { id: 'output', title: 'Output', icon: 'Monitor', special: 'size', primary: ['output.fps', 'output.quality'], advanced: ['output.width', 'output.height'] },
  ],
};
export const cardPaths = card => [...(card.primary ?? []), ...(card.advanced ?? [])];
// Where a path lives: its topic, card and whether it is under Advanced. Absorbed paths resolve to their host control.
export function locate(path) {
  const host = ABSORBED[path] ?? path;
  for (const [topic, cards] of Object.entries(TOPIC_CARDS)) for (const card of cards) {
    if (card.primary?.includes(host)) return { topic, card, advanced: false, host };
    if (card.advanced?.includes(host)) return { topic, card, advanced: true, host };
  }
  return null;
}
// Settings that are not schema paths but still deserve a search result (they open their panel).
export const VIRTUAL_ENTRIES = [
  { path: 'theme', label: 'Theme', help: 'Choose the clean, dark or bold look for the whole video.', keywords: 'style colours look clean dark bold', topic: 'appearance', card: 'theme' },
  { path: 'brand', label: 'Applied brand', help: 'Use a saved logo, colours, fonts and watermark for this project.', keywords: 'logo kit colours fonts', topic: 'brand', card: 'brand' },
  { path: 'watermark.enabled', label: 'Show watermark', help: 'Place the brand logo in a corner of the video.', keywords: 'logo corner brand', topic: 'brand', card: 'watermark' },
  { path: 'watermark.position', label: 'Watermark position', help: 'Which corner holds the watermark.', keywords: 'corner', topic: 'brand', card: 'watermark' },
  { path: 'watermark.opacity', label: 'Watermark opacity', help: 'How see-through the watermark is.', keywords: 'transparent', topic: 'brand', card: 'watermark' },
  { path: 'watermark.sizePct', label: 'Watermark size', help: 'How large the watermark appears.', keywords: 'logo', topic: 'brand', card: 'watermark' },
  { path: 'output.size', label: 'Output size', help: '720p, 1080p, 1440p or 4K.', keywords: 'resolution width height 720p 1080p 1440p 4k', topic: 'output', card: 'output' },
  { path: 'output.preset', label: 'Format', help: 'Landscape, vertical or square. Switch it in the top bar.', keywords: 'orientation landscape vertical square aspect', topic: 'output', card: 'output' },
];
export const SEARCH_SUGGESTIONS = ['Default depth', 'Cursor size', 'Background music'];
