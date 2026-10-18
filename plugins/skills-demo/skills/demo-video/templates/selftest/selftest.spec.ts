// Bundled scenario for `demo.mjs selftest`: a local page, no network, no login.
// The recorder sets DEMO_SELFTEST_URL because this file runs from a copy.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pageUrl = process.env.DEMO_SELFTEST_URL ?? pathToFileURL(path.resolve('index.html')).href;

test('Selftest catalog', async ({ page }) => {
  await test.step('A catalog with filters on the left and products on the right', async () => {
    await page.goto(pageUrl);
    await page.getByRole('heading', { name: 'Filters' }).hover();
  });

  await test.step('Keep only what is in stock', async () => {
    await page.getByLabel('In stock only').check();
    await expect(page.getByText('Showing 6 of 8 products')).toBeVisible();
  });

  await test.step('Narrow to a price range', async () => {
    await page.getByLabel('$50 to $150').check();
    await expect(page.getByText('Showing 3 of 8 products')).toBeVisible();
  });

  await test.step('Name the shortlist', async () => {
    await page.getByLabel('List name').fill('Home office');
  });

  await test.step('Save it: the demo blocks the write, so nothing really changes', async () => {
    await page.getByRole('button', { name: 'Save list' }).click();
    await expect(page.getByText('Save blocked: nothing was changed')).toBeVisible();
  });
});
