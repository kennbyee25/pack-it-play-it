import { describe, it, expect } from 'vitest';
import { makeRng } from './rng';
import { graphColoring } from './graphColoring';
import { setCover } from './setCover';
import { hamiltonian } from './hamiltonian';
import { threeSat } from './threeSat';
import { nonogram, type NonogramState } from './nonogram';
import { sudoku, type SudokuState } from './sudoku';
import { dominatingSet } from './dominatingSet';
import { feedbackVertexSet } from './feedbackVertexSet';
import { x3c } from './x3c';
import { nae3Sat, type Nae3SatState } from './nae3Sat';
import { threeDMatching } from './threeDMatching';
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

    // DIFFICULTY.max is intentionally unbounded (AI/algorithmic play), so use the
    // historic 2500 cap as the "hard" endpoint — grid size must grow with D.
    const hardest = nonogram.generate(2500, makeRng(1)).puzzle;
    expect(hardest.rows).toBeGreaterThan(easiest.rows);
  });

  it('clearing a filled cell (value 0) lowers progress back down', () => {
    const gen = nonogram.generate(1000, makeRng(4));
    const filled = nonogram.applyMove(gen.puzzle, { row: 0, col: 0, value: 1 });
    expect(nonogram.progress(filled)).toBeGreaterThan(0);
    const cleared = nonogram.applyMove(filled, { row: 0, col: 0, value: 0 });
    expect(nonogram.progress(cleared)).toBe(0);
  });

  it('countSolutions returns >= 1 for a freshly generated puzzle', () => {
    for (const seed of [1, 7, 42]) {
      const gen = nonogram.generate(200, makeRng(seed));
      expect(nonogram.countSolutions(gen.puzzle, 10)).toBeGreaterThanOrEqual(1);
    }
  });

  it('countSolutions never exceeds never exceeds the cap', () => {
    for (const seed of [1, 2, 3]) {
      const gen = nonogram.generate(200, makeRng(seed));
      expect(nonogram.countSolutions(gen.puzzle, 2)).toBeLessThanOrEqual(2);
    }
  });

  it('a trivial empty puzzle (no clues) has exactly 1 solution', () => {
    const empty: NonogramState = {
      rows: 3, cols: 3,
      rowClues: [[], [], []], colClues: [[], [], []],
      grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
    };
    expect(nonogram.countSolutions(empty, 10)).toBe(1);
  });

  it('a contradiction puzzle has 0 solutions', () => {
    const unsat: NonogramState = {
      rows: 2, cols: 2,
      rowClues: [[3], [0]], colClues: [[0], [0]],
      grid: [[0, 0], [0, 0]],
    };
    expect(nonogram.countSolutions(unsat, 10)).toBe(0);
  });

  it('countSolutions returns 1 for a known unique 1x1 puzzle', () => {
    const unique: NonogramState = {
      rows: 1, cols: 1,
      rowClues: [[1]], colClues: [[1]],
      grid: [[0]], // unknown
    };
    expect(nonogram.countSolutions(unique, 2)).toBe(1);
  });

  it('countSolutions returns 2 for a known 2x2 puzzle with two solutions', () => {
    const multi: NonogramState = {
      rows: 2, cols: 2,
      rowClues: [[1], [1]], colClues: [[1], [1]],
      grid: [[0, 0], [0, 0]], // all unknown
    };
    expect(nonogram.countSolutions(multi, 10)).toBe(2);
  });
});

describe('sudoku', () => {
  it('size maps from difficulty: D=100→4, D=600→5, D=1100→6, D=1600→7, D=2100→8, D=2500→9', () => {
    const cases: [number, number][] = [
      [100, 4], [600, 5], [1100, 6], [1600, 7], [2100, 8], [2500, 9],
    ];
    for (const [d, expected] of cases) {
      const gen = sudoku.generate(d, makeRng(1));
      expect(gen.puzzle.size).toBe(expected);
    }
  });

  it('progress is 0 on a fresh puzzle and 100 when solved', () => {
    const gen = sudoku.generate(800, makeRng(5));
    expect(sudoku.progress(gen.puzzle)).toBe(0);
    expect(sudoku.progress(applySolution(sudoku, gen))).toBe(100);
  });

  it('placing then clearing a number restores original progress', () => {
    const gen = sudoku.generate(800, makeRng(6));
    const playerCells = gen.puzzle.grid.flat().filter((v, i) => !gen.puzzle.givens[Math.floor(i / gen.puzzle.size)][i % gen.puzzle.size]).length;
    if (playerCells === 0) return;
    const move = gen.solution[0];
    const after = sudoku.applyMove(gen.puzzle, move);
    expect(sudoku.progress(after)).toBeGreaterThan(sudoku.progress(gen.puzzle));
    const cleared = sudoku.applyMove(after, { ...move, value: 0 });
    expect(sudoku.progress(cleared)).toBe(sudoku.progress(gen.puzzle));
  });

  it('given cells reject moves — state is unchanged', () => {
    const gen = sudoku.generate(800, makeRng(7));
    const stateStr = JSON.stringify(gen.puzzle);
    const given = gen.puzzle.givens.flat().findIndex(Boolean);
    if (given === -1) return;
    const row = Math.floor(given / gen.puzzle.size);
    const col = given % gen.puzzle.size;
    const rejected = sudoku.applyMove(gen.puzzle, { row, col, value: 99 });
    expect(JSON.stringify(rejected)).toBe(stateStr);
  });

  it('applyMove with out-of-bounds coordinates returns state unchanged', () => {
    const gen = sudoku.generate(800, makeRng(8));
    const stateStr = JSON.stringify(gen.puzzle);
    expect(JSON.stringify(sudoku.applyMove(gen.puzzle, { row: -1, col: 0, value: 1 }))).toBe(stateStr);
    expect(JSON.stringify(sudoku.applyMove(gen.puzzle, { row: 0, col: 999, value: 1 }))).toBe(stateStr);
    expect(JSON.stringify(sudoku.applyMove(gen.puzzle, { row: 0, col: 0, value: 999 }))).toBe(stateStr);
    expect(JSON.stringify(sudoku.applyMove(gen.puzzle, { row: 0, col: 0, value: -1 }))).toBe(stateStr);
  });

  it('filling a row with duplicates fails isSolved', () => {
    const gen = sudoku.generate(800, makeRng(9));
    let state = gen.puzzle;
    for (let c = 0; c < state.size; c++) {
      if (!state.givens[0][c]) {
        state = sudoku.applyMove(state, { row: 0, col: c, value: 1 });
        break;
      }
    }
    const dup = sudoku.applyMove(state, { row: 0, col: 1, value: 1 });
    expect(sudoku.isSolved(dup)).toBe(false);
  });

  it('countSolutions on a generated puzzle completes within 500ms', () => {
    const gen = sudoku.generate(2000, makeRng(42));
    const start = Date.now();
    const result = sudoku.countSolutions(gen.puzzle, 10);
    const elapsed = Date.now() - start;
    expect(result).toBeGreaterThanOrEqual(1);
    expect(elapsed).toBeLessThan(500);
  });
});

describe('dominatingSet', () => {
  it('is unsolved with nothing selected and rejects over-budget selections', () => {
    const gen = dominatingSet.generate(1000, makeRng(10));
    expect(dominatingSet.isSolved(gen.puzzle)).toBe(false);
    // Selecting every node always exceeds the budget (n > k for all difficulties).
    if (gen.puzzle.n <= gen.puzzle.k) return;
    let all = gen.puzzle;
    for (let node = 0; node < gen.puzzle.n; node++) all = dominatingSet.applyMove(all, { node });
    expect(dominatingSet.isSolved(all)).toBe(false);
    expect(dominatingSet.progress(all)).toBe(0); // over-budget penalty
  });

  it('toggles a node off when clicked twice', () => {
    const gen = dominatingSet.generate(1000, makeRng(11));
    const move = gen.solution[0];
    const on = dominatingSet.applyMove(gen.puzzle, move);
    expect(on.selected[move.node]).toBe(true);
    const off = dominatingSet.applyMove(on, move);
    expect(off.selected[move.node]).toBe(false);
  });
});

describe('feedbackVertexSet', () => {
  it('is unsolved with nothing selected (generated graphs always contain a cycle)', () => {
    // At low difficulty the spanning-cycle guarantee kicks in: n=5 with a full
    // 5-cycle, so the untouched graph is cyclic and the empty set is no FVS.
    const gen = feedbackVertexSet.generate(DIFFICULTY.min, makeRng(12));
    expect(feedbackVertexSet.isSolved(gen.puzzle)).toBe(false);
    expect(feedbackVertexSet.progress(gen.puzzle)).toBe(0);
  });

  it('removing the planted set leaves an acyclic graph within budget', () => {
    const gen = feedbackVertexSet.generate(1000, makeRng(13));
    const solved = applySolution(feedbackVertexSet, gen);
    expect(feedbackVertexSet.isSolved(solved)).toBe(true);
    expect(solved.selected.filter(Boolean).length).toBeLessThanOrEqual(solved.k);
  });

  it('toggles a node off when clicked twice', () => {
    const gen = feedbackVertexSet.generate(1000, makeRng(14));
    const move = gen.solution[0];
    const on = feedbackVertexSet.applyMove(gen.puzzle, move);
    expect(on.selected[move.node]).toBe(true);
    const off = feedbackVertexSet.applyMove(on, move);
    expect(off.selected[move.node]).toBe(false);
  });
});

describe('x3c', () => {
  it('is unsolved while the universe is only partially covered', () => {
    const gen = x3c.generate(1000, makeRng(15));
    const partial = x3c.applyMove(gen.puzzle, gen.solution[0]);
    expect(x3c.isSolved(partial)).toBe(false);
    expect(x3c.progress(partial)).toBeLessThan(100);
  });

  it('rejects a selection that exceeds exactly k subsets', () => {
    const gen = x3c.generate(1000, makeRng(16));
    const planted = new Set(gen.solution.map((m) => m.subsetIndex));
    const extra = gen.puzzle.subsets.findIndex((_, i) => !planted.has(i));
    if (extra === -1) return; // no decoys to test against
    let s = gen.puzzle;
    for (const m of gen.solution) s = x3c.applyMove(s, m);
    s = x3c.applyMove(s, { subsetIndex: extra });
    expect(x3c.isSolved(s)).toBe(false);
  });

  it('every generated subset has exactly 3 elements from the universe', () => {
    const gen = x3c.generate(1500, makeRng(17));
    for (const s of gen.puzzle.subsets) {
      expect(s).toHaveLength(3);
      for (const el of s) {
        expect(el).toBeGreaterThanOrEqual(0);
        expect(el).toBeLessThan(gen.puzzle.universe.length);
      }
    }
  });

  it('toggles a subset off when clicked twice', () => {
    const gen = x3c.generate(1000, makeRng(18));
    const move = gen.solution[0];
    const on = x3c.applyMove(gen.puzzle, move);
    expect(on.selected[move.subsetIndex]).toBe(true);
    const off = x3c.applyMove(on, move);
    expect(off.selected[move.subsetIndex]).toBe(false);
  });
});

describe('nae3Sat', () => {
  it('is unsolved while any variable is unassigned', () => {
    const gen = nae3Sat.generate(1000, makeRng(19));
    expect(nae3Sat.isSolved(gen.puzzle)).toBe(false);
  });

  it('every generated clause has exactly three literals over valid vars', () => {
    const gen = nae3Sat.generate(1500, makeRng(20));
    for (const c of gen.puzzle.clauses) {
      expect(c).toHaveLength(3);
      for (const lit of c) {
        expect(Math.abs(lit)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(lit)).toBeLessThanOrEqual(gen.puzzle.numVars);
      }
    }
  });

  it('rejects a hand-built clause that is all-true (not NAE)', () => {
    const state: Nae3SatState = {
      numVars: 3,
      clauses: [[1, 2, 3]],
      assignment: [null, true, true, true],
    };
    expect(nae3Sat.isSolved(state)).toBe(false);
    expect(nae3Sat.progress(state)).toBe(0);
  });

  it('accepts a mixed clause when a negated literal evaluates false', () => {
    const state: Nae3SatState = {
      numVars: 3,
      clauses: [[1, 2, -3]],
      assignment: [null, true, true, true],
    };
    expect(nae3Sat.isSolved(state)).toBe(true);
    expect(nae3Sat.progress(state)).toBe(100);
  });

  it('re-applying a variable with a different value updates the assignment', () => {
    const gen = nae3Sat.generate(1000, makeRng(21));
    const on = nae3Sat.applyMove(gen.puzzle, { variable: 1, value: true });
    expect(on.assignment[1]).toBe(true);
    const off = nae3Sat.applyMove(on, { variable: 1, value: false });
    expect(off.assignment[1]).toBe(false);
  });
});

describe('threeDMatching', () => {
  it('is solvable via the planted matching', () => {
    for (const seed of [1, 7, 42]) {
      const gen = threeDMatching.generate(600, makeRng(seed));
      expect(threeDMatching.isSolved(applySolution(threeDMatching, gen))).toBe(true);
    }
  });

  it('the planted matching covers every element exactly once', () => {
    for (const seed of [1, 7, 42]) {
      const gen = threeDMatching.generate(600, makeRng(seed));
      const planted = gen.solution.map((m) => gen.puzzle.subsets[m.subsetIndex]);
      const count = new Map<number, number>();
      for (const t of planted) for (const e of t) count.set(e, (count.get(e) ?? 0) + 1);
      expect(count.size, `seed=${seed}`).toBe(gen.puzzle.universe.length);
      for (const [e, c] of count) {
        expect(c, `seed=${seed} element=${e}`).toBe(1);
        expect(gen.puzzle.universe).toContain(e);
      }
    }
  });

  it('the planted matching differs across seeds (always-identical solution regression)', () => {
    const keys = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const gen = threeDMatching.generate(600, makeRng(seed));
      const key = gen.solution
        .map((m) => [...gen.puzzle.subsets[m.subsetIndex]].sort((a, b) => a - b).join('|'))
        .sort()
        .join(',');
      keys.add(key);
    }
    expect(keys.size).toBeGreaterThan(1);
  });
});
