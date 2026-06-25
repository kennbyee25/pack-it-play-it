import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

export interface PartitionItem {
  value: number;
}

export interface PartitionState {
  items: PartitionItem[];
  selected: boolean[];
  target: number;
  targetLabel: string;
  instruction: string;
}

export interface PartitionMove {
  itemIndex: number;
}

function configFor(d: Difficulty) {
  const halfSize = Math.max(2, Math.round(2 + d / 400));
  const maxVal = Math.max(3, Math.round(3 + d / 80));
  return { halfSize, maxVal };
}

export const partition: PuzzleGame<PartitionState, PartitionMove> = {
  id: 'partition',
  name: 'Partition',
  archetype: 'number-packing',

  generate(difficulty: Difficulty, rng: Rng): Generated<PartitionState, PartitionMove> {
    const { halfSize, maxVal } = configFor(difficulty);

    // Build group A: halfSize random values
    const groupAValues = Array.from({ length: halfSize }, () => 1 + rng.int(maxVal));
    const sumA = groupAValues.reduce((a, b) => a + b, 0);

    // Build group B: halfSize-1 random values + one computed value so sumB === sumA
    const groupBPartial = Array.from({ length: halfSize - 1 }, () => 1 + rng.int(maxVal));
    const sumBPartial = groupBPartial.reduce((a, b) => a + b, 0);
    const lastB = sumA - sumBPartial;
    // Ensure lastB >= 1 (if not, reduce some B values)
    const adjustedLastB = Math.max(1, lastB);
    // If we had to clamp, recompute sumA to match: add the difference to sumA by adding to a group A value
    let finalGroupA = [...groupAValues];
    if (lastB < 1) {
      finalGroupA = [...groupAValues];
      finalGroupA[0] += 1 - lastB;
    }
    const groupBValues = [...groupBPartial, adjustedLastB];

    const allTagged = [
      ...finalGroupA.map((v) => ({ v, isA: true })),
      ...groupBValues.map((v) => ({ v, isA: false })),
    ];
    const shuffled = rng.shuffle(allTagged);

    const items: PartitionItem[] = shuffled.map(({ v }) => ({ value: v }));
    const target = finalGroupA.reduce((a, b) => a + b, 0);
    const solution: PartitionMove[] = shuffled
      .map(({ isA }, i) => ({ isA, i }))
      .filter(({ isA }) => isA)
      .map(({ i }) => ({ itemIndex: i }));

    const puzzle: PartitionState = {
      items,
      selected: Array(items.length).fill(false),
      target,
      targetLabel: 'Half total',
      instruction: `Select numbers that sum to exactly half the total (${target})`,
    };
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const selected = [...state.selected];
    selected[move.itemIndex] = !selected[move.itemIndex];
    return { ...state, selected };
  },

  isSolved(state) {
    const sum = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.value : 0), 0);
    return sum === state.target;
  },

  progress(state) {
    const sum = state.items.reduce((s, item, i) => s + (state.selected[i] ? item.value : 0), 0);
    if (sum === state.target) return 100;
    if (state.target === 0) return 0;
    return Math.round(Math.max(0, 100 - (Math.abs(sum - state.target) / state.target) * 100));
  },
};
