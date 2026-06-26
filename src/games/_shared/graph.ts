// Shared graph primitives. Every graph game (coloring, clique, vertex cover,
// independent set, max cut, the Hamiltonian/Steiner family) reimplemented these
// edge helpers; this is the single source of truth.

export type Edge = [number, number];

// Canonical orientation for an undirected edge (smaller endpoint first), so the
// same pair always compares/keys equal regardless of click order.
export const normEdge = (a: number, b: number): Edge => (a < b ? [a, b] : [b, a]);

// Stable string keys for set membership.
export const edgeKey = (a: number, b: number): string => {
  const [x, y] = normEdge(a, b);
  return `${x}-${y}`;
};
export const edgeKeyOf = (e: Edge): string => edgeKey(e[0], e[1]);

// Directed variants — orientation is significant (directed Hamiltonian).
export const dirKey = (a: number, b: number): string => `${a}->${b}`;
export const dirKeyOf = (e: Edge): string => dirKey(e[0], e[1]);

// Accumulate a deduplicated edge list — replaces the seen-Set + addEdge closure
// several generators hand-rolled. `directed` keeps orientation; otherwise edges
// are normalized so (a,b) === (b,a).
export function edgeAccumulator(directed = false) {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  const keyFor = directed ? dirKey : edgeKey;
  return {
    add(a: number, b: number): void {
      const k = keyFor(a, b);
      if (seen.has(k)) return;
      seen.add(k);
      edges.push(directed ? [a, b] : normEdge(a, b));
    },
    has: (a: number, b: number): boolean => seen.has(keyFor(a, b)),
    get edges(): Edge[] {
      return edges;
    },
  };
}
