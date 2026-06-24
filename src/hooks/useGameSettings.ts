import { useCallback, useEffect, useState } from 'react';
import { GAMES } from '@/games/registry';
import {
  type GameSettings,
  mergeSettings,
  parse,
  serialize,
  setEnabled as setEnabledPure,
  setDifficulty as setDifficultyPure,
  defaultSettings,
} from '@/games/settings';

const STORAGE_KEY = 'pip.settings';

function load(): GameSettings {
  if (typeof window === 'undefined') return defaultSettings(GAMES);
  return mergeSettings(parse(window.localStorage.getItem(STORAGE_KEY)), GAMES);
}

// localStorage-backed session settings reconciled against the current registry.
export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize(settings));
    } catch {
      // ignore quota/availability errors — settings still work in-memory
    }
  }, [settings]);

  const setEnabled = useCallback(
    (id: string, on: boolean) => setSettings((s) => setEnabledPure(s, id, on)),
    [],
  );
  const setDifficulty = useCallback(
    (id: string, value: number) => setSettings((s) => setDifficultyPure(s, id, value)),
    [],
  );
  const reset = useCallback(() => setSettings(defaultSettings(GAMES)), []);

  return { settings, setEnabled, setDifficulty, reset };
}
