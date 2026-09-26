"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DUE_CHANGED_EVENT, fetchDue } from "@/lib/api";
import type { DueResponse } from "@/lib/types";

interface DueCountValue {
  /** Latest queue summary (null until the first successful fetch). */
  due: DueResponse | null;
  /** Re-fetch now (also triggered by DUE_CHANGED_EVENT, window focus, and a 30 s poll). */
  refresh: () => void;
}

const DueCountContext = createContext<DueCountValue>({ due: null, refresh: () => undefined });

const POLL_MS = 30_000;

export function DueCountProvider({ children }: { children: ReactNode }) {
  const [due, setDue] = useState<DueResponse | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    fetchDue({ signal: controller.signal })
      .then((next) => setDue(next))
      .catch(() => {
        // Badge is best-effort; keep the last known value.
      });
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    window.addEventListener(DUE_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(DUE_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      inFlight.current?.abort();
    };
  }, [refresh]);

  const value = useMemo(() => ({ due, refresh }), [due, refresh]);
  return <DueCountContext.Provider value={value}>{children}</DueCountContext.Provider>;
}

/** `const { due, refresh } = useDueCount()` anywhere under the root layout. */
export function useDueCount(): DueCountValue {
  return useContext(DueCountContext);
}
