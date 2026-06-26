import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected } from '../_shared/selection';

export interface SetPackingState {
  universe: number[];
  subsets: number[][];
  k: number;
  selected: boolean[];
  instruction: string;
}
export interface SetPackingMove {
  subsetIndex: number;
}

function configFor(d: Difficulty) {
  const universeSize = Math.max(6, Math.round(6 + d / 200));
  const k = Math.min(4, Math.max(2, Math.round(2 + d / 700)));
  const decoys = Math.max(2, Math.round(2 + d / 400));
  return { universeSize, k, decoys };
}

export const setPacking: PuzzleGame<SetPackingState, SetPackingMove> = {
  id: 'set-packing',
  name: 'Set Packing',
  archetype: 'set-cover',

  generate(difficulty: Difficulty, rng: Rng): Generated<SetPackingState, SetPackingMove> {
    const { universeSize, k, decoys } = configFor(difficulty);
    const universe = Array.from({ length: universeSize }, (_, i) => i);

    // Partition the universe into k non-overlapping groups (planted packing).
    const shuffled = rng.shuffle(universe);
    const packing: number[][] = Array.from({ length: k }, () => []);
    shuffled.forEach((el, i) => {
      const group = i < k ? i : rng.int(k);
      packing[group].push(el);
    });

    // Decoy subsets: each overlaps with at least one planted packing subset.
    const decoySubsets: number[][] = Array.from({ length: decoys }, () => {
      // Pick a random planted subset and steal 1+ elements from it, then add some from others.
      const srcGroup = packing[rng.int(k)];
      const stolen = rng.shuffle(srcGroup).slice(0, Math.max(1, rng.int(srcGroup.length)));
      const extra = rng.shuffle(universe)
        .filter((e) => !stolen.includes(e))
        .slice(0, rng.int(Math.max(1, Math.floor(universeSize / 3))));
      return [...new Set([...stolen, ...extra])].sort((a, b) => a - b);
    });

    const tagged = [
      ...packing.map((s) => ({ s, isPacking: true })),
      ...decoySubsets.map((s) => ({ s, isPacking: false })),
    ];
    const order = rng.shuffle(tagged);
    const subsets = order.map((t) => [...t.s].sort((a, b) => a - b));
    const solution: SetPackingMove[] = order
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.isPacking)
      .map(({ i }) => ({ subsetIndex: i }));

    const puzzle: SetPackingState = {
      universe,
      subsets,
      k,
      selected: Array(subsets.length).fill(false),
      instruction: `Select ${k} pairwise disjoint subsets (no shared elements)`,
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.subsetIndex),

  isSolved(state) {
    const selectedIndices = state.selected.map((v: boolean, i: number) => [v, i] as [boolean, number]).filter(([v]) => v).map(([, i]) => i);
    if (selectedIndices.length !== state.k) return false;
    // Check pairwise disjoint.
    const elementCount = new Map<number, number>();
    for (const i of selectedIndices) {
      for (const e of state.subsets[i]) {
        elementCount.set(e, (elementCount.get(e) ?? 0) + 1);
        if ((elementCount.get(e) ?? 0) > 1) return false;
      }
    }
    return true;
  },

  progress(state) {
    const selectedIndices = state.selected.map((v: boolean, i: number) => [v, i] as [boolean, number]).filter(([v]) => v).map(([, i]) => i);
    if (selectedIndices.length === 0) return 0;
    // Check for conflicts.
    const elementCount = new Map<number, number>();
    for (const i of selectedIndices) {
      for (const e of state.subsets[i]) {
        elementCount.set(e, (elementCount.get(e) ?? 0) + 1);
      }
    }
    const hasConflict = [...elementCount.values()].some((c) => c > 1);
    if (hasConflict) return 0;
    return Math.round((selectedIndices.length / state.k) * 100);
  },
};
