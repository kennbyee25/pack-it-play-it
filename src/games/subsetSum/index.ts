import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected } from '../_shared/selection';

export interface SubsetSumItem {
  value: number;
}

export interface SubsetSumState {
  items: SubsetSumItem[];
  selected: boolean[];
  target: number;
  targetLabel: string;
  instruction: string;
}

export interface SubsetSumMove {
  itemIndex: number;
}

function configFor(d: Difficulty) {
  const itemCount = Math.max(5, Math.round(5 + d / 200));
  const solutionSize = Math.max(2, Math.round(2 + d / 600));
  const maxVal = Math.max(5, Math.round(5 + d / 50));
  const decoys = Math.max(2, Math.round(d / 400));
  return { itemCount, solutionSize, maxVal, decoys };
}

export const subsetSum: PuzzleGame<SubsetSumState, SubsetSumMove> = {
  id: 'subset-sum',
  name: 'Subset Sum',
  archetype: 'number-packing',

  generate(difficulty: Difficulty, rng: Rng): Generated<SubsetSumState, SubsetSumMove> {
    const { itemCount, solutionSize, maxVal, decoys } = configFor(difficulty);

    // Plant solution items
    const solutionValues = Array.from({ length: solutionSize }, () => 1 + rng.int(maxVal));
    const target = solutionValues.reduce((a, b) => a + b, 0);

    // Decoy items: pick random values, avoid accidentally equaling target alone
    const decoyValues: number[] = [];
    let attempts = 0;
    while (decoyValues.length < decoys && attempts < decoys * 20) {
      attempts++;
      const v = 1 + rng.int(maxVal);
      decoyValues.push(v);
    }

    // Also fill up to itemCount with random values
    const extraCount = Math.max(0, itemCount - solutionSize - decoyValues.length);
    const extraValues = Array.from({ length: extraCount }, () => 1 + rng.int(maxVal));

    const allValues = [...solutionValues, ...decoyValues, ...extraValues];
    const shuffleIndices = rng.shuffle(allValues.map((v, i) => ({ v, isSolution: i < solutionSize })));

    const items: SubsetSumItem[] = shuffleIndices.map(({ v }) => ({ value: v }));
    const solution: SubsetSumMove[] = shuffleIndices
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => x.isSolution)
      .map(({ i }) => ({ itemIndex: i }));

    const puzzle: SubsetSumState = {
      items,
      selected: Array(items.length).fill(false),
      target,
      targetLabel: 'Target',
      instruction: `Select numbers that sum to exactly ${target}`,
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.itemIndex),

  isSolved(state) {
    if (!state.selected.some(Boolean)) return false;
    const sum = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.value : 0), 0);
    return sum === state.target;
  },

  progress(state) {
    const sum = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.value : 0), 0);
    if (sum === state.target && state.selected.some(Boolean)) return 100;
    if (state.target === 0) return 0;
    return Math.round(Math.max(0, 100 - (Math.abs(sum - state.target) / state.target) * 100));
  },
};
