import type { SolverSpec } from '../solvers/types';
import { bitmasks, randomMask } from '../solvers/enumerate';
import type { SetCoverState } from './index';

// Search space: every choice of subsets (selection mask over subsets.length).
export const setCoverSpec: SolverSpec<SetCoverState> = {
  *enumerate(puzzle) {
    for (const selected of bitmasks(puzzle.subsets.length)) {
      yield { ...puzzle, selected };
    }
  },
  randomCandidate: (puzzle, rng) => ({ ...puzzle, selected: randomMask(puzzle.subsets.length, rng) }),
};
