# Integration Backlog: porting `v0-np-complete-gamebox` → `pack-it-play-it`

> Prioritized, actionable plan derived from [v0-gamebox-codegraph.md](./v0-gamebox-codegraph.md)
> and [v0-gamebox-inventory.md](./v0-gamebox-inventory.md). Each item says **what**, **why**,
> **how it fits pip's existing contracts**, and **which existing plan it percolates into**.
> Ordered by value × synergy. Everything here keeps pip's conventions: TDD red-green-refactor,
> all-green commits, FP/parameterized, the `PuzzleGame` contract.

## Guiding principle for the port

Do **not** wholesale copy v0 (it's Next.js + a different `generate-then-validate` model). pip's
**generate-solved-then-strip** generators are stronger (guaranteed solvable + planted
solution), and pip's `PuzzleGame<TState,TMove>` adds a per-move model v0 lacks. So: **lift the
ideas and algorithms, re-express them against pip's contract.**

---

## P0 — Solver layer (biggest win, unlocks two backlog items)

**What.** Add a `Solver<TState>` abstraction with a `BaseSolver` (Template Method: timing +
`maxIterations`/`timeoutMs` budget) and, per game, a **brute-force** and **random** solver
returning `SolverResult { solved, solution, iterations, timeMs }`. Port v0's algorithms
(`domain/solvers.ts`): bitmask subset enumeration (subset-sum/knapsack/partition/SAT),
k-combinations (clique/vertex-cover), backtracking (hamiltonian/coloring), partition scan
(max-cut).

**Why.** (1) Realizes the platform's "algorithms can be tested" and "AI trained/tested"
pillars. (2) A **brute-force solver that counts solutions implements the deferred
unique-solution feature** — they are the same work. (3) Powers a real `SolverPanel` UI.

**Fit.** New `src/games/solvers/` with `Solver<TState>` keyed off the existing registry; solvers
consume `PuzzleGame.isSolved` as the verifier and the game's `applyMove` to express solutions.
Bound every solver with a timeout so an NP-hard instance never hangs.

**Percolates into.** New dedicated plan [docs/plans/solver-layer.md](../plans/solver-layer.md);
referenced from `vision-and-mvp-roadmap.md` (MVP5) and `project_pip_unique_solution` memory.

**Tests (TDD).** Per solver: *given* a generated puzzle, the brute-force solver finds a
solution that `isSolved`; the random solver finds one within budget or reports `solved:false`;
both respect `maxIterations`/`timeoutMs`. Solution-count variant: planted-unique instances
return count 1.

---

## P1 — Unique-solution generation (was already backlogged; now tractable)

**What.** Use the P0 brute-force **solution counter** to reject-sample generated instances
until exactly one solution exists (for games where uniqueness is well-defined: hamiltonian,
3-SAT, set-cover, subset-sum). Keep the graph-coloring caveat (color-swap symmetry → needs
"given" pre-fills; see [[project-pip-unique-solution]]).

**Fit.** Wrap each game's `generate` with a `uniquify(generate, countSolutions, cap)` helper.

**Percolates into.** `project_pip_unique_solution` memory; a section in
[docs/plans/solver-layer.md](../plans/solver-layer.md).

---

## P2 — Karp-21 breadth-fill (port the 18 generators)

**What.** Port v0's generators (`all-puzzle-strategies.ts`) re-expressed as pip
`PuzzleGame`s, one per reduction family first (pip's existing sequencing), then breadth.
Concrete next set, by archetype reuse:

| pip archetype + renderer | Port from v0 | Notes |
|---|---|---|
| graph-select / `GraphBoard` | clique, vertex-cover, independent-set, max-cut | reuse node-select; clique/IS/VC differ only in `isSolved` |
| set / `SetBoard` | set-packing, exact-cover, hitting-set | reuse subset-toggle UI |
| number / (new `NumberBoard`) | subset-sum, knapsack, partition | needs a weights/target renderer pip lacks |
| logic / `AssignmentBoard` | integer-programming (0/1) | reuse variable toggles |
| graph-path / `PathBoard` | steiner-tree, directed-hamiltonian | reuse edge/path UI |

**Fit.** Each is "a generator + a verifier + reuse a renderer" — exactly pip's
`np-complete-games.md` thesis. Re-use generate-solved-then-strip (don't copy v0's
random-then-solve).

**Percolates into.** `docs/plans/np-complete-games.md` (the breadth-fill section) and the
`mvp3-karp-game-box` plan.

---

## P3 — `SolverPanel` UI + problem catalog

**What.** A `SolverPanel` (run brute-force/random, show `iterations`/`timeMs`, apply solution)
and a **problem catalog / progress dashboard** grouping games by `category` with solved counts.

**Why.** Makes the algorithm pillar visible; gives the box a "table of contents" beyond the
endless stream.

**Fit.** `SolverPanel` replaces the test-only "Show solution" with a real, always-available
feature; catalog is a new route alongside `/box`.

**Percolates into.** `vision-and-mvp-roadmap.md` (MVP5 + human-facing surface).

---

## P4 — Problem metadata: `category` + `reductionFrom`

**What.** Add a problem registry carrying `category` (satisfiability|graph|set|number|sequencing),
`yearIntroduced`, and **`reductionFrom`** per game.

**Why.** Directly serves the **transfer thesis (MVP3)**: group/relate games by reduction
distance; analyze whether skill transfers along reduction edges. Thematically core to the whole
vision.

**Fit.** Extend the registry entry type with metadata fields (no behavior change).

**Percolates into.** `vision-and-mvp-roadmap.md` (A3 transfer experiment design),
`mvp3-karp-game-box` plan.

---

## P5 — Value objects for difficulty/size

**What.** Encapsulate each game's `difficulty → size params` as a small value object /
`sizeFor(difficulty)` (v0's `DifficultyLevel`/`ProblemSize`), replacing inline `configFor`
math.

**Why.** Cleaner, testable, makes the adaptive step semantics explicit; matches "parameterize
everything."

**Percolates into.** `infinite-adaptive-mode.md` and `np-complete-games.md`.

---

## P6 — Engineering-principles doc + code-smell catalog

**What.** `docs/PRINCIPLES.md` (this PR): SOLID + DDD dependency rule + the 8-smell catalog +
the 4-phase add-a-game checklist + pip's existing FP/red-green-refactor/all-green-commits.

**Why.** The user explicitly admired v0's SOLID/TDD/refactoring discipline; codify it so future
work (and agents) follow it.

**Percolates into.** New `docs/PRINCIPLES.md`; linked from `docs/INDEX.md`.

---

## Explicitly NOT porting

- **Next.js / app-router structure** — pip is Vite SPA; no reason to migrate.
- **v0's `generate-then-validate`** — pip's generate-solved-then-strip is strictly better.
- **4-tier-only difficulty** — pip's continuous + adaptive supersedes it (keep presets only as
  labels).
- **`code-smell-detector.ts` runtime tool** — interesting but low ROI; the *catalog* (as docs)
  is the valuable part.
- **Achievements system** — defer; not aligned with the current research-first roadmap.

## Suggested execution order

`P0 solver layer` → `P1 uniqueness` (rides on P0) → `P4 metadata` (cheap, unblocks MVP3
thinking) → `P2 breadth-fill` (steady stream of games) → `P3 SolverPanel + catalog` →
`P5 value objects` (refactor) — with `P6 principles` landing first as the guardrail (this PR).
