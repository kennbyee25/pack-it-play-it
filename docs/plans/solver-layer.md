# Plan: Solver Layer (brute-force + random) — and unique-solution generation

## Context

`pack-it-play-it` has generators and verifiers but **no solvers**. The sibling project
[`v0-np-complete-gamebox`](../analysis/v0-gamebox-codegraph.md) ships a clean solver
architecture — a `Solver<T>` interface, a `BaseSolver` Template Method handling timing and an
iteration/timeout budget, and a **brute-force + random** pair per problem behind a Factory
registry. Porting this is the highest-value idea from v0 because it unlocks three things at
once:

1. **The platform's "algorithms can be tested" / "AI trained-tested" pillars** (vision MVP5):
   solvers + `SolverResult` telemetry are exactly that surface.
2. **The deferred unique-solution feature** ([[project-pip-unique-solution]]): a brute-force
   solver that *counts* solutions lets us reject-sample puzzles down to exactly one solution.
3. **A real `SolverPanel` UI** (replacing the test-only "Show solution") where players watch
   brute-force vs heuristic solve, with iteration/time stats.

This plan deliberately re-expresses v0's algorithms against pip's `PuzzleGame<TState,TMove>`
contract rather than copying v0's Next.js/`generate-then-validate` code.

## Design

### Solver contract — `src/games/solvers/types.ts`

```ts
export interface SolverResult<TState> {
  solved: boolean;
  solution: TState | null;   // a state for which game.isSolved(solution) === true
  iterations: number;
  timeMs: number;
  solutionCount?: number;    // when counting (uniqueness)
}

export interface SolverBudget { maxIterations?: number; timeoutMs?: number; }

export interface Solver<TState> {
  readonly name: string;
  readonly kind: 'brute-force' | 'random';
  solve(puzzle: TState, budget?: SolverBudget): SolverResult<TState>;
}
```

`BaseSolver` (Template Method) owns the loop budget so subclasses implement only the search.
Solvers verify with the game's own `isSolved` (Dependency Inversion) — no duplicated validation.

### Per-game solvers — `src/games/<game>/solver.ts`

Port v0's algorithms, bounded so an NP-hard instance never hangs:

| Game (pip) | Brute force | Random |
|---|---|---|
| three-sat | bitmask over `2^numVars` assignments | random assignments |
| set-cover | enumerate subset-collections ≤ k | random subset picks |
| hamiltonian | DFS/backtracking over cycles | random walks |
| graph-coloring | backtracking k-coloring | random colorings |
| (breadth-fill) subset-sum/knapsack/partition | bitmask subsets | random subsets |
| (breadth-fill) clique/vertex-cover/max-cut | k-combinations / partition scan | random samples |

### Registry — `src/games/solvers/registry.ts`

`getSolvers(gameId) -> { bruteForce, random }`, mirroring the game registry (Factory/Registry,
Open-Closed). Optional `countSolutions(puzzle, cap)` derived from the brute-force enumerator.

## Unique-solution generation (rides on the brute-force counter)

For games where uniqueness is well-defined (hamiltonian, 3-SAT, set-cover, subset-sum), wrap
generation:

```ts
function uniquify(generate, countSolutions, cap = 25) {
  for (let i = 0; i < cap; i++) {
    const gen = generate();
    if (countSolutions(gen.puzzle, 2) === 1) return gen; // exactly one
  }
  return generate(); // fall back; don't block the stream
}
```

**Graph-coloring caveat** (kept from the memory note): proper colorings have color-swap
symmetry, so they're never unique up to permutation — uniqueness there needs a redesign
(Sudoku-style pre-filled "given" nodes or a fixed canonical color order). Out of scope for the
first cut; handle per-game.

## Implementation status (2026-06-26)

**Shipped:** a functional solver core — `solvers/types.ts` (`Solver`, `SolverResult`,
`SolverBudget`, `SolverSpec`), `solvers/base.ts` (`bruteForceSolver`, `randomSolver`,
`countSolutions` — generic, budget/timing-owning, verifying via each game's own
`isSolved`), a shared subset enumerator (`solvers/enumerate.ts`), `solvers/registry.ts`
(`getSolvers`, `countSolutions`, `getGameSolvers`), and `solvers/uniquify.ts`. Per-game
`SolverSpec`s for **three-sat, set-cover, subset-sum**. 23 tests green.

**Empirical finding — uniqueness is a *generator* property, not a solver one.**
Measuring `countSolutions` over 300 fresh instances per game/difficulty:

| Game | Unique-instance rate | Verdict |
|---|---|---|
| set-cover | ~90% (d=100) → 26% (d=1500) | `uniquify` works out of the box |
| subset-sum | ~1–4% | generator must reject decoys that form alternate sums |
| three-sat | ~0% | small satisfiable SAT almost always has many models (Unique-SAT is rare) |

So the solver layer is correct, but `uniquify` only reliably yields unique puzzles for
set-cover today. Making subset-sum/3-SAT uniqueness-friendly is **generator work** (next
step for [[project-pip-unique-solution]]): e.g. subset-sum — reject any decoy set whose
subsets hit the target; 3-SAT — add clauses to pin down the assignment or accept that
uniqueness isn't the right quality bar at these sizes.

**Not yet done:** hamiltonian/graph-coloring + the rest of the 19-game roster (extend the
`SPECS` map, one entry each), and the SolverPanel UI below.

## SolverPanel UI — `src/components/game/SolverPanel.tsx`

A generic panel: **Run brute force** / **Run random** buttons, a readout of
`iterations` + `timeMs` + solved/failed, and **Apply solution** (replays the returned solution
through `applyMove`). Run solvers in a `setTimeout`/worker tick so the UI stays responsive.
This becomes the real, always-on successor to GamePlayer's test-only "Show solution".

## Critical files

- New: `src/games/solvers/types.ts` (Solver, BaseSolver, budget), `src/games/solvers/registry.ts`,
  `src/games/<game>/solver.ts` per game, `src/games/solvers/uniquify.ts`.
- New: `src/components/game/SolverPanel.tsx`.
- Reused: each game's `isSolved`/`applyMove`/`generate` (`src/games/*/index.ts`), the game
  registry, the seeded RNG (`src/games/rng.ts`).

## Verification (TDD)

- **Unit**: for each game, brute-force `solve(generate(d).puzzle)` returns a `solution` with
  `isSolved(solution) === true`; random `solve` finds one within budget or returns
  `solved:false` (never hangs — assert `timeMs` under the timeout). Budget respected
  (`iterations <= maxIterations`).
- **Unique-solution**: on a planted-unique instance, `countSolutions(puzzle, 2) === 1`; on a
  deliberately ambiguous instance, `>= 2`. `uniquify` output always counts 1 (for supported
  games) within the cap.
- **Component/e2e**: SolverPanel runs a solver and "Apply solution" drives the board to solved;
  iteration/time stats render.
- **Gates**: `tsc`, `npm test`, `npm run test:e2e` green per commit.

## Sequencing

1. `Solver`/`BaseSolver` + budget + one game (3-SAT) brute-force & random + tests.
2. Solver registry + remaining current games (set-cover, hamiltonian, graph-coloring).
3. `countSolutions` + `uniquify`; apply to 3-SAT/set-cover/hamiltonian/subset-sum.
4. `SolverPanel` UI + wire into `/box` (and a future problem catalog).
5. Extend solvers as the Karp-21 breadth-fill adds games.

## Related

- [v0 integration backlog](../analysis/v0-integration-backlog.md) (P0/P1)
- [NP-complete games engine plan](./np-complete-games.md)
- [Vision & MVP roadmap](./vision-and-mvp-roadmap.md) (MVP5 — solver telemetry)
- Memory: [[project-pip-unique-solution]]
