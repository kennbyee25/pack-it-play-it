import { test, expect, type Page } from '@playwright/test';
import { seedOnly } from './_helpers';

// Garey-Johnson batch 1: each new game must be playable end-to-end at easy
// difficulty (100–200). Rotation is pinned to the single game, the board
// renders its game-specific elements, and the revealed solution drives the
// app's own move logic to 100%.

const EASY = 150;

const cases: { id: string; name: string; probe: (page: Page) => Promise<void> }[] = [
  {
    id: 'dominating-set',
    name: 'Dominating Set',
    probe: async (page) => {
      await expect(page.getByLabel('graph')).toBeVisible();
      expect(await page.getByRole('button', { name: /^node-/ }).count()).toBeGreaterThan(0);
    },
  },
  {
    id: 'feedback-vertex-set',
    name: 'Feedback Vertex Set',
    probe: async (page) => {
      await expect(page.getByLabel('graph')).toBeVisible();
      expect(await page.getByRole('button', { name: /^node-/ }).count()).toBeGreaterThan(0);
    },
  },
  {
    id: 'x3c',
    name: 'Exact Cover by 3-Sets (X3C)',
    probe: async (page) => {
      await expect(page.getByLabel('universe')).toBeVisible();
      expect(await page.getByRole('button', { name: /^subset-/ }).count()).toBeGreaterThan(0);
    },
  },
  {
    id: 'nae-3sat',
    name: 'NAE-3SAT',
    probe: async (page) => {
      await expect(page.getByLabel('variables')).toBeVisible();
      await expect(page.getByLabel('clauses')).toBeVisible();
      // NAE-specific guidance, not the plain 3-SAT default.
      await expect(page.getByText('at least one true and one false literal')).toBeVisible();
    },
  },
];

for (const c of cases) {
  test.describe(`easy play: ${c.name} (/box)`, () => {
    test('renders its board, reveals solution, and reaches 100%', async ({ page }) => {
      await seedOnly(page, c.id, EASY);
      await page.goto('/box?solve=1&seed=7');

      await expect(page.getByText('Puzzle #1')).toBeVisible();
      await expect(page.locator('h2').first()).toContainText(c.name);
      await expect(page.getByLabel('progress')).toHaveText('0%');

      await c.probe(page);

      await page.getByRole('button', { name: /show solution/i }).click();
      await expect(page.getByLabel('solved', { exact: true })).toHaveText(/Solved!/);
      await expect(page.getByLabel('progress')).toHaveText('100%');
      await expect(page.getByLabel('solved-count')).toHaveText('Solved: 1');
    });
  });
}
