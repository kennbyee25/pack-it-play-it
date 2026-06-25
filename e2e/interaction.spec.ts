import { test, expect } from '@playwright/test';
import { seedEnabled } from './_helpers';

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

  test('Reset clears the board and moves but NOT the timer', async ({ page }) => {
    await seedEnabled(page, ['graph-coloring']);
    await page.goto('/box?seed=1');
    const seconds = async () => Number((await page.getByLabel('timer').textContent())!.replace('s', ''));

    // Color a node — that's one move.
    await page.getByLabel('node-0').click();
    await expect(page.getByLabel('moves')).toHaveText('1 moves');

    // Let the clock run.
    await page.waitForTimeout(1200);
    const before = await seconds();
    expect(before).toBeGreaterThanOrEqual(1);

    await page.getByRole('button', { name: /reset/i }).click();
    await expect(page.getByLabel('moves')).toHaveText('0 moves'); // moves reset
    expect(await seconds()).toBeGreaterThanOrEqual(before); // timer NOT reset
  });
});
