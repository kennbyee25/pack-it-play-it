import { describe, it, expect } from 'vitest';
import { mean, variance, welch, cohensD, meanDiffCI } from './stats';
import { runTransferExperiment, type ExperimentConfig } from './transfer';

const base: ExperimentConfig = {
  nAgents: 300,
  trainGames: ['set-cover', 'subset-sum'],
  heldOut: 'vertex-cover',
  doseTrain: 25,
  probes: 30,
  k: 0.8,
  seed: 1,
};

describe('stats kit', () => {
  it('mean/variance/effect/CI behave', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(variance([2, 2, 2])).toBe(0);
    const a = [5, 6, 7, 6, 5];
    const b = [1, 2, 1, 2, 1];
    expect(welch(a, b).meanDiff).toBeGreaterThan(0);
    expect(cohensD(a, b)).toBeGreaterThan(1); // big separation
    const [lo] = meanDiffCI(a, b);
    expect(lo).toBeGreaterThan(0);
  });
});

describe('transfer experiment — controls', () => {
  // POSITIVE control: a real shared latent factor (k>0) → harness detects transfer.
  it('detects transfer when k > 0', () => {
    const r = runTransferExperiment({ ...base, k: 0.8 });
    expect(r.decision).toBe('transfer');
    expect(r.meanDiff).toBeGreaterThan(0); // trained cold-start higher
    expect(r.ci[0]).toBeGreaterThan(0); // CI excludes 0 (positive)
    expect(r.d).toBeGreaterThanOrEqual(0.2);
  });

  // NEGATIVE control: no shared factor (k=0) → harness reports null (can fail to find).
  it('reports no transfer when k = 0', () => {
    const r = runTransferExperiment({ ...base, k: 0 });
    expect(r.decision).toBe('no-transfer');
    expect(r.ci[0]).toBeLessThanOrEqual(0); // CI includes 0
  });
});

describe('transfer experiment — integrity & hygiene', () => {
  it('never serves the held-out game during training (no contamination)', () => {
    const r = runTransferExperiment(base);
    expect(r.heldOutLeakedInTraining).toBe(false);
  });

  it('assigns balanced cohorts', () => {
    const r = runTransferExperiment(base);
    expect(r.cohortsBalanced).toBe(true);
    expect(r.nTrained + r.nControl).toBe(base.nAgents);
  });

  it('is reproducible for a fixed seed (pre-registered, deterministic)', () => {
    const a = runTransferExperiment({ ...base, seed: 42 });
    const b = runTransferExperiment({ ...base, seed: 42 });
    expect(a.decision).toBe(b.decision);
    expect(a.meanDiff).toBe(b.meanDiff);
    expect(a.ci).toEqual(b.ci);
  });

  it('cold-start skill is recorded for every agent (first-encounter measurement)', () => {
    const r = runTransferExperiment(base);
    expect(r.trainedZ).toHaveLength(r.nTrained);
    expect(r.controlZ).toHaveLength(r.nControl);
    expect(r.trainedZ.every((x) => Number.isFinite(x))).toBe(true);
  });
});
