import { setTimeout as sleep } from 'node:timers/promises';
import { sameDocument } from '../guide/pure.mjs';
import { dismissCookieBanners } from './hygiene.mjs';
import { targetPoint, planMove, dwellMs, pressMs, settleAfterClickMs,
  typingDelays, holdMs } from './cursor-path.mjs';

export async function navigateRecording(page, url, scale, cookies = true) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((zoom) => { document.documentElement.style.zoom = String(zoom); }, scale);
  await sleep(1500);
  if (cookies) await dismissCookieBanners(page);
  await page.evaluate(() => document.fonts.ready);
}

// Two boxes describe the same place when every edge is within `tolerance` pixels.
export function boxesClose(a, b, tolerance = 0.5) {
  if (!a || !b) return false;
  return ['x', 'y', 'width', 'height'].every((key) => Math.abs(a[key] - b[key]) <= tolerance);
}

// A smooth scroll can outlast any fixed wait on a long page, and a box measured mid-scroll sends the click to the wrong place. Wait
// until two reads 100 ms apart agree (after a first 300 ms head start), for at most 4 s, then use the last box.
export async function stableBox(locator, { maxMs = 4000 } = {}) {
  await sleep(300);
  let previous = await locator.boundingBox();
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await sleep(100);
    const next = await locator.boundingBox();
    if (boxesClose(previous, next)) return next;
    previous = next;
  }
  return previous;
}

async function actionLocator(page, action) {
  if (!action.frameUrl || sameDocument(page.url(), action.frameUrl)) return page.locator(action.selector);
  const deadline = Date.now() + 5000;
  do {
    const frame = page.frames().find((frame) => frame.url() === action.frameUrl);
    if (frame) return frame.locator(action.selector);
    await sleep(50);
  } while (Date.now() < deadline);
  throw new Error(`frame not found: ${action.frameUrl}`);
}

async function moveAndClick(state, page, box, key, stepId, tab) {
  const point = targetPoint(box, { key });
  const path = planMove(state.cursor, point, { key });
  const start = state.now();
  for (const sample of path.samples) {
    state.events.cursor.push({ t: start + sample.t / 1000, x: sample.x, y: sample.y });
  }
  let dispatched = -Infinity;
  for (const [index, sample] of path.samples.entries()) {
    if (sample.t - dispatched < 50 && index !== path.samples.length - 1) continue;
    // The final point may wait beyond its planned instant to keep input at <=20 Hz.
    const due = Math.max(sample.t, dispatched + 50);
    await sleep(Math.max(0, (start - state.now()) * 1000 + due));
    await page.mouse.move(sample.x * state.scale, sample.y * state.scale);
    state.events.moves.push({ t: state.now(), x: sample.x, y: sample.y });
    dispatched = due;
  }
  state.cursor = point;
  await sleep(dwellMs(key));
  await page.mouse.down();
  state.events.clicks.push({ t: state.now(), ...point, stepId, tab });
  try { await sleep(pressMs(key)); }
  finally { await page.mouse.up(); }
  await sleep(settleAfterClickMs(key));
}

async function executeAction(state, step, action, index, rehearsal) {
  const tab = action.tab ?? 0;
  const page = await state.pageFor(tab);
  if (action.type === 'goto') {
    await navigateRecording(page, action.url, state.scale, state.cookies);
    return;
  }
  if (action.type === 'wait') { await sleep(action.ms); return; }
  const locator = await actionLocator(page, action);
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  if (rehearsal) {
    if (action.type === 'click') await locator.click({ timeout: 5000 });
    if (action.type === 'fill') await locator.fill(state.value(step, action), { timeout: 5000 });
    if (action.type === 'press') await locator.press(action.key, { timeout: 5000 });
    return;
  }
  await locator.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  const rect = await stableBox(locator);
  if (!rect || rect.width <= 0 || rect.height <= 0) throw new Error('target has no visible box');
  const box = { x: rect.x / state.scale, y: rect.y / state.scale,
    w: rect.width / state.scale, h: rect.height / state.scale };
  state.events.targets.push({ stepId: step.id, t: state.now(), kind: action.type,
    box, sensitive: action.sensitive === true });
  const key = `${step.id}:${index}`;
  if (action.type === 'click' || action.type === 'fill') {
    await moveAndClick(state, page, box, key, step.id, tab);
  }
  if (action.type === 'fill') {
    await locator.fill('');
    const text = state.value(step, action);
    const delays = typingDelays(text, { key });
    for (const [i, character] of Array.from(text).entries()) {
      await page.keyboard.type(character);
      await sleep(delays[i]);
    }
    state.events.keys.push({ t: state.now(), stepId: step.id, count: Array.from(text).length });
  }
  if (action.type === 'press') {
    await locator.focus();
    await locator.press(action.key, { timeout: 5000 });
    state.events.keys.push({ t: state.now(), stepId: step.id, count: 1 });
  }
}

export async function executeScenario(state, steps, { rehearsal = false } = {}) {
  for (const step of steps) {
    const tStart = rehearsal ? 0 : state.now();
    for (const [index, action] of step.actions.entries()) {
      try { await executeAction(state, step, action, index, rehearsal); }
      catch (error) {
        // Playwright errors may include field values: expose only location for secrets.
        const detail = action.sensitive ? 'sensitive action failed' : error.message.split('\n')[0];
        const prefix = rehearsal ? 'rehearsal failed' : 'recording failed';
        throw new Error(`${prefix} in step ${step.id} (selector ${action.selector ?? action.type}): ${detail}`);
      }
    }
    if (!rehearsal) {
      const holdStart = state.now();
      await sleep(holdMs({ caption: step.caption, narration: step.narration, explicit: step.holdMs }));
      state.events.steps.push({ id: step.id, tStart, holdStart, tEnd: state.now() });
    }
  }
}
