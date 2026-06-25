import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// Hitting Set (set-cover archetype, transposed): select ≤k elements from the
// universe so every given subset contains at least one selected element.
// Modeled as set-cover on the transposed instance so SetBoard renders it directly:
//   - "universe"  = original subset indices [0..subsetCount-1]
//   - "subsets"   = for each original element e, which original subsets e hits
//   - "selected"  = which original elements the player picks
//   - "k"         = element budget
export interface HittingSetState {
  universe: number[];
  subsets: number[][];
  k: number;
  selected: boolean[];
  instruction: string;
}
export interface HittingSetMove {
  subsetIndex: number; // index into `subsets` array (= original element index)
}

function configFor(d: Difficulty) {
  const universeSize = Math.max(4, Math.round(4 + d / 300));
  const subsetCount = Math.max(4, Math.round(4 + d / 300));
  return { universeSize, subsetCount };
}

export const hittingSet: PuzzleGame<HittingSetState, HittingSetMove> = {
  id: 'hitting-set',
  name: 'Hitting Set',
  archetype: 'set-cover',

  generate(difficulty: Difficulty, rng: Rng): Generated<HittingSetState, HittingSetMove> {
    const { universeSize, subsetCount } = configFor(difficulty);

    // Build original subsets (each non-empty, size 2-3 elements).
    const originalSubsets: number[][] = [];
    for (let i = 0; i < subsetCount; i++) {
      const size = 2 + rng.int(2);
      const elements = rng
        .shuffle(Array.from({ length: universeSize }, (_, e) => e))
        .slice(0, Math.min(size, universeSize))
        .sort((a, b) => a - b);
      originalSubsets.push(elements);
    }

    // Plant a hitting set: for each original subset pick one element to be a hitter.
    const hittingSetElements = new Set<number>();
    for (const subset of originalSubsets) {
      hittingSetElements.add(subset[rng.int(subset.length)]);
    }
    const hittingSetArr = Array.from(hittingSetElements).sort((a, b) => a - b);
    const k = hittingSetArr.length;

    // Build transposed representation.
    const universe = Array.from({ length: subsetCount }, (_, i) => i);
    const transposedSubsets: number[][] = Array.from({ length: universeSize }, (_, e) =>
      originalSubsets
        .map((s, i) => (s.includes(e) ? i : -1))
        .filter((i) => i >= 0),
    );

    const puzzle: HittingSetState = {
      universe,
      subsets: transposedSubsets,
      k,
      selected: Array(universeSize).fill(false),
      instruction: `Select ≤ ${k} elements so every set contains at least one selected element`,
    };

    const solution: HittingSetMove[] = hittingSetArr.map((e) => ({ subsetIndex: e }));
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const selected = [...state.selected];
    selected[move.subsetIndex] = !selected[move.subsetIndex];
    return { ...state, selected };
  },

  isSolved(state) {
    const count = state.selected.filter(Boolean).length;
    if (count > state.k) return false;
    const covered = new Set<number>();
    state.subsets.forEach((hits, e) => {
      if (state.selected[e]) hits.forEach((j) => covered.add(j));
    });
    return state.universe.every((j) => covered.has(j));
  },

  progress(state) {
    const covered = new Set<number>();
    state.subsets.forEach((hits, e) => {
      if (state.selected[e]) hits.forEach((j) => covered.add(j));
    });
    return Math.round((covered.size / state.universe.length) * 100);
  },
};
