import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// 3-SAT (logic-assignment archetype): assign truth values so every 3-literal
// clause has at least one true literal. Literals are signed, 1-indexed vars
// (e.g. -3 means NOT x3).
export interface SatState {
  numVars: number;
  clauses: [number, number, number][];
  assignment: (boolean | null)[]; // index 0 unused; 1..numVars
}
export interface SatMove {
  variable: number; // 1..numVars
  value: boolean;
}

function configFor(d: Difficulty) {
  const numVars = Math.max(3, Math.round(3 + d / 300)); // ~3..12
  const clauses = Math.max(numVars, Math.round(numVars * (2 + d / 1500)));
  return { numVars, clauses };
}

const literalTrue = (lit: number, assignment: (boolean | null)[]): boolean | null => {
  const v = assignment[Math.abs(lit)];
  if (v === null) return null;
  return lit > 0 ? v : !v;
};

export const threeSat: PuzzleGame<SatState, SatMove> = {
  id: 'three-sat',
  name: '3-SAT',
  description: 'Set each variable true or false so that every row has at least one true value.',
  archetype: 'logic-assignment',

  generate(difficulty: Difficulty, rng: Rng): Generated<SatState, SatMove> {
    const { numVars, clauses: clauseCount } = configFor(difficulty);
    // Plant a satisfying assignment, then build clauses satisfied by it.
    const planted = [null as boolean | null, ...Array.from({ length: numVars }, () => rng.next() < 0.5)];

    const clauses: [number, number, number][] = [];
    for (let c = 0; c < clauseCount; c++) {
      // Pick 3 distinct variables.
      const vars = rng.shuffle(Array.from({ length: numVars }, (_, i) => i + 1)).slice(0, 3);
      // Guarantee at least one literal is true under the planted assignment.
      const guaranteed = rng.int(3);
      const lits = vars.map((v, idx) => {
        if (idx === guaranteed) {
          // sign so the literal is true: positive if planted true, else negative.
          return planted[v] ? v : -v;
        }
        return rng.next() < 0.5 ? v : -v;
      }) as [number, number, number];
      clauses.push(lits);
    }

    const puzzle: SatState = {
      numVars,
      clauses,
      assignment: Array(numVars + 1).fill(null),
    };
    const solution: SatMove[] = Array.from({ length: numVars }, (_, i) => ({
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
    return state.clauses.every((c) => c.some((lit) => literalTrue(lit, state.assignment) === true));
  },

  progress(state) {
    if (state.clauses.length === 0) return 100;
    const satisfied = state.clauses.filter((c) =>
      c.some((lit) => literalTrue(lit, state.assignment) === true),
    ).length;
    return Math.round((satisfied / state.clauses.length) * 100);
  },

  countSolutions(puzzle: SatState, max: number): number {
    const { numVars, clauses } = puzzle;
    const assignment: (boolean | null)[] = Array(numVars + 1).fill(null);
    let count = 0;

    // Returns true when count has reached `max` (early exit signal).
    function bt(v: number): boolean {
      if (v > numVars) {
        if (clauses.every((c) => c.some((lit) => literalTrue(lit, assignment) === true))) {
          count++;
        }
        return count >= max;
      }
      for (const val of [true, false]) {
        assignment[v] = val;
        // Prune: if any clause is already fully falsified, skip this branch.
        const falsified = clauses.some((c) =>
          c.every((lit) => literalTrue(lit, assignment) === false),
        );
        if (!falsified && bt(v + 1)) return true;
      }
      assignment[v] = null;
      return false;
    }

    bt(1);
    return count;
  },
};
