import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const bundleInputs = [
  'scripts/lib/record/encoder-page.js', 'scripts/build.mjs', 'scripts/lib/record/bundle-hash.mjs',
  'package.json', 'package-lock.json',
];

export const renderBundleInputs = [...bundleInputs,
  'scripts/lib/compose/easing.mjs',
  'scripts/lib/compose/render-page.js', 'scripts/lib/compose/draw.js',
  'scripts/lib/audio/decode.js', ...['loudness', 'duck', 'mix', 'retime'].map((name) => `scripts/lib/audio/${name}.mjs`),
  ...['timemap', 'scene-timemap', 'zoom', 'camera', 'cursor-track', 'cursor-director', 'custom-cursor', 'captions', 'themes', 'layout', 'composition', 'plan']
    .map((name) => `scripts/lib/compose/${name}.mjs`),
];
export const encoderHash = (root = new URL('../../../', import.meta.url)) => hashInputs(bundleInputs, root);
export const renderHash = (root = new URL('../../../', import.meta.url)) => hashInputs(renderBundleInputs, root);
export const editorBundleInputs = [...renderBundleInputs, ...['main.jsx', 'index.html', 'editor.css', 'styles.css', 'layout.mjs', 'App.jsx', 'Preview.jsx', 'Settings.jsx', 'TopBar.jsx', 'ExportDialog.jsx', 'state.js', 'frames.js', 'playback.mjs', 'helpers.mjs', 'Timeline.jsx', 'timeline-model.mjs', 'timeline.css', 'clips.mjs', 'zoom-box.mjs', 'ClipPanel.jsx', 'ZoomPanel.jsx', 'ZoomBox.jsx', 'zoom-screen.mjs', 'Rail.jsx', 'rail-model.mjs', 'edit-ops.mjs', 'panel-model.mjs', 'search-model.mjs', 'size-presets.mjs', 'gradient-presets.mjs', 'panels/icons.js', 'panels/InfoTip.jsx', 'panels/EmptyState.jsx', 'panels/Chips.jsx', 'panels/Rows.jsx', 'panels/SettingsCard.jsx', 'panels/ColorSwatch.jsx', 'panels/GradientPicker.jsx', 'panels/ImagePicker.jsx', 'panels/PanelShell.jsx', 'panels/SettingRow.jsx', 'panels/TopicPanel.jsx', 'panels/SearchResults.jsx', 'VoicePanel.jsx', 'MusicPanel.jsx', 'Recorder.jsx', 'voice-controller.js', 'use-controller.js', 'audio-preview.js', 'audio-wav.js', 'audio-view.mjs', 'voice-status.mjs', 'ThemeCards.jsx', 'theme-preview.mjs', 'BrandPanel.jsx', 'brand-model.mjs', 'ScenesStrip.jsx', 'scenes-api.js', 'timeline/zoom-geometry.mjs', 'timeline/context-menu.mjs', 'timeline/thumbnails.mjs', 'timeline/ContextMenu.jsx', 'timeline/Filmstrip.jsx'].map(name => `editor/${name}`), 'scripts/lib/compose/settings-schema.mjs', 'scripts/lib/voice/narration.mjs', 'scripts/lib/voice/pins.mjs', ...['cn.js','button.jsx','input.jsx','label.jsx','select.jsx','checkbox.jsx','switch.jsx','slider.jsx','tabs.jsx','dialog.jsx','popover.jsx','tooltip.jsx','badge.jsx','separator.jsx','toggle-group.jsx'].map(name => `editor/ui/${name}`)];
export const editorHash = (root = new URL('../../../', import.meta.url)) => hashInputs(editorBundleInputs, root);
export const auditBundleInputs = [...renderBundleInputs, 'scripts/audit/audit-page.js', 'scripts/audit/checks.mjs', 'scripts/lib/mp4-boxes.mjs', 'scripts/lib/voice/trim.mjs'];
export const auditHash = (root = new URL('../../../', import.meta.url)) => hashInputs(auditBundleInputs, root);
async function hashInputs(inputs, root) {
  const hash = createHash('sha256');
  for (const name of inputs) {
    hash.update(name + '\0');
    // Line endings are normalised: Git for Windows checks files out with CRLF, which would change the hash of identical sources.
    hash.update((await readFile(new URL(name, root), 'utf8')).replace(/\r\n/g, '\n'));
    hash.update('\0');
  }
  return hash.digest('hex');
}
