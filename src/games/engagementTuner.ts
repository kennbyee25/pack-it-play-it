import { clampDifficulty } from './settings';

// Gaussian Process hyperparameters for the engagement surrogate model
const GP_PARAMS = {
  lengthScale: 50,   // RBF kernel length scale (difficulty units)
  noise: 0.1,        // Observation noise variance
  sigmaF: 0.2,       // Signal variance
};

export interface EngagementObservation {
  difficulty: number;
  engagement: number; // 0-1 score
  timestamp: number;
}

/**
 * Bayesian Engagement Tuner using Gaussian Process regression
 * with Upper Confidence Bound acquisition function
 * 
 * Models engagement score as a function of difficulty per game,
 * balancing exploration (testing uncertain difficulties) vs 
 * exploitation (using current best estimate).
 */
export class BayesianEngagementTuner {
  private observations: EngagementObservation[] = [];
  private readonly maxObservations: number;

  constructor(maxObservations: number = 50) {
    this.maxObservations = maxObservations;
  }

  /**
   * Add a new engagement observation
   * @param obs Observation containing difficulty, engagement score, and timestamp
   */
  addObservation(obs: EngagementObservation): void {
    this.observations.push(obs);
    // Keep only the most recent observations to adapt to changing player skill
    if (this.observations.length > this.maxObservations) {
      this.observations.shift();
    }
  }

  /**
   * Predict engagement score and uncertainty at a given difficulty
   * @param difficulty Difficulty level to predict for
   * @returns Object with mean engagement prediction and standard deviation
   */
  predictEngagement(difficulty: number): { mean: number; std: number } {
    // If no observations, return prior (mean=0.5, std=0.5)
    if (this.observations.length === 0) {
      return { mean: 0.5, std: 0.5 };
    }

    // Compute kernel matrix K + noise*I
    const n = this.observations.length;
    const K: number[][] = Array(n);
    for (let i = 0; i < n; i++) {
      K[i] = Array(n);
      for (let j = 0; j < n; j++) {
        K[i][j] = this.kernel(
          this.observations[i].difficulty,
          this.observations[j].difficulty
        );
      }
      K[i][i] += GP_PARAMS.noise; // Add noise to diagonal
    }

    // Compute kernel vector k* between test point and observations
    const kStar: number[] = this.observations.map(obs =>
      this.kernel(obs.difficulty, difficulty)
    );

    // Solve for predictive distribution: 
    // mean = k*^T * K^-1 * y
    // variance = k** - k*^T * K^-1 * k*
    // where k** = k(x*, x*) = sigmaF^2 (for normalized RBF)
    
    // For simplicity and numerical stability, we'll use a simplified approach:
    // weighted average with kernel weights, plus uncertainty based on distance to observations
    
    let sumK = 0;
    let sumKy = 0;
    let minDistSq = Infinity;

    for (const obs of this.observations) {
      const k = this.kernel(obs.difficulty, difficulty);
      sumK += k;
      sumKy += k * obs.engagement;
      
      // Track minimum distance to any observation (for uncertainty)
      const distSq = Math.pow(obs.difficulty - difficulty, 2);
      if (distSq < minDistSq) {
        minDistSq = distSq;
      }
    }

    const mean = sumK > 0 ? sumKy / sumK : 0.5;
    
    // Uncertainty decreases as we get closer to observations
    // Base uncertainty: sigmaF, decreases with proximity to data
    const distanceUncertainty = Math.min(
      0.5, 
      Math.sqrt(minDistSq) / (2 * GP_PARAMS.lengthScale)
    );
    const std = Math.sqrt(GP_PARAMS.sigmaF * GP_PARAMS.sigmaF + distanceUncertainty * distanceUncertainty);
    
    return { mean, std };
  }

  /**
   * Suggest next difficulty using Upper Confidence Bound acquisition function
   * UCB(d) = mean(d) + kappa * std(d)
   * 
   * @param minDiff Minimum allowed difficulty
   * @param maxDiff Maximum allowed difficulty
   * @param step Difficulty step size (usually from settings.ts)
   * @param kappa Exploration-exploitation tradeoff parameter (default 1.0)
   * @returns Suggested difficulty level
   */
  suggestDifficulty(
    minDiff: number,
    maxDiff: number,
    step: number,
    kappa: number = 1.0
  ): number {
    let bestDiff = minDiff;
    let bestUCB = -Infinity;

    // Grid search over possible difficulties
    for (let d = minDiff; d <= maxDiff; d += step) {
      const pred = this.predictEngagement(d);
      const ucb = pred.mean + kappa * pred.std;
      
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestDiff = d;
      }
    }

    return clampDifficulty(bestDiff);
  }

  /**
   * Compute RBF kernel between two difficulty levels
   * k(x1, x2) = sigmaF^2 * exp(-0.5 * ||x1 - x2||^2 / lengthScale^2)
   */
  private kernel(x1: number, x2: number): number {
    const dx = x1 - x2;
    return (
      GP_PARAMS.sigmaF * GP_PARAMS.sigmaF *
      Math.exp(-0.5 * (dx * dx) / (GP_PARAMS.lengthScale * GP_PARAMS.lengthScale))
    );
  }

  /**
   * Get current observations (for debugging/persistence)
   */
  getObservations(): EngagementObservation[] {
    return [...this.observations];
  }

  /**
   * Clear all observations
   */
  clear(): void {
    this.observations = [];
  }
}