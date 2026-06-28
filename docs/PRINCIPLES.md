# Engineering Principles

The conventions this project is built and maintained under. Adapted in part from the sibling
[`v0-np-complete-gamebox`](./analysis/v0-gamebox-codegraph.md), whose SOLID/TDD/refactoring
discipline we adopt, merged with practices already in force here.

## 1. Test-Driven Development — red → green → refactor

- Write the failing test first; implement the minimum to pass; then refactor under green.
- The **test pyramid**: pure-logic unit tests (generators, solvers, settings, adaptive) →
  component tests (renderers, GamePlayer) → integration/e2e (EndlessMode, Playwright).
- **Every commit is green** (`tsc --noEmit`, `npm test`, and where relevant `npm run test:e2e`).
  History is curated so each commit builds and passes — see the rewritten, classified log.

## 2. SOLID

- **S**ingle Responsibility — one job per module (`adaptive.ts` decides difficulty; renderers
  only render; generators only generate).
- **O**pen/Closed — extend via the registry, not by editing existing games. Adding a game =
  appending one `PuzzleGame` entry; adding a solver = one registry entry.
- **L**iskov Substitution — any `PuzzleGame` is interchangeable under the conformance suite;
  any `Solver` is interchangeable (brute-force ↔ random) behind one interface.
- **I**nterface Segregation — small contracts (`PuzzleGame`, `Solver`, `BoardProps`); no
  god-interfaces.
- **D**ependency Inversion — UI depends on domain abstractions (`PuzzleGame`, `Generated`),
  never the reverse.

## 3. Layering (lightweight DDD)

```
src/games/**      → domain: pure logic (generate, applyMove, isSolved, progress, solvers,
                    settings, adaptive). No React.
src/components/** → presentation + a thin application shell (GameShell/EndlessMode/GamePlayer).
src/hooks/**      → application glue (useGameSettings).
```

**Dependency rule:** presentation → application → domain. Keep `src/games/**` free of React
imports so it stays unit-testable and portable.

## 4. Functional / parameterized style

- Pure functions; **inject the RNG** (`makeRng(seed)`) so generation is deterministic and
  testable — no hidden `Math.random` in domain code.
- Immutable updates (`applyMove` returns new state); prefer `readonly` and value objects over
  scattered primitive math (`sizeFor(difficulty)` over inline `4 + d/250`).
- Parameterize everything; avoid hardcoded magic numbers — name them
  (`DIFFICULTY`, `ADAPT`, solver budgets).

## 5. Code-smell catalog (refactor triggers)

Watch for and refactor these (v0's catalog, adopted):

| Smell | Refactor |
|---|---|
| Long method (>~20 lines doing many things) | extract functions |
| Large class/file (>~200 lines, mixed concerns) | split by responsibility |
| Switch on a type id | Strategy + registry (pip already does this) |
| Primitive obsession (`difficulty === 'easy' ? 3…`) | value object / config map |
| Magic numbers | named constants |
| Duplicate logic | shared util (e.g. a graph kernel across graph games) |
| Mixed concerns in a component | extract a hook / move logic to domain |
| Temporal coupling (order-dependent effects) | centralize initialization |

## 6. The 4-phase "add a game" checklist

1. **Test (red)** — write the conformance entry + generator/verifier tests and any
   per-archetype negative cases *first*.
2. **Implement (green)** — domain generator (generate-solved-then-strip) → `isSolved`/`progress`
   → optional solvers → renderer wiring.
3. **Refactor (clean)** — eliminate smells; reuse an existing archetype renderer; share graph
   utilities.
4. **Document** — note the game in the registry, update the relevant plan, link from
   `docs/INDEX.md`.

## 7. Generation invariant

Prefer **generate-solved-then-strip**: construct a valid solution first, then strip it to make
the puzzle. This guarantees solvability *and* yields a planted solution for tests, hints, and
the conformance suite — stronger than generate-then-search. Difficulty == problem size (these
are NP-hard), so a generator that emits one valid solution at a requested size is sufficient
for difficulty control; **uniqueness** is a separate quality bar (see the solver-layer plan).

## 8. Outward-facing changes

- Confirm before irreversible/outward actions (force-push, making a repo public, deploys).
- CI gates every push (typecheck + unit + e2e); Pages deploys from `main`. Keep them green.
- **Run CI's exact typecheck before pushing:** `npx tsc --noEmit -p tsconfig.app.json`
  (it includes test files; plain `tsc --noEmit` misses errors in tests).

## 9. Game design goals

Three north-star goals govern new games (full detail + tiered notes in
[plans/game-design-goals.md](./plans/game-design-goals.md)):

1. **Prefer NP-complete.**
2. **Prefer a unique optimal/correct solution** — "single correctness" makes "perfect
   solution" well-defined, so success/fail is crisp (undo/skip/reset count as fail).
3. **Add games, don't modify** — "replace" by disabling the old game (`DEFAULT_DISABLED`).

Plus the **scaffolding principle**: give each puzzle as much visual/spatial context as
possible (colored meters, unique color+shape+location) — prefer spatial framings over raw
notation.
