// P4 — problem metadata: category + reduction edges (Karp-style) plus display
// tags, complexity class, and unique-solution capability. Kept as a central map
// (not per-game files) because reductions are *relationships* best read and
// maintained in one place.

export type Category = 'satisfiability' | 'graph' | 'set' | 'number' | 'sequencing';

/** Complexity class for the decision problem. All 20 games here are NP-complete
 *  (Karp's 21), but the tag makes it explicit for filter UI and education. */
export type ComplexityClass =
  | 'NP-complete'
  | 'NP-hard'
  | 'NP'
  | 'P'
  | 'EXPTIME-complete'
  | 'PSPACE-complete';

/** User-facing tags for filtering the game list in advanced settings. */
export interface GameMetadata {
  category: Category;
  complexity: ComplexityClass;
  /** The game is verified to reliably generate unique-solution puzzles
   *  (implements countSolutions and passes the uniqueness conformance gate). */
  uniqueSolutions: boolean;
  /** Human-readable labels used as filter chips, e.g. "graph", "grid", "selection". */
  displayTags: string[];
  // Game ids this problem is (classically) reduced FROM — its parents in the
  // reduction graph rooted at 3-SAT. Empty = a root.
  reductionFrom: string[];
}

// Reduction edges follow the classic Karp lineage (3-SAT at the root). These are
// documentation of relatedness, not load-bearing for gameplay.
// Complexity is NP-complete for all (Karp 21); uniqueSolutions=true only for
// games whose solver consistently finds unique-solution puzzles within retry bounds.
export const METADATA: Record<string, GameMetadata> = {
  'three-sat': {
    category: 'satisfiability',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['assignment', 'satisfiability'],
    reductionFrom: [],
  },
  'integer-programming': {
    category: 'satisfiability',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['assignment', 'satisfiability'],
    reductionFrom: ['three-sat'],
  },
  nonogram: {
    category: 'satisfiability',
    complexity: 'NP-complete',
    uniqueSolutions: true,
    displayTags: ['grid', 'picture'],
    reductionFrom: ['three-sat'],
  },
  'nae-3sat': {
    category: 'satisfiability',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['assignment', 'satisfiability'],
    reductionFrom: ['three-sat'],
  },

  clique: {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'selection'],
    reductionFrom: ['three-sat'],
  },
  'independent-set': {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'selection'],
    reductionFrom: ['clique'],
  },
  'vertex-cover': {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'selection'],
    reductionFrom: ['independent-set'],
  },
  'max-cut': {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'binary-partition'],
    reductionFrom: ['three-sat'],
  },
  'graph-coloring': {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: true,
    displayTags: ['graph', 'coloring'],
    reductionFrom: ['three-sat'],
  },
  'directed-hamiltonian': {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'path'],
    reductionFrom: ['vertex-cover'],
  },
  hamiltonian: {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: true,
    displayTags: ['graph', 'path'],
    reductionFrom: ['directed-hamiltonian'],
  },
  'feedback-vertex-set': {
    category: 'graph',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'selection'],
    reductionFrom: ['vertex-cover'],
  },

  'exact-cover': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['set', 'selection'],
    reductionFrom: ['three-sat'],
  },
  'set-cover': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: true,
    displayTags: ['set', 'selection'],
    reductionFrom: ['vertex-cover'],
  },
  'hitting-set': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['set', 'selection'],
    reductionFrom: ['vertex-cover'],
  },
  'set-packing': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['set', 'selection'],
    reductionFrom: ['exact-cover'],
  },
  '3d-matching': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['set', 'matching'],
    reductionFrom: ['exact-cover'],
  },
  'dominating-set': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['graph', 'selection'],
    reductionFrom: ['vertex-cover'],
  },
  x3c: {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['set', 'selection'],
    reductionFrom: ['three-sat'],
  },
  'steiner-tree': {
    category: 'set',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['set', 'path'],
    reductionFrom: ['exact-cover'],
  },

  'subset-sum': {
    category: 'number',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['number', 'selection'],
    reductionFrom: ['exact-cover'],
  },
  knapsack: {
    category: 'number',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['number', 'selection'],
    reductionFrom: ['subset-sum'],
  },
  partition: {
    category: 'number',
    complexity: 'NP-complete',
    uniqueSolutions: false,
    displayTags: ['number', 'selection'],
    reductionFrom: ['subset-sum'],
  },
  sudoku: {
    category: 'number',
    complexity: 'NP-complete',
    uniqueSolutions: true,
    displayTags: ['grid', 'placement'],
    reductionFrom: [],
  },
};

const FALLBACK: GameMetadata = {
  category: 'graph',
  complexity: 'NP-complete',
  uniqueSolutions: false,
  displayTags: [],
  reductionFrom: [],
};

export const getMetadata = (id: string): GameMetadata => METADATA[id] ?? FALLBACK;
