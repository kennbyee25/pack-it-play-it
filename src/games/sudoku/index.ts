import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

export interface SudokuState {
  size: number;
  grid: number[][];
  givens: boolean[][]; // true = cell was part of original puzzle
  boxRows: number;
  boxCols: number;
  playerGrid: number[][]; // tracks player-filled values for progress (0 = empty, 1..size = value)
}

export interface SudokuMove {
  row: number;
  col: number;
  value: number;
}

// Box lookup: size -> [boxRows, boxCols]
// For sizes 5,7: Latin-square constraint only (useBoxes=false in generation)
const BOX_LOOKUP: Record<number, [number, number]> = {
  4: [2, 2],
  5: [5, 1],
  6: [2, 3],
  7: [7, 1],
  8: [4, 2],
  9: [3, 3],
};

// Check if value is valid at (row, col)
function isValid(
  grid: number[][],
  row: number,
  col: number,
  value: number,
  boxRows: number,
  boxCols: number,
  useBoxes: boolean,
): boolean {
  const size = grid.length;

  // Row check
  for (let c = 0; c < size; c++) {
    if (grid[row][c] === value) return false;
  }

  // Column check
  for (let r = 0; r < size; r++) {
    if (grid[r][col] === value) return false;
  }

  // Box check (only when useBoxes is true)
  if (useBoxes) {
    const boxRowStart = Math.floor(row / boxRows) * boxRows;
    const boxColStart = Math.floor(col / boxCols) * boxCols;
    for (let r = boxRowStart; r < boxRowStart + boxRows; r++) {
      for (let c = boxColStart; c < boxColStart + boxCols; c++) {
        if (grid[r][c] === value) return false;
      }
    }
  }

  return true;
}

// Backtracking fill (seeded from rng)
function backtrackFill(
  grid: number[][],
  boxRows: number,
  boxCols: number,
  useBoxes: boolean,
  rng: Rng,
): boolean {
  const size = grid.length;

  // Find empty cell
  let emptyR = -1;
  let emptyC = -1;
  outer: for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) {
        emptyR = r;
        emptyC = c;
        break outer;
      }
    }
  }

  // All filled
  if (emptyR === -1) return true;

  // Shuffle candidates for diversity
  const candidates = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].slice(0, size));
  for (const val of candidates) {
    if (isValid(grid, emptyR, emptyC, val, boxRows, boxCols, useBoxes)) {
      grid[emptyR][emptyC] = val;
      if (backtrackFill(grid, boxRows, boxCols, useBoxes, rng)) return true;
      grid[emptyR][emptyC] = 0;
    }
  }

  return false;
}

// countSolutions uses an internal counting function defined inline.

export const sudoku: PuzzleGame<SudokuState, SudokuMove> = {
  id: 'sudoku',
  name: 'Sudoku',
  archetype: 'sudoku',

  generate(difficulty: Difficulty, rng: Rng): Generated<SudokuState, SudokuMove> {
    // Size from difficulty
    const size = Math.max(4, Math.min(9, Math.round(4 + difficulty / 500)));

    // Box lookup
    const [rawBoxRows, rawBoxCols] = BOX_LOOKUP[size] ?? [3, 3];
    const boxRows = rawBoxRows;
    const boxCols = rawBoxCols;

    // Latin-square constraint for sizes 5,7 (no region check)
    const useBoxes = size !== 5 && size !== 7;

    // Backtrack-fill a complete solution
    const solution: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    backtrackFill(solution, boxRows, boxCols, useBoxes, rng);

    // Strip cells
    let keepRatio = 0.75 - (difficulty - 100) / 4800;
    keepRatio = Math.max(0.25, Math.min(0.75, keepRatio));

    // Floor at 0.50 for sizes 5,7
    if (size === 5 || size === 7) {
      keepRatio = Math.max(0.5, keepRatio);
    }

    const grid: number[][] = [];
    const givens: boolean[][] = [];

    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      const givenRow: boolean[] = [];
      for (let c = 0; c < size; c++) {
        if (rng.next() < keepRatio) {
          row.push(solution[r][c]);
          givenRow.push(true);
        } else {
          row.push(0);
          givenRow.push(false);
        }
      }
      grid.push(row);
      givens.push(givenRow);
    }

    const puzzle: SudokuState = { size, grid, givens, boxRows, boxCols, playerGrid: Array.from({ length: size }, () => Array(size).fill(0)) };

    // Collect solution moves
    const solutionMoves: SudokuMove[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!givens[r][c]) {
          solutionMoves.push({ row: r, col: c, value: solution[r][c] });
        }
      }
    }

    return { puzzle, solution: solutionMoves };
  },

  applyMove(state: SudokuState, move: SudokuMove): SudokuState {
    const { row, col, value } = move;
    if (row < 0 || row >= state.size || col < 0 || col >= state.size) return state;
    if (value < 0 || value > state.size) return state;
    if (state.givens[row][col]) return state;

    const newGrid = state.grid.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? value : c))
    );
    const newPlayerGrid = state.playerGrid.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? value : c))
    );
    return { ...state, grid: newGrid, playerGrid: newPlayerGrid };
  },

  isSolved(state: SudokuState): boolean {
    const { size, grid, boxRows, boxCols } = state;
    const useBoxes = size !== 5 && size !== 7;

    // Check all filled
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) return false;
      }
    }

    // Check rows
    for (let r = 0; r < size; r++) {
      const seen = new Set<number>();
      for (let c = 0; c < size; c++) {
        const v = grid[r][c];
        if (seen.has(v)) return false;
        seen.add(v);
      }
    }

    // Check columns
    for (let c = 0; c < size; c++) {
      const seen = new Set<number>();
      for (let r = 0; r < size; r++) {
        const v = grid[r][c];
        if (seen.has(v)) return false;
        seen.add(v);
      }
    }

    // Check boxes (only when useBoxes is true)
    if (useBoxes) {
      const numBoxRows = Math.ceil(size / boxRows);
      const numBoxCols = Math.ceil(size / boxCols);
      for (let br = 0; br < numBoxRows; br++) {
        for (let bc = 0; bc < numBoxCols; bc++) {
          const seen = new Set<number>();
          for (let r = br * boxRows; r < br * boxRows + boxRows && r < size; r++) {
            for (let c = bc * boxCols; c < bc * boxCols + boxCols && c < size; c++) {
              const v = grid[r][c];
              if (seen.has(v)) return false;
              seen.add(v);
            }
          }
        }
      }
    }

    return true;
  },

  progress(state: SudokuState): number {
    const { size, playerGrid, givens } = state;
    let playerCells = 0;
    let playerFilled = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!givens[r][c]) {
          playerCells++;
          if (playerGrid[r][c] !== 0) playerFilled++;
        }
      }
    }

    if (playerCells === 0) return 100;
    return Math.round((playerFilled / playerCells) * 100);
  },

  countSolutions(puzzle: SudokuState, cap: number): number {
    const { size, grid, boxRows, boxCols } = puzzle;
    const useBoxes = size !== 5 && size !== 7;

    // Collect empty cells
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          emptyCells.push([r, c]);
        }
      }
    }

    if (emptyCells.length === 0) return 1;

    // Work on a copy
    const work: number[][] = grid.map(row => [...row]);

    // Set a conservative recursion limit for 500ms target
    const startTime = Date.now();
    const MAX_RECURSION_DEPTH = emptyCells.length * 2;
    let recursionCount = 0;

    function countingCountFrom(idx: number): number {
      const now = Date.now();
      if (now - startTime > 450) return cap; // Stop early if running too long
      recursionCount++;

      if (idx >= emptyCells.length) return 1;

      const [row, col] = emptyCells[idx];
      if (work[row][col] !== 0) return countingCountFrom(idx + 1);

      let total = 0;
      for (let val = 1; val <= size; val++) {
        if (isValid(work, row, col, val, boxRows, boxCols, useBoxes)) {
          work[row][col] = val;
          total += countingCountFrom(idx + 1);
          work[row][col] = 0;
          if (total >= cap) return total;
        }
      }
      return total;
    }

    return Math.min(countingCountFrom(0), cap);
  },
};
