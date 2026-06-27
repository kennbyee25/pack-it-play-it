// P4 — problem metadata: category + reduction edges (Karp-style).
// Kept as a central map (not per-game files) because reductions are *relationships*
// best read and maintained in one place. Enriches telemetry traces and feeds the
// MVP 3 transfer analysis (does skill transfer along reduction edges?).

export type Category = 'satisfiability' | 'graph' | 'set' | 'number' | 'sequencing';

export interface GameMetadata {
  category: Category;
  // Game ids this problem is (classically) reduced FROM — its parents in the
  // reduction graph rooted at 3-SAT. Empty = a root.
  reductionFrom: string[];
}

// Reduction edges follow the classic Karp lineage (3-SAT at the root). These are
// documentation of relatedness, not load-bearing for gameplay.
export const METADATA: Record<string, GameMetadata> = {
  'three-sat': { category: 'satisfiability', reductionFrom: [] },
  'integer-programming': { category: 'satisfiability', reductionFrom: ['three-sat'] },
  nonogram: { category: 'satisfiability', reductionFrom: ['three-sat'] },

  clique: { category: 'graph', reductionFrom: ['three-sat'] },
  'independent-set': { category: 'graph', reductionFrom: ['clique'] },
  'vertex-cover': { category: 'graph', reductionFrom: ['independent-set'] },
  'max-cut': { category: 'graph', reductionFrom: ['three-sat'] },
  'graph-coloring': { category: 'graph', reductionFrom: ['three-sat'] },
  'directed-hamiltonian': { category: 'graph', reductionFrom: ['vertex-cover'] },
  hamiltonian: { category: 'graph', reductionFrom: ['directed-hamiltonian'] },

  'exact-cover': { category: 'set', reductionFrom: ['three-sat'] },
  'set-cover': { category: 'set', reductionFrom: ['vertex-cover'] },
  'hitting-set': { category: 'set', reductionFrom: ['vertex-cover'] },
  'set-packing': { category: 'set', reductionFrom: ['exact-cover'] },
  '3d-matching': { category: 'set', reductionFrom: ['exact-cover'] },
  'steiner-tree': { category: 'set', reductionFrom: ['exact-cover'] },

  'subset-sum': { category: 'number', reductionFrom: ['exact-cover'] },
  knapsack: { category: 'number', reductionFrom: ['subset-sum'] },
  partition: { category: 'number', reductionFrom: ['subset-sum'] },
};

const FALLBACK: GameMetadata = { category: 'graph', reductionFrom: [] };

export const getMetadata = (id: string): GameMetadata => METADATA[id] ?? FALLBACK;
