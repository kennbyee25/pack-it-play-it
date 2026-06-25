import type { BoardProps } from './types';

// set-cover archetype. Toggle subset cards; covered universe elements light up.
// Accepts any set-game state with universe/subsets/k/selected (+ optional instruction).
export function SetBoard({ state, onMove }: BoardProps<any, any>) {
  const covered = new Set<number>();
  state.subsets.forEach((s, i) => {
    if (state.selected[i]) s.forEach((e) => covered.add(e));
  });
  const selectedCount = state.selected.filter(Boolean).length;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        {state.instruction ?? `Select ≤ ${state.k} subsets whose union covers the whole universe`}
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-md" aria-label="universe">
        {state.universe.map((e) => (
          <span
            key={e}
            className={`w-8 h-8 flex items-center justify-center rounded text-sm border ${
              covered.has(e) ? 'bg-piece-teal text-white' : 'bg-card text-muted-foreground'
            }`}
          >
            {e}
          </span>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        selected {selectedCount} / budget {state.k}
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {state.subsets.map((s, i) => (
          <button
            key={i}
            aria-label={`subset-${i}`}
            onClick={() => onMove({ subsetIndex: i })}
            className={`px-3 py-2 rounded border text-sm text-left ${
              state.selected[i] ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
            }`}
          >
            {'{'}{s.join(', ')}{'}'}
          </button>
        ))}
      </div>
    </div>
  );
}
