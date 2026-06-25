import { test, expect, type Page } from '@playwright/test';
import { seedOnly } from './_helpers';

const seedOnlySetCover = (page: Page, difficulty = 1000) =>
  seedOnly(page, 'set-cover', difficulty);

const sizeValue = (page: Page) => page.getByLabel('Set Cover size value');

test.describe('adaptive difficulty', () => {
  test('a quick optimal solve raises the difficulty', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?solve=1&seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Show solution replays the optimal moves instantly -> optimal + quick.
    await page.getByRole('button', { name: /show solution/i }).click();
    await expect(page.getByLabel('solved', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('1250');
  });

  test('a solve with wasted moves lowers the difficulty', async ({ page }) => {
    await seedOnlySetCover(page, 1000);
    await page.goto('/box?solve=1&seed=2');
    await page.getByRole('button', { name: /advanced options/i }).click();
    await expect(sizeValue(page)).toHaveText('1000');

    // Two wasted moves (select then deselect) => more than optimal moves.
    await page.getByRole('button', { name: 'subset-0' }).click();
    await page.getByRole('button', { name: 'subset-0' }).click();
    await page.getByRole('button', { name: /show solution/i }).click();
    await expect(page.getByLabel('solved', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /next puzzle/i }).click();

    await expect(sizeValue(page)).toHaveText('750');
  });
});
