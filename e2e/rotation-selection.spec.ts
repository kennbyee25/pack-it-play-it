import { test, expect, type Page } from '@playwright/test';
import { seedOnly } from './_helpers';

// Selecting/deselecting games must safely add/remove that game from the rotation
// without ever wiping the screen (regression: deselecting the currently-shown
// game reused the player with another game's state and crashed the tree).

const openOptions = (page: Page) =>
  page.getByRole('button', { name: /advanced options/i }).click();

const currentGameName = (page: Page) =>
  page.getByRole('heading').first().textContent();

// A rendered board always exposes a progress readout; its presence is our
// "the player is alive, not a blank/crashed screen" signal.
const expectBoardAlive = async (page: Page) => {
  await expect(page.getByLabel('progress')).toBeVisible();
  await expect(page.getByRole('heading').first()).toBeVisible();
};

test.describe('game selection / deselection in the rotation', () => {
  test('deselecting the currently-shown game swaps in another without wiping the screen', async ({
    page,
  }) => {
    await page.goto('/box?seed=1');
    await expectBoardAlive(page);
    const shown = await currentGameName(page);
    expect(shown).toBeTruthy();

    await openOptions(page);
    await page.getByRole('checkbox', { name: `enable ${shown}` }).uncheck();

    // The screen survives and a different game is now displayed.
    await expectBoardAlive(page);
    await expect(page.getByRole('heading').first()).not.toHaveText(shown!);
    // The deselected game's checkbox is unchecked (removed from the rotation).
    await expect(page.getByRole('checkbox', { name: `enable ${shown}` })).not.toBeChecked();
  });

  test('deselecting a game that is NOT currently shown is safe and removes it', async ({
    page,
  }) => {
    await page.goto('/box?seed=1');
    const shown = await currentGameName(page);
    await openOptions(page);

    // Disable some enabled game other than the one on screen.
    const boxes = page.getByRole('checkbox');
    const n = await boxes.count();
    let targetLabel: string | null = null;
    for (let i = 0; i < n; i++) {
      const box = boxes.nth(i);
      const label = await box.getAttribute('aria-label');
      if (label === `enable ${shown}` || (await box.isDisabled())) continue;
      await box.uncheck();
      await expect(box).not.toBeChecked();
      targetLabel = label;
      break;
    }
    expect(targetLabel).toBeTruthy();

    // Toggling the enabled set restarts the rotation by design, so the on-screen
    // puzzle may change — what matters is the board stays alive (no wipe) and the
    // deselected game is gone from the rotation.
    await expectBoardAlive(page);
    await expect(page.getByRole('checkbox', { name: targetLabel! })).not.toBeChecked();
  });

  test('re-enabling a game adds it back without crashing', async ({ page }) => {
    await page.goto('/box?seed=1');
    await openOptions(page);

    await page.getByRole('checkbox', { name: 'enable Nonogram' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'enable Nonogram' })).not.toBeChecked();
    await expectBoardAlive(page);

    await page.getByRole('checkbox', { name: 'enable Nonogram' }).check();
    await expect(page.getByRole('checkbox', { name: 'enable Nonogram' })).toBeChecked();
    await expectBoardAlive(page);
  });

  test('the last remaining game is locked on (rotation never empties)', async ({ page }) => {
    // Seed a state where only one game is enabled.
    await seedOnly(page, 'graph-coloring');
    await page.goto('/box?seed=1');
    await expectBoardAlive(page);
    await openOptions(page);

    // The sole enabled game's checkbox is checked but disabled — it cannot be
    // turned off, so the rotation can never empty.
    const lastBox = page.getByRole('checkbox', { name: 'enable Graph Coloring' });
    await expect(lastBox).toBeChecked();
    await expect(lastBox).toBeDisabled();

    // Attempting to click it changes nothing and the board stays alive.
    await lastBox.click({ force: true });
    await expect(lastBox).toBeChecked();
    await expectBoardAlive(page);
  });
});
