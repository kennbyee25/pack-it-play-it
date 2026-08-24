import { nae3Sat } from './src/games/nae3Sat/index.js';
import { makeRng } from './src/games/rng.js';
import { applySolution } from './src/games/types.js';

console.log('Testing NAE-3SAT QoL changes...');

// Test 1: Check that initial assignment is false
let allPassed = true;
for (let seed = 1; seed <= 10; seed++) {
  const gen = nae3Sat.generate(1000, makeRng(seed));
  const isFalseInit = gen.puzzle.assignment.slice(1).every(v => v === false);
  const isSolved = nae3Sat.isSolved(gen.puzzle);
  
  if (!isFalseInit) {
    console.error(`ERROR: Assignment not initialized to false for seed ${seed}`);
    allPassed = false;
  }
  
  if (isSolved) {
    console.error(`ERROR: Puzzle is solved on generation for seed ${seed}`);
    allPassed = false;
  }
  
  // Also check that we can solve it with the planted solution
  const solvedState = applySolution(nae3Sat, gen);
  const isActuallySolved = nae3Sat.isSolved(solvedState);
  if (!isActuallySolved) {
    console.error(`ERROR: Planted solution does not solve the puzzle for seed ${seed}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('✓ All tests passed: Assignment initialized to false and no trivial solutions generated');
} else {
  process.exit(1);
}
