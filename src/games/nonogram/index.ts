import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// Nonogram (Picross) - its own `nonogram` archetype so the box routes it to the
// NonogramBoard renderer. (It started life sharing 'logic-assignment' with
// 3-SAT, which made GamePlayer render it with AssignmentBoard — that reads
// state.clauses, which a nonogram has none of, so it threw and blanked the
// screen whenever a nonogram came up in the endless rotation.)
export interface NonogramState {
  rows: number;
  cols: number;
  rowClues: number[][]; // clues per row
  colClues: number[][]; // clues per column
  // 0 = unknown, 1 = filled, 2 = marked (empty)
  grid: number[][];
}
export interface NonogramMove {
  row: number;
  col: number;
  value: 0 | 1 | 2; // 0 = clear (deselect), 1 = fill, 2 = mark
}

// Helper: compute run-length clues from a binary grid (1 = filled, 0 = empty)
function computeClues(grid: number[][]): { rowClues: number[][]; colClues: number[][] } {
  const rows = grid.length;
  const cols = grid[0].length;
  const rowClues: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const run: number[] = [];
    let count = 0;
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) {
        count++;
      } else {
        if (count > 0) {
          run.push(count);
          count = 0;
        }
      }
    }
    if (count > 0) run.push(count);
    rowClues.push(run);
  }
  const colClues: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const run: number[] = [];
    let count = 0;
    for (let r = 0; r < rows; r++) {
      if (grid[r][c] === 1) {
        count++;
      } else {
        if (count > 0) {
          run.push(count);
          count = 0;
        }
      }
    }
    if (count > 0) run.push(count);
    colClues.push(run);
  }
  return { rowClues, colClues };
}

export const nonogram: PuzzleGame<NonogramState, NonogramMove> = {
  id: 'nonogram',
  name: 'Nonogram',
  archetype: 'nonogram',

  generate(difficulty: Difficulty, rng: Rng): Generated<NonogramState, NonogramMove> {
    // Grid size scales with difficulty. The floor is a trivial 3x3 (so the
    // easiest setting is genuinely easy) growing to ~13x13 at the top end.
    const size = Math.max(3, Math.round(3 + difficulty / 250)); // ~3..13
    const rows = size;
    const cols = size;

    // Generate a random solution binary grid
    const solution: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(rng.next() < 0.5 ? 1 : 0);
      }
      solution.push(row);
    }

    // Compute clues from solution
    const { rowClues, colClues } = computeClues(solution);

    // Initial player grid: all unknown (0)
    const grid: number[][] = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => 0)
    );

    const puzzle: NonogramState = {
      rows,
      cols,
      rowClues,
      colClues,
      grid,
    };

    // Solution moves: fill cells where solution is 1
    const solutionMoves: NonogramMove[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (solution[r][c] === 1) {
          solutionMoves.push({ row: r, col: c, value: 1 });
        }
      }
    }

    return { puzzle, solution: solutionMoves };
  },

  applyMove(state: NonogramState, move: NonogramMove): NonogramState {
    const { row, col, value } = move;
    // Guard bounds
    if (row < 0 || row >= state.rows || col < 0 || col >= state.cols) return state;
    // Create new grid copy
    const newGrid = state.grid.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? value : c))
    );
    return { ...state, grid: newGrid };
  },

  isSolved(state: NonogramState): boolean {
    // Compute filled/gaps from player grid: treat 1 as filled, 0 or 2 as empty
    const filled: number[][] = state.grid.map((row) =>
      row.map((v) => (v === 1 ? 1 : 0))
    );
    const { rowClues: computedRow, colClues: computedCol } = computeClues(filled);
    // Compare clues
    const rowsMatch = state.rowClues.every((r, i) => {
      const a = r;
      const b = computedRow[i];
      if (a.length !== b.length) return false;
      for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return false;
      return true;
    });
    const colsMatch = state.colClues.every((c, i) => {
      const a = c;
      const b = computedCol[i];
      if (a.length !== b.length) return false;
      for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return false;
      return true;
    });
    return rowsMatch && colsMatch;
  },

  // Progress: filled cells as a fraction of the cells the solution requires
  // filled. The solution only fills the cells dictated by the clues (~half the
  // grid), so the denominator is the total clue length, not the cell count —
  // that way a complete solution reads as 100, not ~50.
  // This is a rough proxy; over-filling is clamped to 100 and incorrect fills
  // still raise it without solving (isSolved gates the real win). Acceptable as
  // an adaptive difficulty signal.
  progress(state: NonogramState): number {
    const totalRequired = state.rowClues.reduce(
      (sum, run) => sum + run.reduce((a, b) => a + b, 0),
      0,
    );
    if (totalRequired === 0) return 100; // solution has no filled cells: an empty grid already solves it
    let filled = 0;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.grid[r][c] === 1) filled++;
      }
    }
    return Math.min(100, Math.round((filled / totalRequired) * 100));
  },
};
