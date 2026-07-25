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

// ── Nonogram solver (constraint propagation + backtracking) ──────────────
// Used by countSolutions to check uniqueness. Grid sizes are small (3×3..13×13),
// so the probing approach is more than fast enough.

type Cell = -1 | 0 | 1; // -1 = empty known, 0 = unknown, 1 = filled known
type CellGrid = Cell[][];

// DP over a single line: how many ways can cells[pos..] be arranged matching
// clues[ci..]?  Uses a fresh memo per call since the constraints change.
function lineWays(line: Cell[], clues: number[]): number {
  const n = line.length;
  const m = clues.length;
  const memo = new Map<number, number>();

  function dp(pos: number, ci: number): number {
    if (ci === m) {
      // All clues used — remaining cells must NOT be filled.
      for (let i = pos; i < n; i++) if (line[i] === 1) return 0;
      return 1;
    }
    if (pos >= n) return 0;
    const key = (pos << 5) | ci;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;

    let total = 0;
    // Option: leave current cell empty
    if (line[pos] !== 1) total += dp(pos + 1, ci);

    // Option: start current clue block at pos
    const len = clues[ci];
    if (pos + len <= n) {
      let ok = true;
      for (let k = 0; k < len; k++) if (line[pos + k] === -1) { ok = false; break; }
      if (ok) {
        if (pos + len === n) {
          total += dp(pos + len, ci + 1);
        } else if (line[pos + len] !== 1) {
          total += dp(pos + len + 1, ci + 1);
        }
      }
    }
    memo.set(key, total);
    return total;
  }
  return dp(0, 0);
}

// Probe each unknown cell in `line` to determine which values are still
// possible.  Marks forced cells in-place.  Returns false if the line is
// impossible (contradiction).
function narrowLine(line: Cell[], clues: number[]): boolean {
  if (lineWays(line, clues) === 0) return false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] !== 0) continue;
    const saved = line[i];

    line[i] = -1;
    const emptyOk = lineWays(line, clues) > 0;
    line[i] = 1;
    const filledOk = lineWays(line, clues) > 0;

    line[i] = saved;
    if (!emptyOk && !filledOk) return false;
    if (emptyOk && !filledOk) line[i] = -1;
    else if (filledOk && !emptyOk) line[i] = 1;
  }
  return true;
}

// Narrow all rows then all columns, repeating until stable or contradiction.
function propagate(grid: CellGrid, rowClues: number[][], colClues: number[][]): boolean {
  const rows = grid.length;
  const cols = grid[0].length;
  let changed = true;
  while (changed) {
    changed = false;
    // rows
    for (let r = 0; r < rows; r++) {
      const before = grid[r].slice() as Cell[];
      if (!narrowLine(grid[r] as Cell[], rowClues[r])) return false;
      for (let c = 0; c < cols; c++) if (grid[r][c] !== before[c]) changed = true;
    }
    // columns
    for (let c = 0; c < cols; c++) {
      const col: Cell[] = [];
      for (let r = 0; r < rows; r++) col.push(grid[r][c]);
      const before = col.slice();
      if (!narrowLine(col, colClues[c])) return false;
      for (let r = 0; r < rows; r++) if (col[r] !== grid[r][c]) { grid[r][c] = col[r]; changed = true; }
    }
  }
  return true;
}

// Check whether a fully-determined grid matches the puzzle clues.
function matchesClues(grid: CellGrid, rowClues: number[][], colClues: number[][]): boolean {
  const rows = grid.length;
  if (rows === 0) return colClues.every(c => c.length === 0);
  const cols = grid[0].length;
  const filled = grid.map(row => row.map(v => (v === 1 ? 1 : 0)));
  const { rowClues: cr, colClues: cc } = computeClues(filled);
  const eq = (a: number[][], b: number[][]) =>
    a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((v, j) => v === b[i][j]));
  return eq(rowClues, cr) && eq(colClues, cc);
}

// Find the unknown cell whose row+column has the fewest unknowns (MRV).
function pickCell(grid: CellGrid): [number, number] | null {
  const rows = grid.length;
  if (rows === 0) return null;
  const cols = grid[0].length;
  let best: [number, number] | null = null;
  let bestScore = Infinity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0) continue;
      let score = 0;
      for (let cc = 0; cc < cols; cc++) if (grid[r][cc] === 0) score++;
      for (let rr = 0; rr < rows; rr++) if (grid[rr][c] === 0) score++;
      if (score < bestScore) { bestScore = score; best = [r, c]; }
    }
  }
  return best;
}

// Recursive count: after propagation, branch on the most-constrained unknown.
function countFrom(grid: CellGrid, rowClues: number[][], colClues: number[][], cap: number): number {
  const cell = pickCell(grid);
  if (!cell) {
    // Fully determined — check solution validity.
    return matchesClues(grid, rowClues, colClues) ? 1 : 0;
  }
  const [r, c] = cell;
  let total = 0;

  // Branch: cell is empty
  {
    const copy: CellGrid = grid.map(row => [...row]);
    copy[r][c] = -1;
    if (propagate(copy, rowClues, colClues)) {
      total += countFrom(copy, rowClues, colClues, cap - total);
      if (total >= cap) return cap;
    }
  }
  // Branch: cell is filled
  {
    const copy: CellGrid = grid.map(row => [...row]);
    copy[r][c] = 1;
    if (propagate(copy, rowClues, colClues)) {
      total += countFrom(copy, rowClues, colClues, cap - total);
    }
  }
  return Math.min(total, cap);
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

    countSolutions(puzzle: NonogramState, cap: number): number {
      // Convert grid: 0=unknown -> 0, 1=filled -> 1, 2=marked -> -1
      const grid: CellGrid = puzzle.grid.map(row =>
        row.map(v => (v === 0 ? 0 : v === 1 ? 1 : -1))
      );
      const res = countFrom(grid, puzzle.rowClues, puzzle.colClues, cap);
      return res;
    },
};
