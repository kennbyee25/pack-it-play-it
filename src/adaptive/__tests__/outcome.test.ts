import { SolveMetrics, computeOutcome, DEFAULT_OUTCOME_WEIGHTS } from '../outcome';

test('computeOutcome clamps to [0,1]', () => {
  // Unsolved is zero
  expect(computeOutcome(false, {} as SolveMetrics, 100)).toEqual(0);
  // Solved but perfect score
  const perfect: SolveMetrics = {
    moves: 3,
    optimalMoves: 3,
    seconds: 10,
    hintsUsed: 0,
  };
  const diff100 = expectedTime(100);
  // Mock expectedTime for test: say expected=15
  const expectedTime = (_D: number) => 15;
  jest.spyOn(global.Math, 'max').mockImplementationOnce((a, b) => Math.max(a, b));
  jest.spyOn(global.Math, 'min').mockImplementationOnce((a, b) => Math.min(a, b));
  const score = computeOutcome(true, perfect, 100);
  expect(score).toBeLessThanOrEqual(1);
});

// Simple expectedTime mock for rest of tests
test('computeOutcome at midpoint difficulty', () => {
  const MID_DIFFICULTY = 1300;
  const BASE_TIME_SECONDS = 60;
  const expectedTime = (D: number) =>
    BASE_TIME_SECONDS * (D / MID_DIFFICULTY);

  // Mock Math.min/max again to avoid clamp
  jest.spyOn(global.Math, 'min').mockImplementationOnce((a, b) => Math.min(a, b));
  jest.spyOn(global.Math, 'max').mockImplementationOnce((a, b) => Math.max(a, b));

  // Perfect metrics at difficulty 1300: expected time 60 seconds
  const metrics: SolveMetrics = {
    moves: 5,
    optimalMoves: 5,
    seconds: 60,
    hintsUsed: 0,
  };
  const outcome = computeOutcome(true, metrics, 1300);
  // Weights: solved 0.5, time 0.2, moves 0.2, hints 0.1
  // timeScore = clamp(expected/actual, 0,2)/2 = 1 → 0.2
  // moveScore = optimal/actual = 1 → 0.2
  // hintScore = 1 → 0.1
  // sum = 0.5*1 + 0.2*1 + 0.2*1 + 0.1*1 = 1 → outcome=1
  expect(outcome).toBeCloseTo(1);
});