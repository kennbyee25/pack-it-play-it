// number-packing archetype. Toggle item cards; running sum shown vs target.
export function NumberBoard({ state, onMove }: { state: any; onMove: (m: any) => void }) {
  const currentSum: number = state.items.reduce(
    (s: number, item: any, i: number) => s + (state.selected[i] ? item.value : 0),
    0,
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{state.instruction}</p>
      <div className="flex items-center gap-6 text-lg font-mono">
        <span>Sum: {currentSum}</span>
        <span className="text-muted-foreground">
          {state.targetLabel}: {state.target}
        </span>
        {state.valueTarget != null && (
          <span className="text-muted-foreground">Value goal: {state.valueTarget}</span>
        )}
      </div>
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
            {item.label ?? item.value}
            {item.weight != null && <span className="block text-xs opacity-70">w: {item.weight}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
