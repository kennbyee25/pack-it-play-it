import { useState } from 'react';
import {
  defaultSessionOptions,
  parseSessionOptions,
  serializeSessionOptions,
  SESSION_OPTIONS_KEY,
  type SessionOptions,
} from '@/games/settings';

function load(): SessionOptions {
  if (typeof window === 'undefined') return defaultSessionOptions();
  return parseSessionOptions(window.localStorage.getItem(SESSION_OPTIONS_KEY));
}

export function useSessionOptions() {
  const [options, setOptions] = useState<SessionOptions>(load);

  const setOption = <K extends keyof SessionOptions>(key: K, value: SessionOptions[K]) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(SESSION_OPTIONS_KEY, serializeSessionOptions(next));
      } catch {
        // ignore quota/availability errors
      }
      return next;
    });
  };

  return { options, setOption };
}
