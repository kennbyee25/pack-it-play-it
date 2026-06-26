import type { SolverSpec } from '../solvers/types';
import { bitmasks, randomMask } from '../solvers/enumerate';
import type { SubsetSumState } from './index';

// Search space: every subset of the items (selection mask over items.length).
export const subsetSumSpec: SolverSpec<SubsetSumState> = {
  *enumerate(puzzle) {
    for (const selected of bitmasks(puzzle.items.length)) {
      yield { ...puzzle, selected };
    }
  },
  randomCandidate: (puzzle, rng) => ({ ...puzzle, selected: randomMask(puzzle.items.length, rng) }),
};
