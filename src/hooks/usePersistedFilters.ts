import { useState, useEffect, useCallback } from "react";

/**
 * useState, который автоматически сохраняет значение в localStorage.
 * При первом рендере читает сохранённое значение (если есть).
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // ignore
    }
    return defaultValue;
  });

  const setPersistedState = useCallback(
    (value: T) => {
      setState(value);
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    },
    [key]
  );

  return [state, setPersistedState];
}