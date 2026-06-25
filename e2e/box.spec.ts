import { test, expect } from '@playwright/test';

// Observable end-to-end behavior of the real shipped site.

test.describe('the game box (default /, alias /box)', () => {
  test('is the default landing at /', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Puzzle #1')).toBeVisible();
    await expect(page.getByLabel('solved-count')).toHaveText('Solved: 0');
  });

  test('streams interleaved NP-complete puzzles', async ({ page }) => {
    await page.goto('/box');
    await expect(page.getByText('Puzzle #1')).toBeVisible();
    await expect(page.getByLabel('solved-count')).toHaveText('Solved: 0');
    // A game from the registry is rendered with a progress readout.
    await expect(page.getByLabel('progress')).toBeVisible();
  });

  test('advances to the next puzzle with no game-over', async ({ page }) => {
    await page.goto('/box');
    await page.getByRole('button', { name: /next puzzle/i }).click();
    await expect(page.getByText('Puzzle #2')).toBeVisible();
  });

  test('a game heading from the registry is shown', async ({ page }) => {
    await page.goto('/box');
    await expect(
      page.getByRole('heading', { name: /graph coloring|set cover|hamiltonian|3-sat/i }),
    ).toBeVisible();
  });
});
