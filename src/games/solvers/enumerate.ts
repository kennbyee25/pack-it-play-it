import type { Rng } from '../rng';

// Yield every boolean[] of length n (all 2^n subsets), as selection masks.
// Shared by every "select a subset" game (subset-sum, set-cover, graph-select…).
export function* bitmasks(n: number): Generator<boolean[]> {
  const total = 1 << n;
  for (let m = 0; m < total; m++) {
    const out = new Array<boolean>(n);
    for (let i = 0; i < n; i++) out[i] = (m & (1 << i)) !== 0;
    yield out;
  }
}

// One random boolean[] of length n.
export const randomMask = (n: number, rng: Rng): boolean[] =>
  Array.from({ length: n }, () => rng.next() < 0.5);
