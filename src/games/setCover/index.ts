import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected } from '../_shared/selection';

// Set Cover (set-cover archetype): choose at most k subsets whose union is the
// whole universe.
export interface SetCoverState {
  universe: number[];
  subsets: number[][];
  k: number; // budget = size of the planted cover
  selected: boolean[];
}
export interface SetCoverMove {
  subsetIndex: number;
}

function configFor(d: Difficulty) {
  const universeSize = Math.max(6, Math.round(6 + d / 200)); // ~6..18
  const coverParts = Math.min(5, Math.max(2, Math.round(2 + d / 700)));
  const decoys = Math.max(2, Math.round(2 + d / 400));
  return { universeSize, coverParts, decoys };
}

export const setCover: PuzzleGame<SetCoverState, SetCoverMove> = {
  id: 'set-cover',
  name: 'Set Cover',
  archetype: 'set-cover',

  generate(difficulty: Difficulty, rng: Rng): Generated<SetCoverState, SetCoverMove> {
    const { universeSize, coverParts, decoys } = configFor(difficulty);
    const universe = Array.from({ length: universeSize }, (_, i) => i);

    // Partition the universe into `coverParts` non-empty groups => an exact cover.
    const shuffled = rng.shuffle(universe);
    const cover: number[][] = Array.from({ length: coverParts }, () => []);
    shuffled.forEach((el, i) => {
      // First coverParts elements seed each group so none is empty.
      const group = i < coverParts ? i : rng.int(coverParts);
      cover[group].push(el);
    });

    // Decoy subsets: random non-empty subsets that don't trivially cover alone.
    const decoySubsets: number[][] = Array.from({ length: decoys }, () => {
      const size = 1 + rng.int(Math.max(1, Math.floor(universeSize / 2)));
      return rng.shuffle(universe).slice(0, size).sort((a, b) => a - b);
    });

    // Interleave cover + decoys, remember where the cover subsets landed.
    const tagged = [
      ...cover.map((s) => ({ s, isCover: true })),
      ...decoySubsets.map((s) => ({ s, isCover: false })),
    ];
    const order = rng.shuffle(tagged);
    const subsets = order.map((t) => [...t.s].sort((a, b) => a - b));
    const solution: SetCoverMove[] = order
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.isCover)
      .map(({ i }) => ({ subsetIndex: i }));

    const puzzle: SetCoverState = {
      universe,
      subsets,
      k: coverParts,
      selected: Array(subsets.length).fill(false),
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.subsetIndex),

  isSolved(state) {
    const count = state.selected.filter(Boolean).length;
    if (count > state.k) return false;
    const covered = new Set<number>();
    state.subsets.forEach((s, i) => {
      if (state.selected[i]) s.forEach((e) => covered.add(e));
    });
    return state.universe.every((e) => covered.has(e));
  },

  progress(state) {
    const covered = new Set<number>();
    state.subsets.forEach((s, i) => {
      if (state.selected[i]) s.forEach((e) => covered.add(e));
    });
    return Math.round((covered.size / state.universe.length) * 100);
  },
};
