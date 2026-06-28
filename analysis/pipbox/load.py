"""Load trace events and join them into per-attempt records.

A puzzle attempt spans one `puzzle_started`, its `move`s, and (usually) one
`puzzle_ended`. We fold those into a single `Attempt` — the unit every analysis
module works on.
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Iterable


@dataclass
class Attempt:
    session_id: str
    puzzle_id: str
    game_id: str
    category: str
    difficulty: float
    gen_seed: int
    optimal_moves: int
    # from puzzle_ended (None if the attempt never ended — e.g. last in session)
    outcome: str | None = None        # solved | abandoned | failed | None
    seconds: float | None = None      # idle-capped active seconds (post-#21)
    score: float | None = None
    ended_moves: int | None = None    # move count recorded at solve
    # derived from the move stream
    move_events: int = 0              # number of move events logged
    first_move_ms: float | None = None
    post_solve_moves: int = 0         # moves logged beyond ended_moves (integrity)

    @property
    def solved(self) -> bool:
        return self.outcome == "solved"

    @property
    def optimal(self) -> bool | None:
        """Solved with no wasted moves (ended_moves == optimal_moves)."""
        if not self.solved or self.ended_moves is None:
            return None
        return self.ended_moves == self.optimal_moves


def is_test_session(session_id: str) -> bool:
    """The early manual test rows used short ids ('s','pubtest'); real sessions are UUIDs."""
    return session_id.count("-") != 4


def load_events(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def load_attempts(path: str, drop_test: bool = True) -> list[Attempt]:
    events = load_events(path)
    return attempts_from_events(events, drop_test=drop_test)


def attempts_from_events(events: Iterable[dict], drop_test: bool = True) -> list[Attempt]:
    by_puzzle: dict[str, dict] = {}
    moves_by_puzzle: dict[str, list[dict]] = {}

    for e in events:
        pid = e.get("puzzleId")
        if not pid:
            continue
        t = e.get("type")
        if t == "puzzle_started":
            by_puzzle.setdefault(pid, {})["start"] = e
        elif t == "puzzle_ended":
            by_puzzle.setdefault(pid, {})["end"] = e
        elif t == "move":
            moves_by_puzzle.setdefault(pid, []).append(e)

    out: list[Attempt] = []
    for pid, parts in by_puzzle.items():
        s = parts.get("start")
        if not s:
            continue  # orphan end without a start — skip
        if drop_test and is_test_session(s.get("sessionId", "")):
            continue
        en = parts.get("end")
        moves = sorted(moves_by_puzzle.get(pid, []), key=lambda m: m.get("moveIndex", 0))
        a = Attempt(
            session_id=s["sessionId"],
            puzzle_id=pid,
            game_id=s["gameId"],
            category=s.get("category", "?"),
            difficulty=float(s["difficulty"]),
            gen_seed=int(s["genSeed"]),
            optimal_moves=int(s["optimalMoves"]),
            move_events=len(moves),
            first_move_ms=(moves[0].get("msSinceStart") if moves else None),
        )
        if en:
            a.outcome = en.get("outcome")
            a.seconds = en.get("seconds")
            a.score = en.get("score")
            a.ended_moves = en.get("moves")
            if a.solved and a.ended_moves is not None:
                a.post_solve_moves = max(0, len(moves) - a.ended_moves)
        out.append(a)
    return out
