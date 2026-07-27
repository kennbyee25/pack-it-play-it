import { useState, useMemo } from 'react';
import { GAMES } from '@/games/registry';
import { getMetadata, type Category } from '@/games/metadata';
import { DIFFICULTY, enabledGameIds, type GameSettings, type SessionOptions } from '@/games/settings';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2, Search, X } from 'lucide-react';

type FilterState = {
  search: string;
  categories: Category[];
  uniqueOnly: boolean | null; // null = no filter, true = only unique-solution games
};

const ALL_CATEGORIES: Category[] = ['satisfiability', 'graph', 'set', 'number', 'sequencing'];
const CATEGORY_LABEL: Record<Category, string> = {
  satisfiability: 'SAT',
  graph: 'Graph',
  set: 'Set',
  number: 'Number',
  sequencing: 'Sequencing',
};

interface SessionSettingsProps {
  settings: GameSettings;
  onToggle: (id: string, on: boolean) => void;
  onDifficulty: (id: string, value: number) => void;
  onReset: () => void;
  onSelectAll: () => void;
  onDeselectAll: (keepId?: string) => void;
  sessionOptions: SessionOptions;
  onSessionOption: <K extends keyof SessionOptions>(key: K, value: SessionOptions[K]) => void;
  /** The id of the game currently being played, so "deselect all" can keep it. */
  currentGameId?: string;
}

export function SessionSettings({
  settings,
  onToggle,
  onDifficulty,
  onReset,
  onSelectAll,
  onDeselectAll,
  sessionOptions,
  onSessionOption,
  currentGameId,
}: SessionSettingsProps) {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ search: '', categories: [], uniqueOnly: null });
  const enabledCount = enabledGameIds(settings).length;

  // Derive the full set of unique tags across all games for the filter chips.
  const tagSet = useMemo(() => {
    const all = new Set<string>();
    for (const g of GAMES) {
      for (const t of getMetadata(g.id).displayTags) all.add(t);
    }
    return [...all].sort();
  }, []);

  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      const meta = getMetadata(game.id);

      // Text search on name
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!game.name.toLowerCase().includes(q) && !game.id.toLowerCase().includes(q)) return false;
      }

      // Category filter (empty = show all)
      if (filters.categories.length > 0 && !filters.categories.includes(meta.category)) return false;

      // Unique-solution filter
      if (filters.uniqueOnly === true && !meta.uniqueSolutions) return false;

      return true;
    });
  }, [filters]);

  const toggleCategory = (cat: Category) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const clearFilters = () => setFilters({ search: '', categories: [], uniqueOnly: null });

  const hasActiveFilters = filters.search !== '' || filters.categories.length > 0 || filters.uniqueOnly !== null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full max-w-md">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Advanced options
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-xl border border-border bg-card p-4 flex flex-col gap-4">
          <label className="flex items-center justify-between text-sm font-medium">
            <span>
              Unique solution
              <span className="ml-2 text-xs font-normal text-muted-foreground">only puzzles with one answer</span>
            </span>
            <Switch
              checked={sessionOptions.uniqueSolution}
              aria-label="unique solution"
              onCheckedChange={(v) => onSessionOption('uniqueSolution', v)}
            />
          </label>
          <hr className="border-border" />

          <p className="text-xs text-muted-foreground">
            Pick which games appear and set each one's problem size.
          </p>

          {/* ── Filters ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                aria-label="filter games"
                placeholder="Search games..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-7 h-8 text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {ALL_CATEGORIES.map((cat) => {
                const active = filters.categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-label={`filter ${CATEGORY_LABEL[cat]}`}
                    onClick={() => toggleCategory(cat)}
                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {CATEGORY_LABEL[cat]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-xs text-muted-foreground mr-1">Tags:</span>
              <button
                type="button"
                aria-label="filter unique solutions"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    uniqueOnly: f.uniqueOnly === true ? null : true,
                  }))
                }
                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                  filters.uniqueOnly === true
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-accent'
                }`}
              >
                Unique solution
              </button>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="self-start h-6 text-xs gap-1" onClick={clearFilters}>
                <X className="w-3 h-3" />
                Clear filters
              </Button>
            )}
          </div>

          {/* ── Game list ────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredGames.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No games match the current filters.</p>
            ) : (
              filteredGames.map((game) => {
                const s = settings[game.id];
                if (!s) return null;
                const isLastEnabled = s.enabled && enabledCount === 1;
                const meta = getMetadata(game.id);
                return (
                  <div key={game.id} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={s.enabled}
                          disabled={isLastEnabled}
                          aria-label={`enable ${game.name}`}
                          onCheckedChange={(c) => onToggle(game.id, c === true)}
                        />
                        {game.name}
                      </label>
                      <span className="text-xs tabular-nums text-muted-foreground" aria-label={`${game.name} size value`}>
                        {s.difficulty}
                      </span>
                    </div>
                    {/* Tag badges */}
                    <div className="flex flex-wrap gap-1 ml-6">
                      {meta.displayTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 font-normal leading-none">
                          {tag}
                        </Badge>
                      ))}
                      {meta.uniqueSolutions && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal leading-none border-amber-400 text-amber-600">
                          unique
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal leading-none">
                        {meta.complexity}
                      </Badge>
                    </div>
                    <Slider
                      aria-label={`${game.name} difficulty`}
                      value={[s.difficulty]}
                      min={DIFFICULTY.min}
                      max={DIFFICULTY.max}
                      step={DIFFICULTY.step}
                      disabled={!s.enabled}
                      onValueChange={([v]) => onDifficulty(game.id, v)}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* ── Bulk actions ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onSelectAll}
            >
              Select all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onDeselectAll(currentGameId)}
            >
              Deselect all
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={onReset}>
              Reset to default
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
