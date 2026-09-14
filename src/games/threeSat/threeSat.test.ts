import { describe, it, expect } from 'vitest';
import { threeSat } from './index';
import { makeRng } from '../rng';
import { applySolution } from '../types';

describe('3-SAT QoL changes', () => {
  it('should initialize assignment to false and avoid trivial solutions', () => {
    let allPassed = true;

    for (let seed = 1; seed <= 10; seed++) {
      const gen = threeSat.generate(1000, makeRng(seed));
      const isFalseInit = gen.puzzle.assignment.slice(1).every(v => v === false);
      const isSolved = threeSat.isSolved(gen.puzzle);

      if (!isFalseInit) {
        console.error('ERROR: Assignment not initialized to false for seed ' + seed);
        allPassed = false;
      }

      if (isSolved) {
        console.error('ERROR: Puzzle is solved on generation for seed ' + seed);
        allPassed = false;
      }

      // Also check that we can solve it with the planted solution
      const solvedState = applySolution(threeSat, gen);
      const isActuallySolved = threeSat.isSolved(solvedState);
      if (!isActuallySolved) {
        console.error('ERROR: Planted solution does not solve the puzzle for seed ' + seed);
        allPassed = false;
      }
    }

    expect(allPassed).toBe(true);
  });
});
