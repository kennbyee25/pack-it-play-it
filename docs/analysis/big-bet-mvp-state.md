# Big Bet MVPs: Current State & Next Steps

> Assessment of the six big-bet MVPs (MVP 0–5) against the vision document.
> Focus: what exists, what's missing, and concrete next actions.

---

## MVP 0 — Measurable Difficulty & Skill

**Bet (A2 feasibility):** A single NP-complete game can be parameterized so difficulty is monotonic with player success, and we can estimate player skill on a stable scale that predicts the next puzzle's outcome better than chance.

### Current State

**✓ EXISTS:**
- Continuous difficulty scale (100–2500, step 50) via `src/games/settings.ts`
- Basic adaptive heuristic in `src/games/adaptive.ts` (adjusts based on moves/time)
- PuzzleGame interface with numeric `difficulty` parameter
- Per-game difficulty persistence in localStorage

**✗ MISSING (Critical Path):**
- **Skill estimator (Glicko-lite)**: No player rating system with skill and rating deviation (rd)
- **Outcome scorer**: No `score ∈ [0,1]` that blends solved, time, mistakes, hints
- **selectDifficulty()**: No function that solves for D given skill and target p*
- **Outcome telemetry**: No structured outcome capture for calibration

### Kill Criterion (from roadmap)

If the difficulty parameter does not correlate monotonically with empirical success rate (Spearman ρ < 0.7 in simulation/pilot), or the skill estimate does not beat a naive baseline at predicting outcomes, then "tunable complexity" is unsupported for this game.

### Concrete Next Steps

1. **Implement Glicko-lite rating system** (`src/adaptive/rating.ts`)
   - `PlayerRating { skill: number; rd: number; }`
   - `expectedScore(skill, D) = 1 / (1 + 10^((D - skill) / 400))`
   - `update(player, D, outcome) -> { newPlayer, newPuzzleRating }`
   - Persist in localStorage (cold-start: skill = mid, rd = high)

2. **Implement outcome scorer** (`src/adaptive/outcome.ts`)
   - `score ∈ [0,1]` blending:
     - Solved? (binary win)
     - Time vs expected time for D
     - Mistakes / invalid moves
     - Hints / resets used
   - Weights tunable (e.g., w1 = 0.5, w2 = 0.3, w3 = 0.2, w4 = 0.0)

3. **Implement difficulty selector** (`src/adaptive/selectDifficulty.ts`)
   - `selectDifficulty(skill, rd, p* = 0.8) -> D*`
   - Formula: `D* = skill - 400 * log10((1 - p*) / p*)`
   - Confidence-scaled jitter (wider when rd is high)
   - Clamp to game's [min, max] range

4. **Unit tests for math**
   - `expectedScore(skill, skill) = 0.5` (symmetry)
   - `selectDifficulty` inverts to `p*` within tolerance
   - `update` moves skill up on wins / down on losses with shrinking steps as rd falls

5. **Simulation harness** (`src/adaptive/__sim__`)
   - Drive the loop with synthetic players of fixed true skill
   - Assert estimated rating converges to truth
   - Assert realized success rate settles near `p*` within ~15–25 puzzles

---

## MVP 1 — The Flow Loop

**Bet (A2 + A4):** Adaptive puzzle selection keeps players inside a target success ("flow") band, and players show within-game learning (skill rises with play).

### Current State

**✓ EXISTS:**
- EndlessMode component with interleaved scheduler (`src/components/game/EndlessMode.tsx`)
- Basic `adaptDifficulty()` heuristic (adjusts based on moves/time)
- Auto-advance preference (localStorage)
- Session persistence (settings + session options)

**✗ MISSING (Critical Path):**
- **Skill-based difficulty selection**: Current `adaptDifficulty()` is a simple heuristic, not Glicko-lite
- **Outcome telemetry**: No structured outcome capture for skill updates
- **Guardrails**: No smoothing/max-step/hysteresis (as specified in plan)
- **Skill readout**: No UI showing player rating curve or level

### Kill Criterion (from roadmap)

If realized success rate fails to converge to the target band, or no positive learning slope emerges across a session → adaptivity doesn't produce the intended challenge experience.

### Concrete Next Steps

1. **Replace heuristic with Glicko-lite flow loop** (update EndlessMode)
   - Load `PlayerRating` from localStorage
   - `D* = selectDifficulty(rating, p*)`
   - `state = game.generate(D*)`
   - On solve: `outcome = score(...)`, `rating = update(rating, D*, outcome)`
   - Persist rating after each puzzle
   - Show skill readout (rating curve or "level")

2. **Add guardrails** (from adaptive mode plan)
   - **Smoothing / max step**: cap `D*` jump between puzzles
   - **Hysteresis band**: only adjust when outside flow band for ≥N puzzles
   - **Floor/ceiling**: never below min solvable, cap top for generation speed
   - **Transparency toggle**: let advanced users see/lock their rating

3. **Within-game learning test**
   - Simulate a learner whose true skill rises
   - Assert served `D` trends upward while success stays near `p*`

4. **EndlessMode tests** (`src/components/game/EndlessMode.test.tsx`)
   - Endless stream (no game-over screen)
   - Stays in the band (success rate within ±10% of `p*`)
   - Smoothing guardrail (no lurch on fluke)
   - Session persists across reloads
   - Skill trends upward on learning

---

## MVP 2 — Multi-Game Common Scale

**Bet (enabler):** Multiple NP-complete games can share one normalized difficulty/skill scale, so a player's skills across games are co-estimable and comparable — the precondition for measuring transfer.

### Current State

**✓ EXISTS:**
- PuzzleGame interface with numeric difficulty
- Per-game difficulty settings (100–2500 scale)
- Registry with 5 games (graphColoring, setCover, hamiltonian, threeSat, nonogram)
- Uniqueness wrapper (`generateUnique()`)
- Conformance test suite (`registry.conformance.test.ts`)

**✗ MISSING (Critical Path):**
- **Per-game calibration**: No mapping from shared difficulty scale to game-specific parameters (difficultyToConfig per game)
- **Calibration suite**: No test that verifies same D yields same expected success across games
- **Skill independence**: No test that estimator reports distinct per-game skills when appropriate

### Kill Criterion (from roadmap)

If per-game difficulty ratings can't be normalized to a common success semantics (same `D` ⇒ wildly different success across games even after calibration) → cross-game comparison is invalid; transfer can't be cleanly measured.

### Concrete Next Steps

1. **Implement per-game difficultyToConfig** (see `docs/plans/np-complete-games.md`)
   - Each game declares its own mapping: `D → { binWidth, binHeight, allowedShapes, minPieces }`
   - Monotonic: bigger D ⇒ larger bin, pentominoes unlocked, more pieces
   - Example for bin-packing:
     ```ts
     function difficultyToConfig(D: number): { width: number; height: number; shapes: PieceShape[] } {
       const size = Math.floor((D - DIFFICULTY.min) / DIFFICULTY.step); // 0..45
       const width = 4 + Math.floor(size / 10);
       const height = 4 + (size % 10);
       const shapes = SHAPES.slice(0, 2 + Math.floor(size / 15));
       return { width, height, shapes };
     }
     ```

2. **Add 2 more games** (recommend Nonograms and Numberlink)
   - Implement PuzzleGame contract for each
   - Add `difficultyToConfig` per game
   - Ensure each game can generate unique-solvable instances

3. **Calibration suite** (`src/games/calibration.test.ts`)
   - For a reference skill, play each game at a fixed `D`
   - Assert success rates across games agree within tolerance
   - Example test:
     ```ts
     test('same D yields same expected success across games', () => {
       const refSkill = 1000;
       const targetD = 1500;
       for (const game of GAMES) {
         const successRate = simulatePlayer(game, refSkill, targetD, 50);
         expect(successRate).toBeCloseTo(0.8, 0.1); // within tolerance
       }
     });
     ```

4. **Per-game skill independence test**
   - Simulate a player strong at game A, weak at game B
   - Assert estimator reports distinct skills (doesn't collapse them)

5. **Registry add is additive test**
   - Add a new game to registry
   - Assert conformance suite covers it with no changes to other games

---

## MVP 3 — Transfer Experiment ★ (make or break)

**Bet (A3 — crown jewel):** Training on game(s) A improves **cold-start** performance on a *previously unseen* game B, beyond what a control group achieves.

### Current State

**✗ MISSING (Critical Path):**
- **Experiment harness**: No cohort assignment, held-out game gating, or cold-start measurement
- **Telemetry**: No structured capture of skill estimates before/after training
- **Statistical infrastructure**: No pre-registered tests with effect size, CI, accept/reject decision

### Kill Criterion (from roadmap)

If the trained cohort's first-encounter skill on the held-out game is **not** significantly higher than control (no effect, or within noise), **A3 is unsupported.** The platform then pivots from "general skill trainer" to "per-skill trainer + solver-data platform" (still valuable, smaller claim).

### Concrete Next Steps

1. **Create experiment harness** (`src/experiments/harness.ts`)
   - Cohort assignment: train vs control
   - Held-out game gating: ensure probe game is never served before measurement point
   - Cold-start measurement: record initial skill on probe game before adaptation kicks in
   - Structured telemetry: save skill estimates, outcomes, and session metadata

2. **Simulation sanity tests** (before real users)
   - Synthetic agents with a shared latent factor of strength k
   - Assert harness detects transfer for k > 0 and reports *no* transfer for k = 0
   - Prove harness can both find and fail to find an effect

3. **Offline simulation first**
   - Drive the harness with synthetic agents before real users
   - Validate statistical machinery

4. **Pre-registered analysis plan**
   - Define effect size, CI, accept/reject decision
   - Document statistical test (e.g., two-tailed t-test or nonparametric equivalent)

---

## MVP 4 — Randomized vs Blocked Practice

**Bet (A5):** A randomized/interleaved puzzle stream produces better *general* (transfer) skill than blocked, one-game-at-a-time practice.

### Current State

**✗ MISSING (Critical Path):**
- **Scheduler variants**: Only interleaved scheduler exists; blocked scheduler not implemented
- **Cohort assignment**: No matched cohorts for interleaved vs blocked
- **Transfer comparison**: No comparison of general skill gain between the two schedulers

### Kill Criterion (from roadmap)

If interleaved cohort shows no transfer advantage over blocked → drop the "randomized maximizes general learning" claim; randomization becomes a UX choice, not a pedagogy.

### Concrete Next Steps

1. **Implement blocked scheduler** (reuses scheduler.ts infrastructure)
   - Each game appears in one contiguous block
   - Equal dose: each game gets same number of puzzles as interleaved

2. **Create interleaved vs blocked cohorts** (reuses MVP 3 harness)
   - Matched cohorts under each scheduler
   - Same total puzzle count, same games

3. **Transfer comparison test**
   - Probe on same held-out game Z
   - Compare general skill gain (difference in skill before/after training)
   - Report effect size with CI (reuses MVP 3 stats harness)

4. **Scheduler fidelity tests** (`src/games/scheduler.test.ts`)
   - Interleaved: no game repeats more than configured max run length
   - Blocked: each game appears in one contiguous block
   - Equal dose: each game gets same number of puzzles in N-length session

---

## MVP 5 — Solver Telemetry (DONE) - Dashboard at `/dashboard`

**Bet (AI/data value):** Human solution *traces* are structured, high-value data — enough to benchmark/train a solver or to mine hard instances.

### Current State

**✗ MISSING (Critical Path):**
- **Move-event schema**: No standardized schema for trace capture
- **Export**: No export function for traces
- **Downstream use**: No demonstrated downstream use (replay-verify, mine hard instances, seed/benchmark solver)

### Kill Criterion (from roadmap)

If captured traces can't reconstruct solves or don't improve any solver baseline → the "advance NP-complete solvers" pillar needs rethinking.

### Concrete Next Steps

1. **Define trace schema** (`src/telemetry/trace-schema.ts`)
   - Every `applyMove` event with:
     - `timestamp`
     - `move` (the action)
     - `stateHash` (for replay verification)
     - `gameId`
     - `difficulty`
     - `progress` (0..100)

2. **Implement trace capture** (modify existing GamePlayer)
   - Log every `applyMove` call
   - Store in structured format (array of events)
   - Persist to localStorage (optional, for later export)

3. **Implement export** (`src/telemetry/export.ts`)
   - Export traces as JSONL
   - Include metadata (session ID, date, user settings)

4. **Demonstrate downstream use**
   - **Replay-verify solves**: Given a trace, replay and assert final state matches solved state
   - **Mine hard instances**: Use human-found instances as difficulty oracle
   - **Seed/benchmark solver**: Use human traces to seed or benchmark solver algorithms

5. **Schema stability test** (`src/telemetry/trace-schema.test.ts`)
   - Any game's trace validates against shared schema
   - Replay-verify works for all games

---

## Summary: What Blocks What

| MVP | Blocks | Blocked By |
|-----|--------|------------|
| **MVP 0** | MVP 1, MVP 2 | Skill estimator + outcome scorer + selectDifficulty |
| **MVP 1** | MVP 2, MVP 3 | Glicko-lite flow loop (EndlessMode needs to use skill-based selector) |
| **MVP 2** | MVP 3 | Per-game calibration + 2 more games + conformance suite |
| **MVP 3** | MVP 4 | Experiment harness + telemetry (reuses MVP 2 infrastructure) |
| **MVP 4** | — | Blocked by MVP 3 (same harness) |
| **MVP 5** | — | Parallel track, independent of others (but can share PuzzleGame interface) |

---

## Recommended Sequence

1. **MVP 0 first** (skill estimator + outcome scorer)
   - Unblocks MVP 1 (skill-based flow loop)
   - Unblocks MVP 2 (calibration suite needs skill estimates)

2. **MVP 1 second** (Glicko-lite endless mode)
   - Unblocks MVP 2 (multi-game requires skill estimates to be comparable)

3. **MVP 2 third** (2 more games + calibration)
   - Unblocks MVP 3 (transfer experiment needs multi-game common scale)

4. **MVP 3 fourth** (transfer experiment harness)
   - Unblocks MVP 4 (same harness)

5. **MVP 4 fifth** (randomized vs blocked)
   - Uses MVP 3 harness

6. **MVP 5 parallel** (solver telemetry)
   - Can start anytime after PuzzleGame interface is stable

---

*Document updated: 2026-06-27*
