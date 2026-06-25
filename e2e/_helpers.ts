import type { Page } from '@playwright/test';

// Read the box's live game roster (published by the registry on load) so test
// fixtures never hardcode the list. Adding a game is picked up automatically.
async function allGameIds(page: Page): Promise<string[]> {
  if (page.url() === 'about:blank') await page.goto('/box');
  const ids = await page.evaluate(
    () => (window as unknown as { __PIP_GAME_IDS__?: string[] }).__PIP_GAME_IDS__,
  );
  if (!ids || ids.length === 0) throw new Error('registry did not publish __PIP_GAME_IDS__');
  return ids;
}

// Seed pip.settings so only `enabledIds` are on (all other registered games off),
// all at the same difficulty. Applied via addInitScript, so the next navigation
// loads with this deterministic rotation.
export async function seedEnabled(page: Page, enabledIds: string[], difficulty = 1000) {
  const ids = await allGameIds(page);
  const settings = Object.fromEntries(
    ids.map((id) => [id, { enabled: enabledIds.includes(id), difficulty }]),
  );
  await page.addInitScript(
    ([k, v]) => window.localStorage.setItem(k as string, v as string),
    ['pip.settings', JSON.stringify(settings)],
  );
}

// Convenience: enable exactly one game.
export const seedOnly = (page: Page, onlyId: string, difficulty = 1000) =>
  seedEnabled(page, [onlyId], difficulty);
