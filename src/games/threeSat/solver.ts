import type { SolverSpec } from '../solvers/types';
import { bitmasks } from '../solvers/enumerate';
import type { SatState } from './index';

// Search space: every truth assignment over numVars (2^numVars). Assignment is
// 1-indexed (slot 0 unused), matching SatState.assignment.
const toAssignment = (mask: boolean[]): (boolean | null)[] => [null, ...mask];

export const threeSatSpec: SolverSpec<SatState> = {
  *enumerate(puzzle) {
    for (const mask of bitmasks(puzzle.numVars)) {
      yield { ...puzzle, assignment: toAssignment(mask) };
    }
  },
  randomCandidate: (puzzle, rng) => ({
    ...puzzle,
    assignment: toAssignment(Array.from({ length: puzzle.numVars }, () => rng.next() < 0.5)),
  }),
};
