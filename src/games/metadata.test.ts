import { describe, it, expect } from 'vitest';
import { GAMES, GAME_IDS } from './registry';
import { getMetadata, METADATA } from './metadata';

describe('game metadata', () => {
  it('every registered game has metadata with a category', () => {
    for (const g of GAMES) {
      const m = getMetadata(g.id);
      expect(m.category, `${g.id} category`).toBeTruthy();
    }
  });

  it('every reductionFrom id is a real, different game', () => {
    for (const [id, m] of Object.entries(METADATA)) {
      for (const parent of m.reductionFrom) {
        expect(GAME_IDS, `${id} <- ${parent}`).toContain(parent);
        expect(parent).not.toBe(id);
      }
    }
  });

  it('walking reductionFrom terminates at a root (no cycles)', () => {
    for (const id of GAME_IDS) {
      let frontier = [id];
      let depth = 0;
      while (frontier.length && depth <= GAME_IDS.length) {
        frontier = frontier.flatMap((g) => getMetadata(g).reductionFrom);
        depth++;
      }
      // If there were a cycle, frontier would never empty within roster-length steps.
      expect(frontier.length, `cycle reachable from ${id}`).toBe(0);
    }
  });
});
