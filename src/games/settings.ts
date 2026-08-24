export interface SessionOptions {
  uniqueSolution: boolean;
  /**
   * Difficulty tuning algorithm selection.
   * 'smart' – current Glicko‑lite rating system (default).
   * 'naive' – simple telemetry‑based step up/down.
   * 'adaptive' – time‑based heuristic from adaptive.ts.
   * 'engagement' – Bayesian optimization maximizing engagement quality.
   * 'random' – per‑puzzle random selection among smart, naive, adaptive, engagement.
   * 'ensemble' – median‑of‑four of smart, naive, adaptive, engagement suggestions.
   */
  tuningAlgorithm: 'smart' | 'naive' | 'adaptive' | 'engagement' | 'random' | 'ensemble';
}