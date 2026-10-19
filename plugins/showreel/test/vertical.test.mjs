import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../scripts/lib/config.mjs';
import { recordingProfile, profileContext } from '../scripts/lib/record/profiles.mjs';
import { RecordingSession } from '../scripts/lib/record/session.mjs';
import { executeScenario } from '../scripts/lib/record/actions.mjs';
import { parseRecordOptions } from '../scripts/lib/record/commands.mjs';
import { validateEvents, validateRecord } from '../scripts/lib/record/schemas.mjs';
import { layoutFor, presetOutput } from '../scripts/lib/compose/layout.mjs';
import { buildComposition, validateComposition, resolveComposition } from '../scripts/lib/compose/composition.mjs';
import { planRender, DESKTOP_VERTICAL_WARNING } from '../scripts/lib/compose/plan.mjs';
import { compositionForFormat, selectRenderRuns } from '../scripts/lib/compose/render.mjs';
import { DEFAULT_BRIEF } from '../scripts/lib/brief.mjs';
const baseURL = 'https://example.test', phone = { width: 390, height: 844 };
function run(profile = 'phone') {
  const sourceSize = profile === 'phone' ? phone : { width: 1920, height: 1080 };
  const events = new RecordingSession(null, recordingProfile(mergeConfig({ baseURL }), profile), 1).events;
  events.steps = [{ id: 's1', tStart: 0, holdStart: 0.5, tEnd: 1 }];
  const record = { version: 1, profile, projectName: 'demo', runId: 'run1', startedAt: '2026-10-19T00:00:00Z',
    scale: { requested: 1, used: 1, reason: 'requested' }, fps: { nominal: 30, effective: 30, dropped: 0, maxBacklog: 1 },
    video: { file: 'raw.mp4', ...sourceSize, durationSec: 1, bytes: 100 }, durationSec: 1, warnings: [] };
  const brief = { ...structuredClone(DEFAULT_BRIEF), topic: 'Demo' };
  const storyboard = { steps: [{ id: 's1', caption: 'Shared caption', guideSteps: [0] }] };
  const composition = buildComposition({ brief, storyboard, events, record, overrides: { output: { preset: 'vertical', fps: 30 } } });
  return { brief, storyboard, events, record, composition, sourceSize };
}
test('profile defaults, viewport validation and capture-scale propagation', () => {
  const config = mergeConfig({ baseURL, viewport: { width: 1440 }, viewports: { phone: { width: 400, height: 850 } } });
  assert.equal(recordingProfile(config).viewport.width, 1440);
  assert.deepEqual(recordingProfile(config, 'phone').viewport, { width: 400, height: 850 });
  assert.deepEqual(recordingProfile(mergeConfig({ baseURL }), 'phone').viewport, phone);
  for (const viewports of [null, [], { tablet: phone }, { phone: { width: 1 } }, { phone: { ...phone, width: 0 } }, { phone: { ...phone, height: 2.5 } }, { phone: { ...phone, dpr: 3 } }]) assert.throws(() => mergeConfig({ baseURL, viewports }), /viewports/);
  const s = new RecordingSession(null, recordingProfile(mergeConfig({ baseURL }), 'phone'), 2);
  assert.deepEqual(s.viewport, { width: 780, height: 1688 }); assert.deepEqual(s.events.viewport, phone); assert.equal(s.events.profile, 'phone');
  assert.deepEqual(profileContext('desktop'), {}); assert.equal(profileContext('phone').hasTouch, true); assert.equal(profileContext('phone').isMobile, true);
  assert.match(profileContext('phone').userAgent, /iPhone.*Mobile.*Safari/);
  assert.equal(parseRecordOptions('record', ['--name', 'demo', '--profile', 'phone'])['--profile'], 'phone');
  assert.throws(() => parseRecordOptions('record', ['--name', 'demo', '--profile', 'tablet']), /profile/);
});
test('profile schemas support legacy runs and require taps on phone runs', () => {
  const { events, record } = run(); events.clicks.push({ t: 0.5, x: 100, y: 100, stepId: 's1', tab: 0, kind: 'tap' });
  assert.equal(validateEvents(events).ok, true); assert.equal(validateRecord(record).ok, true);
  events.clicks[0].kind = 'click'; assert.equal(validateEvents(events).ok, false);
  events.profile = 'tablet'; record.profile = 'tablet'; assert.equal(validateEvents(events).ok, false); assert.equal(validateRecord(record).ok, false);
  delete events.profile; delete record.profile; delete events.clicks[0].kind;
  assert.equal(validateEvents(events).ok, true); assert.equal(validateRecord(record).ok, true);
});
test('mobile rehearsal errors name the step, profile, selector and mobile hint', async () => {
  const state = { config: { profile: 'phone' }, pageFor: async () => ({ locator: () => ({ waitFor: async () => { throw new Error('not visible'); } }) }) };
  await assert.rejects(executeScenario(state, [{ id: 'hidden-nav', actions: [{ type: 'click', selector: '#desktop-nav' }] }], { rehearsal: true }), /hidden-nav.*profile phone.*#desktop-nav.*site may hide it on mobile/);
});
test('phone actions tap and preserve the compositor cursor without mouse moves', async () => {
  const session = new RecordingSession(null, recordingProfile(mergeConfig({ baseURL }), 'phone'), 1); let taps = 0;
  const locator = { waitFor: async () => {}, evaluate: async () => {}, boundingBox: async () => ({ x: 180, y: 390, width: 30, height: 30 }) };
  const page = { locator: () => locator, evaluate: async () => 'pointer', touchscreen: { tap: async () => { taps++; } }, mouse: { move() { assert.fail('mouse move'); }, down() { assert.fail('mouse down'); } } };
  const start = Date.now(); session.now = () => (Date.now() - start) / 1000; session.pageFor = async () => page;
  await executeScenario(session, [{ id: 's1', holdMs: 0, actions: [{ type: 'click', selector: '#button' }] }]);
  assert.equal(taps, 1); assert.equal(session.events.clicks[0].kind, 'tap'); assert.ok(session.events.cursor.length > 1); assert.equal(session.events.moves.length, 0);
});
test('portrait frame and bottom caption band fit safe zones for phone and desktop sources', () => {
  for (const source of [phone, { width: 1920, height: 1080 }]) {
    const input = { output: presetOutput('vertical'), source, composition: { captions: { enabled: true, mode: 'band' } } };
    const { frame: f, content: c, caption: b, safe } = layoutFor(input);
    assert.equal(f.w, 994); assert.equal(b.h, 307); assert.equal(b.y + b.h, safe.y + safe.h);
    assert.ok(f.y >= 1920 * .07 && f.y + f.h <= b.y); assert.ok(b.y + b.h <= 1920 * .86);
    assert.ok(c.x >= f.x && c.y >= f.y && c.x + c.w <= f.x + f.w && c.y + c.h <= f.y + f.h);
    assert.ok(Math.abs(c.h - c.w * source.height / source.width) < 2);
    if (source.width > source.height) assert.ok(c.h < f.h);
    const unsafe = layoutFor({ ...input, composition: { ...input.composition, layout: { safeZones: false } } });
    assert.equal(unsafe.frame.y, 0); assert.equal(unsafe.caption.y + unsafe.caption.h, 1920);
  }
});
test('square safe zones, preset-only dimensions, and portrait 4k', () => {
  assert.deepEqual(presetOutput('square'), { preset: 'square', width: 1080, height: 1080 });
  assert.deepEqual(presetOutput('vertical', '4k'), { preset: 'vertical', width: 2160, height: 3840 });
  const l = layoutFor({ output: presetOutput('square'), source: phone, composition: { captions: { enabled: true, mode: 'band' }, layout: { safeZones: true } } });
  assert.ok(l.frame.y >= 1080 * .07); assert.ok(l.caption.y + l.caption.h <= 1080 * .86);
  assert.equal(validateComposition({ ...run().composition, output: { preset: 'vertical', fps: 30 } }).ok, true);
  const invalid = run().composition; invalid.output.preset = 'invalid'; assert.equal(validateComposition(invalid).ok, false);
  assert.equal(resolveComposition({ output: { preset: 'vertical' } }).zoom.depth, 1.5);
});
test('vertical plans warn for desktop sources, size cursors by width and share storyboard captions', () => {
  const desktop = planRender(run('desktop')), mobile = planRender(run());
  assert.ok(desktop.warnings.includes(DESKTOP_VERTICAL_WARNING)); assert.ok(!mobile.warnings.includes(DESKTOP_VERTICAL_WARNING));
  assert.equal(mobile.cursor.sizePx, 36.72); assert.deepEqual(mobile.cues, desktop.cues);
  const landscape = compositionForFormat(run('desktop').composition, 'landscape', '1080', 30);
  const vertical = compositionForFormat(landscape, 'vertical', '4k', 30);
  assert.equal(vertical.output.height, 3840); assert.equal(vertical.captions.bandHeightPct, 16); assert.equal(vertical.zoom.depth, 1.5);
});
test('all outputs choose the newest completed run of each profile independently', () => {
  assert.deepEqual(selectRenderRuns([{ id: 'a' }, { id: 'b', profile: 'phone' }, { id: 'c', profile: 'desktop' }, { id: 'd', profile: 'phone' }]), [{ runId: 'c', format: 'landscape' }, { runId: 'd', format: 'vertical' }]);
});

test('shared step narration is placed against each run timing independently', () => {
  const phoneRun = run(), desktopRun = run('desktop');
  for (const r of [phoneRun, desktopRun]) {
    r.composition.audio.voice.enabled = true;
    r.voiceClips = { steps: { s1: 'shared-clip' }, clips: { 'shared-clip': { durationSec: .2, source: 'tts' } } };
  }
  desktopRun.events.steps[0].tStart = .2;
  const mobile = planRender(phoneRun), desktop = planRender(desktopRun);
  assert.equal(mobile.audio.narration[0].clipUrl, desktop.audio.narration[0].clipUrl);
  assert.equal(mobile.cues[0].text, desktop.cues[0].text);
  assert.notEqual(mobile.audio.narration[0].outStart, desktop.audio.narration[0].outStart);
});
