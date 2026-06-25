import type { PuzzleGame } from './types';

// The game box auto-discovers every puzzle. Dropping a folder under
// src/games/<name>/index.ts that exports a PuzzleGame is the ENTIRE
// registration step — no list to edit, so a new game can never be silently
// missing from the endless rotation or the advanced settings. Order is sorted
// by id for a stable, deterministic rotation across builds.

// Minimal structural check so only real games are picked up (helpers, types,
// and renderers in sibling files are ignored).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPuzzleGame(v: any): v is PuzzleGame<any, any> {
  return (
    v &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    typeof v.archetype === 'string' &&
    typeof v.generate === 'function' &&
    typeof v.isSolved === 'function' &&
    typeof v.progress === 'function'
  );
}

// Eagerly import every game module. Vite (and Vitest) resolve this glob at build
// time, so the set is fixed and tree-shakeable — just not hand-maintained.
const modules = import.meta.glob('./*/index.ts', { eager: true });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAMES: PuzzleGame<any, any>[] = Object.values(modules)
  .map((mod) => Object.values(mod as Record<string, unknown>).find(isPuzzleGame))
  .filter((g): g is PuzzleGame<any, any> => Boolean(g))
  .sort((a, b) => a.id.localeCompare(b.id));

export const GAME_IDS = GAMES.map((g) => g.id);

// Expose the live id list to e2e so fixtures never hardcode the roster — a new
// game is picked up by tests automatically, the same way it is by the box.
if (typeof window !== 'undefined') {
  (window as unknown as { __PIP_GAME_IDS__?: string[] }).__PIP_GAME_IDS__ = GAME_IDS;
}

export function getGame(id: string) {
  const g = GAMES.find((game) => game.id === id);
  if (!g) throw new Error(`Unknown game: ${id}`);
  return g;
}
