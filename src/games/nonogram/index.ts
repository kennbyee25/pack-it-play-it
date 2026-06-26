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

// Helper: deep equality of two number arrays
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Helper: number of satisfied constraints (rows + columns)
function satisfiedConstraints(state: NonogramState): number {
  const filled = state.grid.map(row => row.map(v => v === 1 ? 1 : 0));
  const { rowClues: computedRow, colClues: computedCol } = computeClues(filled);
  let satisfied = 0;
  // rows
  for (let r = 0; r < state.rows; r++) {
    const a = state.rowClues[r];
    const b = computedRow[r];
    if (arraysEqual(a, b)) satisfied++;
  }
  // cols
  for (let c = 0; c < state.cols; c++) {
    const a = state.colClues[c];
    const b = computedCol[c];
    if (arraysEqual(a, b)) satisfied++;
  }
  return satisfied;
}

// ── Uniqueness solver ─────────────────────────────────────────────────────────

// Generate all binary fills of `width` cells consistent with `clue`.
function rowFills(clue: number[], width: number): number[][] {
  if (clue.length === 0) return [Array(width).fill(0)];
  const results: number[][] = [];
  const run = clue[0];
  const rest = clue.slice(1);
  // Minimum space needed for rest after the mandatory gap:
  // sum of runs + (gaps between runs). No trailing gap is required.
  const minRest = rest.reduce((s, r) => s + r, 0) + Math.max(0, rest.length - 1);
  const maxStart = width - run - (rest.length > 0 ? 1 + minRest : 0);
  for (let start = 0; start <= maxStart; start++) {
    const prefix = [...Array(start).fill(0), ...Array(run).fill(1)];
    if (rest.length === 0) {
      results.push([...prefix, ...Array(width - prefix.length).fill(0)]);
    } else {
      for (const sf of rowFills(rest, width - prefix.length - 1)) {
        results.push([...prefix, 0, ...sf]);
      }
    }
  }
  return results;
}

// Check partial column (rows filled so far) against its clue.
// Completed runs must match the clue prefix; open run must not exceed its slot.
function partialColOk(vals: number[], clue: number[]): boolean {
  let ri = 0;
  let cur = 0;
  for (const v of vals) {
    if (v === 1) {
      cur++;
      if (ri >= clue.length || cur > clue[ri]) return false;
    } else {
      if (cur > 0) {
        if (ri >= clue.length || cur !== clue[ri]) return false;
        ri++;
        cur = 0;
      }
    }
  }
  if (cur > 0 && (ri >= clue.length || cur > clue[ri])) return false;
  return true;
}

// Full column check (when all rows are assigned).
function fullColOk(vals: number[], clue: number[]): boolean {
  const runs: number[] = [];
  let cur = 0;
  for (const v of vals) {
    if (v === 1) cur++;
    else { if (cur > 0) { runs.push(cur); cur = 0; } }
  }
  if (cur > 0) runs.push(cur);
  return runs.length === clue.length && runs.every((r, i) => r === clue[i]);
}

// Count solutions to the nonogram defined by rowClues/colClues up to `max`.
function countNonogramSolutions(
  rowClues: number[][],
  colClues: number[][],
  rows: number,
  cols: number,
  max: number,
): number {
  // Precompute valid fills per row.
  const validFills = rowClues.map((clue) => rowFills(clue, cols));
  // grid[r] will be set to a chosen row fill.
  const grid: number[][] = [];
  let count = 0;

  function bt(r: number): boolean {
    if (r === rows) {
      // Verify all columns.
      for (let c = 0; c < cols; c++) {
        if (!fullColOk(grid.map((row) => row[c]), colClues[c])) return false;
      }
      count++;
      return count >= max;
    }
    for (const fill of validFills[r]) {
      grid[r] = fill;
      // Partial column consistency check.
      let ok = true;
      for (let c = 0; c < cols; c++) {
        if (!partialColOk(grid.map((row) => row[c]), colClues[c])) { ok = false; break; }
      }
      if (ok && bt(r + 1)) return true;
    }
    grid.length = r;
    return false;
  }

  bt(0);
  return count;
}

// ─────────────────────────────────────────────────────────────────────────────

export const nonogram: PuzzleGame<NonogramState, NonogramMove> = {
  id: 'nonogram',
  name: 'Nonogram',
  description: 'Fill cells to match the number clues on each row and column (like Picross).',
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

  countSolutions(puzzle: NonogramState, max: number): number {
    return countNonogramSolutions(puzzle.rowClues, puzzle.colClues, puzzle.rows, puzzle.cols, max);
  },

  // Progress: fraction of constraints (rows + columns) satisfied.
  // When all constraints are satisfied, the puzzle is solved (progress = 100%).
  progress(state: NonogramState): number {
    const totalConstraints = state.rows + state.cols;
    if (totalConstraints === 0) return 0;
    const satisfied = satisfiedConstraints(state);
    return Math.round((satisfied / totalConstraints) * 100);
  },
};