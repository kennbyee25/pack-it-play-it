# Plan: Garey‑Johnson Expansion (Beyond Karp 21)

> **Status (2026-08-07):** �� 📋 planned – not started.

## Goal (MVP 6)

Systematically grow the game catalog **beyond the original Karp 21** by pulling entries from the **Garey & Johnson** NP‑complete problem list (the classic Appendix A). For each new problem we will:

1. Implement a generator that respects the **generate‑solved‑then‑strip** invariant.
2. Add a `PuzzleGame` entry (registry + UI picker) reusing existing archetype renderers where possible.
3. Populate full **P4 metadata** (`category`, `complexity`, `uniqueSolutions`, `displayTags`, `reductionFrom`) so the game feeds:
   * the **cross‑game difficulty calibration** (MVP 2);
   * the **transfer experiment** (MVP 3) – reductions become the logical basis for measuring skill transfer;
   * the **telemetry layer** (MVP 5) – enriched metadata for downstream analytics.
4. Document the **reduction lineage** (which known NP‑complete problem reduces to this one) and any **new reduction edges** we discover while building the generator.

This MVP turns the catalogue into a **living reduction graph**, letting us test the crown‑jewel assumption (A3: reducibility → human skill transfer) on a much richer set of problems.

---

## Due‑diligence checklist (per‑game)

| � ✅ Item | What to capture | Where it lives |
|--------|----------------|----------------|
| **Type / Category** | One of `satisfiability`, `graph`, `set`, `number`, `sequencing` (see `src/games/metadata.ts`). | `METADATA.<gameId>.category` |
| **Complexity class** | Almost always `NP‑complete`; override only if known `NP‑hard` or `PSPACE‑complete`. | `METADATA.<gameId>.complexity` |
| **Unique‑solution flag** | `true` if the generator can reliably emit puzzles with a single optimal solution (via `countSolutions`). | `METADATA.<gameId>.uniqueSolutions` |
| **Display tags** | Human‑readable chips for UI filtering (`grid`, `selection`, `path`, `assignment`, …). | `METADATA.<gameId>.displayTags` |
| **Reduction From** | List of parent game IDs that **classically reduce** to this problem (e.g. `["three-sat"]`). Include *new* edges you discover while building the generator. | `METADATA.<gameId>.reductionFrom` |
| **Archetype mapping** | Choose an existing renderer (`graph-select`, `graph-path`, `set-cover`, `number-packing`, `logic‑assignment`, `nonogram`, `sudoku`). If none fits, create a new renderer and add it to `src/components/game/_renderers/`. | `PuzzleGame.archetype` |
| **Generator feasibility** | Verify monotonic difficulty (Spearman ρ ≤ ‑0.7) on a synthetic constant‑skill player (see `src/games/skill/calibration.ts`). | Unit test + calibration results |
| **Cross‑game calibration** | Ensure the new game joins the **common difficulty scale** (add an entry in `calibration.ts`). | `calibratedNativeDifficulty` map |
| **Experiment readiness** | Add the game ID to the **transfer‑harness config** (`src/games/experiment/transfer.ts`) as a *trained* or *held‑out* candidate. | Experiment config |
| **Telemetry schema** | Extend `P4` metadata payload (`category`, `reductionFrom`) if new fields appear. | `src/telemetry/*.ts` |

All items must be **checked‑off** before the game is merged to `main`.

---

## Integration steps

1. **Catalog ingestion** – run `scripts/garey-johnson.ts` to get a seed JSON of `{id, name, category, reductions}`. This gives us a *source of truth* for the backlog.
2. **Metadata extension** – for each new entry, add a record to `src/games/metadata.ts`. Use the `reductionFrom` list supplied by the script; manually verify each edge.
3. **Generator scaffold** – copy the pattern from an existing game (e.g. `src/games/set-cover/index.ts`) into a new folder `src/games/<gameId>/`. Fill in problem‑specific constraints while keeping the **generate‑solved‑then‑strip** invariant.
4. **Archetype renderer** – reuse an existing renderer if the problem matches an existing archetype; otherwise add a new component under `src/components/game/_renderers/`.
5. **Registry update** – the registry is **auto‑discovered** (`import.meta.glob('./*/index.ts')`), so simply dropping the folder is enough; no hand‑maintained list to edit.
6. **Calibration** – run `npm test` which includes the calibration suite; if the monotonicity kill‑gate fails, iterate on the generator knobs.
7. **Transfer experiment** – add the new game ID to the `TRAINED_GAMES` array (or to the held‑out list for A3 validation) in `src/games/experiment/transfer.ts`. The reduction graph will be used by the experiment’s statistical model to predict transfer strength.
8. **Telemetry** – ensure that `src/telemetry/tracer.ts` emits the new `category` and `reductionFrom` fields in each `puzzle_started` event (P4 metadata).

---

## Scheduling & dependencies

We propose a **time‑boxed batch** of **four high‑yield, visually tractable problems** that mostly reuse existing archetypes:

| Game | Garey‑Johnson ID | Category | Archetype (reused) | Notes |
|------|------------------|----------|--------------------|-------|
| Dominating Set | `dominating-set` | `set` | `set-cover` | Select ≤ k nodes so every node is either in the set or adjacent to a node in the set. |
| Feedback Vertex Set | `feedback-vertex-set` | `graph` | `graph-select` | Select ≤ k nodes whose removal makes the graph acyclic. |
| Exact Cover by 3‑Sets (X3C) | `x3c` | `set` | `set-cover` | Special case of Exact Cover where every subset has size 3. |
| NAE‑3SAT | `nae-3sat` | `satisfiability` | `logic‑assignment` | Not‑All‑Equal 3‑SAT: each clause must have at least one true and one false literal. |

| Milestone | Depends on | Duration (weeks) | Owner |
|-----------|------------|-------------------|-------|
| **6.1 Run Garey‑Johnson script & inspect seed list** | none | 0.5 | Kenneth |
| **6.2 Implement Dominating Set** | 6.1, MVP 2 calibration | 1.5 | Game team |
| **6.3 Implement Feedback Vertex Set** | 6.2 | 1.5 | Game team |
| **6.4 Implement X3C** | 6.3 | 1.5 | Game team |
| **6.5 Implement NAE‑3SAT** (needs AssignmentBoard tweak for instruction) | 6.4 | 2.0 | Game team + UI |
| **6.6 Metadata entries & UI filter integration** | 6.5 | 1.0 | Front‑end |
| **6.7 Calibration & monotonicity test** | 6.6, MVP 2 | 1.0 | Adaptive team |
| **6.8 Transfer‑harness wiring** | 6.7, MVP 3 | 0.5 | Experiment team |
| **6.9 Telemetry P4 stamping (category + reductionFrom)** | 6.8 | 0.5 | Infra team |
| **6.10 Game‑specific tests (generator invariants)** | 6.9 | 1.0 | QA |
| **6.11 Documentation & roadmap update** | 6.10 | 0.5 | Docs |

**Total: ~11–12 working days** for a first substantial batch, after which the remaining catalog can be added incrementally.

---

## Success criteria (kill‑gate)

* **Calibration pass** – each added game must achieve Spearman ρ ≤ ‑0.7 between difficulty knob and synthetic‑player success.
* **Metadata completeness** – all checklist items checked; `reductionFrom` forms a *directed acyclic graph* (no cycles).
* **Experiment inclusion** – the new game appears in the transfer‑harness config and does **not** break existing MVP 3/4 runs.
* **Telemetry emission** – move events for the new game contain the enriched `P4` fields and can be ingested by the difficulty oracle without schema errors.
* **Conformance suite green** – every new game passes the shared parameterized suite (`registry.conformance.test.ts`).

If any of the above fails, the game is **disabled by default** (`DEFAULT_DISABLED = true`) and the issue is logged as a **roadmap blocker**.

---

## Where to put the file

*Create this file*: `docs/plans/garey-johnson-expansion.md`  
*Add a link* in `docs/INDEX.md` under **Plans (what to build)**:

```md
- **[plans/garey-johnson-expansion.md](./plans/garey-johnson-expansion.md)** — systematic expansion of the game catalog beyond Karp’s 21 using the Garey‑Johnson list; due‑diligence, metadata, reduction graph, and integration with calibration/transfer experiments.
```

That satisfies the request: we now have a concrete roadmap item that records the **due‑diligence** (types, tags, attributes, reductions) and ties it into the existing architecture (metadata, calibration, transfer experiment, telemetry). The next step is to execute the plan via the todo list.