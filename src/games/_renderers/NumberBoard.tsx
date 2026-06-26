// number-packing archetype. Toggle item cards to pack them.
//   subset sum / partition: hit a target sum of item values.
//   knapsack: stay within a weight capacity while reaching a value goal — shown
//   as a weight meter (fills toward capacity, turns red when over) plus value.
/* eslint-disable @typescript-eslint/no-explicit-any */
export function NumberBoard({ state, onMove }: { state: any; onMove: (m: any) => void }) {
  const sumOf = (field: 'value' | 'weight'): number =>
    state.items.reduce(
      (s: number, item: any, i: number) => s + (state.selected[i] ? (item[field] ?? 0) : 0),
      0,
    );

  // Knapsack is the variant with both a weight capacity and a value goal.
  const isKnapsack = state.valueTarget != null;
  const value = sumOf('value');
  const weight = sumOf('weight');
  const capacity: number = state.target;
  const over = isKnapsack && weight > capacity;
  const fillPct = isKnapsack && capacity > 0 ? Math.min(weight / capacity, 1) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{state.instruction}</p>

      {isKnapsack ? (
        <div className="flex w-full max-w-md flex-col gap-2">
          <div className="flex items-center justify-between text-sm font-mono">
            <span aria-label="weight-readout" className={over ? 'text-destructive font-semibold' : ''}>
              Weight: {weight} / {capacity}
              {over && ' — over!'}
            </span>
            <span aria-label="value-readout" className="text-muted-foreground">
              Value: {value} / {state.valueTarget}
            </span>
          </div>
          {/* Capacity meter: teal as it fills, red once over capacity. */}
          <div
            className="h-2 w-full overflow-hidden rounded bg-muted"
            role="progressbar"
            aria-label="weight-meter"
            aria-valuenow={weight}
            aria-valuemax={capacity}
          >
            <div
              className={`h-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${over ? 100 : fillPct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-6 text-lg font-mono">
          <span>Sum: {value}</span>
          <span className="text-muted-foreground">
            {state.targetLabel}: {state.target}
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 w-full max-w-md">
        {state.items.map((item: any, i: number) => (
          <button
            key={i}
            aria-label={`item-${i}`}
            onClick={() => onMove({ itemIndex: i })}
            className={`p-2 rounded border text-sm ${
              state.selected[i] ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
            }`}
          >
            {isKnapsack ? `v: ${item.value}` : (item.label ?? item.value)}
            {item.weight != null && <span className="block text-xs opacity-70">w: {item.weight}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
