import { useState } from 'react';
import { GAMES } from '@/games/registry';
import { DIFFICULTY, enabledGameIds, type GameSettings, type SessionOptions } from '@/games/settings';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings2 } from 'lucide-react';

interface SessionSettingsProps {
  settings: GameSettings;
  onToggle: (id: string, on: boolean) => void;
  onDifficulty: (id: string, value: number) => void;
  onReset: () => void;
  sessionOptions: SessionOptions;
  onSessionOption: <K extends keyof SessionOptions>(key: K, value: SessionOptions[K]) => void;
}

// Advanced options: per-game enable + raw difficulty (problem size). Presentational;
// state lives in EndlessMode via useGameSettings / useSessionOptions.
export function SessionSettings({ settings, onToggle, onDifficulty, onReset, sessionOptions, onSessionOption }: SessionSettingsProps) {
  const [open, setOpen] = useState(false);
  const enabledCount = enabledGameIds(settings).length;

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
          {GAMES.map((game) => {
            const s = settings[game.id];
            if (!s) return null;
            const isLastEnabled = s.enabled && enabledCount === 1;
            return (
              <div key={game.id} className="flex flex-col gap-2">
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
          })}
          <Button variant="ghost" size="sm" className="self-end" onClick={onReset}>
            Reset
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
