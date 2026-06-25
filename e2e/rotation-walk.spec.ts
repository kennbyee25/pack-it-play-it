import { test, expect } from '@playwright/test';

// Walk the full interleaved rotation across several seeds. With all games
// enabled, ~14 advances exercises every archetype's renderer, so any
// game whose archetype routes it to a renderer it doesn't fit would surface
// here as a wiped screen / error fallback. This is the integration backstop
// for the per-game render conformance unit tests.
for (const seed of [1, 2, 3, 7, 42]) {
  test(`walking the rotation never wipes the screen (seed ${seed})`, async ({ page }) => {
    await page.goto(`/box?seed=${seed}`);

    const seen = new Set<string>();
    for (let step = 0; step < 14; step++) {
      // The board is alive: a game heading + a progress readout are present...
      await expect(page.getByLabel('progress')).toBeVisible();
      const name = await page.getByRole('heading').first().textContent();
      if (name) seen.add(name);
      // ...and the puzzle never fell back to the crash boundary.
      await expect(page.getByLabel('puzzle-error')).toHaveCount(0);

      await page.getByRole('button', { name: /next puzzle/i }).click();
    }

    // Sanity: a full walk surfaced more than one game (the rotation really moved).
    expect(seen.size).toBeGreaterThan(1);
  });
}
