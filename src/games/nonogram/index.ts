import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// Nonogram (Picross) - logic-assignment archetype: fill cells so that
// row/column run-length sequences match the given clues.
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
  value: 1 | 2; // 1 = fill, 2 = mark
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
  archetype: 'logic-assignment',

  generate(difficulty: Difficulty, rng: Rng): Generated<NonogramState, NonogramMove> {
    // Determine grid size based on difficulty
    const size = Math.max(5, Math.round(5 + difficulty / 200)); // ~5..35
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

  // Progress: fraction of cells that are filled (1) out of total cells.
  // This is a rough proxy; as more cells are filled correctly, progress rises.
  // Incorrect fills (filling a cell that should be empty) will not lead to solve
  // because isSolved will fail, but they still increase this metric.
  // Acceptable for adaptive difficulty signal.
  progress(state: NonogramState): number {
    const totalCells = state.rows * state.cols;
    let filled = 0;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.grid[r][c] === 1) filled++;
      }
    }
    return Math.round((filled / totalCells) * 100);
  },
};
