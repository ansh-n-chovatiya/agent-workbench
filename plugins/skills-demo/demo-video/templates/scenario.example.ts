// Example demo scenario: an ordinary Playwright test.
// Record it with: node <skill>/scripts/demo.mjs record scenario.spec.ts
//
// - Each test.step title is a caption, shown about 0.3 s before the step's
//   first action and held until it can be read (and spoken, with --voice).
//   Write them for the viewer: short, plain sentences about what they see.
// - Use locator actions (click, fill, check, selectOption...). The recorder
//   moves the mouse there like a person and types at a readable pace, so do
//   not add waits or slow typing yourself.
// - No credentials here, ever. Log in once with `demo.mjs login`; the saved
//   session is loaded automatically. Relative URLs resolve against baseURL.
// - Saves are safe: POST/PUT/PATCH/DELETE requests are blocked unless their
//   URL contains an allowWrites entry ("re:" prefix for a regex), so clicking
//   "Save" changes nothing.
// - Import only files in this folder or below it: only this folder is copied
//   for recording.
import { test, expect } from '@playwright/test';

test('Find and filter orders', async ({ page }) => {
  await test.step('The orders page lists every order, newest first', async () => {
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  });

  await test.step('Search by customer name', async () => {
    await page.getByPlaceholder('Search orders').fill('Rivera');
    await page.getByRole('button', { name: 'Search' }).click();
  });

  await test.step('Show only orders waiting to ship', async () => {
    await page.getByLabel('Awaiting shipment').check();
  });

  await test.step('Open an order to see its items and history', async () => {
    await page.getByRole('row').nth(1).click();
    await expect(page.getByRole('heading', { name: /Order #/ })).toBeVisible();
  });
});
