import { test, expect, type Page } from '@playwright/test';

// Drive a real puzzle to completion through the app's own move logic, then
// confirm the box streams on to the next (different) game.

const heading = (page: Page) => page.locator('h2').first();

test.describe('playing one game to the next (/box)', () => {
  test('solve a puzzle, advance, and solve the next', async ({ page }) => {
    // Fixed seed → deterministic puzzle stream.
    await page.goto('/box?solve=1&seed=2');

    // Puzzle 1: fresh and unsolved.
    await expect(page.getByText('Puzzle #1')).toBeVisible();
    await expect(page.getByLabel('solved-count')).toHaveText('Solved: 0');
    await expect(page.getByLabel('progress')).toHaveText('0%');
    const firstGame = await heading(page).textContent();

    // Play it to completion via the revealed solution.
    await page.getByRole('button', { name: /show solution/i }).click();
    await expect(page.getByLabel('solved', { exact: true })).toHaveText(/Solved!/);
    await expect(page.getByLabel('progress')).toHaveText('100%');
    await expect(page.getByLabel('solved-count')).toHaveText('Solved: 1');

    // Advance to the next puzzle — no game-over, fresh board.
    await page.getByRole('button', { name: /next puzzle/i }).click();
    await expect(page.getByText('Puzzle #2')).toBeVisible();
    await expect(page.getByLabel('progress')).toHaveText('0%');
    const secondGame = await heading(page).textContent();

    // Interleaving means consecutive puzzles are different games.
    expect(secondGame).not.toBe(firstGame);

    // Solve the second one too — the loop keeps going.
    await page.getByRole('button', { name: /show solution/i }).click();
    await expect(page.getByLabel('solved', { exact: true })).toHaveText(/Solved!/);
    await expect(page.getByLabel('solved-count')).toHaveText('Solved: 2');
  });

  test('the solution affordance is hidden by default (normal play UX)', async ({ page }) => {
    await page.goto('/box');
    await expect(page.getByText('Puzzle #1')).toBeVisible();
    await expect(page.getByRole('button', { name: /show solution/i })).toHaveCount(0);
  });
});
