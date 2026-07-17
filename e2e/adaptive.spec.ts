import { test, expect, type Page } from '@playwright/test';
import { seedOnly } from './_helpers';

const seedOnlySetCover = (page: Page, difficulty = 1000) =>
  seedOnly(page, 'set-cover', difficulty);

const sizeValue = (page: Page) => page.getByLabel('Set Cover size value');

test.describe('adaptive difficulty', () => {
  test('a quick solve raises the estimated skill and selects an OCP difficulty', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?solve=1&seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Show solution solves instantly -> OCP selects next difficulty.
    await page.getByRole('button', { name: /show solution/i }).click();
    await expect(page.getByLabel('solved', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('400');
  });

  test('skipping lowers the estimated skill and selects a lower OCP difficulty', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Advance without solving -> OCP selects lower difficulty.
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('350');
  });

  test('resetting then advancing counts as a fail and lowers difficulty', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Reset (fail) then advance -> OCP selects lower difficulty.
    await page.getByRole('button', { name: 'reset puzzle' }).click();
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('350');
  });
});
