import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

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
  description: 'Pick as few groups as possible so that every item appears in at least one chosen group.',
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

  applyMove(state, move) {
    const selected = [...state.selected];
    // Toggle: clicking a selected subset again deselects it.
    selected[move.subsetIndex] = !selected[move.subsetIndex];
    return { ...state, selected };
  },

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

  countSolutions(puzzle: SetCoverState, max: number): number {
    const { universe, subsets, k } = puzzle;
    const n = subsets.length;
    let count = 0;

    // Returns true when count reaches `max`.
    function bt(idx: number, selected: number, covered: Set<number>): boolean {
      if (selected > k) return false;
      if (covered.size === universe.length) {
        count++;
        return count >= max;
      }
      if (idx === n) return false;

      // Prune: even selecting all remaining subsets can't cover everything.
      const reachable = new Set(covered);
      for (let i = idx; i < n; i++) subsets[i].forEach((e) => reachable.add(e));
      if (reachable.size < universe.length) return false;

      // Include subsets[idx].
      const added: number[] = [];
      subsets[idx].forEach((e) => { if (!covered.has(e)) { covered.add(e); added.push(e); } });
      if (bt(idx + 1, selected + 1, covered)) return true;
      added.forEach((e) => covered.delete(e));

      // Exclude subsets[idx].
      return bt(idx + 1, selected, covered);
    }

    bt(0, 0, new Set());
    return count;
  },
};
