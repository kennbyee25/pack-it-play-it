import { test, expect } from '@playwright/test';

test.describe('advancing the rotation', () => {
  test('spacebar goes to the next puzzle', async ({ page }) => {
    await page.goto('/box?seed=1');
    await expect(page.getByText('Puzzle #1')).toBeVisible();
    await page.locator('body').press('Space');
    await expect(page.getByText('Puzzle #2')).toBeVisible();
  });

  test('auto-advance moves on after a solve', async ({ page }) => {
    await page.goto('/box?solve=1&seed=2');
    await expect(page.getByText('Puzzle #1')).toBeVisible();

    // Turn on auto-advance (off by default in deterministic mode).
    await page.getByRole('switch', { name: /auto-advance/i }).click();

    await page.getByRole('button', { name: /show solution/i }).click();
    // No manual "Next" click — it should advance itself.
    await expect(page.getByText('Puzzle #2')).toBeVisible({ timeout: 5000 });
  });
});
