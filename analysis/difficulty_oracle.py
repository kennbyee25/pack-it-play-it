#!/usr/bin/env python3
"""Difficulty oracle + hard-instance miner — the demonstrated downstream use of
telemetry traces (MVP 5).

Reads a JSONL export of trace events (one TraceEvent per line; see
src/telemetry/types.ts) and produces, per game:
  - empirical human success rate + median solve time by difficulty bucket,
  - a monotonicity check (Spearman of difficulty vs success) flagging knobs whose
    difficulty does NOT track success — the same A2 signal, now from real humans,
  - the hardest concrete instances (genSeeds with the lowest success), i.e.
    hard-instance mining for solver benchmarking.

Pure stdlib (no pandas/numpy) so it runs anywhere. Aggregation logic is a pure
function (`aggregate`) for testing; the CLI is a thin wrapper.

Usage:
  python3 analysis/difficulty_oracle.py traces.jsonl
  python3 analysis/difficulty_oracle.py traces.jsonl --bucket 300 --md report.md
"""
from __future__ import annotations
import argparse
import json
import statistics
from collections import defaultdict
from dataclasses import dataclass, field


# ---- statistics ------------------------------------------------------------

def spearman(xs, ys):
    """Spearman rank correlation; 0 if undefined."""
    def rank(a):
        order = sorted(range(len(a)), key=lambda i: a[i])
        r = [0.0] * len(a)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and a[order[j + 1]] == a[order[i]]:
                j += 1
            avg = (i + j) / 2 + 1
            for k in range(i, j + 1):
                r[order[k]] = avg
            i = j + 1
        return r

    n = len(xs)
    if n < 2:
        return 0.0
    rx, ry = rank(xs), rank(ys)
    mx, my = sum(rx) / n, sum(ry) / n
    num = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    dx = sum((rx[i] - mx) ** 2 for i in range(n)) ** 0.5
    dy = sum((ry[i] - my) ** 2 for i in range(n)) ** 0.5
    return 0.0 if dx == 0 or dy == 0 else num / (dx * dy)


# ---- aggregation -----------------------------------------------------------

@dataclass
class Bucket:
    game_id: str
    difficulty_bucket: int
    attempts: int
    successes: int
    median_seconds: float

    @property
    def success_rate(self):
        return self.successes / self.attempts if self.attempts else 0.0


@dataclass
class GameReport:
    game_id: str
    buckets: list = field(default_factory=list)  # list[Bucket]
    rho: float = 0.0          # Spearman(difficulty, success) — expect strongly negative
    monotonic: bool = True    # |rho| >= 0.7 and negative
    hardest_seeds: list = field(default_factory=list)  # [(genSeed, difficulty, success_rate, n)]


def _join_attempts(events):
    """Join puzzle_started with puzzle_ended on puzzleId → per-attempt records."""
    started, ended = {}, {}
    for e in events:
        t = e.get("type")
        if t == "puzzle_started":
            started[e["puzzleId"]] = e
        elif t == "puzzle_ended":
            ended[e["puzzleId"]] = e
    rows = []
    for pid, s in started.items():
        en = ended.get(pid)
        if not en:
            continue
        rows.append({
            "game_id": s["gameId"],
            "difficulty": float(s["difficulty"]),
            "genSeed": s["genSeed"],
            "solved": 1 if en.get("outcome") == "solved" else 0,
            "seconds": float(en.get("seconds", 0)),
        })
    return rows


def aggregate(events, bucket_size=300, top_hard=5):
    """Pure aggregation: events → {game_id: GameReport}."""
    rows = _join_attempts(events)

    # by (game, difficulty bucket)
    by_bucket = defaultdict(list)   # (game, bucket) -> [row]
    by_seed = defaultdict(list)     # (game, genSeed, difficulty) -> [solved]
    for r in rows:
        b = round(r["difficulty"] / bucket_size) * bucket_size
        by_bucket[(r["game_id"], b)].append(r)
        by_seed[(r["game_id"], r["genSeed"], r["difficulty"])].append(r["solved"])

    reports = {}
    games = sorted({r["game_id"] for r in rows})
    for g in games:
        buckets = []
        for (gid, b), rs in sorted(by_bucket.items()):
            if gid != g:
                continue
            succ = sum(x["solved"] for x in rs)
            med = statistics.median([x["seconds"] for x in rs]) if rs else 0.0
            buckets.append(Bucket(g, b, len(rs), succ, med))

        diffs = [bk.difficulty_bucket for bk in buckets]
        rates = [bk.success_rate for bk in buckets]
        rho = spearman(diffs, rates)
        monotonic = rho <= -0.7

        # hard-instance mining: seeds with the lowest success (min sample 1)
        seed_rows = [
            (seed, diff, sum(v) / len(v), len(v))
            for (gid, seed, diff), v in by_seed.items() if gid == g
        ]
        seed_rows.sort(key=lambda t: (t[2], -t[3]))  # lowest success, most attempts first
        reports[g] = GameReport(g, buckets, rho, monotonic, seed_rows[:top_hard])
    return reports


# ---- rendering / CLI -------------------------------------------------------

def render_markdown(reports):
    out = ["# Difficulty Oracle Report\n"]
    for g, rep in reports.items():
        flag = "" if rep.monotonic else "  ⚠️ **non-monotonic knob (needs calibration)**"
        out.append(f"## {g}  (ρ={rep.rho:+.2f}){flag}\n")
        out.append("| difficulty | attempts | success | median s |")
        out.append("|---|---|---|---|")
        for bk in rep.buckets:
            out.append(f"| {bk.difficulty_bucket} | {bk.attempts} | "
                       f"{bk.success_rate:.0%} | {bk.median_seconds:.0f} |")
        if rep.hardest_seeds:
            out.append("\n_Hardest instances (seed @ difficulty → success):_")
            for seed, diff, sr, n in rep.hardest_seeds:
                out.append(f"- seed `{seed}` @ {int(diff)} → {sr:.0%} ({n} attempts)")
        out.append("")
    return "\n".join(out)


def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("jsonl", help="trace events, one JSON object per line")
    p.add_argument("--bucket", type=int, default=300, help="difficulty bucket size")
    p.add_argument("--md", help="write a markdown report to this path")
    args = p.parse_args(argv)

    reports = aggregate(load_jsonl(args.jsonl), bucket_size=args.bucket)
    md = render_markdown(reports)
    if args.md:
        with open(args.md, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"wrote {args.md}")
    else:
        print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
