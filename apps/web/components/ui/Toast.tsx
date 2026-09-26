"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { BannerTone } from "./Banner";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: BannerTone;
  /** Leading emoji (defaults per tone). */
  icon?: ReactNode;
  /** Auto-dismiss after ms (default 4500; 0 keeps it until dismissed). */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<BannerTone, string> = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  danger: "⛔",
  synapse: "⚡",
};

const BORDERS: Record<BannerTone, string> = {
  info: "border-info/40",
  success: "border-success/40",
  warning: "border-warning/40",
  danger: "border-danger/50",
  synapse: "border-synapse/50",
};

/** Mounted once in the root layout. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { ...options, id }]);
      const duration = options.duration ?? 4500;
      if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6"
      >
        {items.map((item) => {
          const tone = item.tone ?? "info";
          const icon = item.icon === undefined ? ICONS[tone] : item.icon;
          return (
            <div
              key={item.id}
              role={tone === "danger" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-ink-800/95 px-4 py-3 text-sm shadow-card backdrop-blur",
                "motion-safe:animate-fade-up",
                BORDERS[tone],
              )}
            >
              {icon ? (
                <span aria-hidden="true" className="mt-px text-base leading-5">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fg">{item.title}</p>
                {item.description ? <div className="mt-0.5 text-fg-muted">{item.description}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-ink-700 hover:text-fg"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/** `const { toast } = useToast(); toast({ title: "Saved", tone: "success" })`. No-ops outside the provider. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

const NOOP: ToastApi = { toast: () => 0, dismiss: () => undefined };
