# Documentation Index

Design docs, plans, and analysis for **pack-it-play-it** — a box of NP-complete puzzles that
trains humans, tests algorithms, and (eventually) trains/tests AI on NP-complete solving.

## Start here

- **[PRINCIPLES.md](./PRINCIPLES.md)** — how we build: TDD red-green-refactor, SOLID, DDD
  layering, FP/parameterized style, the code-smell catalog, and the 4-phase "add a game"
  checklist. Read this first.

## Vision & roadmap

- **[plans/vision-and-mvp-roadmap.md](./plans/vision-and-mvp-roadmap.md)** — the platform
  thesis, the five literature assumptions ranked by risk (A3 reducibility→transfer is the
  crown-jewel bet), and MVPs 0–5 with falsifiable kill criteria and Given/When/Then stories.

## Plans (what to build)

- **[plans/np-complete-games.md](./plans/np-complete-games.md)** — the shared `PuzzleGame`
  engine + archetype renderers; how to add games; the Karp-21 breadth-fill.
- **[plans/solver-layer.md](./plans/solver-layer.md)** — brute-force + random solvers
  (ported from v0) and **unique-solution generation** that rides on the solution counter.
- **[plans/infinite-adaptive-mode.md](./plans/infinite-adaptive-mode.md)** — endless mode +
  skill-rating (Glicko/Elo) dynamic difficulty. *Partially shipped* (`settings.ts`,
  `adaptive.ts`); this is the reference for the full version.

## Research

- **[research/optimal-challenge-point.md](./research/optimal-challenge-point.md)** — the
  learning-science behind adaptive difficulty: the Challenge Point Framework (functional vs
  nominal difficulty), ZPDES learning-progress bandits, BKT mastery, desirable difficulties —
  each mapped to a concrete pip mechanic, with a staged upgrade path for `adaptive.ts`.

## Analysis: `v0-np-complete-gamebox`

Study of the sibling project ([repo](https://github.com/kennbyee25/v0-np-complete-gamebox))
and how to fold its best ideas in here.

- **[analysis/v0-gamebox-codegraph.md](./analysis/v0-gamebox-codegraph.md)** — its DDD
  architecture, the `PuzzleStrategy` and `Solver` abstractions, dependency graph.
- **[analysis/v0-gamebox-inventory.md](./analysis/v0-gamebox-inventory.md)** — exhaustive
  feature/principle/approach list with port verdicts (★ port / ~ adapt / ○ have / ✗ skip).
- **[analysis/v0-integration-backlog.md](./analysis/v0-integration-backlog.md)** — prioritized
  port plan (P0 solvers → P1 uniqueness → P2 breadth → P3 SolverPanel → P4 metadata → P5 value
  objects → P6 principles), mapped onto the plans above.

## What's shipped today

4 games (graph-coloring, set-cover, hamiltonian, 3-SAT) in an interleaved endless box at
`/box`, with per-game difficulty + game selection, spacebar/auto-advance, per-puzzle reset +
timer + move counter, and optimal-challenge adaptive difficulty. CI (typecheck + unit + e2e)
and GitHub Pages deploy run on every push to `main`. Live:
https://kennbyee25.github.io/pack-it-play-it/

## Highest-leverage next steps (from the analysis)

1. **Solver layer** ([plans/solver-layer.md](./plans/solver-layer.md)) — unlocks the
   algorithm-testing pillar *and* unique-solution generation in one stroke.
2. **`category` + `reductionFrom` metadata** — cheap, and it's what the transfer experiment
   (MVP3) needs.
3. **Karp-21 breadth-fill** — re-express v0's 18 generators against the `PuzzleGame` contract.
