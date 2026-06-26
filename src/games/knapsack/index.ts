import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected } from '../_shared/selection';

export interface KnapsackItem {
  value: number;
  weight: number;
}

export interface KnapsackState {
  items: KnapsackItem[];
  selected: boolean[];
  target: number;       // weight capacity
  valueTarget: number;  // minimum value to achieve
  targetLabel: string;
  instruction: string;
}

export interface KnapsackMove {
  itemIndex: number;
}

function configFor(d: Difficulty) {
  const itemCount = Math.max(4, Math.round(4 + d / 200));
  const solutionSize = Math.max(2, Math.round(2 + d / 600));
  const maxW = Math.max(3, Math.round(3 + d / 100));
  const maxV = Math.max(3, Math.round(3 + d / 100));
  const decoys = Math.max(2, Math.round(d / 400));
  return { itemCount, solutionSize, maxW, maxV, decoys };
}

export const knapsack: PuzzleGame<KnapsackState, KnapsackMove> = {
  id: 'knapsack',
  name: 'Knapsack',
  archetype: 'number-packing',

  generate(difficulty: Difficulty, rng: Rng): Generated<KnapsackState, KnapsackMove> {
    const { itemCount, solutionSize, maxW, maxV, decoys } = configFor(difficulty);

    // Plant solution items
    const solutionItems: KnapsackItem[] = Array.from({ length: solutionSize }, () => ({
      weight: 1 + rng.int(maxW),
      value: 1 + rng.int(maxV),
    }));
    const capacity = solutionItems.reduce((s, item) => s + item.weight, 0);
    const valueTarget = solutionItems.reduce((s, item) => s + item.value, 0);

    // Decoy items: some good ratio, some bad
    const decoyItems: KnapsackItem[] = Array.from({ length: decoys }, () => ({
      weight: 1 + rng.int(maxW),
      value: 1 + rng.int(maxV),
    }));

    // Extra filler items
    const extraCount = Math.max(0, itemCount - solutionSize - decoyItems.length);
    const extraItems: KnapsackItem[] = Array.from({ length: extraCount }, () => ({
      weight: 1 + rng.int(maxW),
      value: 1 + rng.int(maxV),
    }));

    const allItems = [...solutionItems, ...decoyItems, ...extraItems];
    const tagged = allItems.map((item, i) => ({ item, isSolution: i < solutionSize }));
    const shuffled = rng.shuffle(tagged);

    const items = shuffled.map(({ item }) => item);
    const solution: KnapsackMove[] = shuffled
      .map(({ isSolution }, i) => ({ isSolution, i }))
      .filter(({ isSolution }) => isSolution)
      .map(({ i }) => ({ itemIndex: i }));

    const puzzle: KnapsackState = {
      items,
      selected: Array(items.length).fill(false),
      target: capacity,
      valueTarget,
      targetLabel: 'Capacity',
      instruction: `Select items with total weight ≤ ${capacity} to reach value ≥ ${valueTarget}`,
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.itemIndex),

  isSolved(state) {
    const totalWeight = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.weight : 0), 0);
    const totalValue = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.value : 0), 0);
    return totalWeight <= state.target && totalValue >= state.valueTarget;
  },

  progress(state) {
    const totalWeight = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.weight : 0), 0);
    const totalValue = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.value : 0), 0);
    if (totalWeight > state.target) return 0;
    if (state.valueTarget === 0) return 100;
    return Math.round(Math.min(totalValue / state.valueTarget, 1) * 100);
  },
};
