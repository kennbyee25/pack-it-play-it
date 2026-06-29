// Small statistics kit for the transfer experiment's decision rule. Pure functions.
// The decision compares the trained vs control cold-start distributions with a
// Welch (unequal-variance) two-sample test, an effect size (Cohen's d), and a
// normal-approx confidence interval on the difference of means.

export const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

// Sample variance (n − 1 denominator).
export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

export const std = (xs: number[]): number => Math.sqrt(variance(xs));

// Welch's t statistic and standard error of the mean difference (a − b).
export function welch(a: number[], b: number[]): { t: number; se: number; meanDiff: number } {
  const se = Math.sqrt(variance(a) / a.length + variance(b) / b.length);
  const meanDiff = mean(a) - mean(b);
  return { t: se === 0 ? 0 : meanDiff / se, se, meanDiff };
}

// Cohen's d (pooled SD) — standardized effect size.
export function cohensD(a: number[], b: number[]): number {
  const na = a.length;
  const nb = b.length;
  const pooled = Math.sqrt(((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2));
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled;
}

// 95% (z=1.96) confidence interval on the mean difference (a − b), normal approx.
export function meanDiffCI(a: number[], b: number[], z = 1.96): [number, number] {
  const { se, meanDiff } = welch(a, b);
  return [meanDiff - z * se, meanDiff + z * se];
}
