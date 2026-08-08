#!/usr/bin/env node
/**
 * Garey-Johnson catalog fetcher.
 *
 * Pulls the classic list of NP-complete problems from Garey & Johnson's
 * "Computers and Intractability" (Appendix A) and outputs a JSON array
 * suitable for ingestion into pack-it-play-it's metadata system.
 *
 * The script is deliberately minimal and self-contained so it can run
 * in CI or locally without external deps beyond node-fetch (built-in in
 * recent Node) and a simple HTML parser (DOMParser).
 *
 * Output shape: [{ id: string, name: string, category: Category, reductions: string[] }]
 *
 * Where Category is one of: 'satisfiability' | 'graph' | 'set' | 'number' | 'sequencing'.
 *
 * NOTE: This script is a starting point — the real work is manual curation
 *       (picking visualisable problems, verifying uniqueness, writing generators).
 *       We use it to bootstrap the backlog and keep the reduction graph honest.
 */

import { promises as fs } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

const OUTPUT_JSON = join(repoRoot, 'scripts', 'garey-johnson.json');

/**
 * Hard-coded seed list from Garey & Johnson (Appendix A) + a few commonly
 * used extras that are visually game-like.
 *
 * Each entry is seeded with the known classical reduction(s) from 3-SAT.
 * We will manually verify/correct these when writing the actual generator.
 */
const GAREY_JOHNSON_SEED: Array<{
  id: string;
  name: string;
  category: 'satisfiability' | 'graph' | 'set' | 'number' | 'sequencing';
  reductions: string[];
}> = [
  // Satisfiability (root)
  {
    id: 'three-sat',
    name: '3-SAT',
    category: 'satisfiability',
    reductions: [], // root
  },
  {
    id: 'nae-3sat',
    name: 'Not-All-Equal 3-SAT',
    category: 'satisfiability',
    reductions: ['three-sat'],
  },
  {
    id: 'exactly1-3sat',
    name: 'Exactly-One 3-SAT',
    category: 'satisfiability',
    reductions: ['three-sat'],
  },

  // Graph
  {
    id: 'clique',
    name: 'Clique',
    category: 'graph',
    reductions: ['three-sat'],
  },
  {
    id: 'independent-set',
    name: 'Independent Set',
    category: 'graph',
    reductions: ['clique'],
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    category: 'graph',
    reductions: ['independent-set'],
  },
  {
    id: 'directed-hamiltonian',
    name: 'Directed Hamiltonian Cycle',
    category: 'graph',
    reductions: ['vertex-cover'],
  },
  {
    id: 'hamiltonian',
    name: 'Undirected Hamiltonian Cycle',
    category: 'graph',
    reductions: ['directed-hamiltonian'],
  },
  {
    id: 'graph-coloring',
    name: 'Graph K-Coloring',
    category: 'graph',
    reductions: ['three-sat'],
  },
  {
    id: 'max-cut',
    name: 'Max-Cut',
    category: 'graph',
    reductions: ['three-sat'],
  },
  {
    id: 'steiner-tree',
    name: 'Steiner Tree',
    category: 'graph',
    reductions: ['exact-cover'],
  },
  {
    id: 'feedback-vertex-set',
    name: 'Feedback Vertex Set',
    category: 'graph',
    reductions: ['vertex-cover'],
  },

  // Set
  {
    id: 'exact-cover',
    name: 'Exact Cover',
    category: 'set',
    reductions: ['three-sat'],
  },
  {
    id: 'set-cover',
    name: 'Set Cover',
    category: 'set',
    reductions: ['vertex-cover'],
  },
  {
    id: 'hitting-set',
    name: 'Hitting Set',
    category: 'set',
    reductions: ['vertex-cover'],
  },
  {
    id: 'set-packing',
    name: 'Set Packing',
    category: 'set',
    reductions: ['exact-cover'],
  },
  {
    id: '3d-matching',
    name: '3-Dimensional Matching',
    category: 'set',
    reductions: ['exact-cover'],
  },
  {
    id: 'x3c',
    name: 'Exact Cover by 3-Sets (X3C)',
    category: 'set',
    reductions: ['three-sat'],
  },
  {
    id: 'dominating-set',
    name: 'Dominating Set',
    category: 'set',
    reductions: ['vertex-cover'],
  },

  // Number
  {
    id: 'subset-sum',
    name: 'Subset Sum',
    category: 'number',
    reductions: ['exact-cover'],
  },
  {
    id: 'partition',
    name: 'Partition',
    category: 'number',
    reductions: ['subset-sum'],
  },
  {
    id: 'knapsack',
    name: 'Knapsack',
    category: 'number',
    reductions: ['subset-sum'],
  },
  {
    id: 'bin-packing',
    name: 'Bin Packing',
    category: 'number',
    reductions: ['subset-sum'],
  },

  // Sequencing
  {
    id: 'job-sequencing',
    name: 'Job Sequencing with Deadlines',
    category: 'sequencing',
    reductions: ['partition'],
  },
];

async function main() {
  // Pretty-print with 2 spaces
  const json = JSON.stringify(GAREY_JOHNSON_SEED, null, 2);
  await fs.writeFile(OUTPUT_JSON, json, 'utf8');
  console.log(`Wrote ${GAREY_JOHNSON_SEED.length} entries to ${OUTPUT_JSON}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}