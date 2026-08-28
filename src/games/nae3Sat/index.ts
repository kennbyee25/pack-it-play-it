import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// NAE-3SAT (logic-assignment archetype): Not-All-Equal 3-SAT.
// Each clause must have at least one true and one false literal.
export interface Nae3SatState {
  numVars: number;
  clauses: [number, number, number][]; // 3-literal clauses, literals are signed 1-indexed vars
  assignment: (boolean | null)[]; // index 0 unused; 1..numVars
  instruction?: string;
}
export interface Nae3SatMove {
  variable: number; // 1..numVars
  value: boolean;
}

function configFor(d: Difficulty) {
  const numVars = Math.max(3, Math.round(3 + d / 300)); // ~3..12
  const clauses = Math.max(numVars, Math.round(numVars * (2 + d / 1500))); // clause density
  return { numVars, clauses };
}

const literalValue = (lit: number, assignment: (boolean | null)[]): boolean | null => {
  const v = assignment[Math.abs(lit)];
  if (v === null) return null;
  return lit > 0 ? v : !v;
};

export const nae3Sat: PuzzleGame<Nae3SatState, Nae3SatMove> = {
  id: 'nae-3sat',
  name: 'NAE-3SAT',
  archetype: 'logic-assignment',

  generate(difficulty: Difficulty, rng: Rng): Generated<Nae3SatState, Nae3SatMove> {
    const { numVars, clauses: clauseCount } = configFor(difficulty);
    
    // QoL: Initialize to false and prevent trivial solutions
    for (let attempt = 0; attempt < 100; attempt++) {
      // Plant a random assignment
      const planted = [null as boolean | null, ...Array.from({ length: numVars }, () => rng.next() < 0.5)];

      const clauses: [number, number, number][] = [];
      for (let c = 0; c < clauseCount; c++) {
        // Pick 3 distinct variables
        const vars = rng.shuffle(Array.from({ length: numVars }, (_, i) => i + 1)).slice(0, 3);
        
        // Count how many are true/false under planted assignment
        const trueCount = vars.reduce((count, v) => count + (literalValue(v, planted) === true ? 1 : 0), 0);
        const falseCount = vars.reduce((count, v) => count + (literalValue(v, planted) === false ? 1 : 0), 0);
        // Since we planted a complete assignment, trueCount + falseCount should be 3

        let lits: [number, number, number];
        
        if (trueCount > 0 && falseCount > 0) {
          // Mixed values: assign all same sign to guarantee NAE
          const allSameSign = rng.next() < 0.5 ? 1 : -1; // 1 for +, -1 for -
          lits = vars.map(v => allSameSign * v) as [number, number, number];
        } else {
          // All same value: need mixed signs
          // Assign first two same sign, third opposite
          const sign1 = rng.next() < 0.5 ? 1 : -1;
          const sign2 = sign1; // same as first
          const sign3 = -sign1; // opposite
          lits = [sign1 * vars[0], sign2 * vars[1], sign3 * vars[2]] as [number, number, number];
        }
        
        clauses.push(lits);
      }

      const puzzle: Nae3SatState = {
        numVars,
        clauses,
        assignment: Array(numVars + 1).fill(false), // QoL: initialize to false
        instruction: 'Set each variable so every clause has at least one true and one false literal',
      };
      
      // Check if not trivially solved (QoL: don't generate trivial solutions)
      if (!nae3Sat.isSolved(puzzle)) {
        const solution: Nae3SatMove[] = Array.from({ length: numVars }, (_, i) => ({
          variable: i + 1,
          value: planted[i + 1] as boolean,
        }));
        return { puzzle, solution };
      }
    }
    
    // Fallback: return the last generated puzzle if attempts exhausted
    const planted = [null as boolean | null, ...Array.from({ length: numVars }, () => rng.next() < 0.5)];
    const clauses: [number, number, number][] = [];
    for (let c = 0; c < clauseCount; c++) {
      // Pick 3 distinct variables
      const vars = rng.shuffle(Array.from({ length: numVars }, (_, i) => i + 1)).slice(0, 3);
      
      // Count how many are true/false under planted assignment
      const trueCount = vars.reduce((count, v) => count + (literalValue(v, planted) === true ? 1 : 0), 0);
      const falseCount = vars.reduce((count, v) => count + (literalValue(v, planted) === false ? 1 : 0), 0);
      // Since we planted a complete assignment, trueCount + falseCount should be 3

      let lits: [number, number, number];
      
      if (trueCount > 0 && falseCount > 0) {
        // Mixed values: assign all same sign to guarantee NAE
        const allSameSign = rng.next() < 0.5 ? 1 : -1; // 1 for +, -1 for -
        lits = vars.map(v => allSameSign * v) as [number, number, number];
      } else {
        // All same value: need mixed signs
        // Assign first two same sign, third opposite
        const sign1 = rng.next() < 0.5 ? 1 : -1;
        const sign2 = sign1; // same as first
        const sign3 = -sign1; // opposite
        lits = [sign1 * vars[0], sign2 * vars[1], sign3 * vars[2]] as [number, number, number];
      }
      
      clauses.push(lits);
    }
    
    const puzzle: Nae3SatState = {
      numVars,
      clauses,
      assignment: Array(numVars + 1).fill(false),
      instruction: 'Set each variable so every clause has at least one true and one false literal',
    };
    const solution: Nae3SatMove[] = Array.from({ length: numVars }, (_, i) => ({
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
    return state.clauses.every((c) => {
      const values = c.map(lit => literalValue(lit, state.assignment));
      const trueCount = values.filter(v => v === true).length;
      const falseCount = values.filter(v => v === false).length;
      return trueCount > 0 && falseCount > 0; // at least one true and one false
    });
  },

  progress(state) {
    if (state.clauses.length === 0) return 100;
    const satisfied = state.clauses.filter((c) => {
      const values = c.map(lit => literalValue(lit, state.assignment));
      const trueCount = values.filter(v => v === true).length;
      const falseCount = values.filter(v => v === false).length;
      return trueCount > 0 && falseCount > 0;
    }).length;
    return Math.round((satisfied / state.clauses.length) * 100);
  },
};
