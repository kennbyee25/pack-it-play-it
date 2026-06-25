import { test, expect, type Page } from '@playwright/test';
import { seedEnabled } from './_helpers';

const openOptions = (page: Page) =>
  page.getByRole('button', { name: /advanced options/i }).click();

test.describe('advanced options (/box)', () => {
  test('game selection: only enabled games appear in the rotation', async ({ page }) => {
    await seedEnabled(page, ['graph-coloring']);
    await page.goto('/box?seed=1');

    for (let i = 0; i < 4; i++) {
      await expect(page.getByRole('heading', { name: 'Graph Coloring' })).toBeVisible();
      await page.getByRole('button', { name: /next puzzle/i }).click();
    }
  });

  test('difficulty slider updates the size readout via keyboard', async ({ page }) => {
    await seedEnabled(page, ['graph-coloring']);
    await page.goto('/box?seed=1');
    await openOptions(page);

    const slider = page.getByLabel('Graph Coloring difficulty').getByRole('slider');
    await slider.focus();
    await page.keyboard.press('Home');
    await expect(page.getByLabel('Graph Coloring size value')).toHaveText('100');
    await page.keyboard.press('End');
    await expect(page.getByLabel('Graph Coloring size value')).toHaveText('2500');
  });

  test('higher difficulty yields a larger problem', async ({ page }) => {
    const nodeCount = async (difficulty: number) => {
      await seedEnabled(page, ['graph-coloring'], difficulty);
      await page.goto('/box?seed=1');
      await expect(page.getByRole('heading', { name: 'Graph Coloring' })).toBeVisible();
      return page.locator('[aria-label^="node-"]').count();
    };
    const small = await nodeCount(100);
    const large = await nodeCount(2500);
    expect(large).toBeGreaterThan(small);
  });

  test('changing difficulty does NOT reset the rotation', async ({ page }) => {
    await page.goto('/box?seed=1');
    await page.getByRole('button', { name: /next puzzle/i }).click();
    await expect(page.getByText('Puzzle #2')).toBeVisible();

    await openOptions(page);
    const slider = page.getByLabel('Graph Coloring difficulty').getByRole('slider');
    await slider.focus();
    await page.keyboard.press('End'); // change a difficulty

    // Rotation position is preserved (only the puzzle's size changes).
    await expect(page.getByText('Puzzle #2')).toBeVisible();
  });

  test('set cover subsets can be deselected and moves are counted', async ({ page }) => {
    await seedEnabled(page, ['set-cover']);
    await page.goto('/box?seed=1');
    await expect(page.getByRole('heading', { name: 'Set Cover' })).toBeVisible();
    await expect(page.getByLabel('moves')).toHaveText('0 moves');

    const subset = page.getByRole('button', { name: 'subset-0' });
    await subset.click(); // select
    await expect(page.getByLabel('moves')).toHaveText('1 moves');
    await expect(page.getByLabel('progress')).not.toHaveText('0%');

    await subset.click(); // deselect
    await expect(page.getByLabel('moves')).toHaveText('2 moves');
    await expect(page.getByLabel('progress')).toHaveText('0%');
  });

  test('settings persist across reload', async ({ page }) => {
    await page.goto('/box?seed=1');
    await openOptions(page);
    const setCover = page.getByRole('checkbox', { name: /enable Set Cover/i });
    await setCover.click(); // disable
    await expect(setCover).not.toBeChecked();

    await page.reload();
    await openOptions(page);
    await expect(page.getByRole('checkbox', { name: /enable Set Cover/i })).not.toBeChecked();
  });
});
