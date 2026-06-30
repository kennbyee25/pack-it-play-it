import {
  DEFAULT_RATING,
  PlayerRating,
  expectedScore,
  updatePlayer,
} from '../rating';

test('DEFAULT_RATING has correct defaults', () => {
  expect(DEFAULT_RATING.skill).toEqual(1300);
  expect(DEFAULT_RATING.rd).toEqual(300);
  expect(DEFAULT_RATING.games).toEqual(0);
});

test('expectedScore symmetry', () => {
  const skill = 1200;
  const opp = 1200;
  expect(expectedScore(skill, opp)).toBeCloseTo(0.5);
});

test('expectedScore higher skill vs opponent', () => {
  const skill = 1500;
  const opp = 1200;
  // (1500-1200)/400 = 300/400 = 0.75
  // 10^-0.75 ≈ 0.177; 1/1.177 ≈ 0.85 → should be >0.5
  expect(expectedScore(skill, opp)).toBeGreaterThan(0.5);
});

test('updatePlayer skill moves up on win', () => {
  let rating = DEFAULT_RATING;
  rating = updatePlayer(rating, 1200, 1); // win vs equal opponent
  expect(rating.skill).toBeGreaterThan(1300);
});

test('updatePlayer skill moves down on loss', () => {
  let rating = DEFAULT_RATING;
  rating = updatePlayer(rating, 1200, 0); // loss vs equal opponent
  expect(rating.skill).toBeLessThan(1300);
});

test('updatePlayer RD decreases with experience', () => {
  let rating = DEFAULT_RATING;
  const oldRD = rating.rd;
  rating = updatePlayer(rating, 1200, 0.5); // draw
  expect(rating.rd).toBeLessThan(oldRD);
  expect(rating.rd).toBeGreaterThanOrEqual(30); // floor
});