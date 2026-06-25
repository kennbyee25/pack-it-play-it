// integer-programming archetype. Toggle each binary variable; satisfied constraints light up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function IntegerProgrammingBoard({ state, onMove }: { state: any; onMove: (m: any) => void }) {
  const evalLhs = (coeffs: number[]): number =>
    coeffs.reduce((sum: number, c: number, i: number) => sum + c * (state.assignment[i + 1] ? 1 : 0), 0);

  const termLabel = (coeff: number, varIdx: number): string => {
    const prefix = coeff === 1 ? '' : coeff === -1 ? '-' : `${coeff}`;
    return `${prefix}x${varIdx + 1}`;
  };

  const constraintLabel = (coeffs: number[], bound: number, op: string): string => {
    const terms = coeffs
      .map((c, i) => (c !== 0 ? termLabel(c, i) : ''))
      .filter(Boolean)
      .join(' + ')
      .replace(/\+ -/g, '- ');
    return `${terms} ${op} ${bound}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        Set each variable so all linear constraints are satisfied
      </p>
      <div className="flex flex-wrap gap-3 justify-center" aria-label="variables">
        {Array.from({ length: state.numVars }).map((_: unknown, i: number) => {
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
                  1
                </button>
                <button
                  aria-label={`x${v}-false`}
                  onClick={() => onMove({ variable: v, value: false })}
                  className={`px-2 py-1 text-xs ${val === false ? 'bg-piece-rose text-white' : 'bg-card'}`}
                >
                  0
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1 w-full max-w-md" aria-label="constraints">
        {state.constraints.map(
          (c: { coeffs: number[]; bound: number; op: string }, i: number) => {
            const lhs = evalLhs(c.coeffs);
            const sat =
              c.op === '≤' ? lhs <= c.bound : c.op === '≥' ? lhs >= c.bound : lhs === c.bound;
            return (
              <div
                key={i}
                className={`px-3 py-1 rounded text-sm font-mono border ${
                  sat ? 'bg-piece-teal/20 border-piece-teal' : 'bg-card border-border'
                }`}
              >
                {constraintLabel(c.coeffs, c.bound, c.op)}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
