import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GAMES, GAME_IDS } from './registry';

const gamesDir = dirname(fileURLToPath(import.meta.url));

// Every folder that looks like a game (src/games/<name>/index.ts) must surface
// in the auto-discovered registry. This is the safety net under glob-based
// registration: if a new game's export doesn't satisfy the PuzzleGame shape
// (typo'd field, missing archetype…), it would be silently dropped from the box
// — this test fails loudly instead.
describe('registry auto-discovery', () => {
  const gameFolders = readdirSync(gamesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(gamesDir, d.name, 'index.ts')))
    .map((d) => d.name);

  it('discovers exactly one PuzzleGame per game folder', () => {
    expect(GAMES.length).toBe(gameFolders.length);
  });

  it('assigns every game a unique id', () => {
    expect(new Set(GAME_IDS).size).toBe(GAME_IDS.length);
  });

  it('returns a stable, id-sorted order', () => {
    expect(GAME_IDS).toEqual([...GAME_IDS].sort((a, b) => a.localeCompare(b)));
  });
});
