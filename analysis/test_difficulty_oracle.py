"""Tests for the difficulty oracle. Zero-dep (stdlib unittest); also discoverable
by pytest. Run: python3 -m unittest analysis/test_difficulty_oracle.py
"""
import unittest
from difficulty_oracle import aggregate, spearman


def started(pid, game, diff, seed):
    return {"type": "puzzle_started", "puzzleId": pid, "gameId": game,
            "difficulty": diff, "genSeed": seed}


def ended(pid, outcome, seconds=10):
    return {"type": "puzzle_ended", "puzzleId": pid, "outcome": outcome,
            "seconds": seconds, "score": 1.0 if outcome == "solved" else 0.0}


def attempts(game, diff, seed, solved, n):
    """Generate n started+ended pairs at one (game, diff, seed)."""
    evs = []
    for i in range(n):
        pid = f"{game}-{diff}-{seed}-{i}"
        evs.append(started(pid, game, diff, seed))
        evs.append(ended(pid, "solved" if i < solved else "abandoned"))
    return evs


class TestSpearman(unittest.TestCase):
    def test_monotone(self):
        self.assertAlmostEqual(spearman([1, 2, 3], [3, 2, 1]), -1.0, places=6)
        self.assertAlmostEqual(spearman([1, 2, 3], [1, 2, 3]), 1.0, places=6)


class TestAggregate(unittest.TestCase):
    def test_success_rate_and_buckets(self):
        events = attempts("set-cover", 100, 1, solved=9, n=10) + \
                 attempts("set-cover", 1900, 2, solved=1, n=10)
        rep = aggregate(events, bucket_size=300)["set-cover"]
        buckets = {b.difficulty_bucket: b for b in rep.buckets}
        self.assertEqual(buckets[0].attempts, 10)        # 100 → bucket 0
        self.assertAlmostEqual(buckets[0].success_rate, 0.9)
        self.assertAlmostEqual(buckets[1800].success_rate, 0.1)

    def test_flags_monotone_and_flat_games(self):
        # Monotone game: success falls with difficulty.
        mono = (attempts("good", 0, 1, 10, 10) + attempts("good", 600, 2, 6, 10) +
                attempts("good", 1200, 3, 2, 10) + attempts("good", 1800, 4, 0, 10))
        # Flat game: success ~constant across difficulty (weak knob).
        flat = (attempts("flat", 0, 5, 8, 10) + attempts("flat", 600, 6, 8, 10) +
                attempts("flat", 1200, 7, 8, 10) + attempts("flat", 1800, 8, 8, 10))
        reps = aggregate(mono + flat, bucket_size=300)
        self.assertTrue(reps["good"].monotonic)
        self.assertFalse(reps["flat"].monotonic)

    def test_hard_instance_mining(self):
        events = (attempts("g", 600, 111, solved=0, n=5) +   # impossible-looking seed
                  attempts("g", 600, 222, solved=5, n=5))     # easy seed
        rep = aggregate(events, bucket_size=300)["g"]
        hardest_seed = rep.hardest_seeds[0][0]
        self.assertEqual(hardest_seed, 111)


if __name__ == "__main__":
    unittest.main()
