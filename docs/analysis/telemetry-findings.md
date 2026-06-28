# Telemetry Findings (log-driven)

Living doc: what the live trace logs (MVP 5) tell us about the games. Pull fresh data
with `curl -s https://pip-ingest.tail7a0e03.ts.net/export > traces.jsonl` and analyze with
`analysis/difficulty_oracle.py` (and, increasingly, dedicated analysis scripts).

## Round 1 — first ~78 real puzzles (2026-06-28)

Single anonymous session, 16+ games, mostly the easy band (D 300–600).

### Findings (tagged by impact)

1. **[BIG-BET · data integrity] Post-solve moves are logged across *every* game.**
   After `onSolved` fires, the board stays interactive until auto-advance (900ms) or a
   manual skip, so stray clicks register as moves *after* the puzzle is solved. Examples:
   nonogram #9 solved 13/13 then +24 moves; steiner +47, clique +42, max-cut +41 total
   post-solve moves. Consequences:
   - A trace marked `outcome=solved` can **fail `replayVerify`** (replaying all moves no
     longer ends in a solved state) — directly undermines the MVP 5 "faithful capture" bet.
   - Pollutes move-count / optimality signal.
   - **Root of the nonogram glitch** Kenneth reported (success banner offsets the grid →
     accidental extra square). The banner is the trigger; the systemic cause is an
     unlocked board post-solve.
   - **Fix:** lock the board on solve (GamePlayer ignores moves once `isSolved`), so the
     final logged state always equals the solved state.

2. **[BIG-BET · challenge signal] Idle time corrupts solve-time.** A 3d-matching puzzle
   logged **6420s (~107 min)** — AFK; the timer never pauses. Solve-time feeds
   optimal-challenge/Elo, so we need idle detection or a cap (e.g., pause after N seconds
   of no move; discard or flag attempts over a threshold).

3. **[design] "Steiner is trivial" — confirmed.** steiner-tree: 6/6 solved, **median 4s**,
   2 non-optimal. Fast and non-minimal because optimality isn't the enforced goal (matches
   the design note). Same triviality signal: clique 4s, max-cut 2s.

4. **[BIG-BET · single-correctness] Non-optimal solves accepted as wins** (set-cover 5
   moves/3 optimal; 3d-matching 7/3; steiner ×2). We accept non-minimal solutions →
   validates the "unique optimal / single correctness" goal.

5. **[calibration] Hamiltonian is the human difficulty spike** — 5 played, 2 solved, 3
   failed/abandoned (every other game ~all solved). Matches the solver analysis flagging
   hamiltonian "too hard at D0."

6. **Outcomes:** 69 solved / 4 abandoned / 3 failed / 2 unfinished. Hamiltonian owns most
   failures.

### Caveats
- n≈1 per (game, difficulty) bucket → the difficulty-oracle's Spearman/monotonicity
  verdicts are **not yet meaningful** (see the oracle's `⚠️` flags — small-sample, not
  signal). Need ~20+ attempts/bucket across a range with real failures.

## Analysis framework — direction
Start with **vibes** (ad-hoc Python on the JSONL) → graduate to **committed analysis
scripts** under `analysis/` (per-game success/fail, skip & disable rates, solve-time
percentiles, post-solve/idle detectors, optimal-vs-actual) → **dashboards** → eventually a
**game-box analysis framework**. Candidate first scripts: `game_report.py` (per-game health
card), `integrity_check.py` (replayVerify over real traces + post-solve/idle flags).
