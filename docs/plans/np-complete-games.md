# Plan: Additional NP-Complete Puzzle Games

## Context

`pack-it-play-it` today ships a single game: polyomino bin-packing (an instance
of the NP-complete **Exact Cover / packing** family). The codebase already has a
clean, reusable spine for grid puzzles:

- `src/types/game.ts` — grid + piece types
- `src/utils/puzzleGenerator.ts` — a **generate-a-solved-instance-then-strip**
  pattern driven by recursive backtracking (`generateSolvedPuzzle`,
  `findFirstEmpty`, `canPlace`/`place`/`unplace`), plus immutable React-facing
  ops (`placePiece`, `removePiece`, `calculateEfficiency`).
- `src/components/game/*` — a dumb presentational layer fed by one stateful
  owner (`BinPackingGame.tsx`); native HTML5 drag-and-drop on a fixed-cell grid.

The goal is to add **more NP-complete games** that reuse this spine so each new
game is mostly a generator + a thin interaction layer, not a rewrite. NP-complete
puzzles are a natural fit because (a) they are provably hard to solve but cheap
to *verify*, and (b) we can always manufacture a guaranteed-solvable instance by
generating the solution first — exactly the trick `generateSolvedPuzzle` already
uses.

## Candidate games (chosen for reuse + grid fit)

| Game | NP-complete basis | Reuse of current spine | New work |
|------|-------------------|------------------------|----------|
| **Nonograms / Picross** | Row/column run-length constraint satisfaction | Grid, cell rendering, win-check | Clue generation from a target grid; cell tri-state (filled/empty/marked) |
| **Numberlink / Flow Free** | Disjoint paths in a grid (NP-complete) | Grid, drag interaction (drag = draw path) | Endpoint pair generator; path-validity + full-cover check |
| **Light Up / Akari** | Constraint satisfaction over lamp placement | Grid, click-to-place, win-check | Wall/number generation; illumination propagation |
| **Sudoku (n×n)** | Generalized Sudoku is NP-complete | Grid, immutable cell ops, backtracking generator | Region model; uniqueness-aware hole punching |
| **Graph K-Coloring** | Classic NP-complete | Piece-color palette (`PieceColor`), drag-to-assign | Graph layout/render (non-grid); adjacency conflict check |

Recommended **first three** (highest reuse, lowest new surface): Nonograms,
Numberlink, Light Up. Sudoku and Graph Coloring are stretch goals (Sudoku needs
a region abstraction; coloring needs a non-grid renderer).

## Architecture: extract a shared puzzle engine

Before adding games, generalize the spine so each game is a plugin rather than a
fork of `BinPackingGame`.

### 1. Define a `PuzzleGame` contract — `src/games/types.ts`

```ts
export interface PuzzleGame<TState, TMove> {
  id: string;                 // 'bin-packing' | 'nonogram' | ...
  name: string;
  // Manufacture a guaranteed-solvable instance at a difficulty target.
  generate(difficulty: Difficulty): TState;
  // Pure: apply a player move, returning new state (immutable).
  applyMove(state: TState, move: TMove): TState;
  // Pure verifier — cheap, this is what "NP-complete" buys us.
  isSolved(state: TState): boolean;
  // 0..100 progress proxy, reused by GameStats + the adaptive engine.
  progress(state: TState): number;
}
```

This formalizes what `puzzleGenerator.ts` already does informally
(`generateGame` ≈ `generate`, `placePiece`/`removePiece` ≈ `applyMove`, the
win-check `useEffect` ≈ `isSolved`, `calculateEfficiency` ≈ `progress`).

### 2. Refactor existing game to the contract — `src/games/binPacking/`

Move `polyominoes.ts` + `puzzleGenerator.ts` under `src/games/binPacking/` and
wrap them in a `PuzzleGame` object. Keep behavior identical (the refactor we just
did leaves it clean). This is the reference implementation other games copy.

### 3. Generic shell — `src/components/game/GameShell.tsx`

Lift the difficulty selector, New Game / Reset controls, `GameStats`, toast
win-handling, and the generate/reset state machine out of `BinPackingGame.tsx`
into a `GameShell<TState, TMove>` parameterized by a `PuzzleGame`. Each game
supplies only its board renderer. `BinPackingGame` becomes
`<GameShell game={binPacking} renderBoard={...} />`.

### 4. Game registry + routing — `src/games/registry.ts`, `src/App.tsx`

A registry array drives a game-picker landing page and routes
(`/play/:gameId`). Adding a game = appending one registry entry.

## Per-game generator notes (the only genuinely new logic)

- **Nonogram**: generate a random/target filled grid, derive row/col run clues by
  scanning. Solvability is free (clues come from a real grid); optionally verify
  *uniqueness* with a line-solver to avoid ambiguous puzzles. Difficulty = grid
  size + fill density + whether unique-solution is enforced.
- **Numberlink**: generate by laying disjoint Hamiltonian-ish paths that cover the
  grid (random walk + backtracking, same shape as `generateSolvedPuzzle`), then
  expose only endpoints. `isSolved` = all endpoints connected by non-crossing
  paths covering every cell. Difficulty = grid size + number of pairs.
- **Light Up**: place walls + numeric constraints derived from a valid lamp
  layout; `applyMove` toggles a lamp; `isSolved` = every white cell lit, no two
  lamps see each other, all numbers satisfied. Difficulty = size + wall density.

## Critical files

- New: `src/games/types.ts`, `src/games/registry.ts`,
  `src/games/binPacking/*` (moved), `src/games/nonogram/*`,
  `src/games/numberlink/*`, `src/games/lightup/*`
- New: `src/components/game/GameShell.tsx`
- Modified: `src/App.tsx` (routes + picker), `src/components/game/BinPackingGame.tsx`
  (thinned to a `GameShell` consumer), `src/components/game/GameStats.tsx`
  (already generic — reused as-is)

## Verification

1. `npx tsc --noEmit -p tsconfig.app.json` — clean types after each game.
2. Per game, a unit test asserting **`isSolved(generate(d).appliedSolution)` is
   true** and a freshly generated (stripped) instance is *not* solved — proves the
   generate-then-strip invariant.
3. `npm run dev` and manually solve one small instance of each new game; confirm
   the win toast fires and `progress()` tracks.

## Suggested order

1. Extract `PuzzleGame` contract + `GameShell`, port bin-packing (no behavior
   change). 2. Nonogram. 3. Numberlink. 4. Light Up. 5. (stretch) Sudoku, Graph
   Coloring. Ship the engine refactor first so every subsequent game is additive.

## Breadth-fill from `v0-np-complete-gamebox`

The sibling project already has **~18 generators** and **~11 brute-force/random solver pairs**
covering most of Karp's 21. Fastest path to breadth: **re-express those generators against this
`PuzzleGame` contract** (keeping our stronger generate-solved-then-strip invariant). Per
archetype the renderer already exists:

- graph-select (`GraphBoard`): clique, vertex-cover, independent-set, max-cut, feedback-*
- set (`SetBoard`): set-packing, exact-cover, hitting-set, 3d-matching
- graph-path (`PathBoard`): steiner-tree, directed-hamiltonian
- logic (`AssignmentBoard`): integer-programming
- number (new `NumberBoard`): subset-sum, knapsack, partition, job-sequencing

See [analysis/v0-integration-backlog.md](../analysis/v0-integration-backlog.md) (P2) for the
per-game mapping and [solver-layer.md](./solver-layer.md) for the companion solver/validator
port (which also unlocks unique-solution generation). Each game should carry
**`category` + `reductionFrom` metadata** to support the transfer experiment (MVP3).
