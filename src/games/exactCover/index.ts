import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

export interface ExactCoverState {
  universe: number[];
  subsets: number[][];
  k: number;
  selected: boolean[];
  instruction: string;
}
export interface ExactCoverMove {
  subsetIndex: number;
}

function configFor(d: Difficulty) {
  const universeSize = Math.max(6, Math.round(6 + d / 200));
  const coverParts = Math.min(5, Math.max(2, Math.round(2 + d / 700)));
  const decoys = Math.max(2, Math.round(2 + d / 400));
  return { universeSize, coverParts, decoys };
}

export const exactCover: PuzzleGame<ExactCoverState, ExactCoverMove> = {
  id: 'exact-cover',
  name: 'Exact Cover',
  archetype: 'set-cover',

  generate(difficulty: Difficulty, rng: Rng): Generated<ExactCoverState, ExactCoverMove> {
    const { universeSize, coverParts, decoys } = configFor(difficulty);
    const universe = Array.from({ length: universeSize }, (_, i) => i);

    // Partition the universe into coverParts non-empty groups (exact cover).
    const shuffled = rng.shuffle(universe);
    const cover: number[][] = Array.from({ length: coverParts }, () => []);
    shuffled.forEach((el, i) => {
      const group = i < coverParts ? i : rng.int(coverParts);
      cover[group].push(el);
    });

    // Decoy subsets: random non-empty subsets (may overlap arbitrarily).
    const decoySubsets: number[][] = Array.from({ length: decoys }, () => {
      const size = 1 + rng.int(Math.max(1, Math.floor(universeSize / 2)));
      return rng.shuffle(universe).slice(0, size).sort((a, b) => a - b);
    });

    const tagged = [
      ...cover.map((s) => ({ s, isCover: true })),
      ...decoySubsets.map((s) => ({ s, isCover: false })),
    ];
    const order = rng.shuffle(tagged);
    const subsets = order.map((t) => [...t.s].sort((a, b) => a - b));
    const solution: ExactCoverMove[] = order
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.isCover)
      .map(({ i }) => ({ subsetIndex: i }));

    const puzzle: ExactCoverState = {
      universe,
      subsets,
      k: coverParts,
      selected: Array(subsets.length).fill(false),
      instruction: 'Select subsets that cover every element exactly once (no overlaps, no gaps)',
    };
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const selected = [...state.selected];
    selected[move.subsetIndex] = !selected[move.subsetIndex];
    return { ...state, selected };
  },

  isSolved(state) {
    const selectedCount = state.selected.filter(Boolean).length;
    if (selectedCount !== state.k) return false;
    const elementCount = new Map<number, number>();
    state.subsets.forEach((s: number[], i: number) => {
      if (state.selected[i]) {
        s.forEach((e: number) => elementCount.set(e, (elementCount.get(e) ?? 0) + 1));
      }
    });
    return (
      state.universe.every((e: number) => (elementCount.get(e) ?? 0) === 1) &&
      elementCount.size === state.universe.length
    );
  },

  progress(state) {
    const selectedIndices = state.selected
      .map((v: boolean, i: number) => (v ? i : -1))
      .filter((i: number) => i >= 0);
    if (selectedIndices.length === 0) return 0;
    const elementCount = new Map<number, number>();
    for (const i of selectedIndices) {
      for (const e of state.subsets[i]) {
        elementCount.set(e, (elementCount.get(e) ?? 0) + 1);
      }
    }
    const wellCovered = state.universe.filter((e: number) => (elementCount.get(e) ?? 0) === 1).length;
    return Math.round((wellCovered / state.universe.length) * 100);
  },
};
