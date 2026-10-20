import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SETTINGS, settingFor } from '../scripts/lib/compose/settings-schema.mjs';
import { presetOutput, sizeKeyFor, OUTPUT_SIZES } from '../scripts/lib/compose/layout.mjs';
import { resolveComposition } from '../scripts/lib/compose/composition.mjs';
import { RAIL_TOPICS } from '../editor/rail-model.mjs';
import { TOPIC_CARDS, ABSORBED, CONTROLS, LABELS, CHIP_OPTIONS, VIRTUAL_ENTRIES, PANEL_META, SEARCH_SUGGESTIONS, cardPaths, locate, optionLabel } from '../editor/panel-model.mjs';
import { buildSearchIndex, searchSettings, highlightSegments, tokenize } from '../editor/search-model.mjs';
import { GRADIENT_PRESETS, COLOR_PRESETS, matchGradientPreset, gradientCss, addStop, removeStop, MIN_STOPS, MAX_STOPS, isHex } from '../editor/gradient-presets.mjs';
import { SIZE_PRESETS, presetForSize, sizeForPreset, orientationOf, sizeLabel } from '../editor/size-presets.mjs';
import * as icons from '../editor/panels/icons.js';

test('every schema setting lives in exactly one card (or is absorbed by one), nothing is listed twice', () => {
  const seen = new Map();
  for (const [topic, cards] of Object.entries(TOPIC_CARDS)) for (const card of cards) {
    assert.ok(card.id && card.title && icons[card.icon], `${topic}/${card.id} needs an id, title and a known icon`);
    assert.equal(card.title, card.title[0].toUpperCase() + card.title.slice(1), 'sentence case');
    assert.notEqual(card.title, card.title.toUpperCase());
    if (card.description) assert.ok(card.description.length <= 60, `${card.id} description over 60 chars`);
    for (const path of cardPaths(card)) { assert.ok(settingFor(path), `${path} is not a schema path`); assert.ok(!seen.has(path), `${path} listed twice (${seen.get(path)} and ${card.id})`); seen.set(path, card.id); }
    assert.ok((card.primary?.length ?? 0) <= 7, `${card.id} has more than 7 primary settings`);
  }
  for (const [path, host] of Object.entries(ABSORBED)) { assert.ok(settingFor(path), path); assert.ok(seen.has(host), `${path} absorbed by unlisted ${host}`); assert.ok(!seen.has(path)); }
  for (const s of SETTINGS) if (s.path !== 'theme') assert.ok(seen.has(s.path) || ABSORBED[s.path], `${s.path} is unreachable in the panels`);
  for (const path of Object.keys(LABELS)) assert.ok(settingFor(path), `label for unknown path ${path}`);
  for (const path of Object.keys(CONTROLS)) assert.ok(settingFor(path), path);
  for (const [path, options] of Object.entries(CHIP_OPTIONS)) assert.deepEqual(options.map(o => o.value).sort(), ['click', 'fill'], path);
  for (const topic of RAIL_TOPICS) { assert.ok(TOPIC_CARDS[topic.id], topic.id); assert.ok(PANEL_META[topic.id]?.subtitle, topic.id); assert.ok(icons[topic.icon], topic.icon); }
  assert.ok(!RAIL_TOPICS.some(t => /overlay/i.test(t.label)), 'overlays were removed from the product');
  assert.ok(!Object.values(TOPIC_CARDS).flat().some(c => /overlay/i.test(c.title)));
});
test('locate finds the topic, card and Advanced placement; option labels avoid raw enum values', () => {
  assert.deepEqual({ ...locate('zoom.onlyKinds'), card: locate('zoom.onlyKinds').card.id }, { topic: 'zoom', card: 'auto-zoom', advanced: false, host: 'zoom.onlyKinds' });
  assert.equal(locate('cursor.followThrough.distancePx').advanced, true);
  assert.equal(locate('frame.background.angle').host, 'frame.background.type');
  assert.equal(locate('audio.music.duck.attackMs').card.tab, 'music');
  assert.equal(locate('theme'), null);
  assert.equal(optionLabel('captions.mode', 'overlay'), 'On video');
  assert.equal(optionLabel('captions.fontWeight', 600), 'Semibold');
  assert.equal(optionLabel('cursor.style', 'crosshair'), 'Crosshair');
  assert.equal(optionLabel('output.fps', 60), '60 fps');
});
test('search index covers every reachable setting and the virtual brand, theme and size entries', () => {
  const index = buildSearchIndex();
  const paths = new Set(index.map(e => e.path));
  for (const s of SETTINGS) if (s.path !== 'theme') assert.ok(paths.has(s.path), s.path);
  for (const v of VIRTUAL_ENTRIES) { const entry = index.find(e => e.path === v.path); assert.ok(entry); assert.equal(entry.renderable, false); assert.ok(entry.cardTitle); }
  for (const entry of index) { assert.ok(RAIL_TOPICS.some(t => t.id === entry.topic), entry.path); assert.ok(entry.topicLabel && entry.label && entry.host); }
  assert.equal(index.find(e => e.path === 'frame.background.colors').renderable, false, 'absorbed paths render through their host');
  assert.equal(index.find(e => e.path === 'audio.voice.gainDb').tab, 'voice');
});
test('search ranks label matches first, groups by rail order, dedupes absorbed paths and highlights both spellings', () => {
  const index = buildSearchIndex();
  const typing = searchSettings(index, 'typing');
  assert.equal(typing.groups[0].items[0].entry.path, 'zoom.onlyKinds');
  const colour = searchSettings(index, 'colour'), color = searchSettings(index, 'color');
  assert.equal(colour.total, color.total); assert.ok(colour.total >= 10);
  assert.deepEqual(colour.groups.map(g => g.topic), RAIL_TOPICS.map(t => t.id).filter(id => colour.groups.some(g => g.topic === id)));
  const gradient = searchSettings(index, 'gradient');
  const hosts = gradient.groups.flatMap(g => g.items.map(i => `${i.entry.topic}:${i.entry.host}`));
  assert.equal(new Set(hosts).size, hosts.length, 'one row per control');
  assert.ok(gradient.groups.flatMap(g => g.items).some(i => i.entry.host === 'frame.background.type'));
  assert.equal(searchSettings(index, '   ').total, 0);
  assert.equal(searchSettings(index, 'xyzzy-nothing').total, 0);
  const multi = searchSettings(index, 'cursor size');
  assert.equal(multi.groups[0].items[0].entry.path, 'cursor.sizePct');
  assert.ok(searchSettings(index, 'watermark').groups.some(g => g.topic === 'brand'));
  assert.ok(searchSettings(index, '720p').groups.some(g => g.items.some(i => i.entry.path === 'output.size')));
  assert.deepEqual(tokenize('  Cursor   COLOUR '), ['cursor', 'color']);
  assert.deepEqual(highlightSegments('Click effect colour', tokenize('colour')), [{ text: 'Click effect ', match: false }, { text: 'colour', match: true }]);
  assert.deepEqual(highlightSegments('Text colour', ['color']), [{ text: 'Text ', match: false }, { text: 'colour', match: true }]);
  assert.deepEqual(highlightSegments('Nothing', []), [{ text: 'Nothing', match: false }]);
  for (const suggestion of SEARCH_SUGGESTIONS) assert.ok(searchSettings(index, suggestion).total > 0, suggestion);
});
test('gradient presets round-trip, custom detection, stop limits and CSS', () => {
  assert.ok(GRADIENT_PRESETS.length >= 6);
  for (const p of GRADIENT_PRESETS) { assert.equal(matchGradientPreset(p.colors, p.angle), p.id); assert.equal(matchGradientPreset(p.colors.map(c => c.toUpperCase()), p.angle), p.id); assert.ok(p.colors.every(isHex)); }
  assert.equal(matchGradientPreset(['#eef2f7', '#dbe4f0'], 90), 'custom');
  assert.equal(matchGradientPreset(null, 135), 'custom');
  assert.equal(gradientCss(['#000', '#fff'], 90), 'linear-gradient(90deg, #000, #fff)');
  assert.equal(gradientCss(['#123456']), '#123456');
  let stops = ['#000000', '#ffffff'];
  assert.equal(removeStop(stops, 0), stops, 'never below the minimum');
  for (let i = 0; i < 5; i++) stops = addStop(stops);
  assert.equal(stops.length, MAX_STOPS); assert.equal(MIN_STOPS, 2);
  assert.equal(removeStop(stops, 1).length, MAX_STOPS - 1);
  assert.equal(COLOR_PRESETS.length, 12); assert.ok(COLOR_PRESETS.every(p => isHex(p.hex) && p.name));
  const themed = resolveComposition({ theme: 'dark' }).frame.background;
  assert.equal(matchGradientPreset(themed.colors, themed.angle), 'midnight', 'the dark theme gradient is a preset');
});
test('output size presets map to exact pixels for every format and survive resolveComposition', () => {
  assert.deepEqual(SIZE_PRESETS.map(p => p.id), Object.keys(OUTPUT_SIZES));
  for (const orientation of ['landscape', 'vertical', 'square']) for (const p of SIZE_PRESETS) {
    const output = { preset: orientation, ...sizeForPreset(p.id, { preset: orientation }) };
    assert.equal(presetForSize(output), p.id, `${orientation} ${p.id}`);
    assert.ok(Number.isInteger(output.width) && Number.isInteger(output.height) && output.width % 2 === 0 && output.height % 2 === 0);
    assert.equal(sizeKeyFor(output.width, output.height), p.id);
    const resolved = resolveComposition({ output }).output;
    assert.deepEqual([resolved.width, resolved.height], [output.width, output.height], 'resolveComposition keeps the chosen size');
  }
  assert.deepEqual(sizeForPreset('720', { preset: 'landscape' }), { width: 1280, height: 720 });
  assert.deepEqual(sizeForPreset('1440', { preset: 'vertical' }), { width: 1440, height: 2560 });
  assert.deepEqual(presetOutput('square', '4k'), { preset: 'square', width: 2160, height: 2160 });
  assert.equal(presetForSize({ preset: null, width: 1500, height: 900 }), 'custom');
  assert.equal(orientationOf({ preset: null, width: 900, height: 1500 }), 'vertical');
  assert.equal(orientationOf({ width: 1000, height: 1000 }), 'square');
  assert.equal(sizeLabel({ width: 1920, height: 1080 }), '1920 × 1080');
  assert.equal(sizeKeyFor(undefined, undefined), '1080'); assert.equal(sizeKeyFor(3840, 2160), '4k'); assert.equal(sizeKeyFor(2560, 1440), '1440');
  assert.throws(() => presetOutput('landscape', '900'), /size must be/);
});
test('the image picker in the browser agrees with the upload route limits', async () => {
  const { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } = await import('../scripts/lib/editor/upload-api.mjs');
  const source = await readFile(new URL('../editor/panels/ImagePicker.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes(`IMAGE_EXTENSIONS = ${JSON.stringify(IMAGE_EXTENSIONS).replace(/"/g, "'").replace(/,/g, ', ')}`), 'extension whitelist');
  assert.ok(source.includes(`MAX_IMAGE_BYTES = ${MAX_IMAGE_BYTES / 1024 / 1024} * 1024 * 1024`), 'size cap');
});
test('the settings panel width clamps to 320–560 and falls back to 400', async () => {
  const { panelWidth, PANEL_MIN, PANEL_MAX, PANEL_DEFAULT } = await import('../editor/layout.mjs');
  assert.deepEqual([PANEL_MIN, PANEL_MAX, PANEL_DEFAULT], [320, 560, 400]);
  for (const bad of [undefined, null, '', 'abc', NaN, 0, -5]) assert.equal(panelWidth(bad), 400, String(bad));
  assert.equal(panelWidth(100), 320); assert.equal(panelWidth(9000), 560); assert.equal(panelWidth('444.6'), 445); assert.equal(panelWidth(400), 400);
});
test('info tooltips sit above their row, flip only at the top of the window and stay inside it sideways', async () => {
  const { placeTip } = await import('../editor/layout.mjs');
  const viewport = { width: 1440, height: 900 };
  const above = placeTip({ top: 300, bottom: 318, left: 200, width: 18 }, viewport);
  assert.equal(above.side, 'top'); assert.equal(above.bottom, 900 - 300 + 6); assert.equal(above.top, null); assert.equal(above.left, 200 + 9 - 120);
  const below = placeTip({ top: 40, bottom: 58, left: 200, width: 18 }, viewport);
  assert.equal(below.side, 'bottom'); assert.equal(below.top, 58 + 6);
  assert.equal(placeTip({ top: 300, bottom: 318, left: 2, width: 18 }, viewport).left, 8, 'never off the left edge');
  assert.equal(placeTip({ top: 300, bottom: 318, left: 1430, width: 18 }, viewport).left, 1440 - 240 - 8, 'never off the right edge');
  assert.equal(placeTip({ top: 300, bottom: 318, left: 60, width: 18 }, { left: 56, width: 400, height: 900 }).left, 64, 'clamped to the panel, not the rail');
  assert.equal(placeTip({ top: 300, bottom: 318, left: 440, width: 18 }, { left: 56, width: 400, height: 900 }).left, 56 + 400 - 240 - 8);
});
