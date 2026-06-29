// MVP 3 — the transfer experiment (A3, the crown jewel), as an OFFLINE simulation.
// Synthetic agents carry a tunable shared latent factor: training on games A,B
// raises a general ability `g`, and a transfer coefficient `k` controls how much
// `g` loads onto a *held-out* game Z. k>0 ⇒ training should lift cold-start skill on
// Z above a control cohort; k=0 ⇒ no lift. The harness must detect the former and
// report null for the latter — its positive/negative controls — BEFORE we ever spend
// real-player time. Cold-start skill is measured with the real Glicko estimator.

import { type Rng, makeRng } from '../rng';
import { newPlayer, updateSkill, expectedScore } from '../skill/estimator';
import { welch, cohensD, meanDiffCI } from './stats';

export const TRANSFER = {
  base: 1000, // baseline true skill
  gSd: 150, // population SD of general ability g (mean 0)
  offsetSd: 110, // per-game specific offset SD (mean 0)
  trainGainPerAttempt: 6, // g gained per training attempt (transferable practice)
  probeDifficulty: 1000, // fixed difficulty for the cold-start probe
  dMin: 0.2, // minimum standardized effect to call it real (with CI>0)
} as const;

export type Cohort = 'trained' | 'control';

export interface Agent {
  id: number;
  cohort: Cohort;
  g: number; // general latent ability (rises with training)
  offsets: Record<string, number>; // per-game specific skill
  served: Set<string>; // games this agent has ever attempted (contamination guard)
}

function gauss(rng: Rng, m: number, sd: number): number {
  const u1 = Math.max(1e-9, rng.next());
  const u2 = rng.next();
  return m + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// An agent's TRUE latent skill on a game, given the transfer coefficient.
export function trueSkill(agent: Agent, game: string, k: number): number {
  return TRANSFER.base + k * agent.g + (agent.offsets[game] ?? 0);
}

// One attempt: win with probability expectedScore(trueSkill, difficulty). Records
// that the agent has now seen this game (contamination guard).
export function attempt(agent: Agent, game: string, difficulty: number, k: number, rng: Rng): number {
  agent.served.add(game);
  return rng.next() < expectedScore(trueSkill(agent, game, k), difficulty) ? 1 : 0;
}

// Train: deliberate practice raises the transferable general ability `g`.
export function train(agent: Agent, game: string, dose: number, k: number, rng: Rng): void {
  for (let i = 0; i < dose; i++) {
    attempt(agent, game, TRANSFER.probeDifficulty, k, rng); // play (outcome unused here)
    agent.g += TRANSFER.trainGainPerAttempt;
  }
}

// Cold-start skill on the held-out game: the Glicko estimate after a short probe,
// starting from a fresh prior — i.e. first-encounter skill, before any adaptation.
export function coldStartSkill(agent: Agent, heldOut: string, k: number, probes: number, rng: Rng): number {
  let est = newPlayer();
  for (let i = 0; i < probes; i++) {
    const score = attempt(agent, heldOut, TRANSFER.probeDifficulty, k, rng);
    est = updateSkill(est, TRANSFER.probeDifficulty, score);
  }
  return est.skill;
}

export interface ExperimentConfig {
  nAgents: number;
  trainGames: string[];
  heldOut: string;
  doseTrain: number; // attempts per training game
  probes: number; // cold-start probe length
  k: number; // TRUE transfer strength (the thing controls vary)
  seed: number;
}

export interface ExperimentResult {
  nTrained: number;
  nControl: number;
  trainedZ: number[];
  controlZ: number[];
  meanDiff: number;
  ci: [number, number];
  t: number;
  d: number;
  decision: 'transfer' | 'no-transfer';
  heldOutLeakedInTraining: boolean; // integrity: must be false
  cohortsBalanced: boolean;
}

function makeAgents(n: number, games: string[], rng: Rng): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < n; i++) {
    const offsets: Record<string, number> = {};
    for (const g of games) offsets[g] = gauss(rng, 0, TRANSFER.offsetSd);
    agents.push({ id: i, cohort: 'control', g: gauss(rng, 0, TRANSFER.gSd), offsets, served: new Set() });
  }
  // Randomized, balanced assignment: shuffle, first half trained.
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [agents[i], agents[j]] = [agents[j], agents[i]];
  }
  agents.forEach((a, i) => (a.cohort = i < Math.floor(n / 2) ? 'trained' : 'control'));
  return agents;
}

export function runTransferExperiment(cfg: ExperimentConfig): ExperimentResult {
  const rng = makeRng(cfg.seed);
  const games = [...cfg.trainGames, cfg.heldOut];
  const agents = makeAgents(cfg.nAgents, games, rng);

  // Training phase — trained cohort practices the train games; control does an
  // equal-dose unrelated filler (no transferable gain). Neither sees the held-out game.
  for (const a of agents) {
    if (a.cohort === 'trained') {
      for (const g of cfg.trainGames) train(a, g, cfg.doseTrain, cfg.k, rng);
    }
    // control: filler practice has no effect on g and never touches a real game.
  }
  const heldOutLeakedInTraining = agents.some((a) => a.served.has(cfg.heldOut));

  // Cold-start probe on the held-out game (first encounter for everyone).
  const trainedZ: number[] = [];
  const controlZ: number[] = [];
  for (const a of agents) {
    const z = coldStartSkill(a, cfg.heldOut, cfg.k, cfg.probes, rng);
    (a.cohort === 'trained' ? trainedZ : controlZ).push(z);
  }

  const { t, meanDiff } = welch(trainedZ, controlZ);
  const ci = meanDiffCI(trainedZ, controlZ);
  const d = cohensD(trainedZ, controlZ);
  // Pre-registered rule: significant POSITIVE lift = CI lower bound > 0 AND effect ≥ dMin.
  const decision: 'transfer' | 'no-transfer' = ci[0] > 0 && d >= TRANSFER.dMin ? 'transfer' : 'no-transfer';

  const nTrained = trainedZ.length;
  const nControl = controlZ.length;
  return {
    nTrained,
    nControl,
    trainedZ,
    controlZ,
    meanDiff,
    ci,
    t,
    d,
    decision,
    heldOutLeakedInTraining,
    cohortsBalanced: Math.abs(nTrained - nControl) <= 1,
  };
}
