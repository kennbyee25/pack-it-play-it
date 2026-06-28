"""Per-game health cards from attempt records.

Answers the first-order questions: how often is each game played, solved, skipped;
how long it takes; how often the solution is optimal; and data-integrity flags
(post-solve moves should be ~0 after the lock-on-solve fix).
"""
from __future__ import annotations
import statistics as st
from collections import defaultdict
from dataclasses import dataclass

from .load import Attempt


def _pct(n: int, d: int) -> float:
    return (100.0 * n / d) if d else 0.0


def _pctile(xs: list[float], q: float) -> float | None:
    if not xs:
        return None
    s = sorted(xs)
    i = min(len(s) - 1, int(q * (len(s) - 1) + 0.5))
    return s[i]


@dataclass
class GameHealth:
    game_id: str
    category: str
    attempts: int
    sessions: int
    solved: int
    abandoned: int
    failed: int
    unfinished: int
    optimal_solves: int           # solved with no wasted moves
    p50_seconds: float | None
    p90_seconds: float | None
    post_solve_moves: int         # integrity: should be ~0 post-#21
    longest_seconds: float | None

    @property
    def success_rate(self) -> float:
        ended = self.solved + self.abandoned + self.failed
        return _pct(self.solved, ended)

    @property
    def skip_rate(self) -> float:
        ended = self.solved + self.abandoned + self.failed
        return _pct(self.abandoned + self.failed, ended)

    @property
    def optimality_rate(self) -> float:
        return _pct(self.optimal_solves, self.solved)


def per_game(attempts: list[Attempt]) -> list[GameHealth]:
    g: dict[str, list[Attempt]] = defaultdict(list)
    for a in attempts:
        g[a.game_id].append(a)

    cards: list[GameHealth] = []
    for gid, rs in g.items():
        secs = [a.seconds for a in rs if a.seconds is not None]
        cards.append(GameHealth(
            game_id=gid,
            category=rs[0].category,
            attempts=len(rs),
            sessions=len({a.session_id for a in rs}),
            solved=sum(1 for a in rs if a.outcome == "solved"),
            abandoned=sum(1 for a in rs if a.outcome == "abandoned"),
            failed=sum(1 for a in rs if a.outcome == "failed"),
            unfinished=sum(1 for a in rs if a.outcome is None),
            optimal_solves=sum(1 for a in rs if a.optimal),
            p50_seconds=_pctile(secs, 0.5),
            p90_seconds=_pctile(secs, 0.9),
            post_solve_moves=sum(a.post_solve_moves for a in rs),
            longest_seconds=max(secs) if secs else None,
        ))
    return cards


def render_markdown(cards: list[GameHealth]) -> str:
    cards = sorted(cards, key=lambda c: (-c.attempts, c.game_id))
    out = ["# Game Health Report", ""]
    out.append("| game | cat | n | sess | success | skip | optimal | p50s | p90s | postSolve |")
    out.append("|---|---|--:|--:|--:|--:|--:|--:|--:|--:|")
    for c in cards:
        out.append(
            f"| {c.game_id} | {c.category} | {c.attempts} | {c.sessions} | "
            f"{c.success_rate:.0f}% | {c.skip_rate:.0f}% | {c.optimality_rate:.0f}% | "
            f"{c.p50_seconds or 0:.0f} | {c.p90_seconds or 0:.0f} | "
            f"{c.post_solve_moves}{' ⚠️' if c.post_solve_moves else ''} |"
        )
    # popularity / least-played proxy (we don't yet log enable/disable events)
    least = sorted(cards, key=lambda c: c.attempts)[:3]
    out += ["", "_Least-played (disable proxy — no explicit disable event yet): "
            + ", ".join(f"{c.game_id} ({c.attempts})" for c in least) + "_"]
    return "\n".join(out)
