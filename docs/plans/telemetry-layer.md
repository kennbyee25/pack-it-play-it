# Plan: Telemetry Layer (MVP 5) — structured traces for analytics & training data

## Status (2026-06-27): ✅ shipped (code) — backend needs a Supabase project

Implements **MVP 5 — Solver/Player Telemetry** from the
[vision roadmap](./vision-and-mvp-roadmap.md). Every puzzle attempt is captured as a
structured event stream and sent to a Supabase Postgres backend; one downstream use —
a **difficulty oracle / hard-instance miner** — is delivered. Bundled the cheap **P4
metadata** (`category` + `reductionFrom`) so traces are enriched for MVP 3.

## Why
Human solution *traces* are the platform's training-data pillar (the "AI trained/tested on
NP-complete solving" promise). The bet: traces are structured enough to benchmark/train a
solver or mine hard instances. Kill criterion: traces can't reconstruct a solve, or don't
improve any baseline.

## Architecture

```
GamePlayer.applyMove ──onMove──┐
EndlessMode lifecycle ─────────┼─▶ tracer (stamps metadata, orders events)
                               │      └─▶ guardedSink (live opt-out) ─▶ SupabaseSink
                               │                                          (batch fetch + retry)
                               └─ puzzle_started / puzzle_ended            └─▶ Supabase `traces`
```

- **Schema** (`src/telemetry/types.ts`): `TraceEvent` union — `puzzle_started`
  (gameId, category, difficulty, **genSeed**, optimalMoves), `move` (moveIndex, move,
  msSinceStart), `puzzle_ended` (outcome, moves, optimalMoves, seconds, score). **No PII** —
  only game state, timing, seeds. A puzzle is fully reconstructable from
  `(gameId, difficulty, genSeed)` (pure `generate` + deterministic `makeRng`), so we store the
  seed, not the board.
- **Capture points**: the single per-move choke point `GamePlayer.applyMove` (via a new
  `onMove` prop) and the single lifecycle owner `EndlessMode` (which now retains `genSeed` and
  emits started/ended). `puzzle_ended` builds an `Attempt` → `scoreOutcome` — the first runtime
  use of the skill scorer.
- **Sink** (`src/telemetry/sink.ts`): transport-agnostic `TraceSink`. `SupabaseSink` batches
  events and POSTs rows to the REST endpoint with the publishable anon key (no SDK dep);
  retries with backoff; requeues on failure. `NoopSink` when unconfigured. `guardedSink` applies
  the opt-out live.
- **Faithful-capture guard** (`src/telemetry/replay.ts`): `replayVerify` reconstructs the puzzle
  and replays the trace's moves → asserts solved. This is the schema's kill-criterion test.
- **Privacy**: anonymous per-browser id (`crypto.randomUUID`, `pip.anonId`). Collection is
  **on by default** with a "Contribute anonymized data" toggle in Advanced options
  (`pip.telemetry=off`). Caveat: Supabase logs request IPs server-side.

## Backend (`supabase/schema.sql`)
`traces(type, session_id, puzzle_id, ts, payload jsonb)` with **RLS insert-only for anon** (the
anon key is safe in the client bundle because of this). A `difficulty_oracle` view aggregates
success rate + median solve time per (game, difficulty bucket).

**Manual setup (one-time, needs your account):**
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Put the project URL + anon key in `.env.local` (see `.env.example`) and in the GitHub Pages
   build env.

## Downstream use — difficulty oracle (`analysis/difficulty_oracle.py`)
Zero-dep Python (per "automate with code"). Reads a JSONL trace export and reports, per game:
empirical human success + median time by difficulty bucket, a **monotonicity flag** (Spearman of
difficulty vs success — the A2 signal from real humans), and the **hardest instances** (genSeeds
with lowest success) for solver benchmarking. Tested with `analysis/test_difficulty_oracle.py`.

```bash
python3 analysis/difficulty_oracle.py traces.jsonl --md report.md
```

## Verification
- `src/telemetry/telemetry.test.ts` — schema/no-PII, tracer ordering, SupabaseSink batch+retry,
  replay-verify across games. `src/games/metadata.test.ts` — metadata completeness + acyclic
  reduction graph. `GamePlayer.test` — onMove fires at the choke point.
- `analysis/test_difficulty_oracle.py` — aggregation, monotonicity flagging, hard-instance mining.
- Manual smoke: set `VITE_SUPABASE_*`, play puzzles, confirm rows in `traces`, export and run the
  oracle.

## Out of scope (next)
SolverPanel UI; wiring the full Elo estimator (not just the scorer) into live difficulty; the
MVP 3 transfer experiment (this is its data substrate).
