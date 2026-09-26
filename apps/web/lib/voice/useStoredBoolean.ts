import { useCallback, useEffect, useState } from "react";

/**
 * A boolean preference persisted in localStorage. Renders `fallback` on the
 * server and first client paint, then the stored value (so hydration matches).
 */
export function useStoredBoolean(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      // Sync from storage after hydration (it is not readable during the server render).
      if (stored === "1" || stored === "0") setValue(stored === "1");
    } catch {
      // Storage blocked (private mode, sandboxed iframe): keep the fallback.
    }
  }, [key]);

  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // ignore
      }
    },
    [key],
  );

  return [value, update];
}
