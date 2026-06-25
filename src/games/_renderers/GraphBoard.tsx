// graph-select archetype. Handles two modes via duck-typing:
//   color mode  — state has `colors: (number|null)[]`, click cycles color
//   select mode — state has `selected: boolean[]`, click toggles selection
/* eslint-disable @typescript-eslint/no-explicit-any */

const FILLS = ['#f87171', '#2dd4bf', '#fbbf24', '#a78bfa', '#38bdf8', '#fb7185'];

export function GraphBoard({ state, onMove }: { state: any; onMove: (m: any) => void }) {
  const size = 320;
  const r = size / 2 - 36;
  const cx = size / 2;
  const cy = size / 2;
  const pos = (i: number) => {
    const t = (i / state.n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  };

  const isSelectMode = 'selected' in state;

  const defaultInstruction = isSelectMode
    ? 'Click a node to toggle selection'
    : `Click a node to cycle its color · use ≤ ${state.k} colors, no two linked nodes alike`;

  const instruction: string = state.instruction ?? defaultInstruction;

  const nodeColor = (i: number): string => {
    if (isSelectMode) {
      return state.selected[i] ? '#2dd4bf' : '#475569';
    }
    const c = state.colors[i];
    return c === null ? '#475569' : FILLS[c % FILLS.length];
  };

  const handleNodeClick = (i: number) => {
    if (isSelectMode) {
      onMove({ node: i });
    } else {
      const c = state.colors[i];
      onMove({ node: i, color: c === null ? 0 : (c + 1) % state.k });
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">{instruction}</p>
      <svg width={size} height={size} role="img" aria-label="graph">
        {state.edges.map(([a, b]: [number, number], i: number) => {
          const pa = pos(a);
          const pb = pos(b);
          return (
            <line key={`e${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#94a3b8" strokeWidth={2} />
          );
        })}
        {Array.from({ length: state.n }).map((_, i) => {
          const p = pos(i);
          return (
            <g
              key={`n${i}`}
              role="button"
              aria-label={`node-${i}`}
              style={{ cursor: 'pointer' }}
              onClick={() => handleNodeClick(i)}
            >
              <circle cx={p.x} cy={p.y} r={18} fill={nodeColor(i)} stroke="white" strokeWidth={2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize={12}>{i}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
