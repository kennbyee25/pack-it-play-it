import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected, selectionCount } from '../_shared/selection';

// Exact Cover by 3-Sets (X3C) (set-cover archetype): choose subsets of size 3 that
// partition the universe (each element appears exactly once).
export interface X3CState {
  universe: number[];
  subsets: number[][]; // all subsets have length 3
  k: number; // = universe.length / 3
  selected: boolean[];
}
export interface X3CMove {
  subsetIndex: number;
}

function configFor(d: Difficulty) {
  // universe size must be multiple of 3
  const universeSize = Math.max(6, Math.round(6 + d / 100)); // ~6..30
  const adjustedSize = universeSize - (universeSize % 3); // make multiple of 3
  const subsets = Math.max(adjustedSize / 3, Math.round(adjustedSize / 3 + d / 200)); // more subsets as difficulty increases
  return { universeSize: adjustedSize, subsets };
}

export const x3c: PuzzleGame<X3CState, X3CMove> = {
  id: 'x3c',
  name: 'Exact Cover by 3-Sets (X3C)',
  archetype: 'set-cover',

  generate(difficulty: Difficulty, rng: Rng): Generated<X3CState, X3CMove> {
    const { universeSize, subsets: subsetCount } = configFor(difficulty);
    const universe = Array.from({ length: universeSize }, (_, i) => i);

    // Plant an exact cover: partition universe into groups of 3
    const plantedGroups: number[][] = [];
    const shuffled = rng.shuffle(universe);
    for (let i = 0; i < universeSize; i += 3) {
      plantedGroups.push(shuffled.slice(i, i + 3));
    }
    
    // Generate additional random 3-element subsets (decoys)
    const decoySubsets: number[][] = Array.from({ length: subsetCount }, () => {
      const picked = rng.shuffle(universe).slice(0, 3).sort((a, b) => a - b);
      return picked;
    });
    
    // Combine planted groups and decoys, remember which are from the planted cover
    const tagged = [
      ...plantedGroups.map((s) => ({ s, isPlanted: true })),
      ...decoySubsets.map((s) => ({ s, isPlanted: false })),
    ];
    const order = rng.shuffle(tagged);
    const subsets = order.map((t) => [...t.s]);
    const solution: X3CMove[] = order
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.isPlanted)
      .map(({ i }) => ({ subsetIndex: i }));

    const puzzle: X3CState = {
      universe,
      subsets,
      k: universeSize / 3,
      selected: Array(subsets.length).fill(false),
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.subsetIndex),

  isSolved(state) {
    const selectedCount = selectionCount(state.selected);
    if (selectedCount !== state.k) return false; // must select exactly k subsets
    
    // Check that each element appears exactly once in selected subsets
    const elementCount = new Array(state.universe.length).fill(0);
    state.subsets.forEach((subset, index) => {
      if (state.selected[index]) {
        subset.forEach((el) => {
          elementCount[el]++
        });
      }
    });
    
    // Every element must appear exactly once
    return elementCount.every(count => count === 1);
  },

  progress(state) {
    if (state.universe.length === 0) return 100;
    
    const selectedCount = selectionCount(state.selected);
    if (selectedCount > state.k) {
      // Over-selected - penalize
      return Math.max(0, 100 - Math.round(((selectedCount - state.k) / state.k) * 100));
    }
    
    // Under-selected: check coverage quality
    const coveredOnce = new Set<number>();
    const coveredMultiple = new Set<number>();
    const elementCount = new Array(state.universe.length).fill(0);
    
    state.subsets.forEach((subset, index) => {
      if (state.selected[index]) {
        subset.forEach((el) => {
          elementCount[el]++;
          if (elementCount[el] === 1) coveredOnce.add(el);
          else if (elementCount[el] === 2) coveredMultiple.add(el);
        });
      }
    });
    
    // Progress based on how many elements are covered exactly once
    const exactCoverage = coveredOnce.size;
    return Math.round((exactCoverage / state.universe.length) * 100);
  },
};