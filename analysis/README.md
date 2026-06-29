# pipbox — game-box analysis framework

Reads MVP 5 telemetry traces and turns them into findings about the games. Pure
stdlib (no install); records are plain dataclasses so they drop into pandas/a
notebook when we want dashboards.

## Run

```bash
# pull live data
curl -s https://pip-ingest.tail7a0e03.ts.net/export > traces.jsonl

# per-game health report
python3 analysis/analyze.py traces.jsonl
python3 analysis/analyze.py traces.jsonl --md report.md

# legacy difficulty oracle (challenge curves)
python3 analysis/difficulty_oracle.py traces.jsonl
```

## Layout

```
analysis/
├── analyze.py            # CLI entry (the suite)
├── difficulty_oracle.py  # challenge curves + hard-instance mining
├── pipbox/
│   ├── load.py           # events JSONL -> Attempt records (the substrate)
│   └── report.py         # per-game health cards
└── test_pipbox.py        # tests (python3 -m unittest test_pipbox)
```

## What the health card shows
Per game: attempts, distinct sessions, success/skip rate, **optimality rate**
(solved with no wasted moves), solve-time p50/p90 (idle-capped), and a
**postSolve** integrity flag (should be ~0 after the lock-on-solve fix #21).

## Roadmap (this framework)
- [x] Loader + per-game health report
- [ ] Challenge-curve module on real human data — find the optimal challenge point
      per game and characterise it as a *distribution*, not a point.
- [ ] Per-game **Elo** by replaying the real outcome stream through the estimator.
- [ ] **Integrity replay-check** (Node, reuses `src/telemetry/replay.ts`) — verify
      real traces reconstruct to solved; the postSolve flag is the python-side proxy.
- [ ] Cross-game skill correlation + reduction-distance analysis (MVP 3 substrate).
- [ ] Dashboards (graduate to pandas/Plotly once volume warrants).
- [ ] Capture an explicit settings/disable event so "least-played" → true disable rate.
