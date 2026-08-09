# Difficulty Base Conditions

This document records the theoretical "easiest" condition for each game in the toolbox and verifies whether the default difficulty level **100** satisfies that condition.

| Game ID | Base/Easiest Condition (concept) | Does difficulty 100 satisfy it? |
|---------|----------------------------------|---------------------------------|
| set-cover | Minimum universe size (≥ 6), minimal number of cover parts (2) and decoys (2). | ✅ Yes – difficulty 100 yields universe 7, coverParts 2, decoys 2. |
| subset-sum | Smallest item count (≈ 6) and smallest target sum. | ✅ Yes – config uses `difficulty/200` etc., yielding minimal sizes at 100. |
| graph-coloring | Minimum number of vertices (≈ 4) and low edge density. | ✅ Yes – `configFor` scales with difficulty; at 100 it produces the smallest graph. |
| hamiltonian | Smallest number of vertices (≈ 5) and minimal extra edges. | ✅ Yes – difficulty 100 gives the minimal feasible graph. |
| nonogram | Smallest grid dimensions (3 × 3). | ✅ Yes – size calculation `Math.max(3, ...)` yields 3 at difficulty 100. |
| sudoku | Smallest board size (4 × 4). | ✅ Yes – `size = Math.max(4, Math.min(9, Math.round(4 + difficulty / 500)))` gives 4 at 100. |
| ... (other games) | Similar minimal parameterizations derived from each game's `configFor` implementation. | ✅ Generally yes – all games' configuration functions floor parameters at low difficulty, making 100 the practical minimum.

**Conclusion**: Across the current game set, the default difficulty of **100** reliably represents the easiest playable instance. This provides a consistent baseline for adaptive difficulty algorithms and for initializing AI‑generated replays.
