import { test, expect, type Page } from '@playwright/test';
import { seedOnly } from './_helpers';

const seedOnlySetCover = (page: Page, difficulty = 1000) =>
  seedOnly(page, 'set-cover', difficulty);

const sizeValue = (page: Page) => page.getByLabel('Set Cover size value');

test.describe('adaptive difficulty', () => {
  test('a quick solve raises the difficulty by one step', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?solve=1&seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Show solution solves instantly -> quick -> harder.
    await page.getByRole('button', { name: /show solution/i }).click();
    await expect(page.getByLabel('solved', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('1050');
  });

  test('skipping a puzzle without solving lowers the difficulty', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Advance without solving -> skip -> easier.
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('950');
  });
});
