# Game Design Goals & Notes

Organized from Kenneth's design brain-dump (2026-06-28). Items tagged **[BIG-BET]**
(affects the core MVP science — skill transfer, optimal challenge, measurement validity) vs
**[QoL]** (polish / per-game UX). Big bets come first.

## The three design goals (north star for every game)

1. **Prefer NP-complete.** The substrate stays principled (assumption A1).
2. **Prefer a unique optimal/correct solution.** "Single correctness" — a puzzle should
   have one right answer, which makes "perfect solution" well-defined and success/fail
   crisp. (See [[project-pip-unique-solution]] and the solver layer's `countSolutions`.)
3. **Add games, don't modify.** Iterate by *adding* a new game; "replace" an old one by
   **disabling it by default** (we already do this — see `DEFAULT_DISABLED` in
   `settings.ts`). Keeps history and avoids churn on a game people may rely on.

## Big bets (core science)

- **[BIG-BET] Elo rating per game** + track metrics to find the **optimal challenge point
  per game**. (MVP 0/1 estimator exists in `src/games/skill/`; not yet wired live per game.)
- **[BIG-BET] Challenge point as a *distribution*, not a single point.** We don't know that
  optimal challenge is one precise success probability; treat it as a band/distribution and
  add configurable noise around the target. Feeds the adaptive selector.
- **[BIG-BET] Validate the headline bets** once data volume allows:
  - **A3** reducible games → human **skill transfer** (the crown jewel; MVP 3).
  - **A4** optimal challenge → **skill improvement**.
- **[BIG-BET] Single-correctness ⇒ success/fail definition.** A "perfect" solution is the
  unique optimal one. Implications:
  - **Undo** should count as a **FAIL** (like skip/reset) — undo contradicts a perfect
    solve. (We *may* evaluate softly later, but default to strict.)
  - Per-game success/fail needs **refinement** — logs show non-optimal solutions accepted
    as wins (set-cover 5/3, steiner ×2). Decide per game whether non-minimal = success.
- **[BIG-BET · data integrity]** Lock the board on solve (stop post-solve moves) and add
  **idle detection** for solve-time — both corrupt the challenge/skill signal today (see
  [../analysis/telemetry-findings.md](../analysis/telemetry-findings.md)).

## Scaffolding / digestibility principle

**Provide as much context and scaffolding as possible** so a puzzle is readable at a glance:
- knapsack: colored weight + a capacity **meter**; clearer weight/value display.
- set-cover: unique **color/shape + spatial location** per element. (Insight: the Tetris
  bin-packing problem is effectively a form of set cover — spatial framings transfer.)
- **Prefer spatial/visual over notation.** 3-SAT as raw Boolean notation is poor UX → give
  it a spatial/visual form (or, per goal #3, add a *new* visual logic game instead of
  modifying the pure-math one).
- Teach **high-level tricks** the way Sudoku tutorials do.
- **Single-step variants** of large puzzles (solve just one step of a bigger Sudoku) —
  great for learning/onboarding; this principle generalizes to many games.

## New game ideas

- **Knapsack derivatives with better UX** — Tarkov/Marauders-style **2D grid inventory**:
  rectangles with dollar values, maximize value under space constraints (2D knapsack /
  bin-packing; NP-complete and very visual). Strong candidate.
- **Sudoku** — and especially **single-step Sudoku** puzzles (pick the one forced cell).
- **NP-complete chess variant?** Mate-in-x puzzles are the *inspiration* (not NP-complete);
  explore whether a genuinely NP-complete chess-like puzzle exists, or use chess-puzzle
  *structure* (single tactical step) as a UX template.
- General pattern: take a rich game and expose a **single decision step** as the puzzle.

## QoL / per-game fixes (smaller)

- **[QoL] nonogram** — success banner offsets the grid → accidental post-solve square
  (fixed by the board-lock-on-solve change above).
- **[QoL] integer-programming** — default to all-0s selected.
- **[QoL] knapsack** — better weight/value display; enforce a single solution.
- **[QoL] steiner-tree** — trivial unless optimality is the explicit, enforced goal.
- **[QoL] games in settings can be categorized** (we now have `category` in
  `src/games/metadata.ts` — group the settings UI by it).
