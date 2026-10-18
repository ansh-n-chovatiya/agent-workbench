// Replays a recorded guide in order and resolves every step to a selector that matches exactly one element at that moment.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const guide = JSON.parse(readFileSync(process.env.GUIDE_IN || '../scratch/guide.json', 'utf8'));
const browser = await chromium.launch();
const resolved = [], failures = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const go = async (u) => { await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(3000); };
  await go(guide.url);
  for (const [i, s] of guide.steps.entries()) {
    if (page.url() !== s.url) await go(s.url);
    let selector = null, how = null, multi = null;
    for (const c of s.candidates) { let n = 0; try { n = await page.locator(c).count(); } catch {} if (n === 1) { selector = c; how = 'unique'; break; } if (n > 1 && !multi) multi = c; }
    if (!selector && multi) {   // several matches: pick the one nearest the recorded element box
      const sc = await page.evaluate(() => ({ x: scrollX, y: scrollY })); const cx = s.box.x + s.box.w / 2, cy = s.box.y + s.box.h / 2;
      const loc = page.locator(multi); const n = await loc.count(); let best = -1, bestD = Infinity;
      for (let k = 0; k < n; k++) { const b = await loc.nth(k).boundingBox(); if (!b) continue; const d = Math.hypot(b.x + sc.x + b.width / 2 - cx, b.y + sc.y + b.height / 2 - cy); if (d < bestD) { bestD = d; best = k; } }
      if (best >= 0 && bestD < 40) { selector = `${multi} >> nth=${best}`; how = `nth (box distance ${bestD.toFixed(0)} px)`; }
    }
    if (!selector) { failures.push({ i, name: s.name, why: multi ? 'several matches and none near the recorded box' : 'no candidate matched on replay' }); continue; }
    const count = await page.locator(selector).count();
    if (count !== 1) { failures.push({ i, name: s.name, why: `resolved selector matched ${count}` }); continue; }
    resolved.push({ i, action: s.action, selector, how, name: s.name, url: s.url, value: s.value });
    try { if (s.action === 'click') await page.locator(selector).click({ timeout: 6000 }); else await page.locator(selector).fill(s.value ?? ''); await page.waitForTimeout(2000); }
    catch (e) { failures.push({ i, name: s.name, why: 'action failed: ' + String(e.message).split('\n')[0] }); }
  }
} finally { await browser.close().catch(() => {}); }
const out = { steps: guide.steps.length, resolved: resolved.length, byKind: resolved.reduce((a, r) => (a[r.how.split(' ')[0]] = (a[r.how.split(' ')[0]] || 0) + 1, a), {}), failures };
writeFileSync(process.env.RESOLVED_OUT || '../scratch/guide.resolved.json', JSON.stringify({ url: guide.url, steps: resolved }, null, 2));
writeFileSync(process.env.RESULT_OUT || '../results/s4-guide-v2.json', JSON.stringify(out, null, 2)); console.log(out);
process.exit(0);
