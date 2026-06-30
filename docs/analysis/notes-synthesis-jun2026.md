# Synthesis: Raw Notes → Decisions & Backlog

> Organized mapping of June 2026 brainstorming notes onto the MVP roadmap and big bets.
> Raw ideas are preserved here with disposition: **action** (do now), **backlog** (do later),
> **rejected** (decided against), **constraint/principle** (design rule going forward).

---

## 1. Emergent design principles (constraints going forward)

These three goals surfaced from your notes and should be treated as **hard constraints**
for all future game work:

| Principle | Rationale | Implication |
|---|---|---|
| **Prefer NP-complete** | The platform thesis rests on A1 + A3 (reducible problem space). Non-NP games are admissible only as controlled comparison conditions (e.g., chess puzzles as a non-NP baseline for transfer), not as primary content. | Any non-NP candidate must justify itself as a transfer experiment control, not gameplay filler. |
| **Prefer unique optimal/correct solution** | Enables "single correctness" scoring (outcome ∈ {perfect solve, fail}), simplifies Elo calibration, and favors the "one perfect answer" UX clarity you want. Solver layer (P1) becomes mandatory for this. | Games with inherent ambiguity (graph coloring symmetries, Steiner without well-defined optimality) are replacement candidates. |
| **Add games; don't modify** | Avoids being stuck polishing bad UX into medium UX. A weak game should be disabled and replaced, not refactored. | 3-SAT → disable; Steiner → disable unless optimality defined; Nonogram → keep, fix the post-success bug. |

These now supersede ad-hoc UX improvements on existing games.

---

## 2. Per-note disposition

### Game additions & replacements

| # | Raw note | Disposition | Maps to | Rationale |
|---|----------|-------------|---------|-----------|
| 1 | Games in settings can be categorized | **BACKLOG (MVP 2)** | `v0-integration-backlog.md` P4 metadata; `np-complete-games.md` registry | Cheap to add `category` + `reductionFrom` to registry; unblocks now. Enables grouping for interleaved vs blocked practice later. |
| 2 | Provide as much context/scaffolding as possible (colored weight for knapsack, color/shape + spatial for set cover, Tetris = set cover spatially) | **CONSTRAINT / BACKLOG (per-game)** | `np-complete-games.md` renderer design; vision UX pillar | Treat as a **renderer design rule**: every game needs a spatial/visual metaphor, not a pure math notation. This is why 3-SAT fails. |
| 4 | Knapsack UX → look at scavenger-inventory derivatives (Tarkov/Marauders: 2D rectangles, dollar values, maximize value) | **ACTION: DESIGN DOC** | New game: **Scavenger Grid** under number/packing archetype | This is a *genuinely better knapsack* — spatial + value context + single solution if items are unique. Strong candidate for MVP 2 breadth-fill. Worth a dedicated design doc. |
| 6 | Steiner graph trivial unless optimality is well-defined | **REJECTED / DISABLE** | N/A (disable current game) | Unless we define a tight optimality criterion (shortest total path, boundedSteiner tree size), the game collapses to "connect the dots." Not worth fixing; disable. |
| 7 | 3-SAT sucks because Boolean notation is abstract; replace with visual/spatial or new game | **REJECTED / DISABLE** | N/A (disable 3-SAT; add visual SAT alternative) | Replacing > modifying. Candidate replacements: visual circuit-sat (gates on a grid), or a spatial covering puzzle (Tetris = set cover, as noted in #2). |
| 8 | Knapsack should have a single solution | **CONSTRAINT** | `solver-layer.md` P1 uniqueness | If items have unique weights/values and capacity is tight, uniqueness is often natural. For generated instances, use P0 brute-force counter to enforce it. |
| 11 | NP-complete variant of chess (puzzles/checkmates in x moves)? | **REJECTED — see Section 6 for full analysis** | N/A | Chess derivatives are either harder than NP (PSPACE/EXPTIME) or, when restricted to single-player (Solo Chess), NP-complete only under strict piece-heterogeneity with no meaningful reduction to/from standard NP problems. Not a fit for the platform thesis. Acceptable only as non-NP control in transfer experiments. |
| 12 | Sudoku is obvious but long; extract "single step" puzzle variants for learning | **DEPRECATED — see revised Sudoku strategy below** | See Design Evolution: Knapsack + Sudoku | Full-board Sudoku is the starting point; single-step extraction remains a future teaching-layer idea but is not a near-term priority. |
| 13 | High-level tricks like Sudoku (X-Wing, etc.) as teachable patterns | **BACKLOG (MVP >2)** | Adaptive/teaching layer beyond current scope | Once the adaptive loop (MVP 1) is solid, hint/trick systems become the next difficulty dimension. Defer. |

### Quality-of-life / minor bugs

| # | Raw note | Disposition | Maps to | Rationale |
|---|----------|-------------|---------|-----------|
| 3 | Integer math defaults to 0s selected | **QUICK FIX — BACKLOG** | Existing integer-programming game | Small polish. Tag for "if you're already in the file." Not worth a dedicated cycle. |
| 5 | Nonogram painting after success issue | **BUG — BACKLOG** | `nonogram` renderer / state machine | Existing bug. Fix when Nonogram is next touched, or if bite-sized. |
| 10 | Disable old game rather than modify | **CONSTRAINT** (see principle #3 above) | All replacement decisions | 3-SAT and Steiner should move to a `disabledGames` list, not deleted, so they remain available for controlled experiments or revival. |

### Infrastructure / big bets

| # | Raw note | Disposition | Maps to | Rationale |
|---|----------|-------------|---------|-----------|
| 14 | Undo button = FAIL; single correctness only | **CONSTRAINT / BACKLOG** | Game contract + scoring logic | Consistent with unique-solution principle. Implement as: `undo()` resets to prior state but marks the puzzle as `tainted` for scoring purposes (counts as non-perfect). Or simply don't offer undo in strict mode. Defer until Elo infra is in place so we know what "counts as fail" means mechanically. |
| 15 | Elo per game + noisy / distributional optimal challenge point tracking | **BACKLOG (MVP 3 enabler)** | `infinite-adaptive-mode.md` + research docs | The adaptive loop (current `adaptive.ts`) is the seed. Full per-game Elo + challenge-point distribution analysis requires MVP 2 multi-game common scale to be meaningful. Keep as note for later design doc. |

---

## 3. Concrete next actions (derived from above)

### Action 1: Disable + Replace candidates (this week)
- [ ] Move **3-SAT** and **Steiner** to `disabledGames` in registry (no deletion — archive for possible experiment controls).
- [ ] Add `category` + `reductionFrom` metadata to all remaining enabled games (cheap; unblocks transfer thinking).

### Action 2: Design docs for replacement games (next 1–2 weeks)
- [ ] **Scavenger Grid** (knapsack replacement) — design doc covering:
  - 2D grid inventory with variable-size rectangles
  - Dollar-value + weight (or volume) per item
  - Goal: maximize value subject to grid capacity
  - Uniqueness enforced by unique item dimensions/values + tight grid
  - Visual metaphor: colored rectangles with rendered dollar signs and weight badges
  - Difficulty via grid size + item count + value-density variance
- [ ] **Sudoku** (full-board, scalable difficulty) — design doc covering:
  - Standard n×n Sudoku (n = 4, 6, 9, …) with regions
  - Generate solved board → strip cells to create puzzle
  - Uniqueness via solver backtracking / counting (blocked by P0)
  - Difficulty via grid size + stripped-cell ratio + pattern complexity
  - Visual metaphor: clean grid with region shading, number selection palette
  - Playtime target: 1–3 minutes for medium sizes; scales down for easier bands
  - Teaching layer (single-step extraction) is a future add-on, not MVP
- [ ] **Single-Step Sudoku** (or general "Constraint Step" archetype) — *deferred:*
  - One cell or one region with a missing inference
  - Player selects the correct value (or pattern) to advance
  - Parallel: define a small taxonomy of Sudoku tactics (naked pairs, X-wing, etc.) for progressive hint unlocks
  - Not a full Sudoku — extracted to sub-minute playtime
  - **Status:** This was the original idea, but full-board Sudoku is a stronger near-term add. Revisit once the adaptive loop (MVP 1) is solid and players need progressive teaching.

### Action 3: Solver layer dependency (blocks uniqueness)
- [ ] P0 solver layer (`v0-integration-backlog.md`) remains the **critical path** for unique-solution enforcement, which in turn gates Elo's "single correctness" scoring.

### Action 4: Deferred (not forgotten)
- [ ] Elo per game + optimal challenge point distribution analysis
- [ ] Undo-as-fail mechanic
- [ ] Nonogram post-success paint bug
- [ ] Integer math default-to-zeros
- [ ] Teachable trick/tactic system

---

## 4. How this re-orders the integration backlog

The original backlog order:

```
P0 solvers → P1 uniqueness → P4 metadata → P2 breadth → P3 SolverPanel → P5 value objects
```

Your notes don't change the **critical path**, but they **constrain P2**:

1. **P0 solvers** — still first. Unlocks everything else.
2. **P1 uniqueness** — still second. Needed for single-correctness scoring.
3. **P4 metadata** — still cheap, still do early.
4. **P2 breadth** — now filtered by the three principles:
   - Scavenger Grid (number/packing) replaces knapsack instead of porting raw knapsack
   - Visual SAT (or similar) replaces 3-SAT; skip Steiner unless optimality criterion defined
   - **Full-board Sudoku** becomes a near-term addition (scalable, well-understood, good difficulty control)
   - Single-step Sudoku / Constraint Step is deferred to a future teaching layer
   - Everything added must have a spatial/visual metaphor (reject pure notation games)
5. **P3 SolverPanel** — unchanged
6. **P5 value objects** — unchanged

---

## 5. Design Evolution: Knapsack + Sudoku

### Knapsack → Scavenger Grid (incremental path)

Rather than a single monolithic design, we can evolve the scavenger grid in stages:

| Stage | What | Difficulty levers | Solver needs |
|---|---|---|---|
| **V0: Weight/value list** | Classic knapsack: items as rows in a list, each with weight and dollar value. Drag items into a single "bag" (capacity bar). | Item count, capacity tightness, value density variance | Brute-force subset enumeration (small N) |
| **V1: Spatial grid** | Items become 2D rectangles on a grid. Bag is a fixed-size rectangle container. Must fit spatially + stay under weight cap. | Grid size, item size variance, shape irregularity | 2D packing heuristic + brute force for small grids |
| **V2: Scavenger theme** | Full Tarkov/Marauders aesthetic: grid is an inventory/backpack. Items have shapes (L-shapes, T-shapes), weight, value, some have prerequisites. Thematic context: "loot the room, fit what you can." | Shape complexity, prerequisite chains, multi-bag optimization | 2D packing + knapsack hybrid; solver becomes nontrivial |

This staged approach lets us ship a playable game early (V0 or V1) and iterate.

### Sudoku → full board, scalable

Your updated direction: **start with full-board Sudoku, not single-step extraction.**

Rationale:
- Full Sudoku is well-understood, has established difficulty metrics (stripped cell ratio, backtracking depth required), and maps cleanly onto the `PuzzleGame` contract.
- Playtime naturally scales with grid size: 4×4 → ~30 seconds, 6×6 → ~1 minute, 9×9 → ~3 minutes. This is ideal for an adaptive difficulty band.
- Single-step extraction is a **teaching-layer optimization**, not a game-by-itself. It's what you add *after* players are playing full Sudoku but struggling with specific patterns. Defer.
- NP-completeness of generalized Sudoku is established; the generator can use generate-solved-then-strip.

Difficulty levers for Sudoku:
- **Grid size** (4×4, 6×6, 9×9, 12×12)
- **Stripped cell ratio** (more stripped = harder)
- **Pattern difficulty** (controlled by which cells are stripped: random vs. structured)
- **Constraint visualization** (beginner: highlight row/col/region; expert: none)

---

## 6. Chess derivatives and NP-completeness — resolved

**Question:** Does an NP-complete derivative of chess exist that does NOT scale exponentially?

**Short answer: Yes, but only by restricting the game dramatically.**

### What complexity theory tells us

| Chess variant | Complexity | Key distinction |
|---|---|---|
| **Generalized chess** (n×n, force a win) | **EXPTIME-complete** | Full alternating game; quantifier alternation makes it harder than NP/PSPACE |
| **Mate-in-k** (k part of input) | **PSPACE-complete** for k polynomial in n; **EXPTIME-complete** for k unbounded | Still cooperative but path length grows with input |
| **Solo Chess** (single-player, capture all but one) | **NP-complete** | Single-player, no alternating moves; state is just board position |
| **Solo Chess, single piece type** | **P** (polynomial time) | Asymmetric complexity: one piece type = easy, two = hard |
| **Helpmate / Cooperative chess** | **PSPACE-complete** | Cooperative but unbounded sequence; still harder than NP |
| **Retrograde chess** (reachability from start) | **PSPACE-complete** | Cooperative but asks about exponentially long histories |

### The critical distinction: where the exponential complexity lives

The full game of chess is hard because of **quantifier alternation** (∃White ∀Black ∃…), not because of state space. But even single-player chess puzzles (Solo Chess) derive their hardness from **which piece types you allow**:

- **One piece type** on board: solvable in polynomial time (Theorem 2.2 in Brunner et al.). Essentially, you just need a spanning in-arborescence in the immediate capture graph.
- **Two piece types** (e.g., knights + bishops, or rooks + queens): **NP-complete**.

This is the key insight: NP-completeness emerges from having **heterogeneous piece interactions**, not from the state space being large. A position with N pieces has O(N) state, but the decision problem of which capture sequence works is NP-hard when multiple distinct move patterns interact.

### Does this help us?

**Not directly, for two reasons:**

1. **Chess pieces are not NP-complete problems.** Solo Chess is NP-complete as a *puzzle*, but it does not reduce to or from SAT, 3-SAT, or any standard NP-complete problem in a way that "feels like" playing chess teaches you something about computational complexity. The NP-completeness is a classification of the *decision problem*, not a claim about the game's structure mapping onto Karp's 21.

2. **The "scalable" chess you imagine ( puzzles with adjustable difficulty) already exists** — chess.com's Solo Chess, mate-in-2 problems, etc. But these are not "NP-complete derivatives" in any meaningful sense that connects to the platform thesis. They are just chess puzzles. If we add them, we'd be adding a non-NP game (which is fine as a control, but doesn't advance the "NP-complete substrate" claim).

### Verdict on chess derivatives for the platform

| Variant | Fit for platform | Rationale |
|---|---|---|
| Full chess / checkmate puzzles | **Rejected** (topic of this section) | Not NP-complete; would muddy the substrate claim |
| Solo Chess (single player, capture all) | **Rejected** | Same as above — it's a puzzle, but not an NP-complete problem in any useful sense |
| Chess as non-NP control in transfer experiments | **Acceptable** | If we run MVP 3 transfer experiments, having a non-NP baseline (chess puzzles, Sudoku, Tetris) is scientifically useful. But it's a control, not a primary game. |

### Bottom line

There is no "NP-complete derivative of chess that doesn't scale exponentially" in a form that is both (a) genuinely NP-complete and (b) meaningfully chess-like enough to be interesting. The closest candidates (Solo Chess) are NP-complete only under strict piece-heterogeneity conditions, and their hardness does not generalize or map to standard NP-complete problems in a way that supports the platform's thesis.

**Takeaway for design:** Chess remains a valid inspiration for puzzle design ("learn a pattern / apply the pattern"), but not as an NP-complete substrate. If we ever add it, it should be labeled as a non-NP control game and used only in controlled transfer experiments.

---

## 7. Open questions (still unresolved)

1. **Scavenger Grid: which stage to ship first?** V0 (classic knapsack, list-based) is trivial but not visually compelling. V1 (2D grid) is more engaging but harder to generate with unique solutions. **Decision needed: ship V0 as a fast win, or jump to V1?**

2. **Sudoku uniqueness enforcement:** For 9×9 Sudoku, brute-force uniqueness checking is expensive. Can we generate uniquely solvable boards by construction (e.g., Latin squares with controlled intersection) rather than rejection-sampling with a solver? **Decision needed before generator design.**

3. **Chess as non-NP control: do we want a *placeholder* non-NP game for MVP 3 transfer experiments, or do we design the experiment to compare NP-game-A vs NP-game-B directly?**
   - Direct NP vs NP comparison tests transfer *within* the class.
   - NP vs non-NP tests whether the NP-specific structure matters.
   - **Decision affects whether we ever revive 3-SAT/Steiner as controls.**

---

*This doc should be reviewed and updated as decisions are made. Link from `docs/INDEX.md` when stable.*
