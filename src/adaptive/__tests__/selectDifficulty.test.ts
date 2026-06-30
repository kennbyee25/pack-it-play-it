import { selectDifficulty } from '../selectDifficulty';
import { PlayerRating } from '../rating';

test('selectDifficulty targets p*', () => {
  const player: PlayerRating = { skill: 1200, rd: 30 };
  const targetP = 0.8;
  // D = 1200 + 400 * log10((1-0.8)/0.8) = 1200 + 400 * log10(0.25) ≈ 1200 + 400 * (-0.60206) = 980
  const D = selectDifficulty(player, targetP, 0); // no exploration
  // Tolerance: the formula guarantees expectedScore(skill, D) ≈ p*
  const tolerance = 0.05;
  const actualP = 1 / (1 + Math.pow(10, (D - 1200) / 400));
  expect(Math.abs(actualP - targetP)).toBeLessThan(tolerance);
});

test('selectDifficulty snaps to step', () => {
  const player: { skill: number; rd: number } = { skill: 1200, rd: 30 }; // RD per interface
  const D = selectDifficulty(player, 0.8, 0); // no exploration
  expect(D % 50).toEqual(0); // step 50
});