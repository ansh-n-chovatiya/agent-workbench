import { pickNearestBox, formatResolvedStep, sameDocument } from './pure.mjs';

export async function chooseSelector(frame, step) {
  const multiple = [];
  for (const [index, candidate] of step.candidates.entries()) {
    try {
      const count = await frame.locator(candidate).count();
      if (count === 1) {
        let how = 'unique';
        if (candidate.includes(':has(')) how = 'scoped';
        else if (index === step.candidates.length - 1 && step.tag) how = 'css';
        return { selector: candidate, how };
      }
      if (count > 1) multiple.push(candidate);
    } catch { /* A stale or unsupported candidate does not disqualify the later ones. */ }
  }
  if (multiple.length && !step.box) {
    return { why: 'several matches and no recorded box for nth fallback' };
  }
  for (const candidate of multiple) {
    const boxes = await frame.locator(candidate).evaluateAll((elements) => elements.map((el) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return { x: rect.x + scrollX, y: rect.y + scrollY, w: rect.width, h: rect.height };
    }));
    const index = pickNearestBox(step.box, boxes);
    if (index >= 0) return { selector: `${candidate} >> nth=${index}`, how: 'nth' };
  }
  return { why: multiple.length
    ? 'several matches and none near the recorded box'
    : 'no candidate matched on replay' };
}

export async function navigate(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
}

async function stepFrame(page, step) {
  if (step.isTopFrame !== false) return page.mainFrame();
  const deadline = Date.now() + 5000;
  do {
    const frame = page.frames().find((candidate) => candidate !== page.mainFrame() && candidate.url() === step.frameUrl);
    if (frame) return frame;
    await page.waitForTimeout(50);
  } while (Date.now() < deadline);
  throw new Error(`frame not found: ${step.frameUrl}`);
}

async function replayStep(context, pages, step, next) {
  const page = pages[step.tab ?? 0];
  if (!page) throw new Error(`tab ${step.tab ?? 0} not found`);
  // A null url means "the page the previous step left you on" (Auto mode); only load a page when the recorded one differs.
  if (step.action !== 'goto' && step.isTopFrame !== false && step.url && !sameDocument(page.url(), step.url)) await navigate(page, step.url);
  const frame = await stepFrame(page, step);
  if (step.action === 'goto') { await navigate(page, step.url); return { selector: null, how: 'action' }; }
  if (step.action === 'scroll') { await page.mouse.wheel(0, step.deltaY); await page.waitForTimeout(300); return { selector: null, how: 'action' }; }
  if (step.action === 'wait') { await page.waitForTimeout(step.ms); return { selector: null, how: 'action' }; }
  const choice = await chooseSelector(frame, step);
  if (!choice.selector) {
    const candidates = await frame.locator('a,button,input,select,textarea,[role]').evaluateAll(els => els.filter(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height).map(el => el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').filter(Boolean));
    const closest = closestCandidates(candidates, step.name).map(v => JSON.stringify(v.slice(0,80)));
    return { why: choice.why + '; closest candidates: ' + (closest.join(', ') || '(none)') + '; fix the visible text/role or capture a Guide step with a box' };
  }
  const locator = frame.locator(choice.selector);
  // Arm before the click: a fast popup can arrive before click() resolves.
  const nextTab = next?.tab ?? 0;
  const needsPopup = step.action === 'click' && nextTab > (step.tab ?? 0) && !pages[nextTab];
  const popup = needsPopup
    ? context.waitForEvent('page', { timeout: 5000 }).then((page) => ({ page }), (error) => ({ error }))
    : null;
  if (step.action === 'click') await locator.click({ timeout: 6000 });
  else if (step.action === 'fill' && (!step.sensitive || step.secretEnv)) {
    const value = step.sensitive ? process.env[step.secretEnv] : step.value;
    if (value === undefined) throw new Error('set environment variable ' + step.secretEnv + ' before resolving');
    await locator.fill(value, { timeout: 6000 });
  }
  else if (step.action === 'press') await locator.press(step.key, { timeout: 6000 });
  else if (step.action !== 'fill') throw new Error(`unsupported action: ${step.action}`);
  if (popup) {
    const result = await popup;
    if (result.error) throw new Error('popup page did not open within 5 s');
    await result.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
  }
  await page.waitForTimeout(2000);
  return choice;
}

export async function resolveGuide({ guide, headless = true, storageState }) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless });
  const steps = [];
  const failures = [];
  try {
    const context = await browser.newContext({ storageState, viewport: guide.viewport ?? { width: 1440, height: 900 } });
    const pages = [];
    context.on('page', (page) => { pages.push(page); });
    const page = await context.newPage();
    if (guide.steps[0]?.action !== 'goto') await navigate(page, guide.url);
    for (const [i, step] of guide.steps.entries()) {
      try {
        const choice = await replayStep(context, pages, step, guide.steps[i + 1]);
        if (!choice.selector && choice.how !== 'action') failures.push({ i, name: step.name, why: choice.why });
        else steps.push(formatResolvedStep(step, i, choice.selector, choice.how));
      } catch (error) {
        failures.push({ i, name: step.name, why: step.sensitive ? 'sensitive fill failed; check the field label and environment variable ' + (step.secretEnv ?? '') : `action failed: ${error.message.split('\n')[0]}` });
      }
      if (failures.length) break;
    }
    return { version: 1, url: guide.url, steps, failures };
  } finally { await browser.close(); }
}

// Edit distance ranks page labels without using field values or inventing selectors.
export function closestCandidates(names, wanted) {
  const a = String(wanted ?? '').toLowerCase();
  function distance(name) {
    const b = name.toLowerCase();
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] !== b[j - 1]));
        prev = old;
      }
    }
    return row[b.length];
  }
  return [...new Set(names)].sort((a,b) => distance(a) - distance(b)).slice(0,3);
}
