# Plan: Infinite Puzzle Mode with Adaptive Difficulty

## Context

Today difficulty is a manual three-way switch (`easy` / `medium` / `hard`) hard-
coded in `generateGame` (`src/utils/puzzleGenerator.ts`), and a game ends after a
single puzzle. We want an **endless mode** that streams puzzles forever and
**auto-tunes difficulty to the individual player** so they stay in the
"flow channel" — challenged enough to stay engaged, not so much that they bail.

This is a well-studied problem. The standard framing is **Dynamic Difficulty
Adjustment (DDA)** grounded in Csikszentmihalyi's **flow theory**: keep the match
between player *skill* and task *challenge* inside a narrow band. The conventional
machinery for doing this quantitatively comes from **rating systems** (Elo,
Glicko-2) and **Item Response Theory (IRT)** borrowed from psychometrics, which
have been directly adapted to puzzle games by treating "player attempts puzzle"
as a *match between the player and the puzzle*, rating both on the same scale.

### What the literature recommends (research summary)

- **DDA + flow channel**: define a *challenge function* (a proxy for difficulty —
  e.g. completion time, mistakes, win/loss, hints used), pick a **target value**
  for it that corresponds to flow, detect when the player drifts out of the band,
  and nudge the next puzzle's difficulty toward the target. (Zohaib 2018 review;
  IntechOpen DDA chapter.)
- **Elo for adaptive systems**: rate the player *and* each puzzle on one scale;
  the expected outcome is the logistic `1 / (1 + 10^((D - S)/400))`. After each
  attempt, move both ratings by `K · (actual − expected)`. Widely used in adaptive
  *education*, which is structurally identical to a puzzle ladder. (Pelánek,
  *Applications of the Elo rating system in adaptive educational systems*.)
- **Glicko-2 over plain Elo**: adds a **rating deviation (RD)** = uncertainty and
  a **volatility**. New players get a high RD so their rating moves fast and
  settles as confidence grows — exactly what you want for cold-start. (Glickman.)
- **Dynamic K-factor**: large K early (fast convergence) shrinking as confidence
  grows reduces the stability/flexibility trade-off — a lightweight stand-in for
  Glicko's RD if we want to start simple. (Springer, *dynamic K value*, 2025.)
- **Target difficulty for flow ≈ ~75–85% success**, not 50%. A 50% win rate (the
  Elo "fair match" point) feels frustrating for solo play; flow/optimal-challenge
  work and adaptive-learning practice target a higher success probability so the
  player mostly succeeds with occasional stretch. We expose this as a tunable.

## Approach

### 1. A measurable difficulty scale per game

DDA needs difficulty to be a *continuous knob*, not three buckets. Generalize each
game's generator to accept a numeric **difficulty rating `D` (Elo-scale, e.g.
400–2400)** and map it to concrete parameters. For bin-packing:

```
D → { binWidth, binHeight, allowedShapes, minPieces }
```

via a monotonic mapping (bigger D ⇒ larger bin, pentominoes unlocked, more pieces,
fewer "gift" placements). Replace the `easy/medium/hard` `config` object in
`generateGame` with a `difficultyToConfig(D)` function. Each `PuzzleGame` (see the
NP-complete-games plan) declares its own `difficultyToConfig`.

> **Encapsulation tip from `v0-np-complete-gamebox`.** v0 wraps difficulty→size math in
> **value objects** (`DifficultyLevel`, `ProblemSize`) instead of scattering `difficulty ===
> 'easy' ? 3 : …`. Adopt the shape: a per-game `sizeFor(D)` value object makes the adaptive
> step's effect explicit and testable (kills "primitive obsession"). v0's continuous-less,
> 4-tier model is *weaker* than this plan's continuous `D` — keep `D`, borrow the encapsulation.
> See [analysis/v0-integration-backlog.md](../analysis/v0-integration-backlog.md) (P5).
>
> **Status note:** the manual/adaptive difficulty machinery described below is now partially
> **shipped** — `src/games/settings.ts` (continuous per-game difficulty) and
> `src/games/adaptive.ts` (optimal-challenge adjustment). This plan remains the reference for
> the full Glicko/skill-rating version.

### 2. Player skill model — `src/adaptive/rating.ts`

Implement **Glicko-2-lite** (Elo + an RD-style confidence term; full Glicko-2 is
a drop-in upgrade later):

```ts
interface PlayerRating { skill: number; rd: number; }       // rd = uncertainty
interface Outcome { score: number; }                        // 0..1, see §4

// Expected success probability of player vs a puzzle of rating D.
expectedScore(skill, D) = 1 / (1 + 10 ** ((D - skill) / 400));

// Update after each attempt; K (or RD) shrinks as rd shrinks.
update(player, D, outcome) -> { newPlayer, newPuzzleRating }
```

Both player **and** the just-played puzzle get updated, so puzzle ratings
self-calibrate across the user base if we ever sync them; locally we only need the
player side. Persist `PlayerRating` per game in `localStorage` (cold-start: skill
= mid, rd = high so early puzzles re-rate fast).

### 3. Difficulty selection — `src/adaptive/selectDifficulty.ts`

Don't serve a puzzle at `D = skill` (that's the 50% point). Solve for the `D` that
yields the **target success probability `p*`** (default ≈ 0.8, tunable):

```
D* = skill - 400 * log10( (1 - p*) / p* )
```

Add a small confidence-scaled random jitter (wider when `rd` is high) so the ladder
explores rather than locking onto one rung. Clamp `D*` to the game's supported range.

### 4. Challenge function (the DDA signal) — `src/adaptive/outcome.ts`

Map a finished puzzle to a `score ∈ [0,1]` blending the proxies the literature
uses, all of which the current engine already has or can cheaply add:

- **Solved?** (binary win — from `isSolved`)
- **Time** vs an expected time for that `D` (already have wall-clock; add a timer)
- **Mistakes / invalid drops** (`BinPackingGame` already toasts "Cannot place
  piece here!" — count these)
- **Hints / resets used** (Reset already exists; count it as partial failure)

`score = w1·solved + w2·timeScore + w3·(1 − mistakeRate) − w4·hintPenalty`,
weights tunable. This single scalar feeds `rating.update`, closing the DDA loop.

### 5. Infinite session loop — `src/components/game/EndlessMode.tsx`

A wrapper around `GameShell` (from the NP-complete-games plan) that:

1. loads `PlayerRating` from storage,
2. `D* = selectDifficulty(rating, p*)`,
3. `state = game.generate(D*)`,
4. player solves; on completion compute `outcome = score(...)`,
5. `rating = update(rating, D*, outcome)`; persist,
6. brief feedback ("Nice — stepping it up"/"Let's ease off"), then **goto 2** with
   no game-over screen.

Surface a subtle skill readout (a rating curve or a "level") and a streak so the
adjustment is legible to the player.

## Anti-frustration guardrails (from DDA practice)

- **Smoothing / max step**: cap how far `D*` can jump between consecutive puzzles so
  difficulty eases rather than lurches.
- **Hysteresis band**: only adjust when the player is clearly outside the flow band
  for ≥N puzzles, preventing oscillation on a single fluke.
- **Floor/ceiling**: never below the game's minimum solvable config; cap the top so
  generation stays fast.
- **Transparency toggle**: let advanced users see/lock their rating (some players
  dislike invisible rubber-banding).

## Critical files

- New: `src/adaptive/rating.ts` (Glicko-2-lite), `src/adaptive/selectDifficulty.ts`,
  `src/adaptive/outcome.ts`, `src/adaptive/storage.ts` (localStorage persistence),
  `src/components/game/EndlessMode.tsx`
- Modified: `src/utils/puzzleGenerator.ts` — replace bucketed `config` with
  `difficultyToConfig(D: number)`; `generateGame(D)` takes a numeric rating
- Modified: `src/components/game/BinPackingGame.tsx` — count invalid drops/resets,
  add a per-puzzle timer to feed the challenge function
- Modified: `src/App.tsx` — add `/endless/:gameId` route

## Verification

1. `npx tsc --noEmit -p tsconfig.app.json`.
2. **Unit tests** for the math: `expectedScore` symmetry (`p(s,s)=0.5`),
   `selectDifficulty` inverts to `p*` (`expectedScore(skill, D*) ≈ p*`), and
   `update` moves skill up on wins / down on losses with shrinking steps as `rd`
   falls.
3. **Simulation harness** (`src/adaptive/__sim__`): drive the loop with synthetic
   players of fixed true-skill and assert the estimated rating converges to truth
   and the realized success rate settles near `p*` within ~15–25 puzzles — the
   standard way DDA tuning is validated offline before shipping.
4. `npm run dev`: play the endless ladder; verify deliberate failures lower the
   next puzzle's size/complexity and a win streak raises it, smoothly.

## Phasing

1. Numeric difficulty scale + `difficultyToConfig` (no adaptivity yet).
2. `rating.ts` + `selectDifficulty.ts` + storage; wire a basic endless loop.
3. Real challenge function (timer + mistake/reset counts).
4. Guardrails (smoothing, hysteresis) + simulation-based tuning of `p*`/weights.
5. (Optional) full Glicko-2; shared puzzle-rating sync across users.

## Sources

- [Zohaib, *Dynamic Difficulty Adjustment (DDA) in Computer Games: A Review* (Wiley, 2018)](https://onlinelibrary.wiley.com/doi/10.1155/2018/5681652)
- [*Dynamic Difficulty Adjustment in Games: Concepts, Techniques, and Applications* (IntechOpen)](https://www.intechopen.com/chapters/1228576)
- [Pelánek, *Applications of the Elo rating system in adaptive educational systems* (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S036013151630080X)
- [*Comparing Elo, Glicko, IRT, and Bayesian IRT models for educational and gaming data* (U. Arkansas)](https://scholarworks.uark.edu/etd/3201/)
- [*Balancing stability and flexibility: a dynamic K value for Elo in adaptive learning* (Springer, 2025)](https://link.springer.com/article/10.1007/s11257-025-09439-z)
- [*Solutions for Dynamic Difficulty Adjustment in digital games: A Systematic Literature Review* (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S1875952125001211)
