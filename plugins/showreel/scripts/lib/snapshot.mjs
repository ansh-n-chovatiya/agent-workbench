import { pageScript } from './guide/recorder.mjs';
import { chooseSelector, navigate } from './guide/resolver.mjs';

const line = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
export function formatSnapshot(snapshot) {
  return [
    `# ${line(snapshot.title)}`,
    `headings: ${snapshot.headings.map(line).join(' | ')}`,
    ...snapshot.elements.map(({ role, name, selector }) => `${line(role)} ${JSON.stringify(line(name))} -> ${selector}`),
  ].join('\n');
}

export async function snapshotPage({ url, max = 60, viewport = { width: 1440, height: 900 } }) {
  if (!Number.isInteger(max) || max < 1) throw new Error('--max must be a positive integer');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport });
    await context.addInitScript({ content: pageScript });
    const page = await context.newPage();
    await navigate(page, url);
    const snapshot = await page.evaluate(() => ({
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 12)
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)),
      facts: [...document.querySelectorAll('a[href],button,input,select,textarea,[role="tab"],summary')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        }).map((el) => window.__sr_facts('click', el)),
    }));
    const elements = [];
    for (const step of snapshot.facts.sort((a, b) => a.box.y - b.box.y)) {
      const choice = await chooseSelector(page.mainFrame(), step);
      if (choice.selector) elements.push({ role: step.role, name: step.name, selector: choice.selector, y: Math.round(step.box.y) });
      if (elements.length >= max) break;
    }
    return { title: snapshot.title, headings: snapshot.headings, elements };
  } finally { await browser.close(); }
}
