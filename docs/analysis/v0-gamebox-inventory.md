# Feature & Principle Inventory: `v0-np-complete-gamebox`

> Companion to [v0-gamebox-codegraph.md](./v0-gamebox-codegraph.md). An exhaustive list of
> what v0 has — features, philosophies, approaches — so nothing is lost when we cherry-pick
> into `pack-it-play-it`. Items are tagged with a port verdict:
> **★ port**, **~ adapt**, **○ already have**, **✗ skip** (with reason).

## A. Games (problems implemented)

v0 has generators/components for **~22 problems**, essentially the full Karp 21 + extras.
pip currently has 4 (graph-coloring, set-cover, hamiltonian, 3-SAT).

| Family (pip archetype) | v0 problems | pip has | Port verdict |
|---|---|---|---|
| **Logic** (logic-assignment) | 3-SAT, integer-programming | 3-SAT | ★ integer-programming |
| **Graph-select** | clique, vertex-cover, independent-set, graph-coloring, max-cut, clique-cover, feedback-arc-set, feedback-vertex-set | graph-coloring | ★ clique, vertex-cover, independent-set, max-cut, feedback-* |
| **Graph-path** | directed/undirected hamiltonian, steiner-tree | hamiltonian | ★ steiner-tree, directed variant |
| **Set** | set-covering, set-packing, exact-cover, hitting-set, 3d-matching | set-cover | ★ set-packing, exact-cover, hitting-set, 3d-matching |
| **Number/packing** | knapsack, subset-sum, partition, job-sequencing, quadratic-assignment | (bin-packing, not in registry) | ★ subset-sum, knapsack, partition, job-sequencing |

→ Detailed per-game porting notes in [v0-integration-backlog.md](./v0-integration-backlog.md).

## B. Algorithms & domain logic

1. **★ Dual solvers per problem** (`domain/solvers.ts`, `all-solvers.ts`) — a **brute-force**
   (exhaustive: bitmask subsets, backtracking, k-combinations) and a **random heuristic** for
   each problem, behind one `Solver<T>` interface. pip has *none*. **Highest-value port** — see
   below for synergies.
2. **★ `BaseSolver` Template Method** — centralizes timing, `iterations`, `maxIterations`,
   `timeoutMs`; subclasses only implement `doSolve`. Bounded compute = NP-safe UI.
3. **★ `SolverResult` metadata** — `{ solved, solution, iterations, timeMs, metadata }`. This
   *is* algorithm telemetry (ties to pip vision MVP5).
4. **~ `PuzzleStrategy` (generate/validate/score)** — Strategy + registry. pip's `PuzzleGame`
   already covers generate/validate; v0's optional `calculateScore` is worth adopting for
   optimization problems (knapsack/max-cut where "solved" is "beat target").
5. **★ Separate `validators.ts`** — pure per-problem validation functions (SRP). pip inlines
   `isSolved`; extracting validators aids the solver + uniqueness work.
6. **~ `graph-utils.ts`** — adjacency lists, `isClique`, `isVertexCover`, `isValidColoring`,
   node selection toggles. A shared graph kernel pip lacks (its graph logic is per-game).
7. **○ generate-then-validate** — v0 generates random instances then relies on solver to find
   a solution. pip's **generate-solved-then-strip** is *stronger* (guarantees solvability +
   yields the planted solution). Keep pip's approach; use v0 solvers as an *independent check*.

## C. Difficulty & progression

8. **~ 4-tier difficulty** (`easy|medium|hard|expert`) + `DIFFICULTY_CONFIG{multiplier,baseSize}`.
   pip uses a **continuous** raw difficulty (finer, already adaptive). Adapt: offer named
   presets as labels over the continuous scale; borrow the per-tier config shape.
9. **★ Value Objects** (`DifficultyLevel`, `ProblemSize`) — encapsulate `difficulty → {vertexCount,
   density, scale}`. Cleaner than scattering size math; aligns with pip's "parameterize
   everything" preference. Adapt to a per-game `sizeFor(difficulty)` value object.
10. **○ Adaptive challenge** — v0 has fixed tiers, *no* adaptivity. pip already shipped
    optimal-challenge adaptation (`src/games/adaptive.ts`). pip ahead here.

## D. UI / UX

11. **★ `SolverPanel`** — "Run Brute Force" / "Run Random" buttons, shows iterations + ms,
    "Apply solution". A real feature (vs pip's test-only "Show solution") and the natural home
    for the algorithm-testing pillar.
12. **~ Canvas graph rendering** (`graph-canvas.tsx`) — pip uses SVG. Canvas scales to larger
    graphs but v0's own docs flag it as a perf risk; pip's SVG is fine until graphs get big.
13. **★ Progress tracker / categories** — solved count across problems, grouping by `category`,
    a problem catalog (`problem-card.tsx`). pip's box has no catalog/progress dashboard.
14. **~ Achievements / attempts / best-time** (`game-context.tsx`, `GameInstance`) — pip tracks
    per-puzzle moves/time but no persistent achievements or per-problem best times.
15. **✗ Difficulty selector modal flow** — v0's view state machine (grid→difficulty→playing).
    pip's endless interleaved stream is a different, intentional UX; keep pip's.

## E. Engineering philosophy (the "principles" the user flagged)

16. **★ SOLID** — explicitly applied: SRP (one job per module), Open/Closed (`registerStrategy`),
    Liskov (interchangeable solvers), Interface Segregation (small `Solver`/`Strategy`), DIP
    (UI depends on domain abstractions). Formalize for pip in `docs/PRINCIPLES.md`.
17. **★ DDD layering** — `domain/` (pure) ↔ `application/` (hooks/context) ↔ `presentation/`.
    pip is close (`src/games` ≈ domain) but informal; document the dependency rule.
18. **○ TDD red-green-refactor** — v0's core methodology. pip already follows this convention.
19. **★ Documented code-smell catalog** — 8 smells + a `code-smell-detector` + a 789-line
    `REFACTORING_GUIDE`. Adopt the catalog as a refactoring checklist.
20. **★ 4-phase per-game pattern**: (1) write tests, (2) implement to green
    (domain→solvers→hook→component), (3) refactor smells, (4) document. Adopt as the canonical
    "add a game" checklist (pip's `np-complete-games.md` conformance suite is the test half).
21. **★ Immutability** — `readonly` on all domain types; pure functions. Matches pip's FP
    preference; tighten pip's `any`-typed registry.
22. **○ Lazy-loaded registry** — code-splitting per game. pip loads all 4 eagerly; worth
    adopting once the catalog grows toward 21.

## F. Documentation corpus (what to mirror)

v0 ships ~2,000 lines across: `EXECUTIVE_SUMMARY`, `QUICK_START`, `README`, and `docs/`:
`ARCHITECTURE_VISUALIZATION`, `CODE_SMELLS_REPORT`, `REFACTORING_GUIDE`, `TESTING_GUIDE`,
`GAME_IMPLEMENTATION_CHECKLIST`, `COMPLETION_STATUS`, `SESSION_SUMMARY`, `INDEX`, etc.

→ pip should grow: `docs/PRINCIPLES.md` (★, this PR), a per-game checklist (fold into
`np-complete-games.md`), and an architecture diagram (the codegraph doc covers v0; pip's own
is in its plans). A `docs/INDEX.md` ties it together (this PR).

## Synergies worth shouting about

- **Solvers ↔ unique-solution backlog**: a **brute-force solver that *counts* solutions**
  directly implements pip's deferred "exactly one solution" feature (rejection-sample until the
  solver finds a single solution). The solver port and the uniqueness feature are the *same
  work*. ★★
- **Solvers ↔ vision pillars**: the platform promises "algorithms can be tested" and "AI
  trained/tested on NP-complete." `Solver` + `SolverResult` telemetry is the seed of MVP5.
- **`reductionFrom`/`category` ↔ transfer thesis (MVP3)**: reduction-family metadata lets the
  transfer experiment group games by reduction distance — the crown-jewel bet.
- **Value objects ↔ adaptive difficulty**: a clean `sizeFor(difficulty)` per game makes the
  adaptive step semantics explicit.
