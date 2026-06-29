"""Tests for the pipbox analysis framework. Stdlib unittest (pytest-discoverable).
Run: cd analysis && python3 -m unittest test_pipbox
"""
import unittest
from pipbox.load import attempts_from_events, is_test_session
from pipbox.report import per_game


UUID = "0357a8fc-c053-4287-8ea7-1f7d1fd8b222"


def started(pid, game, diff=300, seed=1, optimal=3, cat="set", sess=UUID):
    return {"type": "puzzle_started", "puzzleId": pid, "sessionId": sess,
            "gameId": game, "category": cat, "difficulty": diff, "genSeed": seed,
            "optimalMoves": optimal, "ts": 0}


def move(pid, i, sess=UUID):
    return {"type": "move", "puzzleId": pid, "sessionId": sess, "moveIndex": i,
            "move": {}, "msSinceStart": (i + 1) * 1000, "ts": i}


def ended(pid, outcome="solved", moves=3, secs=10, score=1.0, sess=UUID):
    return {"type": "puzzle_ended", "puzzleId": pid, "sessionId": sess,
            "outcome": outcome, "moves": moves, "optimalMoves": 3, "seconds": secs,
            "score": score, "ts": 99}


class TestLoad(unittest.TestCase):
    def test_joins_attempt(self):
        evs = [started("p0", "set-cover", optimal=3), move("p0", 0), move("p0", 1),
               move("p0", 2), ended("p0", moves=3)]
        a = attempts_from_events(evs)[0]
        self.assertEqual(a.game_id, "set-cover")
        self.assertEqual(a.move_events, 3)
        self.assertTrue(a.solved)
        self.assertTrue(a.optimal)
        self.assertEqual(a.first_move_ms, 1000)

    def test_post_solve_moves_detected(self):
        # solved at 3 moves, but 5 move events => 2 post-solve
        evs = [started("p1", "nonogram", optimal=3)] + [move("p1", i) for i in range(5)] + \
              [ended("p1", moves=3)]
        a = attempts_from_events(evs)[0]
        self.assertEqual(a.post_solve_moves, 2)

    def test_non_optimal_solve(self):
        evs = [started("p2", "set-cover", optimal=3), ended("p2", moves=5)]
        a = attempts_from_events(evs)[0]
        self.assertTrue(a.solved)
        self.assertFalse(a.optimal)

    def test_drops_test_sessions(self):
        evs = [started("x", "set-cover", sess="pubtest"), ended("x", sess="pubtest")]
        self.assertEqual(len(attempts_from_events(evs, drop_test=True)), 0)
        self.assertEqual(len(attempts_from_events(evs, drop_test=False)), 1)

    def test_is_test_session(self):
        self.assertTrue(is_test_session("pubtest"))
        self.assertFalse(is_test_session(UUID))


class TestReport(unittest.TestCase):
    def test_per_game_rates(self):
        evs = []
        for i in range(4):  # 3 solved, 1 abandoned
            pid = f"sc{i}"
            evs += [started(pid, "set-cover", optimal=3)]
            evs += [ended(pid, outcome="solved" if i < 3 else "abandoned",
                          moves=3 if i < 2 else 5)]
        cards = {c.game_id: c for c in per_game(attempts_from_events(evs))}
        c = cards["set-cover"]
        self.assertEqual(c.attempts, 4)
        self.assertAlmostEqual(c.success_rate, 75.0)
        self.assertAlmostEqual(c.skip_rate, 25.0)
        # 2 of 3 solves were optimal (moves==3)
        self.assertAlmostEqual(c.optimality_rate, 100 * 2 / 3, places=1)


if __name__ == "__main__":
    unittest.main()
