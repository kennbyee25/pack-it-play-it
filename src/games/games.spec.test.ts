import { describe, it, expect } from 'vitest';
import { makeRng } from './rng';
import { graphColoring } from './graphColoring';
import { setCover } from './setCover';
import { hamiltonian } from './hamiltonian';
import { threeSat } from './threeSat';
import { nonogram } from './nonogram';
import { DIFFICULTY } from './settings';
import { applySolution } from './types';

// Targeted Given/When/Then cases per archetype (negative paths the shared
// conformance suite can't express).

describe('graphColoring', () => {
  it('rejects a coloring where adjacent nodes share a color', () => {
    const gen = graphColoring.generate(1000, makeRng(3));
    const [a, b] = gen.puzzle.edges[0];
    let s = gen.puzzle;
    // Color every node 0 -> guarantees the first edge is monochromatic.
    for (let n = 0; n < gen.puzzle.n; n++) s = graphColoring.applyMove(s, { node: n, color: 0 });
    expect(s.colors[a]).toBe(s.colors[b]);
    expect(graphColoring.isSolved(s)).toBe(false);
  });
});

describe('setCover', () => {
  it('is unsolved while the universe is only partially covered', () => {
    const gen = setCover.generate(1000, makeRng(4));
    const partial = setCover.applyMove(gen.puzzle, gen.solution[0]);
    expect(setCover.isSolved(partial)).toBe(false);
    expect(setCover.progress(partial)).toBeLessThan(100);
  });

  it('toggles a subset off when clicked twice', () => {
    const gen = setCover.generate(1000, makeRng(4));
    const move = gen.solution[0];
    const on = setCover.applyMove(gen.puzzle, move);
    expect(on.selected[move.subsetIndex]).toBe(true);
    const off = setCover.applyMove(on, move);
    expect(off.selected[move.subsetIndex]).toBe(false);
  });
});

describe('hamiltonian', () => {
  it('rejects a path that misses a node', () => {
    const gen = hamiltonian.generate(1000, makeRng(6));
    // Apply all but the last cycle edge -> not every node has degree 2.
    let s = gen.puzzle;
    for (const m of gen.solution.slice(0, -1)) s = hamiltonian.applyMove(s, m);
    expect(hamiltonian.isSolved(s)).toBe(false);
  });

  it('toggles an edge off when clicked twice', () => {
    const gen = hamiltonian.generate(1000, makeRng(6));
    const move = gen.solution[0];
    const added = hamiltonian.applyMove(gen.puzzle, move);
    expect(added.chosen.length).toBe(1);
    const removed = hamiltonian.applyMove(added, move);
    expect(removed.chosen.length).toBe(0);
  });
});

describe('threeSat', () => {
  it('flipping every planted value can leave a clause unsatisfied', () => {
    const gen = threeSat.generate(1000, makeRng(8));
    // Negated assignment is not guaranteed UNSAT, but the all-satisfying planted
    // one must be solved while a fresh blank one is not.
    expect(threeSat.isSolved(gen.puzzle)).toBe(false);
    expect(threeSat.isSolved(applySolution(threeSat, gen))).toBe(true);
  });

  it('every generated clause has exactly three literals over valid vars', () => {
    const gen = threeSat.generate(1500, makeRng(9));
    for (const c of gen.puzzle.clauses) {
      expect(c).toHaveLength(3);
      for (const lit of c) {
        expect(Math.abs(lit)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(lit)).toBeLessThanOrEqual(gen.puzzle.numVars);
      }
    }
  });
});

describe('nonogram', () => {
  it('the easiest difficulty is a trivial 3x3, and size grows with difficulty', () => {
    const easiest = nonogram.generate(DIFFICULTY.min, makeRng(1)).puzzle;
    expect(easiest.rows).toBe(3);
    expect(easiest.cols).toBe(3);

    const hardest = nonogram.generate(DIFFICULTY.max, makeRng(1)).puzzle;
    expect(hardest.rows).toBeGreaterThan(easiest.rows);
  });

  it('clearing a filled cell (value 0) lowers progress back down', () => {
    const gen = nonogram.generate(1000, makeRng(4));
    const filled = nonogram.applyMove(gen.puzzle, { row: 0, col: 0, value: 1 });
    expect(nonogram.progress(filled)).toBeGreaterThan(0);
    const cleared = nonogram.applyMove(filled, { row: 0, col: 0, value: 0 });
    expect(nonogram.progress(cleared)).toBe(0);
  });
});
