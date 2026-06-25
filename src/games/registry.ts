import type { PuzzleGame } from './types';
import { graphColoring } from './graphColoring';
import { setCover } from './setCover';
import { hamiltonian } from './hamiltonian';
import { threeSat } from './threeSat';
import { nonogram } from './nonogram';

// The game box. Each entry is a self-contained NP-complete puzzle conforming to
// the PuzzleGame contract. Adding a game = appending one entry.
//
// NOTE: bin-packing (src/utils/puzzleGenerator.ts) is the original game and keeps
// its bespoke UI; a PuzzleGame adapter that exposes its planted solution is a
// follow-up so it can join this registry and the conformance suite.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAMES: PuzzleGame<any, any>[] = [graphColoring, setCover, hamiltonian, threeSat, nonogram];

export const GAME_IDS = GAMES.map((g) => g.id);

export function getGame(id: string) {
  const g = GAMES.find((game) => game.id === id);
  if (!g) throw new Error(`Unknown game: ${id}`);
  return g;
}