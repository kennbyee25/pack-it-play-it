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
  /**
   * Play form: 'short' for puzzle‑like, finite, unique‑solution games; 'long' for match‑like, extended, strategic games.
   */
  playForm: 'short' | 'long';
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
  /** Whether the game has been retired and should not be served to new players. */
  retired: boolean;
  /** Date when the game was retired (if applicable). */
  retiredDate?: string; // ISO date string
}

// Reduction edges follow the classic Karp lineage (3-SAT at the root). These are
// documentation of relatedness, not load-bearing for gameplay.
// Complexity is NP-complete for all (Karp 21); uniqueSolutions=true only for
// games whose solver consistently finds unique-solution puzzles within retry bounds.
export const METADATA: Record<string, GameMetadata> = {
   'three-sat': {
     category: 'satisfiability',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'long',
     displayTags: ['assignment', 'satisfiability'],
     reductionFrom: [],
     retired: false,
   },
   'integer-programming': {
     category: 'satisfiability',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'long',
     displayTags: ['assignment', 'satisfiability'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   nonogram: {
     category: 'satisfiability',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'short',
     displayTags: ['grid', 'picture'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   'nae-3sat': {
     category: 'satisfiability',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'long',
     displayTags: ['assignment', 'satisfiability'],
     reductionFrom: ['three-sat'],
     retired: false,
   },

   clique: {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'long',
     displayTags: ['graph', 'selection'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   'independent-set': {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['graph', 'selection'],
     reductionFrom: ['clique'],
     retired: false,
   },
   'vertex-cover': {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['graph', 'selection'],
     reductionFrom: ['independent-set'],
     retired: false,
   },
   'max-cut': {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['graph', 'binary-partition'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   'graph-coloring': {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'short',
     displayTags: ['graph', 'coloring'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   'directed-hamiltonian': {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['graph', 'path'],
     reductionFrom: ['vertex-cover'],
     retired: false,
   },
   hamiltonian: {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'short',
     displayTags: ['graph', 'path'],
     reductionFrom: ['directed-hamiltonian'],
     retired: false,
   },
   'feedback-vertex-set': {
     category: 'graph',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['graph', 'selection'],
     reductionFrom: ['vertex-cover'],
     retired: false,
   },

   'exact-cover': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['set', 'selection'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   'set-cover': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'short',
     displayTags: ['set', 'selection'],
     reductionFrom: ['vertex-cover'],
     retired: false,
   },
   'hitting-set': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['set', 'selection'],
     reductionFrom: ['vertex-cover'],
     retired: false,
   },
   'set-packing': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['set', 'selection'],
     reductionFrom: ['exact-cover'],
     retired: false,
   },
   '3d-matching': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['set', 'matching'],
     reductionFrom: ['exact-cover'],
     retired: false,
   },
   'dominating-set': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['graph', 'selection'],
     reductionFrom: ['vertex-cover'],
     retired: false,
   },
   x3c: {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['set', 'selection'],
     reductionFrom: ['three-sat'],
     retired: false,
   },
   'steiner-tree': {
     category: 'set',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['set', 'path'],
     reductionFrom: ['exact-cover'],
     retired: false,
   },

   'subset-sum': {
     category: 'number',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['number', 'selection'],
     reductionFrom: ['exact-cover'],
     retired: false,
   },
   knapsack: {
     category: 'number',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['number', 'selection'],
     reductionFrom: ['subset-sum'],
     retired: false,
   },
   partition: {
     category: 'number',
     complexity: 'NP-complete',
     uniqueSolutions: false,
     playForm: 'long',
     displayTags: ['number', 'selection'],
     reductionFrom: ['subset-sum'],
     retired: false,
   },
   sudoku: {
     category: 'number',
     complexity: 'NP-complete',
     uniqueSolutions: true,
     playForm: 'short',
     displayTags: ['grid', 'placement'],
     reductionFrom: [],
     retired: false,
   },
 };

const FALLBACK: GameMetadata = {
  category: 'graph',
  complexity: 'NP-complete',
  uniqueSolutions: false,
    playForm: 'long',
  displayTags: [],
  reductionFrom: [],
};

export const getMetadata = (id: string): GameMetadata => METADATA[id] ?? FALLBACK;
