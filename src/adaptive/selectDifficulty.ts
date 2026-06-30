// Difficulty selection: given player skill and rating deviation, pick D
// that yields target success probability p* (e.g., 0.8)
// Also add exploration jitter based on uncertainty.

import { expectedScore } from './rating';

/**
 * Select difficulty D such that expectedScore(skill, D) = p*
 * Solving: p* = 1 / (1 + 10^((D - skill)/400))
 * => 1/p* = 1 + 10^((D - skill)/400)
 * => 10^((D - skill)/400) = 1/p* - 1 = (1 - p*)/p*
 * => (D - skill)/400 = log10((1 - p*)/p*)
 * => D = skill + 400 * log10((1 - p*)/p*)
 *
 * Note: if p* > 0.5, (1-p*)/p* < 1, log10 negative => D < skill (easier)
 * For p* = 0.8: (1-0.8)/0.8 = 0.2/0.8 = 0.25, log10(0.25) ≈ -0.60206 => D = skill - 240.824
 * So we subtract about 241 from skill to target 80% success.
 */
export function selectDifficulty(
  player: PlayerRating,
  targetSuccessProbability: number = 0.8,
  // Exploration: add jitter proportional to RD to encourage exploration when uncertain
  explorationFactor: number = 0.5 // multiplier for RD to add random offset
): number {
  // Base difficulty from formula
  const base =
    player.skill +
    400 * Math.log10((1 - targetSuccessProbability) / targetSuccessProbability);

  // Exploration jitter: uniform in [-explorationFactor * RD, +explorationFactor * RD]
  const jitter = (Math.random() * 2 - 1) * explorationFactor * player.rd;

  let D = base + jitter;

  // Clamp to allowed difficulty range (should match settings)
  const MIN_D = 100;
  const MAX_D = 2500;
  D = Math.max(MIN_D, Math.min(MAX_D, Math.round(D / 50) * 50)); // snap to step of 50

  return D;
}