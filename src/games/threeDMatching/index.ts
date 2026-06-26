import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected, pickedIndices } from '../_shared/selection';

export interface ThreeDMatchingState {
  universe: number[];
  subsets: number[][];
  k: number;
  selected: boolean[];
  instruction: string;
  n: number; // size of each of the 3 sets (universe = 3*n elements)
}
export interface ThreeDMatchingMove {
  subsetIndex: number;
}

function configFor(d: Difficulty) {
  const n = Math.max(2, Math.round(2 + d / 600));
  const decoys = Math.max(2, Math.round(2 + d / 300));
  return { n, decoys };
}

export const threeDMatching: PuzzleGame<ThreeDMatchingState, ThreeDMatchingMove> = {
  id: '3d-matching',
  name: '3D Matching',
  archetype: 'set-cover',

  generate(difficulty: Difficulty, rng: Rng): Generated<ThreeDMatchingState, ThreeDMatchingMove> {
    const { n, decoys } = configFor(difficulty);
    // Universe: U=[0..n-1], V=[n..2n-1], W=[2n..3n-1]
    const universeSize = 3 * n;
    const universe = Array.from({ length: universeSize }, (_, i) => i);

    // Plant a perfect matching: diagonal triples {i, n+i, 2n+i}
    const matchingTriples: number[][] = Array.from({ length: n }, (_, i) => [i, n + i, 2 * n + i]);

    // Decoy triples: random {u_i, v_j, w_k} combinations not in the planted matching.
    const plantedKeys = new Set(matchingTriples.map((t) => t.join(',')));
    const decoyTriples: number[][] = [];
    let tries = 0;
    while (decoyTriples.length < decoys && tries < decoys * 50) {
      tries++;
      const ui = rng.int(n);
      const vj = n + rng.int(n);
      const wk = 2 * n + rng.int(n);
      const triple = [ui, vj, wk];
      const key = triple.join(',');
      if (!plantedKeys.has(key)) {
        plantedKeys.add(key);
        decoyTriples.push(triple);
      }
    }

    const allTriples = [...matchingTriples, ...decoyTriples];
    const tagged = allTriples.map((t, i) => ({ s: t, isMatching: i < n }));
    const order = rng.shuffle(tagged);
    const subsets = order.map((t) => [...t.s]);
    const solution: ThreeDMatchingMove[] = order
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.isMatching)
      .map(({ i }) => ({ subsetIndex: i }));

    const puzzle: ThreeDMatchingState = {
      universe,
      subsets,
      k: n,
      selected: Array(subsets.length).fill(false),
      instruction: `Select ${n} triples — one per element in each of the three groups`,
      n,
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.subsetIndex),

  isSolved(state) {
    const selectedIndices = pickedIndices(state.selected);
    if (selectedIndices.length !== state.k) return false;
    const elementCount = new Map<number, number>();
    for (const i of selectedIndices) {
      for (const e of state.subsets[i]) {
        elementCount.set(e, (elementCount.get(e) ?? 0) + 1);
        if ((elementCount.get(e) ?? 0) > 1) return false;
      }
    }
    return state.universe.every((e: number) => (elementCount.get(e) ?? 0) === 1);
  },

  progress(state) {
    const selectedIndices = pickedIndices(state.selected);
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
