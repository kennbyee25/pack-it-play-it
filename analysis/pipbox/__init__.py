"""pipbox — analysis framework for the pack-it-play-it game box.

Reads MVP 5 telemetry traces (JSONL, one TraceEvent per line) and turns them into
tidy per-attempt records that the analysis modules consume. Pure stdlib so it runs
anywhere; records are plain dicts so they drop into pandas/a notebook later.

Layers (built incrementally):
  load     — events JSONL  -> Attempt records            (this is the substrate)
  report   — per-game health cards                       (game_report.py)
  ...      — challenge curves, per-game Elo, transfer    (later)
"""
from .load import Attempt, load_attempts, load_events, is_test_session

__all__ = ["Attempt", "load_attempts", "load_events", "is_test_session"]
