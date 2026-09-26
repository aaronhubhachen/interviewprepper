"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Calls `callback` every `intervalMs` while the tab is visible, and again when
 * the tab regains focus/visibility. Pass null to pause. The latest callback is
 * always used (no stale closures, no interval restarts on re-render).
 */
export function useVisiblePolling(callback: () => void, intervalMs: number | null): void {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalMs === null) return;
    const run = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    const timer = window.setInterval(run, intervalMs);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
    };
  }, [intervalMs]);
}

/** Wall clock that re-renders every `intervalMs` (for "3 min ago" labels). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True when the user asked the OS for reduced motion (false during SSR). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
