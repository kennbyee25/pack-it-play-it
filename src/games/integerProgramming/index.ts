import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// 0/1 Integer Programming (integer-programming archetype): assign binary values
// to variables so all linear constraints are satisfied.
export interface IpState {
  numVars: number;
  assignment: (boolean | null)[]; // index 0 unused; 1..numVars
  constraints: { coeffs: number[]; bound: number; op: '≤' | '≥' | '=' }[];
  // coeffs[i] is the coefficient for variable (i+1), length = numVars
}
export interface IpMove {
  variable: number; // 1..numVars
  value: boolean;
}

function configFor(d: Difficulty) {
  const numVars = Math.max(3, Math.round(3 + d / 400));
  const constraintCount = Math.max(2, Math.round(2 + d / 400));
  return { numVars, constraintCount };
}

function evalLhs(coeffs: number[], assignment: (boolean | null)[]): number {
  return coeffs.reduce((sum, c, i) => sum + c * (assignment[i + 1] ? 1 : 0), 0);
}

export const integerProgramming: PuzzleGame<IpState, IpMove> = {
  id: 'integer-programming',
  name: 'Integer Programming',
  archetype: 'integer-programming',

  generate(difficulty: Difficulty, rng: Rng): Generated<IpState, IpMove> {
    const { numVars, constraintCount } = configFor(difficulty);

    // Plant a random 0/1 assignment.
    const planted: (boolean | null)[] = [null];
    for (let i = 0; i < numVars; i++) planted.push(rng.next() < 0.5);

    const ops: ('≤' | '≥' | '=')[] = ['≤', '≤', '≥', '≥', '='];
    const constraints: IpState['constraints'] = [];

    for (let c = 0; c < constraintCount; c++) {
      const coeffs: number[] = [];
      for (let i = 0; i < numVars; i++) {
        let coeff = rng.int(7) - 3; // -3..3
        if (coeff === 0) coeff = 1;
        coeffs.push(coeff);
      }
      const lhs = evalLhs(coeffs, planted);
      const op = ops[rng.int(ops.length)];
      let bound: number;
      if (op === '≤') {
        bound = lhs + rng.int(3);
      } else if (op === '≥') {
        bound = lhs - rng.int(3);
      } else {
        bound = lhs;
      }
      constraints.push({ coeffs, bound, op });
    }

    const puzzle: IpState = {
      numVars,
      assignment: Array(numVars + 1).fill(null),
      constraints,
    };

    const solution: IpMove[] = Array.from({ length: numVars }, (_, i) => ({
      variable: i + 1,
      value: planted[i + 1] as boolean,
    }));

    return { puzzle, solution };
  },

  applyMove(state, move) {
    const assignment = [...state.assignment];
    assignment[move.variable] = move.value;
    return { ...state, assignment };
  },

  isSolved(state) {
    if (state.assignment.slice(1).some((v) => v === null)) return false;
    return state.constraints.every(({ coeffs, bound, op }) => {
      const lhs = evalLhs(coeffs, state.assignment);
      if (op === '≤') return lhs <= bound;
      if (op === '≥') return lhs >= bound;
      return lhs === bound;
    });
  },

  progress(state) {
    if (state.assignment.slice(1).every((v) => v === null)) return 0;
    if (state.constraints.length === 0) return 100;
    const satisfied = state.constraints.filter(({ coeffs, bound, op }) => {
      const lhs = evalLhs(coeffs, state.assignment);
      if (op === '≤') return lhs <= bound;
      if (op === '≥') return lhs >= bound;
      return lhs === bound;
    }).length;
    return Math.round((satisfied / state.constraints.length) * 100);
  },
};
