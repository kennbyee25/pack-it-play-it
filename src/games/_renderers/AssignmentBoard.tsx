import type { SatState, SatMove } from '../threeSat';
import type { BoardProps } from './types';

const litLabel = (lit: number) => (lit < 0 ? `¬x${-lit}` : `x${lit}`);

const litValue = (lit: number, assignment: (boolean | null)[]): boolean | null => {
  const v = assignment[Math.abs(lit)];
  if (v === null) return null;
  return lit > 0 ? v : !v;
};

// logic-assignment archetype. Toggle each variable true/false; satisfied clauses light up.
export function AssignmentBoard({ state, onMove }: BoardProps<SatState, SatMove>) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        Set each variable so every clause has at least one true literal
      </p>
      <div className="flex flex-wrap gap-3 justify-center" aria-label="variables">
        {Array.from({ length: state.numVars }).map((_, i) => {
          const v = i + 1;
          const val = state.assignment[v];
          return (
            <div key={v} className="flex items-center gap-1">
              <span className="text-sm">x{v}</span>
              <div className="flex rounded overflow-hidden border border-border">
                <button
                  aria-label={`x${v}-true`}
                  onClick={() => onMove({ variable: v, value: true })}
                  className={`px-2 py-1 text-xs ${val === true ? 'bg-piece-teal text-white' : 'bg-card'}`}
                >
                  T
                </button>
                <button
                  aria-label={`x${v}-false`}
                  onClick={() => onMove({ variable: v, value: false })}
                  className={`px-2 py-1 text-xs ${val === false ? 'bg-piece-rose text-white' : 'bg-card'}`}
                >
                  F
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1 w-full max-w-md" aria-label="clauses">
        {state.clauses.map((c, i) => {
          const sat = c.some((lit) => litValue(lit, state.assignment) === true);
          return (
            <div
              key={i}
              className={`px-3 py-1 rounded text-sm font-mono border ${
                sat ? 'bg-piece-teal/20 border-piece-teal' : 'bg-card border-border'
              }`}
            >
              ({c.map(litLabel).join(' ∨ ')})
            </div>
          );
        })}
      </div>
    </div>
  );
}
